import base64
import html
import io
import os

import uvicorn

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from PIL.TiffImagePlugin import IFDRational

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv



from local_cv_engine import *
from gemini_analysis import *
from emailing_engine import *
from score_engine import build_gemini_context, build_score_engine, enforce_authoritative_scores

# Load environment variables
load_dotenv()

app = FastAPI(title="FocalPointAI Backend")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://focalpointai.vercel.app"],  # In production, specify the actual frontend bc URL
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

def get_exif_summary(exif_data: dict) -> dict:
    # Helper to resolve IFDRational/bytes
    def clean_val(val):
        if isinstance(val, IFDRational):
            return float(val) if val.denominator != 0 else 0.0
        if isinstance(val, bytes):
            return val.decode('utf-8', errors='ignore')
        return val

    exposure_time = clean_val(exif_data.get('ExposureTime'))
    f_number = clean_val(exif_data.get('FNumber'))
    iso = clean_val(exif_data.get('ISOSpeedRatings'))
    focal_length = clean_val(exif_data.get('FocalLength'))
    camera = clean_val(exif_data.get('Model') or exif_data.get('Make'))
    lens = clean_val(exif_data.get('LensModel'))

    if isinstance(iso, (list, tuple)) and len(iso) > 0:
        iso = iso[0]

    shutter_speed_str = format_shutter_speed(exposure_time)
    aperture_str = f"f/{f_number}" if f_number else None
    iso_str = f"ISO {iso}" if iso else None
    focal_length_str = f"{round(focal_length)}mm" if focal_length else None

    # Construct human readable text for Gemini
    lines = []
    for k, v in exif_data.items():
        cleaned = clean_val(v)
        if cleaned is not None:
            lines.append(f"{k}: {cleaned}")
    exif_text = "\n".join(lines)

    return {
        "raw": {
            "exposure_time": exposure_time,
            "f_number": f_number,
            "iso": iso,
            "focal_length": focal_length,
            "camera": camera,
            "lens": lens
        },
        "formatted": {
            "shutter_speed": shutter_speed_str,
            "aperture": aperture_str,
            "iso": iso_str,
            "focal_length": focal_length_str,
            "camera": str(camera) if camera else None,
            "lens": str(lens) if lens else None
        },
        "text": exif_text
    }

@app.get("/")
def read_root():
    return {"status": "ok", "app": "FocalPointAI Backend"}

@app.post("/analyze")
async def analyze_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    email: str = Form(...)
):
    try:
        # Validate file is an image
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Uploaded file is not an image")

        image_bytes = await file.read()
        image_stream = io.BytesIO(image_bytes)

        with Image.open(image_stream) as image:
            exif_data = extract_exif_data(image)

        exif_summary = get_exif_summary(exif_data)
        # CV and EXIF own the evidence and every numeric score. Gemini only
        # explains those application-computed results in professional language.
        raw_local_analysis = analyze_cv_heuristics(image_bytes, exif_summary=exif_summary)
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
            
        # Determine email sending status
        smtp_host = os.environ.get("SMTP_HOST")
        smtp_username = os.environ.get("SMTP_USERNAME")
        smtp_password = os.environ.get("SMTP_PASSWORD")
        
        # Auto-detect Gmail settings for status determination
        if not smtp_host and smtp_username and smtp_username.endswith("@gmail.com"):
            smtp_host = "smtp.gmail.com"
            
        if smtp_host and smtp_username and smtp_password:
            # The response returns before the background SMTP task runs, so
            # "queued" is accurate here; success/failure is recorded in logs.
            email_status = "queued"
        else:
            email_status = "simulated"
            
        # Add basic info
        analysis_results["email"] = email
        analysis_results["filename"] = file.filename
        analysis_results["email_status"] = email_status
        
        # Trigger background email sending
        background_tasks.add_task(
            send_report_email_async,
            email,
            analysis_results.copy(),  # Send a copy to avoid mutation issues in threads
            image_bytes,
            file.filename
        )
        
        return analysis_results

        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
