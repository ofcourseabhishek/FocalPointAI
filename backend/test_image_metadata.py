import io
import unittest

from fastapi.testclient import TestClient
from PIL import Image
from PIL.TiffImagePlugin import IFDRational

from main import app, get_camera_device_name, get_exif_summary


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
        exif[33434] = IFDRational(1, 250)
        exif[33437] = IFDRational(18, 10)
        exif[34855] = 200
        exif[37386] = IFDRational(67, 10)
        exif[41989] = 24
        exif[37385] = 0
        exif[37380] = IFDRational(-2, 3)
        exif[40961] = 1
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
        self.assertEqual(response.json()["camera_settings"]["shutter_speed"], "1/250s")
        self.assertEqual(response.json()["camera_settings"]["aperture"], "f/1.8")
        self.assertEqual(response.json()["camera_settings"]["iso"], "ISO 200")
        self.assertEqual(response.json()["camera_settings"]["focal_length"], "7mm")
        self.assertEqual(response.json()["camera_settings"]["focal_length_35mm"], "24mm")
        self.assertEqual(response.json()["camera_settings"]["flash_usage"], "No flash")
        self.assertEqual(response.json()["camera_settings"]["exposure_compensation"], "−0.67 EV")
        self.assertEqual(response.json()["camera_settings"]["color_profile"], "sRGB")

    def test_exif_summary_reports_flash_and_optional_color_spaces(self):
        flash_summary = get_exif_summary({"Flash": 1, "ColorSpace": 2})
        self.assertEqual(flash_summary["formatted"]["flash_usage"], "Flash used")
        self.assertEqual(flash_summary["formatted"]["color_profile"], "Adobe RGB")

        positive_bias = get_exif_summary({"ExposureBiasValue": IFDRational(2, 3)})
        self.assertEqual(positive_bias["formatted"]["exposure_compensation"], "+0.67 EV")

        neutral_bias = get_exif_summary({"ExposureBiasValue": 0})
        self.assertEqual(neutral_bias["formatted"]["exposure_compensation"], "0 EV")

        missing_summary = get_exif_summary({})
        self.assertIsNone(missing_summary["formatted"]["flash_usage"])
        self.assertIsNone(missing_summary["formatted"]["exposure_compensation"])
        self.assertIsNone(missing_summary["formatted"]["color_profile"])


if __name__ == "__main__":
    unittest.main()
