import os
import re
import json
import base64
import numpy as np
from PIL import Image
import cv2
import httpx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

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
    if mean_brightness < 80:
        brightness_score = int(max(0, (mean_brightness / 80) * 75))
        b_works = "Captures a moody, low-key lighting scheme, keeping the brightest spots detailed."
        b_imp = "The image is underexposed, resulting in dark shadow areas losing critical details. A slight boost in exposure could bring out hidden elements."
        b_edit = "Increase exposure by +0.5 to +1.0 EV."
    elif mean_brightness > 170:
        brightness_score = int(max(0, ((255 - mean_brightness) / 85) * 75))
        b_works = "Generates a bright, airy, high-key feel that conveys a clean, modern aesthetic."
        b_imp = "The image is overexposed, leading to blown-out highlights where details are permanently lost (e.g., in skies or white shirts)."
        b_edit = "Reduce exposure by -0.4 to -0.8 EV and pull down highlights."
    else:
        diff = abs(mean_brightness - 125)
        brightness_score = int(85 + (15 - (diff / 45) * 15))
        brightness_score = min(100, max(0, brightness_score))
        b_works = "Well-balanced exposure that keeps the image looking natural and captures a full range of tones."
        b_imp = "Exposure is solid, though you could experiment with localized dodge and burn to create more depth."
        b_edit = "Apply minor contrast adjustments to enhance depth."

    # 2. Contrast
    std_contrast = float(np.std(img_gray))
    # Optimal standard deviation is around 50-70.
    if std_contrast < 40:
        contrast_score = int(max(0, (std_contrast / 40) * 80))
        c_works = "Low contrast gives a soft, vintage, or misty atmosphere that works well for dreamy portraits or foggy scenes."
        c_imp = "The image looks a bit flat and lacks punch. Increasing contrast would help separate the subject from the background."
        c_edit = "Increase contrast by +15 or adjust the black point to deepen shadows."
    elif std_contrast > 75:
        contrast_score = int(max(0, (1 - (std_contrast - 75) / 52) * 80))
        c_works = "High contrast creates dramatic impact, bold silhouettes, and strong graphic shapes."
        c_imp = "The contrast is very harsh, which can make transition zones look abrupt and clip the highlights/shadows."
        c_edit = "Decrease contrast by -10, or soften the shadows."
    else:
        diff = abs(std_contrast - 58)
        contrast_score = int(85 + (15 - (diff / 18) * 15))
        contrast_score = min(100, max(0, contrast_score))
        c_works = "Excellent tonal separation. The subject pops nicely from the background without losing fine detail in shadows and highlights."
        c_imp = "Contrast is well managed. You can add a vignette to draw more focus to the center."
        c_edit = "Add a subtle post-crop vignette (-5 to -10)."

    # 3. Saturation
    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    h_ch, s_ch, v_ch = cv2.split(img_hsv)
    mean_sat = float(np.mean(s_ch))
    if mean_sat < 40:
        sat_score = int(max(0, (mean_sat / 40) * 82))
        s_works = "A muted, pastel-like, or documentary feel that looks realistic and sophisticated."
        s_imp = "Colors feel a bit lifeless. A slight boost in saturation or vibrance could make the key colors more engaging."
        s_edit = "Increase vibrance by +15 and saturation by +5."
    elif mean_sat > 150:
        sat_score = int(max(0, ((255 - mean_sat) / 105) * 80))
        s_works = "Vibrant and eye-catching palette with high visual energy."
        s_imp = "Colors are oversaturated, which looks artificial and causes color clipping in highly saturated regions."
        s_edit = "Reduce overall saturation by -12 and use vibrance instead."
    else:
        diff = abs(mean_sat - 90)
        sat_score = int(85 + (15 - (diff / 60) * 15))
        sat_score = min(100, max(0, sat_score))
        s_works = "Colors are vivid yet realistic, rendering a pleasing and lifelike representation."
        s_imp = "Saturation is well balanced. Consider target-adjusting specific hues to create better color harmony."
        s_edit = "Use HSL adjustments to slightly shift greens toward teal or warm up yellows."

    # 4. Warmth (White Balance heuristic based on R-B difference)
    r_mean = float(np.mean(img_rgb[:, :, 0]))
    b_mean = float(np.mean(img_rgb[:, :, 2]))
    warmth_val = r_mean - b_mean # Positive is warm (reddish), negative is cool (bluish)
    if warmth_val < -15:
        warmth_score = int(min(100, max(0, 75 + (25 - abs(warmth_val + 30) / 40 * 25))))
        w_works = "A cool color temperature that emphasizes a clean, clinical, modern, or wintery atmosphere."
        w_imp = "The image has a noticeable blue cast, which can make skin tones look pale and landscapes look cold."
        w_edit = "Increase temperature slider by +8 (warm it up) to restore natural tones."
    elif warmth_val > 25:
        warmth_score = int(min(100, max(0, 75 + (25 - abs(warmth_val - 40) / 40 * 25))))
        w_works = "A warm, golden-hour tone that creates feelings of nostalgia, comfort, and intimacy."
        w_imp = "The image is overly warm or has a heavy yellow cast. Neutral white surfaces appear yellow."
        w_edit = "Decrease temperature slider by -5 to -10, or adjust the tint slightly toward green/magenta."
    else:
        warmth_score = int(min(100, max(0, 90 + (10 - abs(warmth_val) / 20 * 10))))
        w_works = "Color temperature is technically correct and whites appear clean."
        w_imp = "White balance looks highly accurate. You could creatively shift it warmer/cooler for stylistic effect."
        w_edit = "Add a warm gradient map or golden filter in post-processing for creative effect."

    # 5. Details (Structure & Sharpening based on Laplacian variance)
    laplacian = cv2.Laplacian(img_gray, cv2.CV_64F)
    variance_sharp = float(np.var(laplacian))
    if variance_sharp < 80:
        details_score = int(min(75, max(0, (variance_sharp / 80) * 75)))
        d_works = "A soft focus that works well for dreamy portraiture or creative motion blur."
        d_imp = "The image lacks critical sharpness, possibly due to motion blur, missed focus, or lens diffraction. Add structural clarity or sharpening."
        d_edit = "Increase sharpening by +20 and add +10 structure/clarity."
    elif variance_sharp > 500:
        details_score = 95
        d_works = "Incredibly crisp details, showing fine textures and sharp edges."
        d_imp = "Detail retention is excellent. Ensure sharpening artifacts (halo effects around edges) are not visible."
        d_edit = "Apply a masking slider to sharpening so it only affects high-contrast edges, leaving flat areas smooth."
    else:
        details_score = int(min(100, max(0, 80 + (20 * (variance_sharp - 80) / 420))))
        d_works = "Natural and clean detail rendering without harsh artificial sharpening outlines."
        d_imp = "Good sharpness. You could enhance local contrast (micro-contrast) in key areas to draw focus."
        d_edit = "Use a local brush to add +15 clarity to the main subject."

    # 6. Highlights
    high_pixels = float(np.sum(img_gray > 230)) / img_gray.size
    if high_pixels > 0.15:
        high_score = int(60 + (40 * (1 - min(1.0, high_pixels * 2))))
        h_works = "Bright highlights create a high-contrast, glowing feel."
        h_imp = "Large areas of highlights are clipped (blown out), losing detail in skies or bright surfaces."
        h_edit = "Pull down highlights slider by -30 to -50."
    else:
        high_score = 92
        h_works = "Highlights are well controlled, retaining full texture in bright areas (like clouds or snow)."
        h_imp = "Highlights are well within bounds. You could boost them slightly to create specular highlights for metallic or wet surfaces."
        h_edit = "Boost whites by +5 for extra sparkle."

    # 7. Shadows
    shadow_pixels = float(np.sum(img_gray < 25)) / img_gray.size
    if shadow_pixels > 0.20:
        shadow_score = int(65 + (35 * (1 - min(1.0, shadow_pixels * 2))))
        sh_works = "Rich, deep blacks create a sense of mystery, weight, and silhouette."
        sh_imp = "Shadow details are crushed, hiding texture in dark clothing, foliage, or nighttime scenes."
        sh_edit = "Lift shadows slider by +20 to +40."
    else:
        shadow_score = 94
        sh_works = "Excellent shadow detail recovery. Textures are clearly visible in the dark portions of the frame."
        sh_imp = "Shadow depth is good. You can slightly drop the black point to give a cleaner black level if needed."
        sh_edit = "Slightly drop black levels by -3 to add a solid anchor."

    # 8. Ambiance
    # Estimated by standard deviation of midtones (50 to 200)
    midtones = img_gray[(img_gray > 50) & (img_gray < 200)]
    mid_std = float(np.std(midtones)) if midtones.size > 0 else 30
    if mid_std < 25:
        amb_score = 70
        amb_works = "Even, diffuse lighting that creates a flat, predictable atmosphere."
        amb_imp = "Lacks dimensional lighting or ambient glow. Adding localized exposure adjustments can simulate ambient lighting."
        amb_edit = "Use radial filters to simulate light direction or add a soft glow."
    else:
        amb_score = 88
        amb_works = "Rich light interactions with strong presence of ambient light, giving depth."
        amb_imp = "The ambiance is strong. Watch out for distracting highlights in the background."
        amb_edit = "Keep ambient details high while vignetting slightly."

    # 9. Colour harmony / palette
    # Standard deviation across RGB channels
    r_std = float(np.std(img_rgb[:, :, 0]))
    g_std = float(np.std(img_rgb[:, :, 1]))
    b_std = float(np.std(img_rgb[:, :, 2]))
    channel_diff = abs(r_std - g_std) + abs(g_std - b_std) + abs(b_std - r_std)
    if channel_diff > 45:
        col_score = 78
        col_works = "A diverse range of hues that makes the image energetic."
        col_imp = "The color palette is somewhat chaotic. Restricting the color palette to a complementary or triadic harmony will make it more professional."
        col_edit = "Use color grading (split toning) to add teal in shadows and orange in highlights."
    else:
        col_score = 90
        col_works = "Pleasing and unified color palette that is easy on the eyes."
        col_imp = "Good color harmony. You can shift individual colors to enhance the mood."
        col_edit = "Slightly desaturate non-essential colors to make the main color pop."

    # 10. Crop & Composition
    # Aspect ratios
    ratio = w / h
    aspect_str = f"{w}x{h}"
    if abs(ratio - 1.0) < 0.05:
        crop_works = "Square aspect ratio (1:1) centers focus and works great for symmetrical subjects."
        crop_imp = "Make sure the subject is exactly centered, or use off-center placement with high negative space."
        crop_edit = "Crop slightly to ensure absolute symmetry if centering, or apply rule of thirds."
    elif abs(ratio - 1.5) < 0.05 or abs(ratio - 0.66) < 0.05:
        crop_works = "Classic 3:2 ratio provides a natural canvas common in DSLR photography."
        crop_imp = "The subject is placed near the center, which can feel static. Try shifting the subject to one of the third intersections."
        crop_edit = "Crop 5-10% from the side to position the subject along the vertical third gridline."
    else:
        crop_works = "Wide aspect ratio works well for landscapes, giving a cinematic scope."
        crop_imp = "The horizon is positioned near the center. Placing the horizon on the upper or lower third line makes the landscape more dramatic."
        crop_edit = "Adjust crop to position the horizon line on the lower third grid."

    crop_score = 82
    
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
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    prompt = """
    You are a professional photography critic and editor. Analyze this photo and return a JSON object with the following structure:
    {
      "overall_rating": 8.5,  // scale of 1.0 to 10.0
      "aspects": {
        "colour": {
          "rating": 85,  // scale 0 to 100
          "what_works": "The warm tones harmonise beautifully...",
          "what_could_be_improved": "The blues in the background are slightly oversaturated..."
        },
        "details": {
          "rating": 90,
          "what_works": "Excellent sharpness on the eyes of the subject...",
          "what_could_be_improved": "Some noise is visible in the dark background..."
        },
        "brightness": {
          "rating": 80,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "contrast": {
          "rating": 80,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "saturation": {
          "rating": 80,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "ambiance": {
          "rating": 80,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "highlights": {
          "rating": 80,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "shadows": {
          "rating": 80,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "warmth": {
          "rating": 80,
          "what_works": "...",
          "what_could_be_improved": "..."
        },
        "crop": {
          "rating": 75,
          "what_works": "The rule of thirds is applied well...",
          "what_could_be_improved": "The subject is cropped too tightly..."
        }
      },
      "suggested_edits": [
        "Increase exposure by +0.3 EV",
        "Crop 5% from the right to balance the negative space",
        "Shift temperature toward cooler tones (-200K) to fix the yellow cast"
      ]
    }

    Please evaluate all these aspects: colour, details (structure and sharpening), brightness, contrast, saturation, ambiance, highlights, shadows, warmth, crop (subject placement, leading lines, composition). Ensure the response is valid JSON and strictly adheres to this structure. Do not output anything else than the JSON.
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

@app.get("/")
def read_root():
    return {"status": "ok", "app": "FocalPointAI Backend"}

@app.post("/analyze")
async def analyze_image(
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
            
        # Add basic info
        analysis_results["email"] = email
        analysis_results["filename"] = file.filename
        
        return analysis_results
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
