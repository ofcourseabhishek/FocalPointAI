import unittest

try:
    from .intent_engine import build_intent_profile
except ImportError:
    from intent_engine import build_intent_profile


class IntentEngineTests(unittest.TestCase):
    def test_monochrome_minimalist_frame_marks_colour_intentional(self):
        profile = build_intent_profile({
            "image_statistics": {
                "brightness": {"value": 0.42},
                "contrast": {"value": 68},
                "saturation": {"value": 8},
            },
            "aspects": {"colour": {"rating": 0}, "contrast": {"rating": 78}},
            "advanced_cv": {
                "composition": {
                    "negative_space": {"score": 82},
                    "leading_lines": {"score": 0},
                    "rule_of_thirds": {"score": 20},
                    "framing": {"score": 20},
                    "symmetry_patterns": {"score": 22},
                },
                "subject_centering": {"is_centered": False},
                "background_clutter": {"score": 18},
            },
        })
        self.assertEqual(profile["technique_evaluations"]["colour"]["status"], "intentional_absence")
        self.assertEqual(profile["technique_evaluations"]["leading_lines"]["status"], "not_applicable")
        self.assertIn("Minimalism", {signal["label"] for signal in profile["style_signals"]})
        self.assertIn("minimalist storytelling", profile["primary_intent"].lower())
        self.assertTrue(any(item["technique"] == "negative_space" for item in profile["strengths"]))
        self.assertTrue(any(item["technique"] == "layering" for item in profile["opportunities"]))
        self.assertFalse(any(item["technique"] == "framing" for item in profile["opportunities"]))
        self.assertFalse(any(item["technique"] == "colour" for item in profile["opportunities"]))


if __name__ == "__main__":
    unittest.main()
