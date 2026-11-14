import cv2
import numpy as np

from .color import analyze_colour_harmony, analyze_warmth, color_palette, rgb_histogram
from .composition import analyze_composition_rules, analyze_crop, analyze_horizon, detect_lines
from .exif import analyze_exif, explains_blur
from .focus import analyze_details, blur_summary, focus_map_b64, sharpness_variance
from .lighting import (
    HIGHLIGHT_CLIP_LEVEL,
    SHADOW_CLIP_LEVEL,
    analyze_ambiance,
    analyze_brightness,
    analyze_contrast,
    analyze_highlights,
    analyze_shadows,
    histogram_summary,
    luminance_histogram,
)
from .saturation import analyze_saturation
from .subject import (
    background_clutter,
    detect_faces,
    saliency_map,
    saliency_map_b64,
    sky_segmentation,
    subject_centering,
)


# Full-resolution camera images can require several hundred megabytes once the
# analyzer creates RGB, LAB, HSV, grayscale, and floating-point working arrays.
# Keep enough resolution for the heuristics while staying within hosted-service
# memory limits.
MAX_ANALYSIS_DIMENSION = 1600


def resize_for_analysis(img_bgr, max_dimension: int = MAX_ANALYSIS_DIMENSION):
    """Return a memory-bounded image and its original dimensions."""
    original_h, original_w = img_bgr.shape[:2]
    largest_dimension = max(original_w, original_h)

    if largest_dimension <= max_dimension:
        return img_bgr, original_w, original_h

    scale = max_dimension / float(largest_dimension)
    analysis_w = max(1, round(original_w * scale))
    analysis_h = max(1, round(original_h * scale))
    resized = cv2.resize(img_bgr, (analysis_w, analysis_h), interpolation=cv2.INTER_AREA)
    return resized, original_w, original_h


def analyze_advanced_cv(img_bgr, img_gray, img_rgb) -> dict:
    """
    Advanced CV Analyzer using OpenCV/NumPy.
    Computes: face/eye detection, subject centering, horizon line, blur score,
    sky segmentation, background clutter, saliency map, color palette,
    and 6 composition rules (thirds, leading lines, symmetry/patterns, framing, negative space, golden ratio).
    """
    h, w, _ = img_bgr.shape

    faces_detected = detect_faces(img_gray)
    saliency_norm = saliency_map(img_bgr)
    centering, scx, scy = subject_centering(saliency_norm, faces_detected)
    lines = detect_lines(img_gray)
    horizon, horizon_y = analyze_horizon(lines, w, h)

    return {
        "composition": analyze_composition_rules(img_gray, lines, scx, scy, horizon_y),
        "faces": faces_detected,
        "subject_centering": centering,
        "horizon": horizon,
        "blur": blur_summary(sharpness_variance(img_gray)),
        "sky_segmentation": sky_segmentation(img_bgr, img_gray),
        "background_clutter": background_clutter(img_gray, faces_detected, saliency_norm),
        "saliency_map_b64": saliency_map_b64(saliency_norm),
        "focus_map_b64": focus_map_b64(img_gray),
        "color_palette": color_palette(img_rgb),
    }


def first_impression(col_score: int, thirds_score: float, details_score: int) -> str:
    fi_parts = []
    if col_score >= 80:
        fi_parts.append("an aesthetically pleasing color palette with very harmonious tones")
    elif col_score < 60:
        fi_parts.append("some noticeable color clashing or incorrect white balance")
    else:
        fi_parts.append("a balanced but standard color presentation")

    if thirds_score >= 75:
        fi_parts.append("a well-structured layout that follows composition principles cleanly")
    else:
        fi_parts.append("a somewhat basic or unstructured composition")

    first_impression_text = f"My first impression is {', combined with '.join(fi_parts)}."

    if details_score < 60:
        first_impression_text += " However, I immediately notice a severe lack of sharpness and a general softness that detracts from the potential mood. It feels like a moment that could have been much stronger with better technical execution."
    elif details_score >= 80:
        first_impression_text += " I also notice excellent edge definition and high sharpness details that anchor the subject nicely."
    else:
        first_impression_text += " The image has acceptable sharpness, though some areas could benefit from slightly tighter focus definition."
    return first_impression_text


def analyze_cv_heuristics(oriented_rgb: np.ndarray, exif_summary: dict = None) -> dict:
    """
    Fallback CV Analyzer that uses a pre-oriented RGB numpy array to analyze the image
    and generate structured response metrics.
    """
    # Load image from the provided oriented RGB array
    original_h, original_w = oriented_rgb.shape[:2]
    img_bgr = cv2.cvtColor(oriented_rgb, cv2.COLOR_RGB2BGR)

    img_bgr, analyzed_w, analyzed_h = resize_for_analysis(img_bgr)
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    advanced_cv = analyze_advanced_cv(img_bgr, img_gray, img_rgb)
    composition = advanced_cv["composition"]

    brightness, mean_brightness = analyze_brightness(img_gray)
    contrast, std_contrast = analyze_contrast(img_gray)
    saturation, mean_sat = analyze_saturation(img_bgr)
    warmth = analyze_warmth(img_rgb)
    variance_sharp = sharpness_variance(img_gray)
    details, details_can_fix_in_post = analyze_details(variance_sharp)
    highlights, high_pixels = analyze_highlights(img_gray)
    shadows, shadow_pixels = analyze_shadows(img_gray)
    ambiance = analyze_ambiance(img_gray)
    colour = analyze_colour_harmony(img_rgb)
    crop, composition_aspect = analyze_crop(
        composition, advanced_cv["subject_centering"]["is_centered"], original_w, original_h
    )

    graded = {
        "brightness": brightness, "contrast": contrast, "saturation": saturation,
        "warmth": warmth, "details": details, "highlights": highlights,
        "shadows": shadows, "ambiance": ambiance, "colour": colour, "crop": crop,
    }
    overall_rating = round(sum(a["rating"] for a in graded.values()) / len(graded) / 10.0, 1)

    # Suggested edits keyed to their aspect, de-duplicated by text. Read before the
    # details tip is withheld below: the list always carries the sharpening edit.
    seen_texts = set()
    suggested_edits = []
    for key, graded_aspect in graded.items():
        if graded_aspect["improve"] not in seen_texts:
            seen_texts.add(graded_aspect["improve"])
            suggested_edits.append({"key": key, "text": graded_aspect["improve"]})

    exif_analysis = analyze_exif(exif_summary, details["rating"], mean_brightness)

    # When the camera settings themselves point to shake, diffraction, or a
    # depth-of-field miss, prefer that specific, evidence-backed capture-time
    # diagnosis over the generic sharpness read -- and don't suggest a
    # post-processing fix, since this kind of blur can't be rescued after
    # the fact.
    if explains_blur(exif_analysis, details["rating"]):
        diagnostics = exif_analysis["diagnostics"]
        details["assessment"] = "Blurry"
        details["saw"] = diagnostics["issue"]
        details["try_this"] = diagnostics["suggestion"]
        details_can_fix_in_post = False
    if not details_can_fix_in_post:
        details["improve"] = None

    eye_count = sum(len(face.get("eyes", [])) for face in advanced_cv.get("faces", []))
    image_statistics = {
        "dimensions": f"{original_w}x{original_h}",
        "brightness": {
            "value": round(mean_brightness / 255.0, 2),
            "level": "Low" if mean_brightness < 90 else "High" if mean_brightness > 160 else "Balanced",
        },
        "contrast": {
            "value": round(std_contrast, 1),
            "level": "Low" if std_contrast < 40 else "High" if std_contrast > 75 else "Medium",
        },
        "saturation": {
            "value": round(mean_sat, 1),
            "level": "Low" if mean_sat < 25 else "High" if mean_sat > 150 else "Medium",
        },
        "sharpness": {
            "value": round(variance_sharp, 1),
            "level": "Low" if variance_sharp < 80 else "High" if variance_sharp > 500 else "Medium",
        },
        "leading_lines": composition["leading_lines"]["score"] >= 40,
        "rule_of_thirds": composition["rule_of_thirds"]["score"] >= 65,
        "faces": len(advanced_cv.get("faces", [])),
        "eyes_detected": eye_count > 0,
        "eye_count": eye_count,
        "histogram": histogram_summary(high_pixels, shadow_pixels),
        "luminance_histogram": luminance_histogram(img_gray),
        "rgb_histogram": rgb_histogram(img_bgr),
        "clipping_levels": {"shadow": SHADOW_CLIP_LEVEL, "highlight": HIGHLIGHT_CLIP_LEVEL},
        "highlight_clipping_percent": round(high_pixels * 100, 1),
        "shadow_clipping_percent": round(shadow_pixels * 100, 1),
    }

    return {
        "coordinate_space": "normalized",
        "coordinate_basis": "display_oriented",
        "analyzed_width": analyzed_w,
        "analyzed_height": analyzed_h,
        "overall_rating": overall_rating,
        "first_impression": first_impression(
            colour["rating"], composition["rule_of_thirds"]["score"], details["rating"]
        ),
        "aspects": {
            "colour": colour,
            "details": details,
            "brightness": brightness,
            "contrast": contrast,
            "saturation": saturation,
            "ambiance": ambiance,
            "highlights": highlights,
            "shadows": shadows,
            "warmth": warmth,
            "crop": crop,
            "composition": composition_aspect,
        },
        "suggested_edits": suggested_edits,
        "exif_analysis": exif_analysis,
        "image_statistics": image_statistics,
        "advanced_cv": advanced_cv,
        "mode": "computer_vision",
    }
