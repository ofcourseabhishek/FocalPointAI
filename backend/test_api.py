import io
import httpx
from PIL import Image

def test_no_exif():
    print("Testing image with NO EXIF data...")
    img = Image.new('RGB', (100, 100), color = 'red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()

    files = {'file': ('test.jpg', img_bytes, 'image/jpeg')}
    data = {'email': 'test@example.com'}

    with httpx.Client() as client:
        r = client.post('http://127.0.0.1:8000/analyze', files=files, data=data, timeout=30.0)
    print("Status Code:", r.status_code)
    try:
        res = r.json()
        print("Mode:", res.get("mode"))
        print("EXIF Analysis:", res.get("exif_analysis"))
        print("Overall Rating:", res.get("overall_rating"))
    except Exception as e:
        print("Failed to parse JSON:", e)
        print("Response text:", r.text[:500])

def test_with_exif():
    print("\nTesting image WITH EXIF data...")
    img = Image.new('RGB', (100, 100), color = 'blue')
    
    exif = img.getexif()
    exif[271] = "TestMake" # Make
    exif[272] = "TestModel" # Model
    
    # 0x8769 is ExifOffset (SubIFD)
    exif_ifd = exif.get_ifd(0x8769)
    exif_ifd[33434] = 0.004 # 1/250s
    exif_ifd[33437] = 2.8   # f/2.8
    exif_ifd[34855] = 6400  # ISO 6400
    exif_ifd[37386] = 50.0  # 50mm
    exif_ifd[42036] = "TestLens 50mm f/2.8" # LensModel
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG', exif=exif)
    img_bytes = img_byte_arr.getvalue()

    files = {'file': ('test_exif.jpg', img_bytes, 'image/jpeg')}
    data = {'email': 'test@example.com'}

    with httpx.Client() as client:
        r = client.post('http://127.0.0.1:8000/analyze', files=files, data=data, timeout=30.0)
    print("Status Code:", r.status_code)
    try:
        res = r.json()
        print("Mode:", res.get("mode"))
        print("EXIF Analysis Camera Settings:", res.get("exif_analysis", {}).get("camera_settings") if res.get("exif_analysis") else None)
        print("EXIF Analysis Intention:", res.get("exif_analysis", {}).get("photographer_intention") if res.get("exif_analysis") else None)
        print("EXIF Analysis Diagnostics:", res.get("exif_analysis", {}).get("diagnostics") if res.get("exif_analysis") else None)
        print("Overall Rating:", res.get("overall_rating"))
    except Exception as e:
        print("Failed to parse JSON:", e)
        print("Response text:", r.text[:500])

if __name__ == '__main__':
    test_no_exif()
    test_with_exif()
