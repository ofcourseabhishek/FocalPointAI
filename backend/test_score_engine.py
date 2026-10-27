import unittest

try:
    from .score_engine import (
        build_gemini_context,
        build_score_engine,
        enforce_authoritative_scores,
    )
except ImportError:
    from score_engine import (
        build_gemini_context,
        build_score_engine,
        enforce_authoritative_scores,
    )


class ScoreEngineTests(unittest.TestCase):
    def setUp(self):
        ratings = {
            "colour": 78,
            "details": 81,
            "brightness": 72,
            "contrast": 76,
            "saturation": 74,
            "ambiance": 70,
            "highlights": 68,
            "shadows": 82,
            "warmth": 77,
            "crop": 80,
        }
        self.local = {
            "aspects": {
                key: {
                    "rating": value,
                    "what_works": f"Local strength for {key}.",
                    "what_could_be_improved": f"Local improvement for {key}.",
                }
                for key, value in ratings.items()
            },
            "advanced_cv": {
                "composition": {
                    "rule_of_thirds": {"score": 86, "description": "Strong thirds."},
                    "golden_ratio": {"score": 72, "description": "Moderate balance."},
                    "leading_lines": {"score": 65, "description": "Lines guide the eye."},
                    "symmetry_patterns": {"score": 40, "description": "Limited symmetry."},
                    "framing": {"score": 55, "description": "Some framing."},
                },
                "horizon": {"detected": True, "is_level": True},
                "saliency_map_b64": "must-not-be-sent-in-context",
            },
            "image_statistics": {"brightness": {"value": 0.71, "level": "Balanced"}},
            "exif_analysis": {"camera_settings": {"iso": 400}},
        }
        self.exif = {
            "raw": {"iso": 400},
            "formatted": {"iso": "ISO 400", "shutter_speed": "1/500s"},
        }

    def test_gemini_cannot_change_scores_or_exif(self):
        engine = build_score_engine(self.local, self.exif)
        gemini = {
            "overall_rating": 10,
            "aspects": {
                key: {"rating": 99, "what_works": "Gemini explanation."}
                for key in self.local["aspects"]
            },
            "exif_analysis": {"camera_settings": {"iso": 12800}},
        }

        result = enforce_authoritative_scores(gemini, self.local, engine)

        self.assertEqual(result["aspects"]["brightness"]["rating"], 72)
        self.assertEqual(result["aspects"]["composition"]["rating"], engine["categories"]["composition"])
        self.assertEqual(result["overall_rating"], round(engine["overall"] / 10, 1))
        self.assertEqual(result["exif_analysis"], self.local["exif_analysis"])
        self.assertEqual(result["aspects"]["brightness"]["what_works"], "Gemini explanation.")

    def test_gemini_cannot_put_numbers_in_frame_work(self):
        engine = build_score_engine(self.local, self.exif)
        gemini = {
            "frame_work": {
                "lighting": {
                    "score": 99,
                    "rating": 9.9,
                    "interpretation": "Soft light shapes the subject.",
                    "metrics": [
                        {
                            "label": "Highlight clipping",
                            "value": 0.4,
                            "score": 97,
                            "assessment": "Clean highlights",
                            "saw": "The brightest edge keeps its texture.",
                        },
                        {"label": "Detail level", "value": "Moderate", "assessment": "Moderate"},
                    ],
                },
                "focus": "not an object",
            },
        }

        result = enforce_authoritative_scores(gemini, self.local, engine)
        lighting = result["frame_work"]["lighting"]

        self.assertNotIn("score", lighting)
        self.assertNotIn("rating", lighting)
        self.assertEqual(lighting["interpretation"], "Soft light shapes the subject.")
        self.assertNotIn("value", lighting["metrics"][0])
        self.assertNotIn("score", lighting["metrics"][0])
        self.assertEqual(lighting["metrics"][0]["saw"], "The brightest edge keeps its texture.")
        # Word values are explanation, not measurement, so they stay.
        self.assertEqual(lighting["metrics"][1]["value"], "Moderate")
        self.assertNotIn("focus", result["frame_work"])

    def test_context_is_compact_and_contains_authoritative_evidence(self):
        engine = build_score_engine(self.local, self.exif)
        context = build_gemini_context(self.local, self.exif, engine)

        self.assertEqual(context["camera"]["iso"], "ISO 400")
        self.assertEqual(context["authoritative_scores"], engine)
        self.assertNotIn("must-not-be-sent-in-context", str(context))


if __name__ == "__main__":
    unittest.main()
