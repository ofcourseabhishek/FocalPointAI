import unittest

import numpy as np

try:
    from .cv_fallback import resize_for_analysis
except ImportError:
    from cv_fallback import resize_for_analysis


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


if __name__ == "__main__":
    unittest.main()
