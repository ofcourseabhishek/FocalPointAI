import cv2
import numpy as np

from .aspect import aspect


# Bins per channel for the camera-style RGB histogram (each bin covers 4 levels).
RGB_HISTOGRAM_BINS = 64


def analyze_warmth(img_rgb) -> dict:
    # White balance heuristic based on the R-B difference.
    r_mean = float(np.mean(img_rgb[:, :, 0]))
    b_mean = float(np.mean(img_rgb[:, :, 2]))
    warmth_val = r_mean - b_mean  # Positive is warm (reddish), negative is cool (bluish)
    if warmth_val < -15:
        # Stricter baseline of 60 (down from 75)
        warmth_score = int(min(100, max(0, 60 + (30 - abs(warmth_val + 30) / 40 * 30))))
        w_works = "A cool color temperature that emphasizes a clean, clinical, modern, or wintery atmosphere."
        w_imp = "The image has a noticeable blue cast, which can make skin tones look pale and landscapes look cold."
        w_edit = "Increase temperature slider by +8 (warm it up) to restore natural tones."
        w_assess = "Cool Cast"
        w_next = "Set a custom white balance for the light you're shooting in (or use a gray card) instead of relying on auto white balance, which can drift cool under some lighting."
    elif warmth_val > 25:
        # Stricter baseline of 60 (down from 75)
        warmth_score = int(min(100, max(0, 60 + (30 - abs(warmth_val - 40) / 40 * 30))))
        w_works = "A warm, golden-hour tone that creates feelings of nostalgia, comfort, and intimacy."
        w_imp = "The image is overly warm or has a heavy yellow cast. Neutral white surfaces appear yellow."
        w_edit = "Decrease temperature slider by -5 to -10, or adjust the tint slightly toward green/magenta."
        w_assess = "Warm Cast"
        w_next = "Set a custom white balance for the light source (tungsten/fluorescent presets, or a gray card) instead of leaving it on auto."
    else:
        # Stricter baseline of 80 (down from 90)
        warmth_score = int(min(100, max(0, 80 + (20 - abs(warmth_val) / 20 * 20))))
        w_works = "Color temperature is technically correct and whites appear clean."
        w_imp = "White balance looks highly accurate. You could creatively shift it warmer/cooler for stylistic effect."
        w_edit = "Add a warm gradient map or golden filter in post-processing for creative effect."
        w_assess = "Neutral White Balance"
        w_next = "Whatever white balance approach you used here is working -- keep it for this kind of light."
    return aspect(warmth_score, w_works, w_imp, w_assess, w_edit, w_next)


def analyze_colour_harmony(img_rgb) -> dict:
    # Standard deviation across RGB channels
    r_std = float(np.std(img_rgb[:, :, 0]))
    g_std = float(np.std(img_rgb[:, :, 1]))
    b_std = float(np.std(img_rgb[:, :, 2]))
    channel_diff = abs(r_std - g_std) + abs(g_std - b_std) + abs(b_std - r_std)
    if channel_diff > 40:
        # Stricter palette score of 68 (down from 78)
        return aspect(
            68,
            "A diverse range of hues that makes the image energetic.",
            "The color palette is somewhat chaotic. Restricting the color palette to a complementary or triadic harmony will make it more professional.",
            "Clashing Palette",
            "Use color grading (split toning) to add teal in shadows and orange in highlights.",
            "Before you shoot, scan the frame for stray bright or saturated colors near the edges and reposition or remove them from the composition.",
        )
    # Stricter default score of 82 (down from 90)
    return aspect(
        82,
        "Pleasing and unified color palette that is easy on the eyes.",
        "Good color harmony. You can shift individual colors to enhance the mood.",
        "Harmonious Palette",
        "Slightly desaturate non-essential colors to make the main color pop.",
        "The color relationships in this frame are working well -- keep an eye out for similarly coordinated scenes.",
    )


def color_palette(img_rgb) -> list:
    """Five dominant colors (K-Means), largest share first."""
    small_rgb = cv2.resize(img_rgb, (100, 100))
    pixels = small_rgb.reshape(-1, 3).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    flags = cv2.KMEANS_RANDOM_CENTERS
    _, kmeans_labels, centers = cv2.kmeans(pixels, 5, None, criteria, 10, flags)

    unique_labels, counts = np.unique(kmeans_labels, return_counts=True)
    total_count = np.sum(counts)
    palette = []
    for i in range(len(centers)):
        cnt = counts[i] if i < len(counts) else 0
        pct = float(cnt) / total_count * 100
        rgb = centers[i].astype(int)
        hex_code = f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"
        palette.append({"hex": hex_code, "percentage": round(pct, 1)})
    palette.sort(key=lambda x: x["percentage"], reverse=True)
    return palette


def rgb_histogram(img_bgr) -> dict:
    # Camera-style per-channel histograms. One shared peak keeps the channels comparable,
    # so a red-heavy photo shows a taller red curve rather than three equal-height ones.
    rgb_counts = {
        name: cv2.calcHist([img_bgr], [channel], None, [RGB_HISTOGRAM_BINS], [0, 256]).flatten()
        for name, channel in (("r", 2), ("g", 1), ("b", 0))
    }
    rgb_peak = max(float(counts.max()) for counts in rgb_counts.values()) or 1.0
    return {
        name: [round(float(value) / rgb_peak * 100, 1) for value in counts]
        for name, counts in rgb_counts.items()
    }
