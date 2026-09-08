import io
import os
import unittest

from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image

from main import app
from app.services.analysis.response import _visual_evidence, build_canonical_response
from app.services.metadata import ensure_safe_image_dimensions
from app.services.recommendations import load_tutorial_catalog


class AnalysisContractTests(unittest.TestCase):
    def setUp(self):
        os.environ.pop("GEMINI_API_KEY", None)
        image = io.BytesIO()
        Image.new("RGB", (96, 64), "#60798d").save(image, format="JPEG")
        self.response = TestClient(app).post(
            "/analyze", files={"file": ("plain.jpg", image.getvalue(), "image/jpeg")}
        )
        self.assertEqual(self.response.status_code, 200)
        self.data = self.response.json()

    def test_canonical_sections_and_fallback_are_present(self):
        self.assertTrue({"metadata", "overview", "analysis", "visual_breakdown", "learning_next", "tutorials", "diagnostics"}.issubset(self.data))
        self.assertEqual(self.data["diagnostics"]["ai_status"], "not_configured")
        self.assertEqual(self.data["diagnostics"]["coordinate_space"], "normalized")
        self.assertEqual(self.data["metadata"]["filename"], "plain.jpg")
        self.assertNotIn("exif", self.data["metadata"])
        post_processing = next(
            item for item in self.data["analysis"]["categories"] if item["id"] == "technical"
        )
        self.assertNotIn("score", post_processing)
        self.assertEqual(post_processing["metrics"], [])

    def test_tutorials_are_catalog_backed_unique_and_https(self):
        tutorials = self.data["tutorials"]
        catalog_ids = {item["id"] for item in load_tutorial_catalog()}
        self.assertLessEqual(len(tutorials), 4)
        self.assertEqual(len({item["id"] for item in tutorials}), len(tutorials))
        self.assertTrue(all(item["url"].startswith("https://www.youtube.com/") for item in tutorials))
        self.assertTrue(all(item["id"] in catalog_ids for item in tutorials))
        self.assertTrue(all(item["matched_metric_ids"] for item in tutorials))
        self.assertEqual(tutorials[0]["priority_label"], "START HERE")

    def test_visual_geometry_is_normalized_or_omitted(self):
        for evidence in self.data["visual_breakdown"]["evidence"]:
            for field in ("point", "start", "end"):
                if field in evidence:
                    self.assertTrue(all(0 <= value <= 1 for value in evidence[field]))
            if "region" in evidence:
                x, y, width, height = evidence["region"]
                self.assertGreater(width, 0); self.assertGreater(height, 0)
                self.assertLessEqual(x + width, 1); self.assertLessEqual(y + height, 1)

    def test_corrupt_image_is_a_clean_400(self):
        response = TestClient(app).post(
            "/analyze", files={"file": ("broken.jpg", b"not an image", "image/jpeg")}
        )
        self.assertEqual(response.status_code, 400)

    def test_unsupported_or_mislabeled_image_is_a_clean_400(self):
        gif = io.BytesIO()
        Image.new("RGB", (12, 12), "#60798d").save(gif, format="GIF")
        client = TestClient(app)
        unsupported = client.post(
            "/analyze", files={"file": ("plain.gif", gif.getvalue(), "image/gif")}
        )
        mislabeled = client.post(
            "/analyze", files={"file": ("plain.jpg", gif.getvalue(), "image/jpeg")}
        )
        self.assertEqual(unsupported.status_code, 400)
        self.assertEqual(mislabeled.status_code, 400)

    def test_invalid_detector_coordinates_are_rejected(self):
        evidence, _ = _visual_evidence({"advanced_cv": {
            "faces": [{"box": [-0.1, 0.2, 0.3, 0.4]}],
            "subject_centering": {"centroid": [1.4, 0.5]},
            "composition": {"leading_lines": {"lines": [{"start": [0, 0], "end": [2, 1]}]}},
        }})
        self.assertFalse(any(item["type"] in {"point", "region", "line"} for item in evidence))

    def test_sky_segmentation_is_not_misrepresented_as_lighting(self):
        for percentage in (0.0, 12.0):
            evidence, _ = _visual_evidence({"advanced_cv": {
                "sky_segmentation": {"percentage": percentage, "mask_b64": "encoded-mask"}
            }})
            self.assertFalse(any(item["category"] == "lighting" and item["type"] == "mask" for item in evidence))

    def test_structured_gemini_overview_is_preserved(self):
        raw = dict(self.data)
        raw["overview"] = {
            "keep": [{"label": "Light", "text": "The side light gives the subject shape."}],
            "change_one_thing": {"category": "composition", "text": "Simplify the upper edge.", "detail": "A bright mark competes.", "why": "It divides attention."},
            "try_this_next": {"title": "Edge study", "text": "Make three tighter frames.", "variations": [{"label": "1", "instruction": "A"}, {"label": "2", "instruction": "B"}, {"label": "3", "instruction": "C"}]},
        }
        canonical = build_canonical_response(raw, self.data["metadata"], [])
        self.assertEqual(canonical["overview"]["change_one_thing"]["action"], "Simplify the upper edge.")
        self.assertEqual(canonical["overview"]["try_this_next"]["title"], "Edge study")

    def test_exif_orientation_matches_analysis_coordinate_space(self):
        image = io.BytesIO()
        source = Image.new("RGB", (100, 50), "#60798d")
        exif = source.getexif()
        exif[274] = 6
        source.save(image, format="JPEG", exif=exif)
        response = TestClient(app).post(
            "/analyze", files={"file": ("rotated.jpg", image.getvalue(), "image/jpeg")}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["metadata"]["width"], 50)
        self.assertEqual(response.json()["metadata"]["height"], 100)
        self.assertEqual(response.json()["metadata"]["orientation"], "portrait")

    def test_decoded_pixel_limit_is_enforced(self):
        with self.assertRaises(HTTPException) as context:
            ensure_safe_image_dimensions(10_000, 10_000)
        self.assertEqual(context.exception.status_code, 413)


if __name__ == "__main__":
    unittest.main()
