import io
import json
import os

import uvicorn

from PIL import Image, ImageCms
from PIL.ExifTags import TAGS, GPSTAGS
from PIL.TiffImagePlugin import IFDRational

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv



from local_cv_engine import *
from gemini_analysis import *
from pdf_engine import generate_critique_pdf, pdf_download_filename
from score_engine import build_gemini_context, build_score_engine, enforce_authoritative_scores
from tutorial_recommendation_engine import load_tutorial_catalog, recommend_tutorials
from intent_engine import build_intent_profile

# Load environment variables
load_dotenv()

app = FastAPI(title="FocalPointAI Backend")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)





def extract_exif_data(image) -> dict:
    """
    Extracts primary, sub-IFD, and GPS EXIF metadata from PIL Image.
    Returns a dictionary of tag name -> value.
    """
    exif_data = {}
    try:
        img_exif = image.getexif()
        if img_exif is not None:
            # 1. Primary tags
            for key, val in img_exif.items():
                tag_name = TAGS.get(key, str(key))
                if tag_name != 'exif': # avoid raw offset dict
                    exif_data[tag_name] = val
            
            # 2. Exif sub-IFD (detailed camera settings)
            # 0x8769 is the offset for Exif sub-IFD
            try:
                exif_ifd = img_exif.get_ifd(0x8769)
                if exif_ifd:
                    for key, val in exif_ifd.items():
                        tag_name = TAGS.get(key, str(key))
                        exif_data[tag_name] = val
            except Exception as e:
                print(f"Error parsing sub-IFD EXIF: {e}")
                
            # 3. GPS Info (0x8825)
            try:
                gps_ifd = img_exif.get_ifd(0x8825)
                if gps_ifd:
                    for key, val in gps_ifd.items():
                        tag_name = GPSTAGS.get(key, str(key))
                        exif_data[tag_name] = val
            except Exception as e:
                print(f"Error parsing GPS EXIF: {e}")

            # 4. Embedded ICC profile (when present). This is stored outside
            # the EXIF IFD but is still part of the image metadata users expect.
            icc_profile = image.info.get("icc_profile")
            if icc_profile:
                try:
                    profile = ImageCms.ImageCmsProfile(io.BytesIO(icc_profile))
                    description = ImageCms.getProfileDescription(profile).strip("\x00 \r\n")
                    exif_data["ICCProfileDescription"] = description or "Embedded ICC profile"
                except Exception:
                    exif_data["ICCProfileDescription"] = "Embedded ICC profile"
    except Exception as e:
        print(f"Failed to extract EXIF: {e}")
    return exif_data

def format_shutter_speed(exposure_time) -> str:
    if not exposure_time:
        return None
    try:
        val = float(exposure_time)
        if val <= 0:
            return f"{val}s"
        if val >= 1.0:
            return f"{round(val, 1)}s"
        # Convert to fraction (e.g. 1/250)
        denom = round(1.0 / val)
        return f"1/{denom}s"
    except Exception:
        return str(exposure_time)


def clean_exif_value(value):
    if isinstance(value, IFDRational):
        return float(value) if value.denominator != 0 else 0.0
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="ignore").strip("\x00 ")
    return value


def get_camera_device_name(exif_data: dict) -> str | None:
    """Return a readable EXIF Make + Model without duplicating the brand."""
    make = str(clean_exif_value(exif_data.get("Make")) or "").strip()
    model = str(clean_exif_value(exif_data.get("Model")) or "").strip()

    if make and model:
        if model.casefold().startswith(make.casefold()):
            return model
        return f"{make} {model}"
    return model or make or None


def format_flash_usage(value) -> str | None:
    """Convert the EXIF Flash bit field into the simple state shown in the UI."""
    value = clean_exif_value(value)
    if value is None:
        return None
    try:
        return "Flash used" if int(value) & 1 else "No flash"
    except (TypeError, ValueError):
        text = str(value).strip().casefold()
        if not text:
            return None
        return "No flash" if "not" in text or "no flash" in text else "Flash used"


def format_exposure_compensation(value) -> str | None:
    """Format EXIF exposure bias as a signed exposure-value adjustment."""
    value = clean_exif_value(value)
    if value is None:
        return None
    try:
        ev = float(value)
    except (TypeError, ValueError):
        return str(value).strip() or None

    if abs(ev) < 0.005:
        return "0 EV"
    magnitude = f"{abs(ev):.2f}".rstrip("0").rstrip(".")
    sign = "+" if ev > 0 else "−"
    return f"{sign}{magnitude} EV"


def get_color_profile_name(exif_data: dict) -> str | None:
    """Prefer an ICC description, then fall back to EXIF color-space tags."""
    icc_description = clean_exif_value(exif_data.get("ICCProfileDescription"))
    if icc_description:
        return str(icc_description).strip() or None

    color_space = clean_exif_value(exif_data.get("ColorSpace"))
    try:
        color_space_code = int(color_space) if color_space is not None else None
    except (TypeError, ValueError):
        color_space_code = None

    if color_space_code == 1:
        return "sRGB"
    if color_space_code == 2:
        return "Adobe RGB"
    if color_space_code == 0xFFFF:
        return "Uncalibrated"
    if color_space not in (None, ""):
        return str(color_space)

    interoperability = str(clean_exif_value(exif_data.get("InteroperabilityIndex")) or "").strip().upper()
    if interoperability == "R98":
        return "sRGB"
    if interoperability == "R03":
        return "Adobe RGB"
    return None


def get_exif_summary(exif_data: dict) -> dict:
    exposure_time = clean_exif_value(exif_data.get('ExposureTime'))
    f_number = clean_exif_value(exif_data.get('FNumber'))
    iso = clean_exif_value(exif_data.get('ISOSpeedRatings'))
    focal_length = clean_exif_value(exif_data.get('FocalLength'))
    focal_length_35mm = clean_exif_value(exif_data.get('FocalLengthIn35mmFilm'))
    flash = clean_exif_value(exif_data.get('Flash'))
    exposure_compensation = clean_exif_value(exif_data.get('ExposureBiasValue'))
    camera = get_camera_device_name(exif_data)
    lens = clean_exif_value(exif_data.get('LensModel'))
    color_profile = get_color_profile_name(exif_data)

    if isinstance(iso, (list, tuple)) and len(iso) > 0:
        iso = iso[0]

    shutter_speed_str = format_shutter_speed(exposure_time)
    aperture_str = f"f/{f_number}" if f_number else None
    iso_str = f"ISO {iso}" if iso else None
    focal_length_str = f"{round(focal_length)}mm" if focal_length else None
    focal_length_35mm_str = f"{round(focal_length_35mm)}mm" if focal_length_35mm else None
    flash_usage_str = format_flash_usage(flash)
    exposure_compensation_str = format_exposure_compensation(exposure_compensation)

    # Construct human readable text for Gemini
    lines = []
    for k, v in exif_data.items():
        cleaned = clean_exif_value(v)
        if cleaned is not None:
            lines.append(f"{k}: {cleaned}")
    exif_text = "\n".join(lines)

    return {
        "raw": {
            "exposure_time": exposure_time,
            "f_number": f_number,
            "iso": iso,
            "focal_length": focal_length,
            "focal_length_35mm": focal_length_35mm,
            "flash": flash,
            "exposure_compensation": exposure_compensation,
            "color_profile": color_profile,
            "camera": camera,
            "lens": lens
        },
        "formatted": {
            "shutter_speed": shutter_speed_str,
            "aperture": aperture_str,
            "iso": iso_str,
            "focal_length": focal_length_str,
            "focal_length_35mm": focal_length_35mm_str,
            "flash_usage": flash_usage_str,
            "exposure_compensation": exposure_compensation_str,
            "color_profile": color_profile,
            "camera": str(camera) if camera else None,
            "lens": str(lens) if lens else None
        },
        "text": exif_text
    }

@app.get("/")
def read_root():
    return {"status": "ok", "app": "FocalPointAI Backend"}


@app.post("/image-metadata")
async def read_image_metadata(file: UploadFile = File(...)):
    """Read lightweight device metadata for the pre-analysis upload preview."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not an image")

    image_bytes = await file.read()
    if len(image_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Uploaded image exceeds 15 MB")

    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            exif_data = extract_exif_data(image)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The image metadata could not be read") from exc

    exif_summary = get_exif_summary(exif_data)
    return {
        "camera": get_camera_device_name(exif_data),
        "make": clean_exif_value(exif_data.get("Make")),
        "model": clean_exif_value(exif_data.get("Model")),
        "has_exif": bool(exif_data),
        "camera_settings": exif_summary["formatted"],
    }


@app.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
):
    try:
        # Validate file is an image
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Uploaded file is not an image")

        image_bytes = await file.read()
        image_stream = io.BytesIO(image_bytes)

        with Image.open(image_stream) as image:
            exif_data = extract_exif_data(image)

        exif_summary = get_exif_summary(exif_data)
        # CV and EXIF own the evidence and every numeric score. Gemini only
        # explains those application-computed results in professional language.
        raw_local_analysis = analyze_cv_heuristics(image_bytes, exif_summary=exif_summary)
        raw_local_analysis["intent_profile"] = build_intent_profile(raw_local_analysis)
        score_engine = build_score_engine(raw_local_analysis, exif_summary)
        local_analysis = enforce_authoritative_scores(
            raw_local_analysis,
            raw_local_analysis,
            score_engine,
        )
        local_analysis["mode"] = "computer_vision"
        gemini_context = build_gemini_context(local_analysis, exif_summary, score_engine)
        # Check if Gemini API key is available
        api_key = os.environ.get("GEMINI_API_KEY")
        
        if api_key:
            try:
                # Try real AI analysis
                gemini_analysis = await analyze_gemini(
                    image_bytes=image_bytes,
                    analysis_context=gemini_context,
                    api_key=api_key,
                    mime_type=file.content_type,
                )
                analysis_results = enforce_authoritative_scores(
                    gemini_analysis,
                    local_analysis,
                    score_engine,
                )
                analysis_results["ai_status"] = "success"
            except Exception as e:
                # Log error and fallback
                ai_status = classify_gemini_error(e)
                print(
                    f"Gemini API failed ({ai_status}): {e}. "
                    "Falling back to computer vision..."
                )
                analysis_results = local_analysis
                analysis_results["ai_status"] = ai_status
                analysis_results["fallback_reason"] = str(e)
        else:
            # Fallback directly
            analysis_results = local_analysis
            analysis_results["ai_status"] = "not_configured"
            
        # Add basic info
        analysis_results["filename"] = file.filename
        analysis_results["tutorial_recommendations"] = recommend_tutorials(analysis_results, limit=12)

        return analysis_results

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@app.post("/critique-pdf")
async def download_critique_pdf(
    analysis_json: str = Form(...),
    file: UploadFile | None = File(None),
):
    """Generate a downloadable PDF for a critique already shown in the UI."""
    try:
        analysis_results = json.loads(analysis_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Analysis data is not valid JSON") from exc

    if not isinstance(analysis_results, dict):
        raise HTTPException(status_code=400, detail="Analysis data must be an object")

    image_bytes = None
    if file is not None:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Uploaded file is not an image")
        image_bytes = await file.read()
        if len(image_bytes) > 15 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Uploaded image exceeds 15 MB")

    try:
        pdf_bytes = generate_critique_pdf(analysis_results, image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Could not generate the PDF critique") from exc

    download_name = pdf_download_filename(analysis_results.get("filename"))
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )


@app.get("/tutorials")
def list_tutorials():
    """Return the curated YouTube learning catalog."""
    tutorials = load_tutorial_catalog()
    return {"count": len(tutorials), "tutorials": tutorials}


@app.post("/tutorial-recommendations")
def tutorial_recommendations(analysis: dict, limit: int = 3):
    """Recommend tutorials for an existing photo-analysis payload."""
    try:
        return {
            "learner_path": recommend_tutorials(analysis, limit=limit),
        }
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
