import cv2
import numpy as np

from .aspect import aspect


def analyze_saturation(img_bgr):
    """Return the saturation aspect and the mean HSV saturation."""
    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    mean_sat = float(np.mean(img_hsv[:, :, 1]))
    if mean_sat < 40:
        sat_score = int(max(0, (mean_sat / 40) * 70))
        s_works = "A muted, pastel-like, or documentary feel that looks realistic and sophisticated."
        s_imp = "Colors feel a bit lifeless. A slight boost in saturation or vibrance could make the key colors more engaging."
        s_edit = "Increase vibrance by +15 and saturation by +5."
        s_assess = "Undersaturated"
        s_next = "If more color punch is the goal, shoot in richer light (golden hour, or a scene with naturally saturated colors) rather than flat midday light, which tends to wash colors out."
    elif mean_sat > 150:
        sat_score = int(max(0, ((255 - mean_sat) / 105) * 70))
        s_works = "Vibrant and eye-catching palette with high visual energy."
        s_imp = "Colors are oversaturated, which looks artificial and causes color clipping in highly saturated regions."
        s_edit = "Reduce overall saturation by -12 and use vibrance instead."
        s_assess = "Oversaturated"
        s_next = "If your camera's picture profile is set to \"vivid\" or similar, switch to a neutral/standard profile so color intensity is easier to control later."
    else:
        diff = abs(mean_sat - 90)
        # Stricter baseline of 75 (down from 85)
        sat_score = int(75 + (25 - (diff / 60) * 25))
        sat_score = min(100, max(0, sat_score))
        s_works = "Colors are vivid yet realistic, rendering a pleasing and lifelike representation."
        s_imp = "Saturation is well balanced. Consider target-adjusting specific hues to create better color harmony."
        s_edit = "Use HSL adjustments to slightly shift greens toward teal or warm up yellows."
        s_assess = "Balanced Saturation"
        s_next = "Color intensity is landing well here -- no change needed for this kind of scene."
    return aspect(sat_score, s_works, s_imp, s_assess, s_edit, s_next), mean_sat
