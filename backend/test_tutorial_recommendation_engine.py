import unittest
import re

try:
    from .tutorial_recommendation_engine import load_tutorial_catalog, recommend_tutorials
except ImportError:
    from tutorial_recommendation_engine import load_tutorial_catalog, recommend_tutorials


class TutorialRecommendationEngineTests(unittest.TestCase):
    def test_catalog_is_loaded_and_flattened(self):
        tutorials = load_tutorial_catalog()
        self.assertGreaterEqual(len(tutorials), 30)
        self.assertTrue(all(item["youtube_link"].startswith("https://www.youtube.com/") for item in tutorials))
        self.assertTrue(all(item["creator"] and item["creator"] != "Creator not verified" for item in tutorials))
        self.assertTrue(all(re.fullmatch(r"(?:\d+:)?\d{1,2}:\d{2}", item["runtime"]) for item in tutorials))
        self.assertTrue(all(item["embed_url"].startswith("https://www.youtube-nocookie.com/embed/") for item in tutorials))
        self.assertTrue(all(item["thumbnail_url"].endswith("/maxresdefault.jpg") for item in tutorials))

    def test_weak_exposure_prioritizes_relevant_lesson(self):
        analysis = {
            "overall_rating": 6.2,
            "score_engine": {
                "overall": 62,
                "categories": {"composition": 82, "focus": 84, "color": 80},
            },
            "aspects": {
                "brightness": {"rating": 28},
                "highlights": {"rating": 35},
                "shadows": {"rating": 42},
                "contrast": {"rating": 55},
                "ambiance": {"rating": 70},
                "details": {"rating": 84},
                "colour": {"rating": 80},
                "saturation": {"rating": 78},
                "warmth": {"rating": 76},
                "crop": {"rating": 82},
                "feel": {"wow_factor": {"rating": 75}, "emotional_impact": {"rating": 74}},
            },
        }
        results = recommend_tutorials(analysis, limit=3)
        exposure_objectives = {"reading_the_histogram", "camera_metering_modes", "basic_panel_and_histogram"}
        self.assertIn(results[0]["objective"], exposure_objectives)
        self.assertEqual(results[0]["based_on"]["label"], "exposure")

    def test_results_are_bounded_unique_and_explainable(self):
        results = recommend_tutorials({"overall_rating": 7.0}, limit=99)
        self.assertEqual(len(results), 8)
        self.assertEqual(len({item["id"] for item in results}), len(results))
        self.assertTrue(all(item["reason"] and item["match_score"] >= 55 for item in results))
        self.assertTrue(all(item["confidence_label"] for item in results))
        self.assertTrue(all(item["addresses"][0]["key"] == item["based_on"]["key"] for item in results))
        self.assertTrue(all(item["target_score"] > item["based_on"]["score"] for item in results))

    def test_leading_lines_gap_is_not_presented_as_visual_evidence(self):
        analysis = {
            "overall_rating": 5.0,
            "score_engine": {"overall": 50, "categories": {"composition": 35}},
            "aspects": {"brightness": {"rating": 75}, "contrast": {"rating": 72}, "details": {"rating": 70}},
            "advanced_cv": {"composition": {
                "leading_lines": {"score": 0},
                "negative_space": {"score": 82},
                "rule_of_thirds": {"score": 78},
            }},
        }
        result = recommend_tutorials(analysis, limit=8)
        self.assertNotEqual(result[0]["based_on"]["key"], "leading_lines")
        self.assertTrue(any(item["key"] == "leading_lines" for item in result[0]["rejected_visual_needs"]))
        self.assertTrue(all(item["based_on"]["key"] != "leading_lines" for item in result))


if __name__ == "__main__":
    unittest.main()
