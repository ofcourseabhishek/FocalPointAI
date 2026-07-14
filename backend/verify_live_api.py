import httpx

def test_live_server():
    print("Testing live FastAPI server at http://127.0.0.1:8000/analyze...")
    url = "http://127.0.0.1:8000/analyze"
    email = "learner@focalpoint.ai"
    
    try:
        import os
        from PIL import Image
        import io
        
        # Check if the sunset test image exists, if not create a dummy one
        img_path = "../test_sunset.jpg"
        if not os.path.exists(img_path):
            print("test_sunset.jpg not found, creating a dummy image...")
            img = Image.new('RGB', (400, 300), color = (235, 120, 40)) # Warm sunset orange color
            img.save(img_path, format='JPEG')
            
        with open(img_path, "rb") as f:
            file_bytes = f.read()
            
        files = {
            "file": ("test_sunset.jpg", file_bytes, "image/jpeg")
        }
        data = {
            "email": email
        }
        
        response = httpx.post(url, data=data, files=files, timeout=60.0)
        
        print("Status Code:", response.status_code)
        if response.status_code == 200:
            res_json = response.json()
            print("--- Analysis Results ---")
            print("Overall Rating:", res_json.get("overall_rating"))
            print("Mode:", res_json.get("mode"))
            print("Email:", res_json.get("email"))
            print("Filename:", res_json.get("filename"))
            print("\nAspects Breakdowns:")
            for aspect, details in res_json.get("aspects", {}).items():
                print(f"  - {aspect.capitalize()}: Rating {details['rating']}/100")
                print(f"    Works: {details['what_works']}")
                print(f"    Improve: {details['what_could_be_improved']}")
            print("\nSuggested Edits:")
            for edit in res_json.get("suggested_edits", []):
                print(f"  * {edit}")
            print("\nVerification Succeeded!")
        else:
            print("Verification Failed! Status code:", response.status_code)
            print("Response:", response.text)
            
    except Exception as e:
        print("Verification Failed! Error:", e)

if __name__ == '__main__':
    test_live_server()
