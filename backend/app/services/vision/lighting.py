import cv2
import numpy as np

from .aspect import aspect


# Grayscale levels counted as clipped. The clipping percentages and the result page's
# histogram clip zones both use these, so the chart and the numbers always agree.
SHADOW_CLIP_LEVEL = 25
HIGHLIGHT_CLIP_LEVEL = 230


def analyze_brightness(img_gray):
    """Return the brightness aspect and the mean grayscale level."""
    mean_brightness = float(np.mean(img_gray))
    # Optimal brightness is around 125.
    if mean_brightness < 90:
        brightness_score = int(max(0, (mean_brightness / 90) * 70))
        b_works = "Captures a moody, low-key lighting scheme, keeping the brightest spots detailed."
        b_imp = "The image is underexposed, resulting in dark shadow areas losing critical details. A slight boost in exposure could bring out hidden elements."
        b_edit = "Increase exposure by +0.5 to +1.0 EV."
        b_assess = "Underexposed"
        b_next = "Add positive exposure compensation (around +1/3 to +1 stop) before you shoot, or widen the aperture / slow the shutter a touch so the sensor captures more light to begin with."
    elif mean_brightness > 160:
        brightness_score = int(max(0, ((255 - mean_brightness) / 95) * 70))
        b_works = "Generates a bright, airy, high-key feel that conveys a clean, modern aesthetic."
        b_imp = "The image is overexposed, leading to blown-out highlights where details are permanently lost (e.g., in skies or white shirts)."
        b_edit = "Reduce exposure by -0.4 to -0.8 EV and pull down highlights."
        b_assess = "Overexposed"
        b_next = "Dial in negative exposure compensation (try -1 stop) before you shoot, or meter for the brightest part of the scene instead of the midtones."
    else:
        diff = abs(mean_brightness - 125)
        # Optimal brightness range. We use a stricter baseline of 75 (down from 85).
        brightness_score = int(75 + (25 - (diff / 35) * 25))
        brightness_score = min(100, max(0, brightness_score))
        b_works = "Well-balanced exposure that keeps the image looking natural and captures a full range of tones."
        b_imp = "Exposure is solid, though you could experiment with localized dodge and burn to create more depth."
        b_edit = "Apply minor contrast adjustments to enhance depth."
        b_assess = "Properly Exposed"
        b_next = "Keep metering the same way for this kind of light -- it's landing in the right range."
    return aspect(brightness_score, b_works, b_imp, b_assess, b_edit, b_next), mean_brightness


def analyze_contrast(img_gray):
    """Return the contrast aspect and the grayscale standard deviation."""
    std_contrast = float(np.std(img_gray))
    # Optimal standard deviation is around 50-70.
    if std_contrast < 40:
        contrast_score = int(max(0, (std_contrast / 40) * 70))
        c_works = "Low contrast gives a soft, vintage, or misty atmosphere that works well for dreamy portraits or foggy scenes."
        c_imp = "The image looks a bit flat and lacks punch. Increasing contrast would help separate the subject from the background."
        c_edit = "Increase contrast by +15 or adjust the black point to deepen shadows."
        c_assess = "Flat"
        c_next = "Shoot with more directional light (side light or golden hour) instead of flat, even lighting -- it naturally builds contrast into the frame."
    elif std_contrast > 75:
        contrast_score = int(max(0, (1 - (std_contrast - 75) / 52) * 70))
        c_works = "High contrast creates dramatic impact, bold silhouettes, and strong graphic shapes."
        c_imp = "The contrast is very harsh, which can make transition zones look abrupt and clip the highlights/shadows."
        c_edit = "Decrease contrast by -10, or soften the shadows."
        c_assess = "High Contrast"
        c_next = "If this wasn't the look you wanted, shoot in softer or more diffused light (open shade, overcast, or a reflector/diffuser) to tame the harsh transitions."
    else:
        diff = abs(std_contrast - 58)
        # Stricter baseline of 75 (down from 85)
        contrast_score = int(75 + (25 - (diff / 18) * 25))
        contrast_score = min(100, max(0, contrast_score))
        c_works = "Excellent tonal separation. The subject pops nicely from the background without losing fine detail in shadows and highlights."
        c_imp = "Contrast is well managed. You can add a vignette to draw more focus to the center."
        c_edit = "Add a subtle post-crop vignette (-5 to -10)."
        c_assess = "Balanced Contrast"
        c_next = "This tonal range is working well -- keep shooting in similar light."
    return aspect(contrast_score, c_works, c_imp, c_assess, c_edit, c_next), std_contrast


def analyze_highlights(img_gray):
    """Return the highlights aspect and the fraction of clipped highlight pixels."""
    high_pixels = float(np.sum(img_gray > HIGHLIGHT_CLIP_LEVEL)) / img_gray.size
    if high_pixels > 0.10:
        # Stricter highlights score calculation
        high_score = int(50 + (35 * (1 - min(1.0, high_pixels * 2))))
        h_works = "Bright highlights create a high-contrast, glowing feel."
        h_imp = "Large areas of highlights are clipped (blown out), losing detail in skies or bright surfaces."
        h_edit = "Pull down highlights slider by -30 to -50."
        h_assess = "Blown-out Highlights"
        h_next = "Dial in negative exposure compensation before you shoot, or meter for the brightest area of the scene (like the sky) instead of the overall frame."
    else:
        # Stricter default score of 85 (down from 92)
        high_score = 85
        h_works = "Highlights are well controlled, retaining full texture in bright areas (like clouds or snow)."
        h_imp = "Highlights are well within bounds. You could boost them slightly to create specular highlights for metallic or wet surfaces."
        h_edit = "Boost whites by +5 for extra sparkle."
        h_assess = "Highlights Controlled"
        h_next = "Highlight exposure is landing well -- keep metering the same way in similar light."
    return aspect(high_score, h_works, h_imp, h_assess, h_edit, h_next), high_pixels


def analyze_shadows(img_gray):
    """Return the shadows aspect and the fraction of crushed shadow pixels."""
    shadow_pixels = float(np.sum(img_gray < SHADOW_CLIP_LEVEL)) / img_gray.size
    if shadow_pixels > 0.15:
        # Stricter shadows score calculation
        shadow_score = int(55 + (30 * (1 - min(1.0, shadow_pixels * 2))))
        sh_works = "Rich, deep blacks create a sense of mystery, weight, and silhouette."
        sh_imp = "Shadow details are crushed, hiding texture in dark clothing, foliage, or nighttime scenes."
        sh_edit = "Lift shadows slider by +20 to +40."
        sh_assess = "Crushed Shadows"
        sh_next = "Add a touch of positive exposure compensation, or use fill light/a reflector on the shadow side of the subject while shooting."
    else:
        # Stricter default score of 86 (down from 94)
        shadow_score = 86
        sh_works = "Excellent shadow detail recovery. Textures are clearly visible in the dark portions of the frame."
        sh_imp = "Shadow depth is good. You can slightly drop the black point to give a cleaner black level if needed."
        sh_edit = "Slightly drop black levels by -3 to add a solid anchor."
        sh_assess = "Shadow Detail Preserved"
        sh_next = "Shadow detail is holding up well -- no change needed for this kind of light."
    return aspect(shadow_score, sh_works, sh_imp, sh_assess, sh_edit, sh_next), shadow_pixels


def analyze_ambiance(img_gray) -> dict:
    # Estimated by standard deviation of midtones (50 to 200)
    midtones = img_gray[(img_gray > 50) & (img_gray < 200)]
    mid_std = float(np.std(midtones)) if midtones.size > 0 else 30
    if mid_std < 30:
        # Stricter low-ambiance score of 60 (down from 70)
        return aspect(
            60,
            "Even, diffuse lighting that creates a flat, predictable atmosphere.",
            "Lacks dimensional lighting or ambient glow. Adding localized exposure adjustments can simulate ambient lighting.",
            "Flat Ambient Light",
            "Use radial filters to simulate light direction or add a soft glow.",
            "Look for more directional or layered light sources on location -- window light, a single lamp, or backlighting -- instead of flat, even ambient light.",
        )
    # Stricter default score of 80 (down from 88)
    return aspect(
        80,
        "Rich light interactions with strong presence of ambient light, giving depth.",
        "The ambiance is strong. Watch out for distracting highlights in the background.",
        "Rich Ambient Light",
        "Keep ambient details high while vignetting slightly.",
        "This light source and direction are working well -- worth returning to for similar shots.",
    )


def histogram_summary(high_pixels: float, shadow_pixels: float) -> str:
    if high_pixels > 0.10:
        return "Significant highlight clipping"
    if high_pixels > 0.02:
        return "Slight highlight clipping"
    if shadow_pixels > 0.15:
        return "Significant shadow clipping"
    if shadow_pixels > 0.03:
        return "Slight shadow clipping"
    return "No significant clipping"


def luminance_histogram(img_gray) -> list:
    """24-bin grayscale histogram scaled so the tallest bin is 100."""
    histogram_values = cv2.calcHist([img_gray], [0], None, [24], [0, 256]).flatten()
    histogram_peak = float(histogram_values.max()) if histogram_values.size else 0.0
    return [
        round(float(value) / histogram_peak * 100, 1) if histogram_peak else 0.0
        for value in histogram_values
    ]
