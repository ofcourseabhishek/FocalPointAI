def analyze_exif(exif_summary: dict, details_score: int, mean_brightness: float):
    """Camera-settings diagnostics from EXIF, or None when the image carries none."""
    # Check if we have valid raw exif settings
    raw_exif = exif_summary.get("raw", {}) if exif_summary else {}
    formatted_exif = exif_summary.get("formatted", {}) if exif_summary else {}

    has_exif = any(val is not None for val in raw_exif.values()) if raw_exif else False
    if not has_exif:
        return None

    shutter_speed = formatted_exif.get("shutter_speed")
    iso = raw_exif.get("iso")
    aperture = formatted_exif.get("aperture")
    focal_length_str = formatted_exif.get("focal_length")
    focal_length_35mm_str = formatted_exif.get("focal_length_35mm")
    flash_usage = formatted_exif.get("flash_usage")
    exposure_compensation = formatted_exif.get("exposure_compensation")
    color_profile = formatted_exif.get("color_profile")
    focal_length = raw_exif.get("focal_length")
    camera = formatted_exif.get("camera")
    lens = formatted_exif.get("lens")

    # 1. Predict Photographer Intention
    f_number = raw_exif.get("f_number")
    exposure_time = raw_exif.get("exposure_time")

    intention = "Standard documentary or snapshot capture with balanced depth of field."

    if f_number and f_number <= 2.8 and focal_length and focal_length >= 50:
        intention = "Shallow depth-of-field portrait/subject isolation to create a beautiful bokeh background."
    elif f_number and f_number >= 8.0:
        intention = "Deep depth-of-field landscape, architectural, or street photography keeping both foreground and background sharp."
    elif exposure_time and exposure_time <= 1/500:
        intention = "Action freeze-frame to capture sports, wildlife, or fast-moving elements without motion blur."
    elif exposure_time and exposure_time >= 0.5:
        intention = "Long-exposure creative motion blur, perfect for silky waterfalls, oceans, or light trails."
    elif iso and iso >= 3200:
        intention = "Low-light or night-time ambient capture, shooting in challenging dark environments."
    elif f_number and f_number <= 2.0:
        intention = "Aesthetic subject separation with thin focal plane or low-light handheld shooting."

    # 2. Settings diagnostics (issue & suggestion)
    status = "ok"
    issue = "No technical settings issues detected. Settings appear appropriate."
    suggestion = "Keep experimenting with creative angles and lighting."

    # Check high ISO (digital noise)
    if iso and iso >= 6400:
        status = "critical"
        issue = f"Extremely high ISO ({iso}) detected. This introduces significant sensor noise and decreases color dynamic range."
        suggestion = "Lower ISO to 100-400 by using a tripod to allow a slower shutter speed, or widen the aperture to let in more light."
    elif iso and iso >= 3200:
        status = "warning"
        issue = f"High ISO ({iso}) detected. This introduces noticeable grain/noise, especially in dark shadow regions."
        suggestion = "Consider raising exposure in post-processing or lowering ISO while using a tripod or wider aperture."

    # Check camera shake / slow shutter speed (exclude long exposures which are intentional)
    elif exposure_time and focal_length and exposure_time > (1.0 / max(1.0, focal_length)) and exposure_time > 1/50 and exposure_time < 0.5:
        status = "warning"
        issue = f"Slow shutter speed ({shutter_speed}) relative to focal length ({focal_length:.0f}mm) increases danger of handheld camera shake blur."
        suggestion = f"Increase shutter speed to at least 1/{focal_length:.0f}s or mount the camera on a tripod to keep the image crisp."

    # Check blur in combination with slow shutter speed
    elif exposure_time and exposure_time >= 0.1 and exposure_time < 2.0 and details_score < 70:
        status = "warning"
        issue = f"Slow shutter speed ({shutter_speed}) combined with low image sharpness suggests motion blur or camera shake."
        suggestion = "Use a tripod, enable image stabilization, or speed up the shutter speed (e.g. 1/125s or faster)."

    # Check diffraction at narrow aperture
    elif f_number and f_number >= 16.0:
        status = "warning"
        issue = f"Very narrow aperture ({aperture}) detected. This can cause lens optical diffraction, which softens fine details across the frame."
        suggestion = "Open the aperture to its 'sweet spot' (typically f/5.6 - f/11) for maximum sharpness, and adjust shutter speed to compensate."

    # Check thin depth of field missed focus
    elif f_number and f_number <= 1.8 and details_score < 70:
        status = "warning"
        issue = f"Ultra-wide aperture ({aperture}) creates a wafer-thin depth of field, making focus accuracy extremely critical."
        suggestion = "Step down to f/2.8 or f/4 to widen the focal plane, or zoom in to verify the focus point is exactly on the subject's eyes/details."

    # Check low-light underexposure with room to adjust
    elif mean_brightness < 90 and iso and iso < 800:
        status = "warning"
        issue = "Underexposure detected, and ISO is set conservatively."
        suggestion = "Increase ISO (up to 800 or 1600) or open up the aperture to brighten the image at capture time."

    return {
        "camera_settings": {
            "shutter_speed": shutter_speed,
            "iso": int(iso) if iso else None,
            "aperture": aperture,
            "focal_length": focal_length_str,
            "focal_length_35mm": focal_length_35mm_str,
            "flash_usage": flash_usage,
            "exposure_compensation": exposure_compensation,
            "color_profile": color_profile,
            "lens": lens,
            "camera": camera
        },
        "photographer_intention": intention,
        "diagnostics": {
            "status": status,
            "issue": issue,
            "suggestion": suggestion
        }
    }


def explains_blur(exif_analysis, details_score: int) -> bool:
    """True when the camera settings themselves point to shake, diffraction, or a
    depth-of-field miss on a soft image."""
    if not exif_analysis:
        return False
    diagnostics = exif_analysis["diagnostics"]
    issue = diagnostics["issue"].lower()
    return diagnostics["status"] != "ok" and details_score < 70 and any(
        word in issue for word in ("shake", "diffraction", "depth of field", "focus accuracy")
    )
