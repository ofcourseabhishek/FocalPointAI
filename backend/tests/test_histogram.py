import unittest

import numpy as np

from app.services.vision import analyze_cv_heuristics


class RgbHistogramTests(unittest.TestCase):
    def test_channels_land_in_their_own_bins_and_share_one_peak(self):
        red = np.zeros((120, 160, 3), dtype=np.uint8)
        red[..., 0] = 255  # input is RGB

        stats = analyze_cv_heuristics(red)["image_statistics"]
        histogram = stats["rgb_histogram"]

        self.assertEqual(sorted(histogram), ["b", "g", "r"])
        self.assertTrue(all(len(values) == 64 for values in histogram.values()))
        self.assertEqual(histogram["r"][-1], 100)
        self.assertEqual(sum(histogram["r"][:-1]), 0)
        self.assertEqual(histogram["g"][0], 100)
        self.assertEqual(histogram["b"][0], 100)

    def test_clipping_levels_match_the_clipping_percentages(self):
        image = np.full((100, 100, 3), 128, dtype=np.uint8)
        image[:10] = 0     # 10% pure black
        image[10:30] = 255  # 20% pure white

        stats = analyze_cv_heuristics(image)["image_statistics"]

        self.assertEqual(stats["clipping_levels"], {"shadow": 25, "highlight": 230})
        self.assertAlmostEqual(stats["shadow_clipping_percent"], 10.0, places=1)
        self.assertAlmostEqual(stats["highlight_clipping_percent"], 20.0, places=1)


if __name__ == "__main__":
    unittest.main()
