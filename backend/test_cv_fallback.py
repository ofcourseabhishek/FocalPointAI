import unittest

import cv2
import numpy as np

try:
    from .local_cv_engine import analyze_cv_heuristics, resize_for_analysis
except ImportError:
    from local_cv_engine import analyze_cv_heuristics, resize_for_analysis


class ResizeForAnalysisTests(unittest.TestCase):
    def test_large_image_is_bounded_and_dimensions_are_preserved(self):
        image = np.zeros((3000, 4500, 3), dtype=np.uint8)

        resized, original_w, original_h = resize_for_analysis(image, max_dimension=1600)

        self.assertEqual((original_w, original_h), (4500, 3000))
        self.assertEqual(max(resized.shape[:2]), 1600)
        self.assertAlmostEqual(resized.shape[1] / resized.shape[0], 1.5, places=3)

    def test_small_image_is_not_copied(self):
        image = np.zeros((600, 800, 3), dtype=np.uint8)

        resized, original_w, original_h = resize_for_analysis(image, max_dimension=1600)

        self.assertIs(resized, image)
        self.assertEqual((original_w, original_h), (800, 600))

    def test_analysis_includes_histogram_and_focus_map_evidence(self):
        image = np.zeros((240, 320, 3), dtype=np.uint8)
        cv2.rectangle(image, (70, 50), (250, 190), (220, 220, 220), -1)
        cv2.line(image, (20, 220), (300, 20), (255, 255, 255), 5)
        encoded, buffer = cv2.imencode(".jpg", image)
        self.assertTrue(encoded)

        result = analyze_cv_heuristics(buffer.tobytes())

        histogram = result["image_statistics"]["luminance_histogram"]
        self.assertEqual(len(histogram), 24)
        self.assertGreater(max(histogram), 0)
        self.assertTrue(result["advanced_cv"]["focus_map_b64"])


if __name__ == "__main__":
    unittest.main()
