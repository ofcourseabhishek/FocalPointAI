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
    import os
    # Clear out any pre-existing email simulation files
    sim_file = os.path.join(os.path.dirname(__file__), "email_simulation.html")
    if os.path.exists(sim_file):
        os.remove(sim_file)
        
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
    print("API Response email_status:", res_data["email_status"])
    
    assert "email_status" in res_data
    assert res_data["email_status"] in ["sent", "simulated"]
    
    # Check that simulation file was created (since SMTP is not configured in tests)
    if res_data["email_status"] == "simulated":
        assert os.path.exists(sim_file), "Simulation file was not created!"
        with open(sim_file, "r", encoding="utf-8") as f:
            content = f.read()
            assert "test@focalpoint.ai" in content
            assert "test.jpg" in content
        print("Simulation email generated correctly and contains appropriate details.")
        
        # Cleanup
        os.remove(sim_file)
        
    print("FastAPI /analyze endpoint test passed!")


if __name__ == "__main__":
    test_cv_heuristics()
    test_api_endpoint()
