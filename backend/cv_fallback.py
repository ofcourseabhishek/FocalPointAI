import cv2
import numpy as np
import base64
import os
import urllib.request

def download_cascade(filename: str) -> str:
    """
    Downloads Haar Cascade XML from OpenCV repository if not already cached.
    """
    cascade_dir = os.path.join(os.path.dirname(__file__), "cascades")
    os.makedirs(cascade_dir, exist_ok=True)
    local_path = os.path.join(cascade_dir, filename)
    if os.path.exists(local_path):
        return local_path
    
    url = f"https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/{filename}"
    try:
        print(f"Downloading Haar cascade {filename} from {url}...")
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            with open(local_path, "wb") as f:
                f.write(response.read())
        print(f"Saved Haar cascade to {local_path}")
        return local_path
    except Exception as e:
        print(f"Warning: Failed to download cascade {filename}: {e}")
        return None

def analyze_advanced_cv(image_bytes: bytes, img_bgr, img_gray, img_rgb) -> dict:
    """
    Advanced CV Analyzer using OpenCV/NumPy.
    Computes: face/eye detection, subject centering, horizon line, blur score,
    sky segmentation, background clutter, saliency map, color palette,
    and 6 composition rules (thirds, leading lines, symmetry/patterns, framing, negative space, golden ratio).
    """
    h, w, _ = img_bgr.shape

    # 1. Face & Eye Detection
    faces_detected = []
    face_xml = download_cascade("haarcascade_frontalface_default.xml")
    eye_xml = download_cascade("haarcascade_eye.xml")
    
    if hasattr(cv2, 'CascadeClassifier') and face_xml and os.path.exists(face_xml):
        try:
            face_cascade = cv2.CascadeClassifier(face_xml)
            faces = face_cascade.detectMultiScale(img_gray, 1.1, 4, minSize=(30, 30))
            
            eye_cascade = None
            if eye_xml and os.path.exists(eye_xml):
                eye_cascade = cv2.CascadeClassifier(eye_xml)
                
            for (x, y, fw, fh) in faces:
                box = [float(x)/w, float(y)/h, float(fw)/w, float(fh)/h]
                eyes_in_face = []
                eye_contact = False
                
                if eye_cascade is not None:
                    # Search inside face (upper region)
                    face_roi = img_gray[y:y+int(fh*0.65), x:x+fw]
                    eyes = eye_cascade.detectMultiScale(face_roi, 1.1, 3, minSize=(10, 10))
                    for (ex, ey, ew, eh) in eyes:
                        eyes_in_face.append([
                            float(x + ex)/w,
                            float(y + ey)/h,
                            float(ew)/w,
                            float(eh)/h
                        ])
                    if len(eyes) >= 2:
                        eye_contact = True
                        
                faces_detected.append({
                    "box": box,
                    "eyes": eyes_in_face,
                    "eye_contact": eye_contact
                })
        except Exception as e:
            print(f"Face/eye detection failed: {e}")

    # 2. Saliency Map (Frequency-Tuned Visual Saliency)
    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    blurred_lab = cv2.GaussianBlur(img_lab, (5, 5), 0)
    mean_lab = np.mean(img_lab, axis=(0, 1))
    diff_lab = blurred_lab.astype(np.float32) - mean_lab
    saliency = np.sqrt(np.sum(diff_lab**2, axis=2))
    saliency_norm = cv2.normalize(saliency, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # Compute saliency centroid
    moments = cv2.moments(saliency_norm)
    if moments["m00"] > 0:
        scx = (moments["m10"] / moments["m00"]) / w
        scy = (moments["m01"] / moments["m00"]) / h
    else:
        scx, scy = 0.5, 0.5

    # 3. Subject Centering
    if faces_detected:
        largest_face = max(faces_detected, key=lambda f: f["box"][2] * f["box"][3])
        box = largest_face["box"]
        scx = box[0] + box[2]/2.0
        scy = box[1] + box[3]/2.0

    offset_x = scx - 0.5
    offset_y = scy - 0.5
    dist_from_center = np.sqrt(offset_x**2 + offset_y**2)
    is_centered = bool(dist_from_center < 0.15)

    # 4. Horizon Detection
    edges = cv2.Canny(img_gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=50, minLineLength=int(w * 0.15), maxLineGap=20)
    
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

    # 5. Sky Segmentation
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    hsv_blurred = cv2.GaussianBlur(hsv, (5, 5), 0)
    
    # Blue sky
    lower_blue = np.array([90, 30, 50])
    upper_blue = np.array([135, 255, 255])
    blue_sky = cv2.inRange(hsv_blurred, lower_blue, upper_blue)
    
    # Cloudy/gray/white sky
    lower_white = np.array([0, 0, 180])
    upper_white = np.array([180, 25, 255])
    white_sky = cv2.inRange(hsv_blurred, lower_white, upper_white)
    
    sky_color = cv2.bitwise_or(blue_sky, white_sky)
    
    lap_mag = np.abs(cv2.Laplacian(img_gray, cv2.CV_32F))
    smooth_mask = lap_mag < 10.0
    sky_candidate = cv2.bitwise_and(sky_color, sky_color, mask=smooth_mask.astype(np.uint8) * 255)
    
    # Upper 65% frame limit
    y_indices, x_indices = np.indices((h, w))
    upper_mask = (y_indices < int(h * 0.65)).astype(np.uint8) * 255
    sky_mask = cv2.bitwise_and(sky_candidate, sky_candidate, mask=upper_mask)
    
    sky_pixels = np.sum(sky_mask > 0)
    sky_percentage = float(sky_pixels) / (w * h) * 100
    
    # Resize sky mask to 150px width for base64 payload
    mask_w = 150
    mask_h = max(10, int(h * mask_w / w))
    small_sky_mask = cv2.resize(sky_mask, (mask_w, mask_h), interpolation=cv2.INTER_NEAREST)
    _, mask_buffer = cv2.imencode('.png', small_sky_mask)
    sky_mask_b64 = base64.b64encode(mask_buffer).decode('utf-8')

    # 6. Background Clutter
    subject_mask = np.zeros_like(img_gray)
    if faces_detected:
        for f in faces_detected:
            box = f["box"]
            fx, fy, fw_b, fh_b = int(box[0]*w), int(box[1]*h), int(box[2]*w), int(box[3]*h)
            pad_x = int(fw_b * 0.25)
            pad_y = int(fh_b * 0.25)
            cv2.rectangle(subject_mask, 
                          (max(0, fx - pad_x), max(0, fy - pad_y)), 
                          (min(w, fx + fw_b + pad_x), min(h, fy + fh_b + pad_y)), 
                          255, -1)
    else:
        high_sal_mask = saliency_norm > 120
        subject_mask[high_sal_mask] = 255
        
    background_mask = cv2.bitwise_not(subject_mask)
    canny_bg = cv2.Canny(img_gray, 50, 150)
    canny_bg_masked = cv2.bitwise_and(canny_bg, canny_bg, mask=background_mask)
    
    bg_pixels = np.sum(background_mask > 0)
    if bg_pixels > 0:
        edge_pixels = np.sum(canny_bg_masked > 0)
        clutter_score = float(edge_pixels) / bg_pixels * 100
        clutter_score = min(100.0, clutter_score * 12.0)
    else:
        clutter_score = 0.0
        
    bg_clutter_desc = "Clean, out-of-focus background that isolates the subject nicely."
    if clutter_score > 60:
        bg_clutter_desc = "Highly cluttered background with strong distracting textures, which pulls attention away from the subject."
    elif clutter_score > 30:
        bg_clutter_desc = "Moderately busy background; some details could be softened or cropped to enhance subject focus."

    # 7. Saliency Map base64 JPEG (200px width)
    sal_w = 200
    sal_h = max(10, int(h * sal_w / w))
    small_sal = cv2.resize(saliency_norm, (sal_w, sal_h), interpolation=cv2.INTER_LINEAR)
    _, sal_buffer = cv2.imencode('.jpg', small_sal, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
    saliency_map_b64 = base64.b64encode(sal_buffer).decode('utf-8')

    # 8. Color Palette (K-Means, K=5)
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

    # 9. Composition Rules
    # Rule of Thirds
    dx_thirds = min(abs(scx - 0.333), abs(scx - 0.667))
    dy_thirds = min(abs(scy - 0.333), abs(scy - 0.667))
    if horizon_detected:
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

    # Leading Lines
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

    # Symmetry & Patterns
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

    # Framing
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

    # Negative Space
    neg_space_pct = float(np.sum(smooth_mask)) / (w * h) * 100
    neg_space_desc = "Minimal negative space. The frame is densely packed with elements, which can feel energetic but busy."
    if neg_space_pct > 65:
        neg_space_desc = f"Extremely high negative space ({neg_space_pct:.1f}%). Creates a very clean, minimalist, or isolated aesthetic."
    elif neg_space_pct > 40:
        neg_space_desc = f"Good balance of negative space ({neg_space_pct:.1f}%). The subject has breathing room, keeping the frame clean."

    # Golden Ratio
    golden_points = [(0.618, 0.618), (0.382, 0.618), (0.618, 0.382), (0.382, 0.382)]
    dists = [np.sqrt((scx - gx)**2 + (scy - gy)**2) for (gx, gy) in golden_points]
    min_golden_dist = min(dists)
    golden_ratio_score = min(100.0, max(0.0, 100.0 - min_golden_dist * 220.0))
    
    golden_desc = "The composition does not strongly align with the Golden Ratio spiral."
    if golden_ratio_score > 75:
        golden_desc = "Excellent alignment with the Golden Ratio/Fibonacci spiral focal points, evoking organic harmony."
    elif golden_ratio_score > 50:
        golden_desc = "Moderate alignment with the Golden Ratio focal points, conveying natural balance."

    laplacian = cv2.Laplacian(img_gray, cv2.CV_64F)
    variance_sharp = float(np.var(laplacian))

    return {
        "composition": {
            "rule_of_thirds": {
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
            },
            "leading_lines": {
                "score": round(leading_lines_score, 1),
                "description": leading_desc,
                "lines": leading_lines_drawn
            },
            "symmetry_patterns": {
                "score": round(max(symmetry_score, pattern_score), 1),
                "horizontal_symmetry_score": round(h_sym_score, 1),
                "vertical_symmetry_score": round(v_sym_score, 1),
                "pattern_score": round(pattern_score, 1),
                "is_pattern": bool(is_pattern),
                "description": sym_desc
            },
            "framing": {
                "score": round(framing_score, 1),
                "description": framing_desc
            },
            "negative_space": {
                "score": round(neg_space_pct, 1),
                "percentage": round(neg_space_pct, 1),
                "description": neg_space_desc
            },
            "golden_ratio": {
                "score": round(golden_ratio_score, 1),
                "description": golden_desc
            }
        },
        "faces": faces_detected,
        "subject_centering": {
            "centroid": [round(scx, 3), round(scy, 3)],
            "offset_x": round(offset_x, 3),
            "offset_y": round(offset_y, 3),
            "is_centered": bool(is_centered)
        },
        "horizon": {
            "detected": bool(horizon_detected),
            "y_position": round(horizon_y, 3) if horizon_detected else None,
            "angle": round(horizon_angle, 1) if horizon_detected else None,
            "is_level": bool(is_horizon_level) if horizon_detected else None,
            "line": horizon_line
        },
        "blur": {
            "score": round(variance_sharp, 1),
            "is_blurry": bool(variance_sharp < 80),
            "description": f"Image is {'blurry or has soft focus' if variance_sharp < 80 else 'sharp and crisp'} (Laplacian variance: {variance_sharp:.1f})."
        },
        "sky_segmentation": {
            "percentage": round(sky_percentage, 1),
            "mask_b64": sky_mask_b64
        },
        "background_clutter": {
            "score": round(clutter_score, 1),
            "description": bg_clutter_desc
        },
        "saliency_map_b64": saliency_map_b64,
        "color_palette": palette
    }

def analyze_cv_heuristics(image_bytes: bytes, exif_summary: dict = None) -> dict:
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

    # Run advanced CV analysis
    advanced_cv = analyze_advanced_cv(image_bytes, img_bgr, img_gray, img_rgb)

    # 1. Brightness
    mean_brightness = float(np.mean(img_gray))
    # Optimal brightness is around 125.
    if mean_brightness < 90:
        brightness_score = int(max(0, (mean_brightness / 90) * 70))
        b_works = "Captures a moody, low-key lighting scheme, keeping the brightest spots detailed."
        b_imp = "The image is underexposed, resulting in dark shadow areas losing critical details. A slight boost in exposure could bring out hidden elements."
        b_edit = "Increase exposure by +0.5 to +1.0 EV."
    elif mean_brightness > 160:
        brightness_score = int(max(0, ((255 - mean_brightness) / 95) * 70))
        b_works = "Generates a bright, airy, high-key feel that conveys a clean, modern aesthetic."
        b_imp = "The image is overexposed, leading to blown-out highlights where details are permanently lost (e.g., in skies or white shirts)."
        b_edit = "Reduce exposure by -0.4 to -0.8 EV and pull down highlights."
    else:
        diff = abs(mean_brightness - 125)
        # Optimal brightness range. We use a stricter baseline of 75 (down from 85).
        brightness_score = int(75 + (25 - (diff / 35) * 25))
        brightness_score = min(100, max(0, brightness_score))
        b_works = "Well-balanced exposure that keeps the image looking natural and captures a full range of tones."
        b_imp = "Exposure is solid, though you could experiment with localized dodge and burn to create more depth."
        b_edit = "Apply minor contrast adjustments to enhance depth."

    # 2. Contrast
    std_contrast = float(np.std(img_gray))
    # Optimal standard deviation is around 50-70.
    if std_contrast < 40:
        contrast_score = int(max(0, (std_contrast / 40) * 70))
        c_works = "Low contrast gives a soft, vintage, or misty atmosphere that works well for dreamy portraits or foggy scenes."
        c_imp = "The image looks a bit flat and lacks punch. Increasing contrast would help separate the subject from the background."
        c_edit = "Increase contrast by +15 or adjust the black point to deepen shadows."
    elif std_contrast > 75:
        contrast_score = int(max(0, (1 - (std_contrast - 75) / 52) * 70))
        c_works = "High contrast creates dramatic impact, bold silhouettes, and strong graphic shapes."
        c_imp = "The contrast is very harsh, which can make transition zones look abrupt and clip the highlights/shadows."
        c_edit = "Decrease contrast by -10, or soften the shadows."
    else:
        diff = abs(std_contrast - 58)
        # Stricter baseline of 75 (down from 85)
        contrast_score = int(75 + (25 - (diff / 18) * 25))
        contrast_score = min(100, max(0, contrast_score))
        c_works = "Excellent tonal separation. The subject pops nicely from the background without losing fine detail in shadows and highlights."
        c_imp = "Contrast is well managed. You can add a vignette to draw more focus to the center."
        c_edit = "Add a subtle post-crop vignette (-5 to -10)."

    # 3. Saturation
    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    h_ch, s_ch, v_ch = cv2.split(img_hsv)
    mean_sat = float(np.mean(s_ch))
    if mean_sat < 40:
        sat_score = int(max(0, (mean_sat / 40) * 70))
        s_works = "A muted, pastel-like, or documentary feel that looks realistic and sophisticated."
        s_imp = "Colors feel a bit lifeless. A slight boost in saturation or vibrance could make the key colors more engaging."
        s_edit = "Increase vibrance by +15 and saturation by +5."
    elif mean_sat > 150:
        sat_score = int(max(0, ((255 - mean_sat) / 105) * 70))
        s_works = "Vibrant and eye-catching palette with high visual energy."
        s_imp = "Colors are oversaturated, which looks artificial and causes color clipping in highly saturated regions."
        s_edit = "Reduce overall saturation by -12 and use vibrance instead."
    else:
        diff = abs(mean_sat - 90)
        # Stricter baseline of 75 (down from 85)
        sat_score = int(75 + (25 - (diff / 60) * 25))
        sat_score = min(100, max(0, sat_score))
        s_works = "Colors are vivid yet realistic, rendering a pleasing and lifelike representation."
        s_imp = "Saturation is well balanced. Consider target-adjusting specific hues to create better color harmony."
        s_edit = "Use HSL adjustments to slightly shift greens toward teal or warm up yellows."

    # 4. Warmth (White Balance heuristic based on R-B difference)
    r_mean = float(np.mean(img_rgb[:, :, 0]))
    b_mean = float(np.mean(img_rgb[:, :, 2]))
    warmth_val = r_mean - b_mean  # Positive is warm (reddish), negative is cool (bluish)
    if warmth_val < -15:
        # Stricter baseline of 60 (down from 75)
        warmth_score = int(min(100, max(0, 60 + (30 - abs(warmth_val + 30) / 40 * 30))))
        w_works = "A cool color temperature that emphasizes a clean, clinical, modern, or wintery atmosphere."
        w_imp = "The image has a noticeable blue cast, which can make skin tones look pale and landscapes look cold."
        w_edit = "Increase temperature slider by +8 (warm it up) to restore natural tones."
    elif warmth_val > 25:
        # Stricter baseline of 60 (down from 75)
        warmth_score = int(min(100, max(0, 60 + (30 - abs(warmth_val - 40) / 40 * 30))))
        w_works = "A warm, golden-hour tone that creates feelings of nostalgia, comfort, and intimacy."
        w_imp = "The image is overly warm or has a heavy yellow cast. Neutral white surfaces appear yellow."
        w_edit = "Decrease temperature slider by -5 to -10, or adjust the tint slightly toward green/magenta."
    else:
        # Stricter baseline of 80 (down from 90)
        warmth_score = int(min(100, max(0, 80 + (20 - abs(warmth_val) / 20 * 20))))
        w_works = "Color temperature is technically correct and whites appear clean."
        w_imp = "White balance looks highly accurate. You could creatively shift it warmer/cooler for stylistic effect."
        w_edit = "Add a warm gradient map or golden filter in post-processing for creative effect."

    # 5. Details (Structure & Sharpening based on Laplacian variance)
    laplacian = cv2.Laplacian(img_gray, cv2.CV_64F)
    variance_sharp = float(np.var(laplacian))
    if variance_sharp < 80:
        # Stricter baseline of 60 (down from 75)
        details_score = int(min(60, max(0, (variance_sharp / 80) * 60)))
        d_works = "A soft focus that works well for dreamy portraiture or creative motion blur."
        d_imp = "The image lacks critical sharpness, possibly due to motion blur, missed focus, or lens diffraction. Add structural clarity or sharpening."
        d_edit = "Increase sharpening by +20 and add +10 structure/clarity."
    elif variance_sharp > 500:
        # Stricter cap of 88 (down from 95)
        details_score = 88
        d_works = "Incredibly crisp details, showing fine textures and sharp edges."
        d_imp = "Detail retention is excellent. Ensure sharpening artifacts (halo effects around edges) are not visible."
        d_edit = "Apply a masking slider to sharpening so it only affects high-contrast edges, leaving flat areas smooth."
    else:
        # Stricter range of 70 to 95 (down from 80 to 100)
        details_score = int(min(95, max(0, 70 + (25 * (variance_sharp - 80) / 420))))
        d_works = "Natural and clean detail rendering without harsh artificial sharpening outlines."
        d_imp = "Good sharpness. You could enhance local contrast (micro-contrast) in key areas to draw focus."
        d_edit = "Use a local brush to add +15 clarity to the main subject."

    # 6. Highlights
    high_pixels = float(np.sum(img_gray > 230)) / img_gray.size
    if high_pixels > 0.10:
        # Stricter highlights score calculation
        high_score = int(50 + (35 * (1 - min(1.0, high_pixels * 2))))
        h_works = "Bright highlights create a high-contrast, glowing feel."
        h_imp = "Large areas of highlights are clipped (blown out), losing detail in skies or bright surfaces."
        h_edit = "Pull down highlights slider by -30 to -50."
    else:
        # Stricter default score of 85 (down from 92)
        high_score = 85
        h_works = "Highlights are well controlled, retaining full texture in bright areas (like clouds or snow)."
        h_imp = "Highlights are well within bounds. You could boost them slightly to create specular highlights for metallic or wet surfaces."
        h_edit = "Boost whites by +5 for extra sparkle."

    # 7. Shadows
    shadow_pixels = float(np.sum(img_gray < 25)) / img_gray.size
    if shadow_pixels > 0.15:
        # Stricter shadows score calculation
        shadow_score = int(55 + (30 * (1 - min(1.0, shadow_pixels * 2))))
        sh_works = "Rich, deep blacks create a sense of mystery, weight, and silhouette."
        sh_imp = "Shadow details are crushed, hiding texture in dark clothing, foliage, or nighttime scenes."
        sh_edit = "Lift shadows slider by +20 to +40."
    else:
        # Stricter default score of 86 (down from 94)
        shadow_score = 86
        sh_works = "Excellent shadow detail recovery. Textures are clearly visible in the dark portions of the frame."
        sh_imp = "Shadow depth is good. You can slightly drop the black point to give a cleaner black level if needed."
        sh_edit = "Slightly drop black levels by -3 to add a solid anchor."

    # 8. Ambiance
    # Estimated by standard deviation of midtones (50 to 200)
    midtones = img_gray[(img_gray > 50) & (img_gray < 200)]
    mid_std = float(np.std(midtones)) if midtones.size > 0 else 30
    if mid_std < 30:
        # Stricter low-ambiance score of 60 (down from 70)
        amb_score = 60
        amb_works = "Even, diffuse lighting that creates a flat, predictable atmosphere."
        amb_imp = "Lacks dimensional lighting or ambient glow. Adding localized exposure adjustments can simulate ambient lighting."
        amb_edit = "Use radial filters to simulate light direction or add a soft glow."
    else:
        # Stricter default score of 80 (down from 88)
        amb_score = 80
        amb_works = "Rich light interactions with strong presence of ambient light, giving depth."
        amb_imp = "The ambiance is strong. Watch out for distracting highlights in the background."
        amb_edit = "Keep ambient details high while vignetting slightly."

    # 9. Colour harmony / palette
    # Standard deviation across RGB channels
    r_std = float(np.std(img_rgb[:, :, 0]))
    g_std = float(np.std(img_rgb[:, :, 1]))
    b_std = float(np.std(img_rgb[:, :, 2]))
    channel_diff = abs(r_std - g_std) + abs(g_std - b_std) + abs(b_std - r_std)
    if channel_diff > 40:
        # Stricter palette score of 68 (down from 78)
        col_score = 68
        col_works = "A diverse range of hues that makes the image energetic."
        col_imp = "The color palette is somewhat chaotic. Restricting the color palette to a complementary or triadic harmony will make it more professional."
        col_edit = "Use color grading (split toning) to add teal in shadows and orange in highlights."
    else:
        # Stricter default score of 82 (down from 90)
        col_score = 82
        col_works = "Pleasing and unified color palette that is easy on the eyes."
        col_imp = "Good color harmony. You can shift individual colors to enhance the mood."
        col_edit = "Slightly desaturate non-essential colors to make the main color pop."

    # 10. Crop & Composition
    # Aspect ratios
    ratio = w / h
    aspect_str = f"{w}x{h}"
    
    thirds_score = advanced_cv["composition"]["rule_of_thirds"]["score"]
    centering_info = advanced_cv["subject_centering"]
    
    if centering_info["is_centered"]:
        crop_works = "Subject is well-centered in the frame, creating a strong focal anchor."
        crop_imp = "Centering works, but try placing the subject on a third-line intersection for a more dynamic feel."
        crop_score = int(80 + (100 - thirds_score) * 0.1)
    else:
        if thirds_score > 70:
            crop_works = "Excellent off-center subject placement adhering to the Rule of Thirds."
            crop_imp = "The crop is well balanced. Ensure there is enough negative space in front of the subject's gaze."
            crop_score = int(thirds_score)
        else:
            crop_works = "The subject is positioned off-center."
            crop_imp = "The subject is slightly off-grid but not centered. Try aligning them with a vertical grid line."
            crop_score = int(60 + thirds_score * 0.2)
            
    crop_score = min(100, max(0, crop_score))
    crop_edit = "Crop slightly to shift subject placement closer to a thirds grid line."

    # Calculate overall rating
    scores = [brightness_score, contrast_score, sat_score, warmth_score, details_score,
              high_score, shadow_score, amb_score, col_score, crop_score]
    overall_rating = round(sum(scores) / len(scores) / 10.0, 1)

    # Compile the final suggestions — keyed to the aspect they belong to
    all_edits_keyed = [
        {"key": "brightness",  "text": b_edit},
        {"key": "contrast",    "text": c_edit},
        {"key": "saturation",  "text": s_edit},
        {"key": "warmth",      "text": w_edit},
        {"key": "details",     "text": d_edit},
        {"key": "highlights",  "text": h_edit},
        {"key": "shadows",     "text": sh_edit},
        {"key": "ambiance",    "text": amb_edit},
        {"key": "colour",      "text": col_edit},
        {"key": "crop",        "text": crop_edit},
    ]
    # De-duplicate by text and keep all unique entries
    seen_texts = set()
    suggested_edits = []
    for e in all_edits_keyed:
        if e["text"] not in seen_texts:
            seen_texts.add(e["text"])
            suggested_edits.append(e)

    # EXIF-based camera settings diagnostics
    exif_analysis = None
    
    # Check if we have valid raw exif settings
    raw_exif = exif_summary.get("raw", {}) if exif_summary else {}
    formatted_exif = exif_summary.get("formatted", {}) if exif_summary else {}
    
    has_exif = any(val is not None for val in raw_exif.values()) if raw_exif else False
    
    if has_exif:
        shutter_speed = formatted_exif.get("shutter_speed")
        iso = raw_exif.get("iso")
        aperture = formatted_exif.get("aperture")
        focal_length_str = formatted_exif.get("focal_length")
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

        exif_analysis = {
            "camera_settings": {
                "shutter_speed": shutter_speed,
                "iso": int(iso) if iso else None,
                "aperture": aperture,
                "focal_length": focal_length_str,
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

    # Synthesize first impression
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

    return {
        "overall_rating": overall_rating,
        "first_impression": first_impression_text,
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
        "exif_analysis": exif_analysis,
        "advanced_cv": advanced_cv,
        "mode": "computer_vision"
    }
