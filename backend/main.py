import os
import uvicorn
import re
import json
import base64
import numpy as np
from PIL import Image
import cv2
import httpx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage


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

def analyze_cv_heuristics(image_bytes: bytes) -> dict:
    """
    Fallback CV Analyzer that uses OpenCV/PIL to analyze the image
    and generate structured response metrics.
    """
    # Load image in OpenCV
    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img_bgr is None:
        raise ValueError("Could not decode image")
        
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h, w, _ = img_bgr.shape
    
    # 1. Brightness
    mean_brightness = float(np.mean(img_gray))
    # Optimal brightness is around 125.
    if mean_brightness < 90:
        brightness_score = int(max(0, (mean_brightness / 90) * 70))
        b_works = "Captures a moody, low-key lighting scheme, keeping the brightest spots detailed."
        b_imp = "The image is underexposed, resulting in dark shadow areas losing critical details. A slight boost in exposure could bring out hidden elements."
        b_edit = "Increase exposure by +0.5 to +1.0 EV."
    elif mean_brightness > 160:
        brightness_score = int(max(0, ((255 - mean_brightness) / 95) * 70))
        b_works = "Generates a bright, airy, high-key feel that conveys a clean, modern aesthetic."
        b_imp = "The image is overexposed, leading to blown-out highlights where details are permanently lost (e.g., in skies or white shirts)."
        b_edit = "Reduce exposure by -0.4 to -0.8 EV and pull down highlights."
    else:
        diff = abs(mean_brightness - 125)
        # Optimal brightness range. We use a stricter baseline of 75 (down from 85).
        brightness_score = int(75 + (25 - (diff / 35) * 25))
        brightness_score = min(100, max(0, brightness_score))
        b_works = "Well-balanced exposure that keeps the image looking natural and captures a full range of tones."
        b_imp = "Exposure is solid, though you could experiment with localized dodge and burn to create more depth."
        b_edit = "Apply minor contrast adjustments to enhance depth."

    # 2. Contrast
    std_contrast = float(np.std(img_gray))
    # Optimal standard deviation is around 50-70.
    if std_contrast < 40:
        contrast_score = int(max(0, (std_contrast / 40) * 70))
        c_works = "Low contrast gives a soft, vintage, or misty atmosphere that works well for dreamy portraits or foggy scenes."
        c_imp = "The image looks a bit flat and lacks punch. Increasing contrast would help separate the subject from the background."
        c_edit = "Increase contrast by +15 or adjust the black point to deepen shadows."
    elif std_contrast > 75:
        contrast_score = int(max(0, (1 - (std_contrast - 75) / 52) * 70))
        c_works = "High contrast creates dramatic impact, bold silhouettes, and strong graphic shapes."
        c_imp = "The contrast is very harsh, which can make transition zones look abrupt and clip the highlights/shadows."
        c_edit = "Decrease contrast by -10, or soften the shadows."
    else:
        diff = abs(std_contrast - 58)
        # Stricter baseline of 75 (down from 85)
        contrast_score = int(75 + (25 - (diff / 18) * 25))
        contrast_score = min(100, max(0, contrast_score))
        c_works = "Excellent tonal separation. The subject pops nicely from the background without losing fine detail in shadows and highlights."
        c_imp = "Contrast is well managed. You can add a vignette to draw more focus to the center."
        c_edit = "Add a subtle post-crop vignette (-5 to -10)."

    # 3. Saturation
    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    h_ch, s_ch, v_ch = cv2.split(img_hsv)
    mean_sat = float(np.mean(s_ch))
    if mean_sat < 40:
        sat_score = int(max(0, (mean_sat / 40) * 70))
        s_works = "A muted, pastel-like, or documentary feel that looks realistic and sophisticated."
        s_imp = "Colors feel a bit lifeless. A slight boost in saturation or vibrance could make the key colors more engaging."
        s_edit = "Increase vibrance by +15 and saturation by +5."
    elif mean_sat > 150:
        sat_score = int(max(0, ((255 - mean_sat) / 105) * 70))
        s_works = "Vibrant and eye-catching palette with high visual energy."
        s_imp = "Colors are oversaturated, which looks artificial and causes color clipping in highly saturated regions."
        s_edit = "Reduce overall saturation by -12 and use vibrance instead."
    else:
        diff = abs(mean_sat - 90)
        # Stricter baseline of 75 (down from 85)
        sat_score = int(75 + (25 - (diff / 60) * 25))
        sat_score = min(100, max(0, sat_score))
        s_works = "Colors are vivid yet realistic, rendering a pleasing and lifelike representation."
        s_imp = "Saturation is well balanced. Consider target-adjusting specific hues to create better color harmony."
        s_edit = "Use HSL adjustments to slightly shift greens toward teal or warm up yellows."

    # 4. Warmth (White Balance heuristic based on R-B difference)
    r_mean = float(np.mean(img_rgb[:, :, 0]))
    b_mean = float(np.mean(img_rgb[:, :, 2]))
    warmth_val = r_mean - b_mean # Positive is warm (reddish), negative is cool (bluish)
    if warmth_val < -15:
        # Stricter baseline of 60 (down from 75)
        warmth_score = int(min(100, max(0, 60 + (30 - abs(warmth_val + 30) / 40 * 30))))
        w_works = "A cool color temperature that emphasizes a clean, clinical, modern, or wintery atmosphere."
        w_imp = "The image has a noticeable blue cast, which can make skin tones look pale and landscapes look cold."
        w_edit = "Increase temperature slider by +8 (warm it up) to restore natural tones."
    elif warmth_val > 25:
        # Stricter baseline of 60 (down from 75)
        warmth_score = int(min(100, max(0, 60 + (30 - abs(warmth_val - 40) / 40 * 30))))
        w_works = "A warm, golden-hour tone that creates feelings of nostalgia, comfort, and intimacy."
        w_imp = "The image is overly warm or has a heavy yellow cast. Neutral white surfaces appear yellow."
        w_edit = "Decrease temperature slider by -5 to -10, or adjust the tint slightly toward green/magenta."
    else:
        # Stricter baseline of 80 (down from 90)
        warmth_score = int(min(100, max(0, 80 + (20 - abs(warmth_val) / 20 * 20))))
        w_works = "Color temperature is technically correct and whites appear clean."
        w_imp = "White balance looks highly accurate. You could creatively shift it warmer/cooler for stylistic effect."
        w_edit = "Add a warm gradient map or golden filter in post-processing for creative effect."

    # 5. Details (Structure & Sharpening based on Laplacian variance)
    laplacian = cv2.Laplacian(img_gray, cv2.CV_64F)
    variance_sharp = float(np.var(laplacian))
    if variance_sharp < 80:
        # Stricter baseline of 60 (down from 75)
        details_score = int(min(60, max(0, (variance_sharp / 80) * 60)))
        d_works = "A soft focus that works well for dreamy portraiture or creative motion blur."
        d_imp = "The image lacks critical sharpness, possibly due to motion blur, missed focus, or lens diffraction. Add structural clarity or sharpening."
        d_edit = "Increase sharpening by +20 and add +10 structure/clarity."
    elif variance_sharp > 500:
        # Stricter cap of 88 (down from 95)
        details_score = 88
        d_works = "Incredibly crisp details, showing fine textures and sharp edges."
        d_imp = "Detail retention is excellent. Ensure sharpening artifacts (halo effects around edges) are not visible."
        d_edit = "Apply a masking slider to sharpening so it only affects high-contrast edges, leaving flat areas smooth."
    else:
        # Stricter range of 70 to 95 (down from 80 to 100)
        details_score = int(min(95, max(0, 70 + (25 * (variance_sharp - 80) / 420))))
        d_works = "Natural and clean detail rendering without harsh artificial sharpening outlines."
        d_imp = "Good sharpness. You could enhance local contrast (micro-contrast) in key areas to draw focus."
        d_edit = "Use a local brush to add +15 clarity to the main subject."

    # 6. Highlights
    high_pixels = float(np.sum(img_gray > 230)) / img_gray.size
    if high_pixels > 0.10:
        # Stricter highlights score calculation
        high_score = int(50 + (35 * (1 - min(1.0, high_pixels * 2))))
        h_works = "Bright highlights create a high-contrast, glowing feel."
        h_imp = "Large areas of highlights are clipped (blown out), losing detail in skies or bright surfaces."
        h_edit = "Pull down highlights slider by -30 to -50."
    else:
        # Stricter default score of 85 (down from 92)
        high_score = 85
        h_works = "Highlights are well controlled, retaining full texture in bright areas (like clouds or snow)."
        h_imp = "Highlights are well within bounds. You could boost them slightly to create specular highlights for metallic or wet surfaces."
        h_edit = "Boost whites by +5 for extra sparkle."

    # 7. Shadows
    shadow_pixels = float(np.sum(img_gray < 25)) / img_gray.size
    if shadow_pixels > 0.15:
        # Stricter shadows score calculation
        shadow_score = int(55 + (30 * (1 - min(1.0, shadow_pixels * 2))))
        sh_works = "Rich, deep blacks create a sense of mystery, weight, and silhouette."
        sh_imp = "Shadow details are crushed, hiding texture in dark clothing, foliage, or nighttime scenes."
        sh_edit = "Lift shadows slider by +20 to +40."
    else:
        # Stricter default score of 86 (down from 94)
        shadow_score = 86
        sh_works = "Excellent shadow detail recovery. Textures are clearly visible in the dark portions of the frame."
        sh_imp = "Shadow depth is good. You can slightly drop the black point to give a cleaner black level if needed."
        sh_edit = "Slightly drop black levels by -3 to add a solid anchor."

    # 8. Ambiance
    # Estimated by standard deviation of midtones (50 to 200)
    midtones = img_gray[(img_gray > 50) & (img_gray < 200)]
    mid_std = float(np.std(midtones)) if midtones.size > 0 else 30
    if mid_std < 30:
        # Stricter low-ambiance score of 60 (down from 70)
        amb_score = 60
        amb_works = "Even, diffuse lighting that creates a flat, predictable atmosphere."
        amb_imp = "Lacks dimensional lighting or ambient glow. Adding localized exposure adjustments can simulate ambient lighting."
        amb_edit = "Use radial filters to simulate light direction or add a soft glow."
    else:
        # Stricter default score of 80 (down from 88)
        amb_score = 80
        amb_works = "Rich light interactions with strong presence of ambient light, giving depth."
        amb_imp = "The ambiance is strong. Watch out for distracting highlights in the background."
        amb_edit = "Keep ambient details high while vignetting slightly."

    # 9. Colour harmony / palette
    # Standard deviation across RGB channels
    r_std = float(np.std(img_rgb[:, :, 0]))
    g_std = float(np.std(img_rgb[:, :, 1]))
    b_std = float(np.std(img_rgb[:, :, 2]))
    channel_diff = abs(r_std - g_std) + abs(g_std - b_std) + abs(b_std - r_std)
    if channel_diff > 40:
        # Stricter palette score of 68 (down from 78)
        col_score = 68
        col_works = "A diverse range of hues that makes the image energetic."
        col_imp = "The color palette is somewhat chaotic. Restricting the color palette to a complementary or triadic harmony will make it more professional."
        col_edit = "Use color grading (split toning) to add teal in shadows and orange in highlights."
    else:
        # Stricter default score of 82 (down from 90)
        col_score = 82
        col_works = "Pleasing and unified color palette that is easy on the eyes."
        col_imp = "Good color harmony. You can shift individual colors to enhance the mood."
        col_edit = "Slightly desaturate non-essential colors to make the main color pop."

    # 10. Crop & Composition
    # Aspect ratios
    ratio = w / h
    aspect_str = f"{w}x{h}"
    if abs(ratio - 1.0) < 0.05:
        crop_score = 78
        crop_works = "Square aspect ratio (1:1) centers focus and works great for symmetrical subjects."
        crop_imp = "Make sure the subject is exactly centered, or use off-center placement with high negative space."
        crop_edit = "Crop slightly to ensure absolute symmetry if centering, or apply rule of thirds."
    elif abs(ratio - 1.5) < 0.05 or abs(ratio - 0.66) < 0.05:
        crop_score = 82
        crop_works = "Classic 3:2 ratio provides a natural canvas common in DSLR photography."
        crop_imp = "The subject is placed near the center, which can feel static. Try shifting the subject to one of the third intersections."
        crop_edit = "Crop 5-10% from the side to position the subject along the vertical third gridline."
    else:
        crop_score = 72
        crop_works = "Wide aspect ratio works well for landscapes, giving a cinematic scope."
        crop_imp = "The horizon is positioned near the center. Placing the horizon on the upper or lower third line makes the landscape more dramatic."
        crop_edit = "Adjust crop to position the horizon line on the lower third grid."
    
    # Calculate overall rating
    scores = [brightness_score, contrast_score, sat_score, warmth_score, details_score, 
              high_score, shadow_score, amb_score, col_score, crop_score]
    overall_rating = round(sum(scores) / len(scores) / 10.0, 1)

    # Compile the final suggestions
    suggested_edits = list(set([b_edit, c_edit, s_edit, w_edit, d_edit, h_edit, sh_edit, amb_edit, col_edit]))[:5]

    return {
        "overall_rating": overall_rating,
        "aspects": {
            "colour": {
                "rating": col_score,
                "what_works": col_works,
                "what_could_be_improved": col_imp
            },
            "details": {
                "rating": details_score,
                "what_works": d_works,
                "what_could_be_improved": d_imp
            },
            "brightness": {
                "rating": brightness_score,
                "what_works": b_works,
                "what_could_be_improved": b_imp
            },
            "contrast": {
                "rating": contrast_score,
                "what_works": c_works,
                "what_could_be_improved": c_imp
            },
            "saturation": {
                "rating": sat_score,
                "what_works": s_works,
                "what_could_be_improved": s_imp
            },
            "ambiance": {
                "rating": amb_score,
                "what_works": amb_works,
                "what_could_be_improved": amb_imp
            },
            "highlights": {
                "rating": high_score,
                "what_works": h_works,
                "what_could_be_improved": h_imp
            },
            "shadows": {
                "rating": shadow_score,
                "what_works": sh_works,
                "what_could_be_improved": sh_imp
            },
            "warmth": {
                "rating": warmth_score,
                "what_works": w_works,
                "what_could_be_improved": w_imp
            },
            "crop": {
                "rating": crop_score,
                "what_works": crop_works,
                "what_could_be_improved": crop_imp
            }
        },
        "suggested_edits": suggested_edits,
        "mode": "computer_vision"
    }

async def analyze_gemini(image_bytes: bytes, api_key: str) -> dict:
    """
    Call Gemini API to perform multi-modal analysis on the image.
    """
    # Encode image in base64
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    prompt = """
    You are a professional photography critic and editor. You must evaluate the photo critically and strictly.
    Please note that most photos are submitted by amateur or semi-professional photographers, so do not hesitate to give low ratings. Be extremely honest and do not inflate scores.
    Use the following scale for individual aspect ratings (0 to 100):
    - 90 to 100: Exceptional, professional gallery-grade, virtually flawless. Use this very sparingly.
    - 80 to 89: Very good, above average, minimal flaws.
    - 70 to 79: Good/average consumer photo, has clear areas for improvement.
    - 50 to 69: Mediocre with noticeable issues (e.g. slight blur, poor white balance, minor highlights clipping).
    - Below 50: Poor/unusable, severe technical or composition flaws.

    You must evaluate all 10 aspects: colour, details, brightness, contrast, saturation, ambiance, highlights, shadows, warmth, crop.
    
    CRITICAL: The "overall_rating" (scale of 1.0 to 10.0) MUST be calculated mathematically as:
    overall_rating = (sum of all 10 aspect ratings / 10.0) / 10.0, rounded to 1 decimal place (which is the sum of aspect ratings divided by 100.0). E.g., if the average of aspect scores is 72.4, the overall_rating must be exactly 7.2.

    Return a JSON object with the following structure:
    {
      "overall_rating": 7.2,
      "aspects": {
        "colour": {
          "rating": 75,  // scale 0 to 100
          "what_works": "The warm tones harmonise decently...",
          "what_could_be_improved": "The blues in the background are slightly oversaturated..."
        },
        "details": {
          "rating": 70,
          "what_works": "Decent sharpness on the eyes of the subject...",
          "what_could_be_improved": "Some noise is visible in the dark background..."
        },
        "brightness": {
          "rating": 72,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "contrast": {
          "rating": 70,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "saturation": {
          "rating": 78,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "ambiance": {
          "rating": 68,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "highlights": {
          "rating": 72,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "shadows": {
          "rating": 70,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "warmth": {
          "rating": 75,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "crop": {
          "rating": 71,
          "what_works": "The rule of thirds is applied decently...",
          "what_could_be_improved": "The subject is cropped a bit too tightly..."
        }
      },
      "suggested_edits": [
        "Increase exposure by +0.3 EV",
        "Crop 5% from the right to balance the negative space",
        "Shift temperature toward cooler tones (-200K) to fix the yellow cast"
      ]
    }

    Please evaluate all these aspects. Ensure the response is valid JSON and strictly adheres to this structure. Do not output anything else than the JSON.
    """
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": "image/jpeg",
                            "data": base64_image
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=30.0)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Gemini API error: {response.text}"
            )
            
        result = response.json()
        
        try:
            # Extract text candidate
            text_response = result["candidates"][0]["content"]["parts"][0]["text"]
            
            # Clean text if it has markdown formatting
            text_response = text_response.strip()
            if text_response.startswith("```"):
                # strip out ```json and ```
                text_response = re.sub(r"^```(?:json)?\n", "", text_response)
                text_response = re.sub(r"\n```$", "", text_response)
                text_response = text_response.strip()
                
            analysis_data = json.loads(text_response)
            analysis_data["mode"] = "gemini_ai"
            return analysis_data
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            raise ValueError(f"Failed to parse Gemini response: {str(e)}. Raw response: {response.text}")

def generate_email_content(email_to: str, analysis_results: dict, image_bytes: bytes = None, is_simulation: bool = False) -> tuple[str, str]:
    """
    Generates plain-text and HTML versions of the photography critique report.
    """
    filename = analysis_results.get("filename", "photograph")
    overall_rating = analysis_results.get("overall_rating", 0.0)
    mode = analysis_results.get("mode", "unknown")
    mode_str = "Gemini AI Engine" if mode == "gemini_ai" else "Computer Vision"
    suggested_edits = analysis_results.get("suggested_edits", [])
    aspects = analysis_results.get("aspects", {})

    # Create plain-text version
    text_lines = [
        f"FocalPointAI Photo Critique & Quality Report",
        f"============================================",
        f"File: {filename}",
        f"Overall Rating: {overall_rating} / 10",
        f"Engine: {mode_str}",
        f"Target Workspace: {email_to}",
        "",
        "Suggested Edits:",
        "----------------"
    ]
    for edit in suggested_edits:
        text_lines.append(f"- {edit}")
    
    text_lines.extend(["", "Aspect Breakdowns:", "------------------"])
    for key, data in aspects.items():
        text_lines.extend([
            f"Aspect: {key.capitalize()}",
            f"  Score: {data.get('rating')}/100",
            f"  What Works: {data.get('what_works')}",
            f"  What Could Be Improved: {data.get('what_could_be_improved')}",
            ""
        ])
    
    text_content = "\n".join(text_lines)

    # Construct embedded image HTML showcase
    image_html = ""
    if image_bytes:
        if is_simulation:
            # For local simulation preview, use inline base64
            img_b64 = base64.b64encode(image_bytes).decode("utf-8")
            image_src = f"data:image/jpeg;base64,{img_b64}"
        else:
            # For real emails, use standard CID reference
            image_src = "cid:analyzed_image"
            
        image_html = f"""
        <!-- Embedded Image showcase -->
        <div style="margin: 15px auto 0 auto; max-width: 400px; border-radius: 8px; overflow: hidden; border: 1px solid #1E293B; background-color: #000; padding: 4px; text-align: center;">
            <img src="{image_src}" alt="Analyzed Photograph" style="max-width: 100%; max-height: 300px; height: auto; object-fit: contain; display: block; margin: 0 auto; border-radius: 6px;" />
        </div>
        """

    # Create HTML version with clean modern design
    aspects_html = ""
    for key, data in aspects.items():
        rating = data.get("rating", 0)
        # Determine score colors
        if rating >= 80:
            color = "#10B981"  # Emerald
        elif rating >= 70:
            color = "#6366F1"  # Indigo
        elif rating >= 50:
            color = "#F59E0B"  # Amber
        else:
            color = "#EF4444"  # Red

        aspects_html += f"""
        <div style="margin-bottom: 20px; padding: 18px; background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-left: 4px solid {color}; border-radius: 8px;">
            <div style="margin-bottom: 10px; font-weight: bold; font-size: 16px; color: #FFFFFF;">
                <span style="text-transform: capitalize; float: left;">{key}</span>
                <span style="float: right; color: {color}; font-weight: 800; font-size: 16px;">{rating}<span style="font-size: 12px; color: #8F9CAE; font-weight: normal;"> / 100</span></span>
                <div style="clear: both;"></div>
            </div>
            <div style="margin-bottom: 8px; text-align: left;">
                <strong style="color: #10B981; font-size: 13px; display: block; margin-bottom: 2px;">What Works</strong>
                <p style="margin: 0; color: #BAC4D1; font-size: 13px; line-height: 1.4;">{data.get('what_works', '')}</p>
            </div>
            <div style="text-align: left;">
                <strong style="color: #F59E0B; font-size: 13px; display: block; margin-bottom: 2px;">What Could Be Done Better</strong>
                <p style="margin: 0; color: #BAC4D1; font-size: 13px; line-height: 1.4;">{data.get('what_could_be_improved', '')}</p>
            </div>
        </div>
        """

    edits_html = ""
    for edit in suggested_edits:
        edits_html += f"""
        <li style="margin-bottom: 8px; color: #BAC4D1; font-size: 14px; line-height: 1.4; text-align: left;">
            <span style="color: #8B5CF6; margin-right: 8px;">✔</span> {edit}
        </li>
        """
    if not edits_html:
        edits_html = "<p style='color: #8F9CAE; font-size: 14px;'>No specific edits suggested.</p>"

    # Determine overall color
    overall_score = overall_rating * 10
    if overall_score >= 80:
        overall_color = "#10B981"
    elif overall_score >= 70:
        overall_color = "#6366F1"
    elif overall_score >= 50:
        overall_color = "#F59E0B"
    else:
        overall_color = "#EF4444"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>FocalPointAI - Photo Critique</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0A0E1A; color: #BAC4D1;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #0E1326; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
        <!-- Header Banner -->
        <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%); border-bottom: 1px solid #1E293B; text-align: center;">
                <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 800; letter-spacing: 1px;">FocalPoint<span style="color: #6366F1;">AI</span></h1>
                <p style="margin: 5px 0 0 0; color: #8F9CAE; font-size: 14px;">Constructive Photography Critique Engine</p>
            </td>
        </tr>
        <!-- Overall Score Section -->
        <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: rgba(99, 102, 241, 0.02);">
                <p style="color: #8F9CAE; font-size: 12px; text-transform: uppercase; font-weight: bold; letter-spacing: 1.5px; margin: 0 0 10px 0;">Critique Summary</p>
                <div style="margin: 0 auto 15px auto; border: 4px solid {overall_color}; border-radius: 50%; width: 100px; height: 100px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: {overall_color}; line-height: 100px;">{overall_rating}</div>
                </div>
                <p style="margin: 15px 0 5px 0; font-size: 16px; font-weight: bold; color: #FFFFFF;">File: {filename}</p>
                <p style="margin: 0 0 15px 0; font-size: 13px; color: #8F9CAE;">Analyzed via {mode_str}</p>
                {image_html}
            </td>
        </tr>
        <!-- Suggested Edits -->
        <tr>
            <td style="padding: 20px 40px 10px 40px; border-top: 1px solid #1E293B;">
                <h3 style="color: #FFFFFF; font-size: 18px; margin-top: 0; margin-bottom: 15px; text-align: left;">
                    <span style="color: #8B5CF6; margin-right: 10px; font-size: 20px;">⚙</span> Suggested Edits
                </h3>
                <ul style="margin: 0; padding-left: 0; list-style-type: none;">
                    {edits_html}
                </ul>
            </td>
        </tr>
        <!-- Aspect Breakdowns -->
        <tr>
            <td style="padding: 20px 40px 40px 40px;">
                <h3 style="color: #FFFFFF; font-size: 18px; margin-top: 0; margin-bottom: 20px; text-align: left;">
                    <span style="color: #6366F1; margin-right: 10px; font-size: 20px;">📊</span> Aspect Quality Metrics
                </h3>
                <div>
                    {aspects_html}
                </div>
            </td>
        </tr>
        <!-- Footer -->
        <tr>
            <td style="padding: 20px 40px; background-color: #0B0F19; border-top: 1px solid #1E293B; text-align: center; font-size: 11px; color: #64748B;">
                <p style="margin: 0 0 5px 0;">This email was sent to associate your photography workspace at {email_to}.</p>
                <p style="margin: 0;">© 2026 FocalPointAI. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    return text_content, html_content

def send_report_email_async(
    email_to: str,
    analysis_results: dict,
    image_bytes: bytes,
    filename: str
):
    """
    Sends the photo critique report to the specified email address.
    If SMTP is not fully configured, it falls back to writing the HTML
    content to a local simulation file.
    """
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = os.environ.get("SMTP_PORT")
    smtp_username = os.environ.get("SMTP_USERNAME")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    smtp_sender = os.environ.get("SMTP_SENDER")

    # Auto-detect Gmail settings if not explicitly configured
    if not smtp_host and smtp_username and smtp_username.endswith("@gmail.com"):
        smtp_host = "smtp.gmail.com"
        if not smtp_port:
            smtp_port = "587"

    if not smtp_sender:
        smtp_sender = smtp_username or "FocalPointAI <no-reply@focalpoint.ai>"

    # Check if SMTP is configured.
    if not smtp_host or not smtp_username or not smtp_password:
        print("SMTP credentials not fully configured. Writing email to simulation file...")
        _, html_content = generate_email_content(email_to, analysis_results, image_bytes, is_simulation=True)
        simulation_path = os.path.join(os.path.dirname(__file__), "email_simulation.html")
        try:
            with open(simulation_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"Simulated email written to: {simulation_path}")
        except Exception as err:
            print(f"Failed to write simulation email: {err}")
        return

    # Generate standard email content with CID image reference
    subject = f"[FocalPointAI] Photo Critique & Quality Report - {filename}"
    text_content, html_content =    generate_email_content(email_to, analysis_results, image_bytes, is_simulation=False)

    try:
        port = int(smtp_port) if smtp_port else 587
        
        # Root mixed message to support attachments
        msg_root = MIMEMultipart('mixed')
        msg_root['Subject'] = subject
        msg_root['From'] = smtp_sender
        msg_root['To'] = email_to

        # Related container for HTML body + inline image
        msg_related = MIMEMultipart('related')
        
        # Alternative container for plain text and HTML text
        msg_alternative = MIMEMultipart('alternative')
        part_text = MIMEText(text_content, 'plain', 'utf-8')
        part_html = MIMEText(html_content, 'html', 'utf-8')
        msg_alternative.attach(part_text)
        msg_alternative.attach(part_html)
        
        msg_related.attach(msg_alternative)

        # Attach image as INLINE content inside the related section
        if image_bytes:
            ext = os.path.splitext(filename)[1].lower().strip('.')
            subtype = ext if ext in ['jpeg', 'jpg', 'png', 'gif'] else 'jpeg'
            if subtype == 'jpg':
                subtype = 'jpeg'
                
            img_inline = MIMEImage(image_bytes, _subtype=subtype)
            img_inline.add_header('Content-ID', '<analyzed_image>')
            img_inline.add_header('Content-Disposition', 'inline', filename=filename)
            msg_related.attach(img_inline)

        # Attach related part to root mixed container
        msg_root.attach(msg_related)

        # Also attach the image file as a downloadable attachment
        if image_bytes:
            img_file = MIMEApplication(image_bytes)
            img_file.add_header('Content-Disposition', 'attachment', filename=filename)
            msg_root.attach(img_file)

        server = smtplib.SMTP(smtp_host, port, timeout=15)
        server.ehlo()
        
        if port == 465:
            server.close()
            server = smtplib.SMTP_SSL(smtp_host, port, timeout=15)
        else:
            if server.has_extn('STARTTLS'):
                server.starttls()
                server.ehlo()
                
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_sender, [email_to], msg_root.as_string())
        server.quit()
        print(f"Email successfully sent to {email_to} via SMTP (with inline and attached image).")
    except Exception as e:
        print(f"SMTP error while sending email to {email_to}: {str(e)}")
        # Generate simulation as fallback
        _, html_content = generate_email_content(email_to, analysis_results, image_bytes, is_simulation=True)
        simulation_path = os.path.join(os.path.dirname(__file__), "email_simulation.html")
        try:
            with open(simulation_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"SMTP failed, fell back to writing email to simulation file: {simulation_path}")
        except Exception as err:
            print(f"Failed to write simulation email: {err}")



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
        
        # Check if Gemini API key is available
        api_key = os.environ.get("GEMINI_API_KEY")
        
        if api_key:
            try:
                # Try real AI analysis
                analysis_results = await analyze_gemini(image_bytes, api_key)
            except Exception as e:
                # Log error and fallback
                print(f"Gemini API failed: {e}. Falling back to computer vision...")
                analysis_results = analyze_cv_heuristics(image_bytes)
                analysis_results["fallback_reason"] = str(e)
        else:
            # Fallback directly
            analysis_results = analyze_cv_heuristics(image_bytes)
            
        # Determine email sending status
        smtp_host = os.environ.get("SMTP_HOST")
        smtp_username = os.environ.get("SMTP_USERNAME")
        smtp_password = os.environ.get("SMTP_PASSWORD")
        
        # Auto-detect Gmail settings for status determination
        if not smtp_host and smtp_username and smtp_username.endswith("@gmail.com"):
            smtp_host = "smtp.gmail.com"
            
        if smtp_host and smtp_username and smtp_password:
            email_status = "sent"
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
