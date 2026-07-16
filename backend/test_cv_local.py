import io
from PIL import Image
from cv_fallback import analyze_cv_heuristics, analyze_advanced_cv
import numpy as np
import cv2

def test_local_cv():
    print("Running local CV unit tests...")
    
    # 1. Create a dummy solid image (red)
    img = Image.new('RGB', (300, 300), color = (200, 50, 50))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()
    
    # Run heuristics
    print("Testing red image...")
    res = analyze_cv_heuristics(img_bytes)
    
    print("Mode:", res.get("mode"))
    print("Overall Rating:", res.get("overall_rating"))
    assert "advanced_cv" in res, "Missing advanced_cv key"
    
    adv = res["advanced_cv"]
    print("Color Palette:")
    for col in adv["color_palette"]:
        print(f"  {col['hex']}: {col['percentage']}%")
        
    print("Centering Centroid:", adv["subject_centering"]["centroid"])
    print("Rule of Thirds Score:", adv["composition"]["rule_of_thirds"]["score"])
    print("Horizon Detected:", adv["horizon"]["detected"])
    print("Sky percentage:", adv["sky_segmentation"]["percentage"])
    print("Blur Is Blurry:", adv["blur"]["is_blurry"])
    print("Faces found:", len(adv["faces"]))
    
    # 2. Create an image with some text/shapes to test lines and edges
    img_shapes = Image.new('RGB', (400, 300), color = (255, 255, 255))
    # Convert to openCV to draw lines
    cv_img = np.array(img_shapes)
    # Draw a line (horizon-ish)
    cv2.line(cv_img, (0, 150), (400, 150), (0, 0, 0), 4)
    # Draw a diagonal line (leading line-ish)
    cv2.line(cv_img, (0, 300), (200, 150), (0, 0, 0), 3)
    # Save back
    _, buf = cv2.imencode('.jpg', cv_img)
    img_bytes_shapes = buf.tobytes()
    
    print("\nTesting shapes image...")
    res_shapes = analyze_cv_heuristics(img_bytes_shapes)
    adv_shapes = res_shapes["advanced_cv"]
    print("Horizon Detected:", adv_shapes["horizon"]["detected"])
    if adv_shapes["horizon"]["detected"]:
        print("Horizon line:", adv_shapes["horizon"]["line"])
        print("Horizon angle:", adv_shapes["horizon"]["angle"])
    print("Leading Lines Count:", len(adv_shapes["composition"]["leading_lines"]["lines"]))
    print("Negative Space Score:", adv_shapes["composition"]["negative_space"]["score"])
    
    print("\nAll local unit tests completed successfully!")

if __name__ == '__main__':
    test_local_cv()
