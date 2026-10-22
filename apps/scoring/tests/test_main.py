import unittest

from app.main import ScoreRequest, calculate_score, calculate_score_details


def request(**overrides: object) -> ScoreRequest:
    data: dict[str, object] = {
        "inn": "7700000000",
        "egrul": {"status": "Действующее"},
        "bki": {"overdueDays": 0, "activeLoans": 1},
        "fns": {"taxDebtRub": 0},
    }
    data.update(overrides)
    return ScoreRequest.model_validate(data)


class ScoreTests(unittest.TestCase):
    def test_active_russian_status_is_positive(self) -> None:
        self.assertEqual(calculate_score(request()), 95.0)

    def test_missing_fields_do_not_get_zero_value_bonus(self) -> None:
        score, factors = calculate_score_details(request(egrul={}, bki={}, fns={}))
        self.assertEqual(score, 50.0)
        self.assertTrue(all(f.impact == 0 for f in factors))

    def test_score_is_clamped_and_explained(self) -> None:
        score, factors = calculate_score_details(
            request(
                egrul={"status": "Ликвидирована"},
                bki={"overdueDays": 365, "activeLoans": 9},
                fns={"taxDebtRub": 10_000_000},
            )
        )
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)
        self.assertEqual(len(factors), 4)


if __name__ == "__main__":
    unittest.main()
