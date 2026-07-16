import io
import os
import uvicorn
import cv2
import numpy as np

import base64
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from PIL.TiffImagePlugin import IFDRational

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage

from cv_fallback import *
from gemini_request import *

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



def generate_email_content(email_to: str, analysis_results: dict, image_bytes: bytes = None, is_simulation: bool = False) -> tuple[str, str]:
    """
    Generates plain-text and HTML versions of the photography critique report.
    """
    filename = analysis_results.get("filename", "photograph")
    overall_rating = analysis_results.get("overall_rating", 0.0)
    mode = analysis_results.get("mode", "unknown")
    mode_str = "Gemini AI Engine" if mode == "gemini_ai" else "Computer Vision"
    suggested_edits = analysis_results.get("suggested_edits", [])
    # Helper: extract plain text regardless of whether edits are flat strings or {key, text} dicts
    def edit_text(e): return e["text"] if isinstance(e, dict) else e
    aspects = analysis_results.get("aspects", {})
    exif_analysis = analysis_results.get("exif_analysis")

    # Create plain-text version
    text_lines = [
        f"FocalPointAI Photo Critique & Quality Report",
        f"============================================",
        f"File: {filename}",
        f"Overall Rating: {overall_rating} / 10",
        f"Engine: {mode_str}",
        f"Target Workspace: {email_to}",
        "",
        "First Impression:",
        "-----------------",
        analysis_results.get("first_impression", "N/A"),
        "",
        "Suggested Edits:",
        "----------------"
    ]
    for edit in suggested_edits:
        text_lines.append(f"- {edit_text(edit)}")

    if exif_analysis:
        settings = exif_analysis.get("camera_settings", {})
        diag = exif_analysis.get("diagnostics", {})
        text_lines.extend([
            "",
            "Camera Settings (EXIF):",
            "-----------------------",
            f"  Shutter Speed: {settings.get('shutter_speed') or 'N/A'}",
            f"  Aperture: {settings.get('aperture') or 'N/A'}",
            f"  ISO: {settings.get('iso') or 'N/A'}",
            f"  Focal Length: {settings.get('focal_length') or 'N/A'}",
            f"  Camera Model: {settings.get('camera') or 'N/A'}",
            f"  Lens Model: {settings.get('lens') or 'N/A'}",
            "",
            "Settings Audit Diagnostics:",
            f"  Status: {diag.get('status', 'N/A').upper()}",
            f"  Issue: {diag.get('issue') or 'N/A'}",
            f"  Suggestion: {diag.get('suggestion') or 'N/A'}"
        ])
    
    # Map the raw aspects to the 6 major parameters
    advanced_cv = analysis_results.get("advanced_cv")

    def get_aspect_data(key):
        if "." in key:
            parts = key.split(".")
            if parts[0] in aspects and parts[1] in aspects[parts[0]]:
                return aspects[parts[0]][parts[1]]
        elif key in aspects:
            return aspects[key]
        return None

    # 1. Composition
    comp_sub = []
    data_comp = get_aspect_data("composition")
    if data_comp: comp_sub.append({"key": "composition", "label": "Composition Rules", **data_comp})
    data_crop = get_aspect_data("crop")
    if data_crop: comp_sub.append({"key": "crop", "label": "Grid & Crop", **data_crop})
    data_angle = get_aspect_data("feel.angle_and_viewpoint")
    if data_angle: comp_sub.append({"key": "angle_and_viewpoint", "label": "Angle & Viewpoint", **data_angle})
    if advanced_cv and advanced_cv.get("horizon"):
        cv_h = advanced_cv.get("horizon")
        comp_sub.append({
            "key": "horizon", "label": "Horizon Alignment",
            "rating": 95 if cv_h.get("is_level") else max(40, round(90 - abs(cv_h.get("angle") or 0.0) * 5)),
            "what_works": "Horizon is perfectly level." if cv_h.get("is_level") else f"Horizon is aligned at {cv_h.get('angle') or 0.0} degrees.",
            "what_could_be_improved": "No alignment adjustment needed." if cv_h.get("is_level") else "Rotate the image slightly to level the horizon line."
        })
    if advanced_cv and advanced_cv.get("subject_centering"):
        cv_c = advanced_cv.get("subject_centering")
        dist = cv_c.get("thirds_distance", 0.5)
        comp_sub.append({
            "key": "thirds", "label": "Rule of Thirds Alignment",
            "rating": max(50, min(100, round(100 - dist * 100))),
            "what_works": "Subject aligns with the Rule of Thirds." if dist < 0.15 else "Centering creates a stable focal point.",
            "what_could_be_improved": "Keep this off-center composition." if dist < 0.15 else "Consider cropping to place the subject on a third-line intersection."
        })

    # 2. Lighting & Exposure
    light_sub = []
    for k in ["brightness", "contrast", "highlights", "shadows", "ambiance"]:
        lbl = "Exposure / Brightness" if k == "brightness" else "Tonal Contrast" if k == "contrast" else "Highlights & Whites" if k == "highlights" else "Shadows & Blacks" if k == "shadows" else "Ambiance / Tone Map"
        data = get_aspect_data(k)
        if data: light_sub.append({"key": k, "label": lbl, **data})

    # 3. Focus & Sharpness
    focus_sub = []
    data_det = get_aspect_data("details")
    if data_det: focus_sub.append({"key": "details", "label": "Details & Micro-sharpness", **data_det})
    if advanced_cv and advanced_cv.get("sharpness"):
        cv_s = advanced_cv.get("sharpness", {})
        focus_sub.append({
            "key": "sharpness", "label": "Edge Definition",
            "rating": round(cv_s.get("score", 75)),
            "what_works": "Edges are crisp and clear." if cv_s.get("score", 75) >= 70 else "Soft details create a gentle transition.",
            "what_could_be_improved": "Focus looks solid." if cv_s.get("score", 75) >= 70 else "Increase detail sharpness."
        })

    # 4. Color & Tones
    color_sub = []
    for k in ["colour", "saturation", "warmth"]:
        lbl = "Colour Palette Harmony" if k == "colour" else "Color Saturation" if k == "saturation" else "Warmth / White Balance"
        data = get_aspect_data(k)
        if data: color_sub.append({"key": k, "label": lbl, **data})

    # 5. Subject & Story
    subject_sub = []
    data_wow = get_aspect_data("feel.wow_factor")
    if data_wow: subject_sub.append({"key": "wow_factor", "label": "Wow Factor & Engagement", **data_wow})
    data_emo = get_aspect_data("feel.emotional_impact")
    if data_emo: subject_sub.append({"key": "emotional_impact", "label": "Emotional Impact", **data_emo})
    if exif_analysis and exif_analysis.get("photographer_intention"):
        subject_sub.append({
            "key": "intention", "label": "Photographic Intent",
            "rating": 85,
            "what_works": f"Conveys intent: \"{exif_analysis.get('photographer_intention')}\"",
            "what_could_be_improved": "Ensure all lighting and composition elements support this core intent."
        })

    # 6. Post-Processing
    post_sub = []
    post_score = 100 - len(suggested_edits) * 6
    if exif_analysis and exif_analysis.get("diagnostics"):
        st = exif_analysis.get("diagnostics", {}).get("status", "ok")
        if st == "warning": post_score -= 15
        elif st == "critical": post_score -= 30
    post_score = max(30, min(100, post_score))
    edit_texts = [edit_text(e) for e in suggested_edits]
    post_sub.append({
        "key": "edits_needed", "label": "Slider Adjustments Needed",
        "rating": post_score,
        "what_works": "Minimal editing required." if len(suggested_edits) == 0 else f"Only {len(suggested_edits)} tweaks suggested.",
        "what_could_be_improved": f"Apply tweaks: {', '.join(edit_texts)}" if len(suggested_edits) > 0 else "No urgent edits."
    })
    if exif_analysis and exif_analysis.get("diagnostics"):
        diag = exif_analysis.get("diagnostics", {})
        post_sub.append({
            "key": "exif_settings", "label": "Camera Settings Audit",
            "rating": 95 if diag.get("status") == "ok" else 70 if diag.get("status") == "warning" else 45,
            "what_works": "Optimal camera settings selected." if diag.get("status") == "ok" else "Exposure is acceptable.",
            "what_could_be_improved": diag.get("issue") or "Verify camera settings."
        })

    # Group into the 6 major parameters
    categories = [
        {"id": "composition", "label": "Composition", "sub": comp_sub},
        {"id": "lighting", "label": "Lighting & Exposure", "sub": light_sub},
        {"id": "focus", "label": "Focus & Sharpness", "sub": focus_sub},
        {"id": "color", "label": "Color & Tones", "sub": color_sub},
        {"id": "subject", "label": "Subject & Story", "sub": subject_sub},
        {"id": "post-processing", "label": "Post-Processing", "sub": post_sub}
    ]

    # Calculate overall rating and reviews for each category
    for cat in categories:
        valid_ratings = [s["rating"] for s in cat["sub"] if "rating" in s]
        avg = round(sum(valid_ratings) / len(valid_ratings)) if valid_ratings else 70
        cat["rating"] = avg
        
        works_list = [s["what_works"] for s in cat["sub"] if s.get("what_works") and len(s["what_works"]) > 3]
        cat["what_works"] = " ".join(works_list) if works_list else "Technical elements are stable."
        
        imp_list = [s["what_could_be_improved"] for s in cat["sub"] if s.get("what_could_be_improved") and len(s["what_could_be_improved"]) > 3 and "No alignment adjustment" not in s["what_could_be_improved"] and "No urgent edits" not in s["what_could_be_improved"]]
        cat["what_could_be_improved"] = " ".join(imp_list) if imp_list else "No major improvements needed."

    # Build plain text lines
    text_lines.extend(["", "Evaluation Categories Breakdown:", "---------------------------------"])
    for cat in categories:
        text_lines.extend([
            f"Category: {cat['label']}",
            f"  Overall Score: {cat['rating']}/100",
            f"  What Works: {cat['what_works']}",
            f"  What Could Be Improved: {cat['what_could_be_improved']}",
            "  Sub-aspects:"
        ])
        for sub in cat["sub"]:
            text_lines.extend([
                f"    - {sub['label']}: {sub['rating']}/100",
                f"      Works: {sub.get('what_works')}",
                f"      Improve: {sub.get('what_could_be_improved')}"
            ])
        text_lines.append("")
    
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
    for cat in categories:
        rating = cat["rating"]
        if rating >= 80:
            color = "#10B981"  # Emerald
        elif rating >= 70:
            color = "#6366F1"  # Indigo
        elif rating >= 50:
            color = "#F59E0B"  # Amber
        else:
            color = "#EF4444"  # Red

        sub_html = ""
        for sub in cat["sub"]:
            sub_rating = sub["rating"]
            if sub_rating >= 80:
                sub_color = "#10B981"
            elif sub_rating >= 70:
                sub_color = "#6366F1"
            elif sub_rating >= 50:
                sub_color = "#F59E0B"
            else:
                sub_color = "#EF4444"
            
            sub_html += f"""
            <div style="margin-top: 12px; padding: 12px; background-color: rgba(255,255,255,0.01); border-left: 3px solid {sub_color}; border-radius: 4px;">
                <div style="font-weight: bold; font-size: 13px; color: #FFFFFF; text-align: left;">
                    {sub['label']} <span style="float: right; color: {sub_color}; font-weight: bold;">{sub_rating}/100</span>
                </div>
                {f'<p style="margin: 4px 0 0 0; color: #BAC4D1; font-size: 12px; line-height: 1.4; text-align: left;"><strong>Works:</strong> {sub["what_works"]}</p>' if sub.get("what_works") else ''}
                {f'<p style="margin: 4px 0 0 0; color: #BAC4D1; font-size: 12px; line-height: 1.4; text-align: left;"><strong>Improve:</strong> {sub["what_could_be_improved"]}</p>' if sub.get("what_could_be_improved") else ''}
            </div>
            """

        aspects_html += f"""
        <div style="margin-bottom: 25px; padding: 20px; background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-left: 5px solid {color}; border-radius: 8px;">
            <div style="margin-bottom: 12px; font-weight: bold; font-size: 17px; color: #FFFFFF; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                <span style="float: left;">{cat['label']}</span>
                <span style="float: right; color: {color}; font-weight: 800;">{rating}<span style="font-size: 12px; color: #8F9CAE; font-weight: normal;"> / 100</span></span>
                <div style="clear: both;"></div>
            </div>
            <div style="margin-bottom: 8px; text-align: left;">
                <strong style="color: #10B981; font-size: 13px; display: block; margin-bottom: 2px;">Overall What Works</strong>
                <p style="margin: 0; color: #BAC4D1; font-size: 13px; line-height: 1.4;">{cat['what_works']}</p>
            </div>
            <div style="margin-bottom: 12px; text-align: left;">
                <strong style="color: #F59E0B; font-size: 13px; display: block; margin-bottom: 2px;">Overall Areas for Improvement</strong>
                <p style="margin: 0; color: #BAC4D1; font-size: 13px; line-height: 1.4;">{cat['what_could_be_improved']}</p>
            </div>
            <div style="margin-top: 15px;">
                <strong style="color: #6366F1; font-size: 12px; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Sub-aspect breakdown</strong>
                {sub_html}
            </div>
        </div>
        """

    edits_html = ""
    for edit in suggested_edits:
        edits_html += f"""
        <li style="margin-bottom: 8px; color: #BAC4D1; font-size: 14px; line-height: 1.4; text-align: left;">
            <span style="color: #8B5CF6; margin-right: 8px;">✔</span> {edit_text(edit)}
        </li>
        """
    if not edits_html:
        edits_html = "<p style='color: #8F9CAE; font-size: 14px;'>No specific edits suggested.</p>"

    exif_html = ""
    if exif_analysis:
        settings = exif_analysis.get("camera_settings", {})
        diag = exif_analysis.get("diagnostics", {})
        diag_status = diag.get("status", "ok")
        
        # Color matching status
        if diag_status == "critical":
            status_color = "#EF4444"
            bg_color = "rgba(239, 68, 68, 0.05)"
            border_color = "rgba(239, 68, 68, 0.2)"
        elif diag_status == "warning":
            status_color = "#F59E0B"
            bg_color = "rgba(245, 158, 11, 0.05)"
            border_color = "rgba(245, 158, 11, 0.2)"
        else:
            status_color = "#10B981"
            bg_color = "rgba(16, 185, 129, 0.05)"
            border_color = "rgba(16, 185, 129, 0.2)"
            
        exif_html = f"""
        <!-- EXIF metadata section -->
        <tr>
            <td style="padding: 20px 40px 10px 40px; border-top: 1px solid #1E293B;">
                <h3 style="color: #FFFFFF; font-size: 18px; margin-top: 0; margin-bottom: 15px; text-align: left;">
                    <span style="color: #10B981; margin-right: 10px; font-size: 20px;">📷</span> Camera Settings (EXIF)
                </h3>
                
                <!-- LCD Screen style settings grid -->
                <div style="background-color: #080A10; border: 1px solid #1E293B; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 13px; color: #BAC4D1;">
                        <tr>
                            <td width="33%"><strong>Shutter Speed</strong><br/><span style="font-size: 16px; color: #FFF; font-weight: bold;">{settings.get('shutter_speed') or 'N/A'}</span></td>
                            <td width="33%"><strong>Aperture</strong><br/><span style="font-size: 16px; color: #FFF; font-weight: bold;">{settings.get('aperture') or 'N/A'}</span></td>
                            <td width="34%"><strong>ISO</strong><br/><span style="font-size: 16px; color: #FFF; font-weight: bold;">{settings.get('iso') or 'N/A'}</span></td>
                        </tr>
                        <tr>
                            <td style="padding-top: 10px;"><strong>Focal Length</strong><br/><span style="color: #FFF;">{settings.get('focal_length') or 'N/A'}</span></td>
                            <td style="padding-top: 10px;" colspan="2"><strong>Camera & Lens</strong><br/><span style="color: #FFF;">{settings.get('camera') or 'Generic Camera'} {f'({settings.get("lens")})' if settings.get('lens') else ''}</span></td>
                        </tr>
                    </table>
                </div>
                
                <!-- Diagnostic Card -->
                <div style="padding: 15px; background-color: {bg_color}; border: 1px solid {border_color}; border-left: 4px solid {status_color}; border-radius: 6px; text-align: left;">
                    <strong style="color: {status_color}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Settings Audit: {diag_status.upper()}</strong>
                    <p style="margin: 5px 0; color: #FFF; font-size: 13px; font-weight: bold;">{diag.get('issue')}</p>
                    <p style="margin: 0; color: #BAC4D1; font-size: 12px; line-height: 1.4;"><strong>Recommendation:</strong> {diag.get('suggestion')}</p>
                </div>
            </td>
        </tr>
        """

    advanced_cv = analysis_results.get("advanced_cv")
    cv_html = ""
    if advanced_cv:
        # Build color palette swatches HTML
        palette_html = ""
        for col in advanced_cv.get("color_palette", []):
            palette_html += f"""
            <div style="display: inline-block; margin-right: 12px; text-align: center;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background-color: {col['hex']}; border: 1px solid rgba(255,255,255,0.15); margin: 0 auto 4px auto;"></div>
                <div style="font-size: 10px; color: #BAC4D1;">{col['percentage']}%</div>
                <div style="font-size: 9px; color: #64748B; font-family: monospace;">{col['hex'].upper()}</div>
            </div>
            """
            
        # Build composition rules list
        rules_html = ""
        comp_rules = [
            ("Rule of Thirds", advanced_cv.get("composition", {}).get("rule_of_thirds", {})),
            ("Golden Ratio", advanced_cv.get("composition", {}).get("golden_ratio", {})),
            ("Symmetry & Patterns", advanced_cv.get("composition", {}).get("symmetry_patterns", {})),
            ("Framing", advanced_cv.get("composition", {}).get("framing", {})),
            ("Negative Space", advanced_cv.get("composition", {}).get("negative_space", {})),
            ("Leading Lines", advanced_cv.get("composition", {}).get("leading_lines", {}))
        ]
        for name, rule in comp_rules:
            if rule:
                score = rule.get("score", 0)
                score_color = "#EF4444"
                if score >= 75:
                    score_color = "#10B981"
                elif score >= 45:
                    score_color = "#F59E0B"
                rules_html += f"""
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 8px 0; font-size: 13px; color: #FFFFFF; text-align: left;"><strong>{name}</strong></td>
                    <td style="padding: 8px 0; font-size: 13px; color: {score_color}; text-align: right; font-weight: bold;">{score} / 100</td>
                </tr>
                <tr>
                    <td colspan="2" style="padding-bottom: 8px; font-size: 12px; color: #BAC4D1; text-align: left; line-height: 1.4;">{rule.get('description', '')}</td>
                </tr>
                """

        # Face/Horizon stats
        centering = advanced_cv.get("subject_centering", {})
        horizon = advanced_cv.get("horizon", {})
        faces = advanced_cv.get("faces", [])
        blur = advanced_cv.get("blur", {})
        
        cv_html = f"""
        <!-- Advanced CV metrics section -->
        <tr>
            <td style="padding: 20px 40px 10px 40px; border-top: 1px solid #1E293B;">
                <h3 style="color: #FFFFFF; font-size: 18px; margin-top: 0; margin-bottom: 15px; text-align: left;">
                    <span style="color: #8B5CF6; margin-right: 10px; font-size: 20px;">⚙</span> Advanced Computer Vision Analytics
                </h3>
                
                <!-- Color Palette swatches -->
                <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 15px; margin-bottom: 15px; text-align: left;">
                    <strong style="color: #FFFFFF; font-size: 13px; display: block; margin-bottom: 10px;">Dominant Color Palette</strong>
                    {palette_html}
                </div>
                
                <!-- Heuristics grid -->
                <div style="background-color: #080A10; border: 1px solid #1E293B; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 12px; color: #BAC4D1; text-align: left;">
                        <tr>
                            <td width="50%"><strong>Subject Centering</strong><br/>
                                <span style="font-size: 14px; color: {'#10B981' if centering.get('is_centered') else '#F59E0B'}; font-weight: bold;">
                                    { 'Centered' if centering.get('is_centered') else 'Off-Center' }
                                </span>
                            </td>
                            <td width="50%"><strong>Horizon Level</strong><br/>
                                <span style="font-size: 14px; color: { '#10B981' if not horizon.get('detected') or horizon.get('is_level') else '#EF4444' }; font-weight: bold;">
                                    { 'Not Detected' if not horizon.get('detected') else ('Level' if horizon.get('is_level') else 'Tilted') }
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding-top: 10px;"><strong>Faces Detected</strong><br/>
                                <span style="font-size: 14px; color: #FFF; font-weight: bold;">{len(faces)}</span>
                            </td>
                            <td style="padding-top: 10px;"><strong>Sky Coverage</strong><br/>
                                <span style="font-size: 14px; color: #FFF; font-weight: bold;">{advanced_cv.get('sky_segmentation', {}).get('percentage', 0.0)}%</span>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- Sharpness detail -->
                <div style="margin-bottom: 15px; text-align: left; font-size: 12px; color: #BAC4D1; line-height: 1.4;">
                    <strong>Sharpness Audit:</strong> {blur.get('description', '')}
                </div>
                
                <!-- Composition table -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;">
                    {rules_html}
                </table>
            </td>
        </tr>
        """

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
        <!-- First Impression -->
        <tr>
            <td style="padding: 20px 40px 20px 40px; border-top: 1px solid #1E293B; text-align: left;">
                <h3 style="color: #FFFFFF; font-size: 18px; margin-top: 0; margin-bottom: 12px;">
                    <span style="color: #6366F1; margin-right: 10px; font-size: 20px;">✨</span> First Impression
                </h3>
                <div style="margin: 0; color: #BAC4D1; font-size: 13px; line-height: 1.5; font-style: italic; background-color: rgba(255,255,255,0.01); padding: 15px; border-left: 4px solid #6366F1; border-radius: 6px;">
                    "{analysis_results.get('first_impression', 'N/A')}"
                </div>
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
        {exif_html}
        {cv_html}
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
        # Check if Gemini API key is available
        api_key = os.environ.get("GEMINI_API_KEY")
        
        if api_key:
            try:
                # Try real AI analysis
                analysis_results = await analyze_gemini(image_bytes=image_bytes, exif=exif_summary["text"], api_key=api_key)
                # Compute local advanced CV overlays for Gemini path
                try:
                    nparr = np.frombuffer(image_bytes, np.uint8)
                    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if img_bgr is not None:
                        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
                        img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
                        analysis_results["advanced_cv"] = analyze_advanced_cv(image_bytes, img_bgr, img_gray, img_rgb)
                except Exception as cv_err:
                    print(f"Failed to merge advanced CV into Gemini results: {cv_err}")
            except Exception as e:
                # Log error and fallback
                print(f"Gemini API failed: {e}. Falling back to computer vision...")
                analysis_results = analyze_cv_heuristics(image_bytes, exif_summary=exif_summary)
                analysis_results["fallback_reason"] = str(e)
        else:
            # Fallback directly
            analysis_results = analyze_cv_heuristics(image_bytes, exif_summary=exif_summary)
            
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
