import io
import pytest
from PIL import Image, ImageDraw
import numpy as np

from app.services.vision.local_cv_engine import analyze_cv_heuristics

def create_test_image(orientation: int) -> bytes:
    img = Image.new('RGB', (200, 100), color='blue')
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, 50, 50], fill='red')
    
    exif = img.getexif()
    exif[274] = orientation
    
    buf = io.BytesIO()
    img.save(buf, format='JPEG', exif=exif)
    return buf.getvalue()

from app.api.routes.analysis import process_image

def test_orientation_1():
    data = create_test_image(1)
    _, metadata, _, oriented_rgb = process_image(data, None)
    res = analyze_cv_heuristics(oriented_rgb)
    cx = res['advanced_cv']['subject_centering']['centroid'][0]
    cy = res['advanced_cv']['subject_centering']['centroid'][1]
    # Top-Left
    assert cx < 0.5
    assert cy < 0.5
    assert res['coordinate_basis'] == 'display_oriented'
    assert res['coordinate_space'] == 'normalized'
    assert metadata['width'] == res['analyzed_width']
    assert metadata['height'] == res['analyzed_height']

def test_orientation_6():
    data = create_test_image(6)
    _, metadata, _, oriented_rgb = process_image(data, None)
    res = analyze_cv_heuristics(oriented_rgb)
    cx = res['advanced_cv']['subject_centering']['centroid'][0]
    cy = res['advanced_cv']['subject_centering']['centroid'][1]
    # Top-Right
    assert cx > 0.5
    assert cy < 0.5
    assert metadata['width'] == res['analyzed_width']
    assert metadata['height'] == res['analyzed_height']

def test_orientation_8():
    data = create_test_image(8)
    _, metadata, _, oriented_rgb = process_image(data, None)
    res = analyze_cv_heuristics(oriented_rgb)
    cx = res['advanced_cv']['subject_centering']['centroid'][0]
    cy = res['advanced_cv']['subject_centering']['centroid'][1]
    # Bottom-Left
    assert cx < 0.5
    assert cy > 0.5
    assert metadata['width'] == res['analyzed_width']
    assert metadata['height'] == res['analyzed_height']
