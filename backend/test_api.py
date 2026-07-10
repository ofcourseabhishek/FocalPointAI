import io
from PIL import Image
from fastapi.testclient import TestClient
from main import app, analyze_cv_heuristics

client = TestClient(app)

def test_cv_heuristics():
    print("Testing CV heuristics on a dummy image...")
    # Create a dummy solid red image
    img = Image.new('RGB', (100, 100), color = 'red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()
    
    result = analyze_cv_heuristics(img_bytes)
    print(f"Overall Rating: {result['overall_rating']}")
    print(f"Mode: {result['mode']}")
    print(f"Aspects keys: {list(result['aspects'].keys())}")
    print(f"Suggested edits: {result['suggested_edits']}")
    
    assert "colour" in result["aspects"]
    assert "brightness" in result["aspects"]
    assert "crop" in result["aspects"]
    assert result["overall_rating"] > 0
    print("CV heuristics test passed!")

def test_api_endpoint():
    print("\nTesting FastAPI /analyze endpoint...")
    # Create dummy image
    img = Image.new('RGB', (120, 120), color = 'blue')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()
    
    # Send post request
    response = client.post(
        "/analyze",
        data={"email": "test@focalpoint.ai"},
        files={"file": ("test.jpg", img_bytes, "image/jpeg")}
    )
    
    assert response.status_code == 200
    res_data = response.json()
    print("API Response overall rating:", res_data["overall_rating"])
    print("API Response mode:", res_data["mode"])
    print("API Response filename:", res_data["filename"])
    print("API Response email:", res_data["email"])
    print("FastAPI /analyze endpoint test passed!")

if __name__ == "__main__":
    test_cv_heuristics()
    test_api_endpoint()
