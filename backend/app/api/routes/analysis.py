"""Analysis, metadata, PDF and tutorial HTTP endpoints."""
from __future__ import annotations

import asyncio
import io
import json
import os

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from app.services.analysis import analyze_gemini, build_canonical_response, classify_gemini_error
from app.services.export import generate_critique_pdf, pdf_download_filename
from app.services.intent import build_intent_profile
from app.services.metadata import extract_exif_data, get_camera_device_name, get_exif_summary, image_metadata, open_verified_image, read_image_bytes, require_image_upload
from app.services.recommendations import load_tutorial_catalog, recommend_tutorials
from app.services.scoring import build_gemini_context, build_score_engine, enforce_authoritative_scores
from app.services.vision import analyze_cv_heuristics

router = APIRouter()
IMAGE_CPU_LIMITER = asyncio.Semaphore(1)


def _inspect_uploaded_image(image_bytes: bytes, filename: str | None) -> tuple[dict, dict, dict]:
    image = open_verified_image(image_bytes)
    try:
        exif_data = extract_exif_data(image)
        return exif_data, image_metadata(filename, image, exif_data), get_exif_summary(exif_data)
    finally:
        image.close()


def _generate_verified_pdf(analysis: dict, image_bytes: bytes | None) -> bytes:
    if image_bytes:
        image = open_verified_image(image_bytes)
        image.close()
    return generate_critique_pdf(analysis, image_bytes)


@router.get("/")
def read_root():
    return {"status": "ok", "app": "Snapgrade Backend"}


@router.post("/image-metadata")
async def read_image_metadata(file: UploadFile = File(...)):
    require_image_upload(file)
    image_bytes = await read_image_bytes(file)
    async with IMAGE_CPU_LIMITER:
        exif_data, _, exif_summary = await run_in_threadpool(_inspect_uploaded_image, image_bytes, file.filename)
    return {"camera": get_camera_device_name(exif_data), "make": exif_data.get("Make"), "model": exif_data.get("Model"), "has_exif": bool(exif_data), "camera_settings": exif_summary["formatted"]}


@router.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    require_image_upload(file)
    image_bytes = await read_image_bytes(file)
    try:
        async with IMAGE_CPU_LIMITER:
            _, metadata, exif_summary = await run_in_threadpool(_inspect_uploaded_image, image_bytes, file.filename)
            local = await run_in_threadpool(analyze_cv_heuristics, image_bytes, exif_summary=exif_summary)
        local["intent_profile"] = build_intent_profile(local)
        score_engine = build_score_engine(local, exif_summary)
        local = enforce_authoritative_scores(local, local, score_engine)
        local["mode"] = "computer_vision"
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            try:
                generated = await analyze_gemini(image_bytes, build_gemini_context(local, exif_summary, score_engine), api_key, file.content_type)
                result = enforce_authoritative_scores(generated, local, score_engine)
                result["ai_status"] = "success"
            except Exception as exc:
                result = local
                result["ai_status"] = classify_gemini_error(exc)
        else:
            result = local
            result["ai_status"] = "not_configured"
        result["filename"] = file.filename
        result["tutorial_recommendations"] = recommend_tutorials(result, limit=4)
        canonical = build_canonical_response(result, metadata, result["tutorial_recommendations"])
        # Existing integrations and PDF generation still consume the legacy payload.
        return {**result, **canonical}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Internal Server Error") from exc


@router.post("/critique-pdf")
async def download_critique_pdf(analysis_json: str = Form(...), file: UploadFile | None = File(None)):
    try:
        analysis = json.loads(analysis_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Analysis data is not valid JSON") from exc
    if not isinstance(analysis, dict):
        raise HTTPException(status_code=400, detail="Analysis data must be an object")
    image_bytes = None
    if file is not None:
        require_image_upload(file)
        image_bytes = await read_image_bytes(file)
    try:
        async with IMAGE_CPU_LIMITER:
            pdf_bytes = await run_in_threadpool(_generate_verified_pdf, analysis, image_bytes)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Could not generate the PDF critique") from exc
    name = pdf_download_filename(analysis.get("filename"))
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{name}"'})


@router.get("/tutorials")
def list_tutorials():
    tutorials = load_tutorial_catalog()
    return {"count": len(tutorials), "tutorials": tutorials}


@router.post("/tutorial-recommendations")
def tutorial_recommendations(analysis: dict, limit: int = 3):
    try:
        return {"learner_path": recommend_tutorials(analysis, limit=limit)}
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
