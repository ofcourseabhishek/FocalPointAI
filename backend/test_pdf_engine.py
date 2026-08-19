import inspect
import io
import json
import re
import unittest
from copy import deepcopy
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image

from main import analyze_image, app
from pdf_engine import _image_reader, generate_critique_pdf, pdf_download_filename


class PdfEngineTests(unittest.TestCase):
    def setUp(self):
        self.analysis = {
            "filename": "portrait final.jpg",
            "overall_rating": 8.4,
            "mode": "gemini_ai",
            "first_impression": "Strong subject separation and natural light.",
            "suggested_edits": [
                {"key": "brightness", "text": "Raise exposure by +0.20 EV."},
            ],
            "aspects": {
                "composition": {
                    "rating": 84,
                    "what_works": "The subject is placed with intent.",
                    "what_could_be_improved": "Leave slightly more headroom.",
                },
                "brightness": {
                    "rating": 67,
                    "what_works": "Highlights retain detail.",
                    "what_could_be_improved": "Lift the midtones.",
                },
            },
            "exif_analysis": {
                "camera_settings": {
                    "shutter_speed": "1/250s",
                    "aperture": "f/2.8",
                    "iso": 200,
                    "focal_length": "50mm",
                    "camera": "Demo Camera",
                    "lens": "50mm Prime",
                }
            },
        }

    def test_pdf_report_is_generated_with_embedded_photo(self):
        image_buffer = io.BytesIO()
        Image.new("RGB", (640, 360), "#4f7890").save(image_buffer, format="JPEG")

        pdf = generate_critique_pdf(self.analysis, image_buffer.getvalue())

        self.assertTrue(pdf.startswith(b"%PDF-"))
        self.assertGreater(len(pdf), 5000)
        self.assertIsNotNone(re.search(rb"/Count\s+7\b", pdf))

    def test_image_reader_applies_exif_orientation_before_embedding(self):
        image_buffer = io.BytesIO()
        image = Image.new("RGB", (640, 360), "#4f7890")
        exif = image.getexif()
        exif[274] = 6  # Camera sensor image should be displayed rotated clockwise.
        image.save(image_buffer, format="JPEG", exif=exif)

        reader, width, height = _image_reader(image_buffer.getvalue())

        self.assertIsNotNone(reader)
        self.assertEqual((width, height), (360, 640))

    def test_download_filename_is_safe_and_descriptive(self):
        self.assertEqual(
            pdf_download_filename("portrait final.jpg"),
            "portrait-final-critique.pdf",
        )
        self.assertEqual(pdf_download_filename("../../<>.jpg"), "photograph-critique.pdf")

    def test_analysis_no_longer_accepts_or_requires_email(self):
        parameters = inspect.signature(analyze_image).parameters

        self.assertEqual(list(parameters), ["file"])

    def test_pdf_endpoint_returns_a_named_pdf_download(self):
        image_buffer = io.BytesIO()
        Image.new("RGB", (640, 360), "#4f7890").save(image_buffer, format="JPEG")

        response = TestClient(app).post(
            "/critique-pdf",
            data={"analysis_json": json.dumps(self.analysis)},
            files={"file": ("portrait.jpg", image_buffer.getvalue(), "image/jpeg")},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "application/pdf")
        self.assertIn("portrait-final-critique.pdf", response.headers["content-disposition"])
        self.assertTrue(response.content.startswith(b"%PDF-"))

    def test_pdf_embeds_ranked_youtube_tutorial_links(self):
        analysis = deepcopy(self.analysis)
        video_url = "https://www.youtube.com/watch?v=AHiZvTxvHiA"
        analysis["tutorial_recommendations"] = [{
            "id": "leading_lines",
            "title": "Leading Lines Photography: Must-Know Tips",
            "creator": "Viewfinder Mastery",
            "runtime": "8:45",
            "youtube_link": video_url,
            "video_id": "AHiZvTxvHiA",
            "match_score": 96,
            "reason": "Leading lines are the clearest growth area.",
            "based_on": {"key": "leading_lines", "label": "leading lines", "score": 22},
        }]

        with patch("pdf_engine._youtube_thumbnail", return_value=None):
            pdf = generate_critique_pdf(analysis)

        self.assertIn(video_url.encode("ascii"), pdf)
        self.assertGreaterEqual(pdf.count(b"/URI"), 2)


if __name__ == "__main__":
    unittest.main()
