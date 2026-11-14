from math import gcd

import cv2
import numpy as np


def simplified_aspect_ratio(width: int, height: int) -> str:
    """Reduce pixel dimensions to a friendly ratio string, e.g. 6000x4000 -> '3:2'."""
    if not width or not height:
        return ""
    divisor = gcd(int(width), int(height)) or 1
    return f"{int(width) // divisor}:{int(height) // divisor}"


def dominant_composition_technique(composition: dict, is_centered: bool) -> str:
    """Name the strongest detected composition technique for display, favoring a
    clearly centered subject over a marginal technique score."""
    candidates = {
        "Rule of Thirds": (composition.get("rule_of_thirds") or {}).get("score", 0),
        "Leading Lines": (composition.get("leading_lines") or {}).get("score", 0),
        "Symmetry": (composition.get("symmetry_patterns") or {}).get("score", 0),
        "Framing": (composition.get("framing") or {}).get("score", 0),
        "Golden Ratio": (composition.get("golden_ratio") or {}).get("score", 0),
    }
    label, score = max(candidates.items(), key=lambda item: item[1]) if candidates else (None, 0)
    if is_centered and score < 70:
        return "Centered Composition"
    return label if score >= 60 else "Off-Center Placement"


def detect_lines(img_gray):
    """Probabilistic Hough segments shared by horizon and leading-line detection."""
    w = img_gray.shape[1]
    edges = cv2.Canny(img_gray, 50, 150, apertureSize=3)
    return cv2.HoughLinesP(edges, 1, np.pi/180, threshold=50, minLineLength=int(w * 0.15), maxLineGap=20)


def analyze_horizon(lines, w, h):
    """Return the horizon summary and its unrounded y position (None if not found)."""
    horizon_detected = False
    horizon_line = None
    horizon_angle = 0.0
    horizon_y = 0.5
    is_horizon_level = True

    if lines is not None:
        horizontal_lines = []
        for line in lines:
            pts = line.ravel()
            if len(pts) != 4:
                continue
            x1, y1, x2, y2 = pts
            dx = x2 - x1
            dy = y2 - y1
            angle = np.arctan2(dy, dx) * 180 / np.pi
            if angle > 90:
                angle -= 180
            elif angle < -90:
                angle += 180

            if abs(angle) < 10:
                length = np.sqrt(dx**2 + dy**2)
                horizontal_lines.append((length, angle, (x1, y1, x2, y2)))

        if horizontal_lines:
            horizontal_lines.sort(key=lambda x: x[0], reverse=True)
            longest_len, longest_ang, longest_pts = horizontal_lines[0]
            x1, y1, x2, y2 = longest_pts
            horizon_detected = True
            horizon_angle = float(longest_ang)
            horizon_y = float((y1 + y2) / 2.0) / h
            is_horizon_level = bool(abs(horizon_angle) < 1.5)
            horizon_line = {
                "start": [float(x1)/w, float(y1)/h],
                "end": [float(x2)/w, float(y2)/h]
            }

    horizon = {
        "detected": bool(horizon_detected),
        "y_position": round(horizon_y, 3) if horizon_detected else None,
        "angle": round(horizon_angle, 1) if horizon_detected else None,
        "is_level": bool(is_horizon_level) if horizon_detected else None,
        "line": horizon_line
    }
    return horizon, (horizon_y if horizon_detected else None)


def _rule_of_thirds(scx, scy, horizon_y) -> dict:
    dx_thirds = min(abs(scx - 0.333), abs(scx - 0.667))
    dy_thirds = min(abs(scy - 0.333), abs(scy - 0.667))
    if horizon_y is not None:
        dy_horiz_thirds = min(abs(horizon_y - 0.333), abs(horizon_y - 0.667))
        thirds_score = 100 - min(dx_thirds + dy_thirds, dy_horiz_thirds) * 180
    else:
        thirds_score = 100 - (dx_thirds + dy_thirds) * 180
    thirds_score = min(100.0, max(0.0, thirds_score))

    thirds_desc = "The subject is centered or placed off-grid. Placing key visual elements along the vertical/horizontal thirds can create more dynamic tension."
    if thirds_score > 75:
        thirds_desc = "Excellent rule of thirds application; subjects or horizon align cleanly with the grid lines/intersections."
    elif thirds_score > 50:
        thirds_desc = "Good rule of thirds application, keeping the composition visually balanced."

    return {
        "score": round(thirds_score, 1),
        "description": thirds_desc,
        "grid_lines": {
            "horizontal": [0.333, 0.667],
            "vertical": [0.333, 0.667]
        },
        "intersections": [
            {"x": 0.333, "y": 0.333},
            {"x": 0.333, "y": 0.667},
            {"x": 0.667, "y": 0.333},
            {"x": 0.667, "y": 0.667}
        ]
    }


def _leading_lines(lines, w, h, scx, scy) -> dict:
    leading_lines_score = 0.0
    leading_lines_drawn = []
    if lines is not None:
        matching_lines_count = 0
        for line in lines:
            pts = line.ravel()
            if len(pts) != 4:
                continue
            x1_l, y1_l, x2_l, y2_l = pts
            lx1_n, ly1_n = float(x1_l)/w, float(y1_l)/h
            lx2_n, ly2_n = float(x2_l)/w, float(y2_l)/h

            dx_l = lx2_n - lx1_n
            dy_l = ly2_n - ly1_n
            length_l = np.sqrt(dx_l**2 + dy_l**2)
            if length_l < 0.08:
                continue

            ang_rad = np.arctan2(dy_l, dx_l)
            ang_deg = abs(ang_rad * 180 / np.pi)
            if (15 < ang_deg < 75) or (105 < ang_deg < 165):
                A = ly1_n - ly2_n
                B = lx2_n - lx1_n
                C = lx1_n*ly2_n - lx2_n*ly1_n
                denom_l = np.sqrt(A**2 + B**2)
                if denom_l > 0:
                    dist_to_subj = abs(A*scx + B*scy + C) / denom_l
                    if dist_to_subj < 0.12:
                        matching_lines_count += 1
                        leading_lines_drawn.append({
                            "start": [lx1_n, ly1_n],
                            "end": [lx2_n, ly2_n]
                        })
        leading_lines_score = min(100.0, matching_lines_count * 20.0)

    leading_desc = "No clear leading lines detected pointing toward the subject."
    if leading_lines_score > 60:
        leading_desc = f"Detected {len(leading_lines_drawn)} strong diagonal leading lines guiding the viewer's eye directly to the main subject."
    elif leading_lines_score > 30:
        leading_desc = "Some diagonal elements are present, providing subtle direction for the viewer's eye."

    return {
        "score": round(leading_lines_score, 1),
        "description": leading_desc,
        "lines": leading_lines_drawn
    }


def _symmetry_patterns(img_gray) -> dict:
    sym_img = cv2.resize(img_gray, (120, 120))
    left_side = sym_img[:, :60]
    right_side = sym_img[:, 60:]
    right_side_flipped = cv2.flip(right_side, 1)
    h_sym_score = float(np.mean(cv2.matchTemplate(left_side, right_side_flipped, cv2.TM_CCOEFF_NORMED)))
    h_sym_score = max(0.0, h_sym_score) * 100

    top_side = sym_img[:60, :]
    bottom_side = sym_img[60:, :]
    bottom_side_flipped = cv2.flip(bottom_side, 0)
    v_sym_score = float(np.mean(cv2.matchTemplate(top_side, bottom_side_flipped, cv2.TM_CCOEFF_NORMED)))
    v_sym_score = max(0.0, v_sym_score) * 100

    grid_rows, grid_cols = 4, 4
    cell_h, cell_w = 30, 30
    canny_sym = cv2.Canny(sym_img, 50, 150)
    densities = []
    for r_idx in range(grid_rows):
        for c_idx in range(grid_cols):
            cell = canny_sym[r_idx*cell_h:(r_idx+1)*cell_h, c_idx*cell_w:(c_idx+1)*cell_w]
            densities.append(np.mean(cell > 0))
    avg_density = np.mean(densities)
    std_density = np.std(densities)
    is_pattern = avg_density > 0.03 and std_density < 0.02
    pattern_score = 100 * (1.0 - std_density / max(0.01, avg_density + std_density)) if avg_density > 0.02 else 0.0
    pattern_score = min(100.0, max(0.0, pattern_score))

    symmetry_score = max(h_sym_score, v_sym_score)
    sym_desc = "Low symmetry or structural pattern detected. This works fine for dynamic, informal, or asymmetrical subjects."
    if is_pattern and pattern_score > 70:
        sym_desc = "Strong repeating texture pattern detected across the image, creating a rhythmic and harmonious structure."
    elif symmetry_score > 78:
        sym_desc = f"Excellent {'horizontal' if h_sym_score > v_sym_score else 'vertical'} symmetry detected, projecting balance, order, and classical harmony."

    return {
        "score": round(max(symmetry_score, pattern_score), 1),
        "horizontal_symmetry_score": round(h_sym_score, 1),
        "vertical_symmetry_score": round(v_sym_score, 1),
        "pattern_score": round(pattern_score, 1),
        "is_pattern": bool(is_pattern),
        "description": sym_desc
    }


def _framing(img_gray) -> dict:
    scale_img = cv2.resize(img_gray, (100, 100))
    center_roi = scale_img[25:75, 25:75]
    mask_border = np.ones((100, 100), dtype=np.uint8) * 255
    mask_border[25:75, 25:75] = 0
    mean_center = np.mean(center_roi)
    mean_border = np.mean(scale_img[mask_border > 0])
    framing_diff = max(0.0, float(mean_center - mean_border))
    canny_scale = cv2.Canny(scale_img, 50, 150)
    boundary_mask = np.zeros((100, 100), dtype=np.uint8)
    cv2.rectangle(boundary_mask, (22, 22), (78, 78), 255, 3)
    boundary_edges = np.mean(canny_scale[boundary_mask > 0] > 0)
    framing_score = min(100.0, (framing_diff / 255.0 * 120.0) + (boundary_edges * 800.0))

    framing_desc = "No natural framing elements (e.g. doorways, windows, branches) detected surrounding the subject."
    if framing_score > 55:
        framing_desc = "Strong natural framing detected. The surrounding elements guide the eye inward and add depth."

    return {"score": round(framing_score, 1), "description": framing_desc}


def _negative_space(img_gray) -> dict:
    h, w = img_gray.shape[:2]
    smooth_mask = np.abs(cv2.Laplacian(img_gray, cv2.CV_32F)) < 10.0
    neg_space_pct = float(np.sum(smooth_mask)) / (w * h) * 100
    neg_space_desc = "Minimal negative space. The frame is densely packed with elements, which can feel energetic but busy."
    if neg_space_pct > 65:
        neg_space_desc = f"Extremely high negative space ({neg_space_pct:.1f}%). Creates a very clean, minimalist, or isolated aesthetic."
    elif neg_space_pct > 40:
        neg_space_desc = f"Good balance of negative space ({neg_space_pct:.1f}%). The subject has breathing room, keeping the frame clean."

    return {
        "score": round(neg_space_pct, 1),
        "percentage": round(neg_space_pct, 1),
        "description": neg_space_desc
    }


def _golden_ratio(scx, scy) -> dict:
    golden_points = [(0.618, 0.618), (0.382, 0.618), (0.618, 0.382), (0.382, 0.382)]
    dists = [np.sqrt((scx - gx)**2 + (scy - gy)**2) for (gx, gy) in golden_points]
    min_golden_dist = min(dists)
    golden_ratio_score = min(100.0, max(0.0, 100.0 - min_golden_dist * 220.0))

    golden_desc = "The composition does not strongly align with the Golden Ratio spiral."
    if golden_ratio_score > 75:
        golden_desc = "Excellent alignment with the Golden Ratio/Fibonacci spiral focal points, evoking organic harmony."
    elif golden_ratio_score > 50:
        golden_desc = "Moderate alignment with the Golden Ratio focal points, conveying natural balance."

    return {"score": round(golden_ratio_score, 1), "description": golden_desc}


def analyze_composition_rules(img_gray, lines, scx, scy, horizon_y) -> dict:
    """Score the six composition rules around the subject centroid (scx, scy)."""
    h, w = img_gray.shape[:2]
    return {
        "rule_of_thirds": _rule_of_thirds(scx, scy, horizon_y),
        "leading_lines": _leading_lines(lines, w, h, scx, scy),
        "symmetry_patterns": _symmetry_patterns(img_gray),
        "framing": _framing(img_gray),
        "negative_space": _negative_space(img_gray),
        "golden_ratio": _golden_ratio(scx, scy),
    }


def analyze_crop(composition: dict, is_centered: bool, original_w: int, original_h: int):
    """Return the crop aspect and the composition aspect (same guidance, but the
    composition aspect names the dominant technique instead of carrying a score)."""
    thirds_score = composition["rule_of_thirds"]["score"]

    if is_centered:
        crop_works = "Subject is well-centered in the frame, creating a strong focal anchor."
        crop_imp = "Centering works, but try placing the subject on a third-line intersection for a more dynamic feel."
        crop_score = int(80 + (100 - thirds_score) * 0.1)
        crop_assess = "Centered Composition"
        crop_next = "Centering reads as deliberate here. If you want more dynamic tension in similar shots, try the rule-of-thirds grid on your camera's live view and place the subject on an intersection instead."
    elif thirds_score > 70:
        crop_works = "Excellent off-center subject placement adhering to the Rule of Thirds."
        crop_imp = "The crop is well balanced. Ensure there is enough negative space in front of the subject's gaze."
        crop_score = int(thirds_score)
        crop_assess = "Rule of Thirds"
        crop_next = "This placement is working well -- keep using your grid overlay to repeat it."
    else:
        crop_works = "The subject is positioned off-center."
        crop_imp = "The subject is slightly off-grid but not centered. Try aligning them with a vertical grid line."
        crop_score = int(60 + thirds_score * 0.2)
        crop_assess = "Off-Center Crop"
        crop_next = "Turn on your camera's rule-of-thirds gridlines and place the subject deliberately on a line or intersection rather than leaving it to chance."

    crop_score = min(100, max(0, crop_score))
    crop_edit = "Crop slightly to shift subject placement closer to a thirds grid line."
    composition_value = dominant_composition_technique(composition, is_centered)

    def shaped(rating, assessment, value):
        return {
            "rating": rating,
            "what_works": crop_works,
            "what_could_be_improved": crop_imp,
            "assessment": assessment,
            "value": value,
            "saw": crop_imp,
            "improve": crop_edit,
            "try_this": crop_next,
        }

    crop = shaped(crop_score, crop_assess, simplified_aspect_ratio(original_w, original_h))
    return crop, shaped(None, composition_value, composition_value)
