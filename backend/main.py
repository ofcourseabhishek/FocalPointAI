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

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage

from cv_fallback import *
from gemini_request import *
from score_engine import build_gemini_context, build_score_engine, enforce_authoritative_scores

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

    def html_text(value, fallback="N/A"):
        """Escape dynamic report content before inserting it into email HTML."""
        if value is None or value == "":
            value = fallback
        return html.escape(str(value), quote=True)

    def score_color(score):
        """Match the dashboard's success/warning/danger score bands."""
        if score >= 80:
            return "#1B6A55"
        if score >= 60:
            return "#F59E0B"
        return "#EF4444"
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

    # Construct the same dark photograph stage used by the dashboard.
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
        <div style="background-color:#020306;border:1px solid #23343C;border-radius:12px;padding:8px;text-align:center;">
            <img src="{image_src}" alt="Analyzed photograph" width="480" style="display:block;width:100%;max-width:480px;max-height:430px;height:auto;margin:0 auto;border:0;border-radius:8px;object-fit:contain;" />
        </div>
        <p style="margin:10px 2px 0;color:#94A3B8;font-size:11px;line-height:16px;text-align:left;overflow-wrap:anywhere;">{html_text(filename)}</p>
        """

    # Build email-safe dashboard cards. Inline styles and table layout keep the
    # report consistent across Gmail, Outlook, and the simulation preview.
    aspects_html = ""
    for cat in categories:
        rating = cat["rating"]
        color = score_color(rating)

        sub_html = ""
        for sub in cat["sub"]:
            sub_rating = sub["rating"]
            sub_color = score_color(sub_rating)
            suggested_hint = sub.get("suggested_edit_hint")
            
            sub_html += f"""
            <div style="margin-top:12px;padding:14px;background-color:#122129;border:1px solid #23343C;border-left:4px solid {sub_color};border-radius:10px;">
                <div style="font-weight:800;font-size:14px;line-height:20px;color:#F8FAFC;text-align:left;">
                    {html_text(sub['label'])} <span style="float:right;color:{sub_color};font-weight:800;font-size:15px;">{sub_rating}<span style="color:#94A3B8;font-size:11px;font-weight:600;"> / 100</span></span>
                </div>
                <div style="clear:both;"></div>
                <div style="height:6px;background-color:#26353D;border-radius:999px;margin:10px 0 12px;overflow:hidden;"><div style="height:6px;width:{max(0, min(100, sub_rating))}%;background-color:{sub_color};border-radius:999px;"></div></div>
                {f'<p style="margin:0 0 7px;color:#94A3B8;font-size:12px;line-height:18px;text-align:left;"><strong style="color:#4EAA8C;text-transform:uppercase;letter-spacing:.04em;font-size:10px;">What works</strong><br>{html_text(sub["what_works"])}</p>' if sub.get("what_works") else ''}
                {f'<p style="margin:0;color:#94A3B8;font-size:12px;line-height:18px;text-align:left;"><strong style="color:#F59E0B;text-transform:uppercase;letter-spacing:.04em;font-size:10px;">Area to improve</strong><br>{html_text(sub["what_could_be_improved"])}</p>' if sub.get("what_could_be_improved") else ''}
                {f'<p style="margin:10px 0 0;padding:9px 11px;background-color:#17243D;border-left:3px solid #5E69D8;border-radius:7px;color:#B8C0EE;font-size:12px;line-height:18px;text-align:left;"><strong style="color:#8D96EC;">Suggested edit</strong><br>{html_text(suggested_hint)}</p>' if suggested_hint else ''}
            </div>
            """

        aspects_html += f"""
        <div style="margin-bottom:18px;padding:20px;background-color:#0E1D24;border:1px solid #23343C;border-left:6px solid {color};border-radius:14px;">
            <div style="margin-bottom:14px;font-weight:800;font-size:17px;line-height:24px;color:#F8FAFC;border-bottom:1px solid #23343C;padding-bottom:12px;">
                <span style="float:left;">{html_text(cat['label'])}</span>
                <span style="float:right;color:{color};font-weight:900;">{rating}<span style="font-size:11px;color:#94A3B8;font-weight:600;"> / 100</span></span>
                <div style="clear:both;"></div>
            </div>
            <div style="margin-bottom:10px;text-align:left;">
                <strong style="color:#4EAA8C;font-size:10px;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.05em;">What works</strong>
                <p style="margin:0;color:#CBD5E1;font-size:13px;line-height:19px;">{html_text(cat['what_works'])}</p>
            </div>
            <div style="margin-bottom:14px;text-align:left;">
                <strong style="color:#F59E0B;font-size:10px;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.05em;">Areas for improvement</strong>
                <p style="margin:0;color:#CBD5E1;font-size:13px;line-height:19px;">{html_text(cat['what_could_be_improved'])}</p>
            </div>
            <div style="margin-top:16px;">
                <strong style="color:#8D96EC;font-size:10px;display:block;margin-bottom:7px;text-transform:uppercase;letter-spacing:.08em;text-align:left;">Sub-aspect breakdown</strong>
                {sub_html}
            </div>
        </div>
        """

    edits_html = ""
    for edit in suggested_edits:
        edits_html += f"""
        <div style="margin-bottom:10px;padding:12px 14px;background-color:#122129;border:1px solid #23343C;border-left:4px solid #5E69D8;border-radius:9px;color:#CBD5E1;font-size:13px;line-height:19px;text-align:left;">
            <span style="display:block;color:#8D96EC;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">Suggested adjustment</span>{html_text(edit_text(edit))}
        </div>
        """
    if not edits_html:
        edits_html = "<p style='margin:0;color:#94A3B8;font-size:13px;'>No specific edits suggested.</p>"

    exif_html = ""
    if exif_analysis:
        settings = exif_analysis.get("camera_settings", {})
        diag = exif_analysis.get("diagnostics", {})
        diag_status = diag.get("status", "ok")
        
        # Color matching status
        if diag_status == "critical":
            status_color = "#EF4444"
            bg_color = "#29191C"
            border_color = "#643039"
        elif diag_status == "warning":
            status_color = "#F59E0B"
            bg_color = "#292317"
            border_color = "#654B17"
        else:
            status_color = "#4EAA8C"
            bg_color = "#142A27"
            border_color = "#275C50"
            
        exif_html = f"""
        <tr>
            <td class="section-pad" style="padding:24px 32px 8px;">
                <p style="margin:0 0 12px;color:#F8FAFC;font-size:15px;line-height:22px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;">Camera settings <span style="color:#5E69D8;">(EXIF)</span></p>
                <div style="background-color:#0A1419;border:1px solid #23343C;border-radius:12px;padding:14px;margin-bottom:12px;">
                    <table role="presentation" width="100%" cellpadding="6" cellspacing="0" style="font-size:12px;color:#94A3B8;text-align:center;">
                        <tr>
                            <td width="33%" style="text-transform:uppercase;font-size:9px;letter-spacing:.05em;">Shutter<br><span style="font-size:17px;line-height:26px;color:#38BDF8;font-weight:900;text-transform:none;">{html_text(settings.get('shutter_speed'))}</span></td>
                            <td width="33%" style="text-transform:uppercase;font-size:9px;letter-spacing:.05em;">Aperture<br><span style="font-size:17px;line-height:26px;color:#4EAA8C;font-weight:900;text-transform:none;">{html_text(settings.get('aperture'))}</span></td>
                            <td width="34%" style="text-transform:uppercase;font-size:9px;letter-spacing:.05em;">ISO<br><span style="font-size:17px;line-height:26px;color:#F59E0B;font-weight:900;text-transform:none;">{html_text(settings.get('iso'))}</span></td>
                        </tr>
                        <tr>
                            <td style="padding-top:10px;border-top:1px solid #23343C;">Focal length<br><span style="color:#F8FAFC;font-weight:700;">{html_text(settings.get('focal_length'))}</span></td>
                            <td style="padding-top:10px;border-top:1px solid #23343C;" colspan="2">Camera &amp; lens<br><span style="color:#F8FAFC;font-weight:700;">{html_text(settings.get('camera'), 'Generic Camera')}{f' · {html_text(settings.get("lens"))}' if settings.get('lens') else ''}</span></td>
                        </tr>
                    </table>
                </div>
                <div style="padding:13px 15px;background-color:{bg_color};border:1px solid {border_color};border-left:4px solid {status_color};border-radius:9px;text-align:left;">
                    <strong style="color:{status_color};font-size:10px;text-transform:uppercase;letter-spacing:.06em;">Settings audit · {html_text(diag_status.upper())}</strong>
                    <p style="margin:5px 0;color:#F8FAFC;font-size:13px;line-height:19px;font-weight:700;">{html_text(diag.get('issue'))}</p>
                    <p style="margin:0;color:#CBD5E1;font-size:12px;line-height:18px;"><strong>Recommendation:</strong> {html_text(diag.get('suggestion'))}</p>
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
            <div style="display:inline-block;margin:0 12px 8px 0;text-align:center;">
                <div style="width:34px;height:34px;border-radius:50%;background-color:{html_text(col.get('hex'), '#000000')};border:2px solid #33434B;margin:0 auto 4px;"></div>
                <div style="font-size:10px;color:#CBD5E1;">{html_text(col.get('percentage'), '0')}%</div>
                <div style="font-size:8px;color:#64748B;font-family:monospace;">{html_text(str(col.get('hex', '')).upper(), '')}</div>
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
                rule_color = score_color(score)
                rules_html += f"""
                <tr>
                    <td style="padding:9px 0 4px;border-top:1px solid #23343C;font-size:12px;color:#F8FAFC;text-align:left;"><strong>{html_text(name)}</strong></td>
                    <td style="padding:9px 0 4px;border-top:1px solid #23343C;font-size:12px;color:{rule_color};text-align:right;font-weight:800;">{score} / 100</td>
                </tr>
                <tr>
                    <td colspan="2" style="padding-bottom:9px;font-size:11px;color:#94A3B8;text-align:left;line-height:17px;">{html_text(rule.get('description'), '')}</td>
                </tr>
                """

        # Face/Horizon stats
        centering = advanced_cv.get("subject_centering", {})
        horizon = advanced_cv.get("horizon", {})
        faces = advanced_cv.get("faces", [])
        blur = advanced_cv.get("blur", {})
        
        cv_html = f"""
        <tr>
            <td class="section-pad" style="padding:24px 32px 8px;">
                <p style="margin:0 0 12px;color:#F8FAFC;font-size:15px;line-height:22px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;">Computer vision analytics</p>
                <div style="background-color:#0E1D24;border:1px solid #23343C;border-radius:12px;padding:15px;margin-bottom:12px;text-align:left;">
                    <strong style="color:#F8FAFC;font-size:11px;display:block;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em;">Dominant color palette</strong>
                    {palette_html}
                </div>
                <div style="background-color:#0A1419;border:1px solid #23343C;border-radius:12px;padding:14px;margin-bottom:12px;">
                    <table role="presentation" width="100%" cellpadding="6" cellspacing="0" style="font-size:10px;color:#94A3B8;text-align:left;text-transform:uppercase;letter-spacing:.04em;">
                        <tr>
                            <td width="50%">Subject centering<br>
                                <span style="font-size:14px;line-height:23px;color:{'#4EAA8C' if centering.get('is_centered') else '#F59E0B'};font-weight:800;text-transform:none;letter-spacing:0;">
                                    { 'Centered' if centering.get('is_centered') else 'Off-Center' }
                                </span>
                            </td>
                            <td width="50%">Horizon level<br>
                                <span style="font-size:14px;line-height:23px;color:{'#4EAA8C' if not horizon.get('detected') or horizon.get('is_level') else '#EF4444'};font-weight:800;text-transform:none;letter-spacing:0;">
                                    { 'Not Detected' if not horizon.get('detected') else ('Level' if horizon.get('is_level') else 'Tilted') }
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding-top:10px;border-top:1px solid #23343C;">Faces detected<br>
                                <span style="font-size:14px;line-height:23px;color:#F8FAFC;font-weight:800;">{len(faces)}</span>
                            </td>
                            <td style="padding-top:10px;border-top:1px solid #23343C;">Sky coverage<br>
                                <span style="font-size:14px;line-height:23px;color:#F8FAFC;font-weight:800;">{html_text(advanced_cv.get('sky_segmentation', {}).get('percentage', 0.0))}%</span>
                            </td>
                        </tr>
                    </table>
                </div>
                <div style="margin-bottom:12px;padding:12px 14px;background-color:#0E1D24;border:1px solid #23343C;border-left:4px solid #145895;border-radius:9px;text-align:left;font-size:12px;color:#CBD5E1;line-height:18px;">
                    <strong style="color:#F8FAFC;">Sharpness audit:</strong> {html_text(blur.get('description'), 'No sharpness notes were generated.')}
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;background-color:#0E1D24;border:1px solid #23343C;border-radius:12px;padding:5px 14px;">
                    {rules_html}
                </table>
            </td>
        </tr>
        """

    # Match the score bands and muted palette used by the result dashboard.
    overall_score = overall_rating * 10
    overall_color = score_color(overall_score)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>FocalPointAI photography critique</title>
    <style>
        @media only screen and (max-width: 640px) {{
            .email-shell {{ width:100% !important; border-radius:0 !important; }}
            .outer-pad {{ padding:0 !important; }}
            .section-pad {{ padding-left:18px !important; padding-right:18px !important; }}
            .summary-copy, .score-cell {{ display:block !important; width:100% !important; text-align:left !important; }}
            .score-wrap {{ margin:20px 0 0 !important; }}
        }}
    </style>
</head>
<body style="margin:0;padding:0;background-color:#020F15;color:#CBD5E1;font-family:Inter,'Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#020F15;">
<tr><td class="outer-pad" style="padding:24px 12px;">
    <table role="presentation" class="email-shell" align="center" border="0" cellpadding="0" cellspacing="0" width="680" style="width:100%;max-width:680px;margin:0 auto;background-color:#07161D;border:1px solid #23343C;border-radius:20px;overflow:hidden;box-shadow:0 18px 50px #000000;">
        <tr>
            <td class="section-pad" style="padding:22px 32px;background-color:#091A22;border-bottom:1px solid #23343C;text-align:left;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td style="width:42px;height:42px;border-radius:12px;background-color:#145895;text-align:center;color:#F8FAFC;font-size:18px;font-weight:900;">FP</td>
                    <td style="padding-left:12px;">
                        <p style="margin:0;color:#F8FAFC;font-size:20px;line-height:23px;font-weight:800;letter-spacing:-.03em;">Focalpoint<span style="color:#7E88E5;">.AI</span></p>
                        <p style="margin:3px 0 0;color:#94A3B8;font-size:10px;line-height:14px;text-transform:uppercase;letter-spacing:.09em;">Photography critique &amp; mentor</p>
                    </td>
                </tr></table>
            </td>
        </tr>
        <tr>
            <td class="section-pad" style="padding:26px 32px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0E1D24;border:1px solid #23343C;border-radius:16px;">
                    <tr>
                        <td class="summary-copy" style="padding:24px;width:72%;vertical-align:middle;text-align:left;">
                            <span style="display:inline-block;padding:4px 8px;background-color:#102D41;border:1px solid #214E6D;border-radius:6px;color:#6EABD9;font-size:9px;line-height:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Analysis complete</span>
                            <h1 style="margin:9px 0 7px;color:#F8FAFC;font-size:25px;line-height:31px;font-weight:900;letter-spacing:-.03em;">Constructive Critique Dashboard</h1>
                            <p style="margin:0;color:#94A3B8;font-size:12px;line-height:19px;overflow-wrap:anywhere;">Workspace: <strong style="color:#F8FAFC;">{html_text(email_to)}</strong><br>Engine: <strong style="color:#8D96EC;">{html_text(mode_str)}</strong></p>
                        </td>
                        <td class="score-cell" style="padding:20px 24px 20px 0;width:28%;vertical-align:middle;text-align:center;">
                            <div class="score-wrap" style="margin:0 auto;width:104px;height:104px;border:5px solid {overall_color};border-radius:50%;text-align:center;">
                                <div style="color:#F8FAFC;font-size:31px;line-height:78px;font-weight:900;letter-spacing:-.04em;">{overall_rating}</div>
                                <div style="margin-top:-23px;color:#94A3B8;font-size:9px;line-height:14px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Rating</div>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td class="section-pad" style="padding:20px 32px 8px;">{image_html}</td>
        </tr>
        <tr>
            <td class="section-pad" style="padding:16px 32px 8px;text-align:left;">
                <div style="padding:17px 18px;background-color:#0E1D24;border:1px solid #23343C;border-left:4px solid #145895;border-radius:12px;">
                    <p style="margin:0 0 7px;color:#F8FAFC;font-size:11px;line-height:16px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;">First impression</p>
                    <p style="margin:0;color:#CBD5E1;font-size:13px;line-height:20px;">{html_text(analysis_results.get('first_impression'), 'No initial impression data was computed for this photograph.')}</p>
                </div>
            </td>
        </tr>
        <tr>
            <td class="section-pad" style="padding:24px 32px 8px;">
                <p style="margin:0 0 12px;color:#F8FAFC;font-size:15px;line-height:22px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;">Suggested edits</p>
                {edits_html}
            </td>
        </tr>
        {exif_html}
        {cv_html}
        <tr>
            <td class="section-pad" style="padding:26px 32px 30px;">
                <p style="margin:0 0 14px;color:#F8FAFC;font-size:15px;line-height:22px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;">Aspect quality metrics</p>
                {aspects_html}
            </td>
        </tr>
        <tr>
            <td class="section-pad" style="padding:20px 32px;background-color:#061219;border-top:1px solid #23343C;text-align:center;font-size:10px;line-height:16px;color:#64748B;">
                <p style="margin:0 0 4px;">Prepared for {html_text(email_to)} by the FocalPointAI critique workspace.</p>
                <p style="margin:0;">© 2026 FocalPointAI. All rights reserved.</p>
            </td>
        </tr>
    </table>
</td></tr></table>
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
    text_content, html_content = generate_email_content(
        email_to, analysis_results, image_bytes, is_simulation=False
    )

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

        if port == 465:
            server = smtplib.SMTP_SSL(smtp_host, port, timeout=15)
        else:
            server = smtplib.SMTP(smtp_host, port, timeout=15)
            server.ehlo()
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
