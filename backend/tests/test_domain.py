import unittest

from app.services.normalizer import calculate_interactions
from app.services.taxonomy import classify_theme
from app.services.trends import _growth


class DomainRulesTest(unittest.TestCase):
    def test_interactions_preserve_partial_coverage(self):
        self.assertEqual(calculate_interactions(10, 2, None, None), (12, False))
        self.assertEqual(calculate_interactions(None, None, None, None), (None, False))

    def test_classification_uses_caption_content(self):
        self.assertEqual(classify_theme("Ônibus e mobilidade em Planaltina")[0], "Transporte/Mobilidade")
        self.assertEqual(classify_theme("Produtor rural fortalece a agricultura")[0], "Agro/Rural")
        self.assertEqual(classify_theme("")[0], "Outros")

    def test_growth_handles_zero_and_directions(self):
        self.assertIsNone(_growth(3, 0))
        self.assertEqual(_growth(15, 10), 0.5)
        self.assertEqual(_growth(5, 10), -0.5)


if __name__ == "__main__":
    unittest.main()
