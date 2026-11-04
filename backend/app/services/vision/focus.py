import base64

import cv2
import numpy as np

from .aspect import aspect


def sharpness_variance(img_gray) -> float:
    """Laplacian variance: higher means more fine detail and crisper focus."""
    return float(np.var(cv2.Laplacian(img_gray, cv2.CV_64F)))


def blur_summary(variance_sharp: float) -> dict:
    return {
        "score": round(variance_sharp, 1),
        "is_blurry": bool(variance_sharp < 80),
        "description": f"Image is {'blurry or has soft focus' if variance_sharp < 80 else 'sharp and crisp'} (Laplacian variance: {variance_sharp:.1f})."
    }


def focus_map_b64(img_gray) -> str:
    """Local edge energy as a focus-confidence heatmap: brighter/warmer regions
    contain more recoverable fine detail and stronger focus cues."""
    h, w = img_gray.shape[:2]
    focus_energy = cv2.convertScaleAbs(cv2.Laplacian(img_gray, cv2.CV_64F))
    focus_energy = cv2.GaussianBlur(focus_energy, (9, 9), 0)
    focus_norm = cv2.normalize(focus_energy, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    focus_w = 320
    focus_h = max(10, int(h * focus_w / w))
    small_focus = cv2.resize(focus_norm, (focus_w, focus_h), interpolation=cv2.INTER_LINEAR)
    focus_heatmap = cv2.applyColorMap(small_focus, cv2.COLORMAP_TURBO)
    _, focus_buffer = cv2.imencode('.jpg', focus_heatmap, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
    return base64.b64encode(focus_buffer).decode('utf-8')


def analyze_details(variance_sharp: float):
    """Return the details (sharpness) aspect and whether a post-processing fix
    is worth offering."""
    if variance_sharp < 80:
        # Stricter baseline of 60 (down from 75)
        details_score = int(min(60, max(0, (variance_sharp / 80) * 60)))
        d_works = "A soft focus that works well for dreamy portraiture or creative motion blur."
        d_imp = "The image lacks critical sharpness, possibly due to motion blur, missed focus, or lens diffraction. Add structural clarity or sharpening."
        d_edit = "Increase sharpening by +20 and add +10 structure/clarity."
        d_assess = "Blurry"
        # Pure diagnosis, deliberately without a fix suggestion baked in --
        # real blur/shake can't be recovered by sharpening after the fact, so
        # no post-processing tip is offered for this branch, only capture-time
        # guidance (see d_next below).
        d_saw = "This looks soft rather than crisp, most likely from camera shake or a missed focus point rather than the lens itself."
        d_can_fix_in_post = False
        d_next = "Raise your shutter speed to at least 1/(focal length) of a second to freeze handheld shake, or use a tripod. If light is limited, open the aperture before raising ISO, and double-check focus landed on the subject rather than the background."
    elif variance_sharp > 500:
        # Stricter cap of 88 (down from 95)
        details_score = 88
        d_works = "Incredibly crisp details, showing fine textures and sharp edges."
        d_imp = "Detail retention is excellent. Ensure sharpening artifacts (halo effects around edges) are not visible."
        d_edit = "Apply a masking slider to sharpening so it only affects high-contrast edges, leaving flat areas smooth."
        d_assess = "Very Sharp"
        d_saw = d_imp
        d_can_fix_in_post = True
        d_next = "Whatever combination of shutter speed, focus technique, and stability got you this result is working -- keep it up."
    else:
        # Stricter range of 70 to 95 (down from 80 to 100)
        details_score = int(min(95, max(0, 70 + (25 * (variance_sharp - 80) / 420))))
        d_works = "Natural and clean detail rendering without harsh artificial sharpening outlines."
        d_imp = "Good sharpness. You could enhance local contrast (micro-contrast) in key areas to draw focus."
        d_edit = "Use a local brush to add +15 clarity to the main subject."
        d_assess = "Sharp"
        d_saw = d_imp
        d_can_fix_in_post = True
        d_next = "Focus and stability are solid here -- no change needed for this kind of shot."
    return aspect(details_score, d_works, d_imp, d_assess, d_edit, d_next, saw=d_saw), d_can_fix_in_post
