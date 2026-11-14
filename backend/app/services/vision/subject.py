import base64
import os
import urllib.request
from pathlib import Path

import cv2
import numpy as np


def download_cascade(filename: str) -> str:
    """
    Downloads Haar Cascade XML from OpenCV repository if not already cached.
    """
    # Bundled cascades keep production analysis offline and package-relative.
    cascade_dir = str(Path(__file__).resolve().parents[2] / "data" / "cascades")
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


def detect_faces(img_gray) -> list:
    """Haar-cascade faces with the eyes found inside each, in normalized boxes."""
    h, w = img_gray.shape[:2]
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
    return faces_detected


def saliency_map(img_bgr):
    """Frequency-tuned visual saliency, normalized to 0-255."""
    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    blurred_lab = cv2.GaussianBlur(img_lab, (5, 5), 0)
    mean_lab = np.mean(img_lab, axis=(0, 1))
    diff_lab = blurred_lab.astype(np.float32) - mean_lab
    saliency = np.sqrt(np.sum(diff_lab**2, axis=2))
    return cv2.normalize(saliency, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)


def saliency_map_b64(saliency_norm) -> str:
    h, w = saliency_norm.shape[:2]
    sal_w = 200
    sal_h = max(10, int(h * sal_w / w))
    small_sal = cv2.resize(saliency_norm, (sal_w, sal_h), interpolation=cv2.INTER_LINEAR)
    _, sal_buffer = cv2.imencode('.jpg', small_sal, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
    return base64.b64encode(sal_buffer).decode('utf-8')


def subject_centering(saliency_norm, faces_detected):
    """Return the centering summary and the unrounded subject centroid (scx, scy).
    The largest face wins over the saliency centroid."""
    h, w = saliency_norm.shape[:2]
    moments = cv2.moments(saliency_norm)
    if moments["m00"] > 0:
        scx = (moments["m10"] / moments["m00"]) / w
        scy = (moments["m01"] / moments["m00"]) / h
    else:
        scx, scy = 0.5, 0.5

    if faces_detected:
        largest_face = max(faces_detected, key=lambda f: f["box"][2] * f["box"][3])
        box = largest_face["box"]
        scx = box[0] + box[2]/2.0
        scy = box[1] + box[3]/2.0

    offset_x = scx - 0.5
    offset_y = scy - 0.5
    dist_from_center = np.sqrt(offset_x**2 + offset_y**2)
    is_centered = bool(dist_from_center < 0.15)

    centering = {
        "centroid": [round(scx, 3), round(scy, 3)],
        "offset_x": round(offset_x, 3),
        "offset_y": round(offset_y, 3),
        "is_centered": bool(is_centered)
    }
    return centering, scx, scy


def background_clutter(img_gray, faces_detected, saliency_norm) -> dict:
    """Edge density outside the subject (padded faces, else high-saliency pixels)."""
    h, w = img_gray.shape[:2]
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

    return {"score": round(clutter_score, 1), "description": bg_clutter_desc}


def sky_segmentation(img_bgr, img_gray) -> dict:
    """Smooth blue/white regions in the upper 65% of the frame."""
    h, w = img_gray.shape[:2]
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
    return {
        "percentage": round(sky_percentage, 1),
        "mask_b64": base64.b64encode(mask_buffer).decode('utf-8')
    }
