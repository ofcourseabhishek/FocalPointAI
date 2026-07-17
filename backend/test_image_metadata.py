import io
import unittest

from fastapi.testclient import TestClient
from PIL import Image

from main import app, get_camera_device_name


class ImageMetadataTests(unittest.TestCase):
    def test_make_and_model_are_combined_without_brand_duplication(self):
        self.assertEqual(
            get_camera_device_name({"Make": "Apple", "Model": "iPhone 15 Pro"}),
            "Apple iPhone 15 Pro",
        )
        self.assertEqual(
            get_camera_device_name({"Make": "Canon", "Model": "Canon EOS R6"}),
            "Canon EOS R6",
        )

    def test_metadata_endpoint_returns_embedded_camera_device(self):
        image_buffer = io.BytesIO()
        exif = Image.Exif()
        exif[271] = "Apple"
        exif[272] = "iPhone 15 Pro"
        Image.new("RGB", (320, 240), "#506f80").save(
            image_buffer,
            format="JPEG",
            exif=exif,
        )

        response = TestClient(app).post(
            "/image-metadata",
            files={"file": ("phone-photo.jpg", image_buffer.getvalue(), "image/jpeg")},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["camera"], "Apple iPhone 15 Pro")
        self.assertTrue(response.json()["has_exif"])


if __name__ == "__main__":
    unittest.main()
