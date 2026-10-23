import unittest

from app.main import ScoreRequest, calculate_score, calculate_score_details, score


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

    def test_decision_contract_requests_missing_evidence(self) -> None:
        result = score(request())
        self.assertEqual(result.model, "rules-baseline-v2")
        self.assertEqual(result.recommendation, "request_info")
        self.assertLess(result.readiness_index, 100)
        self.assertGreaterEqual(result.confidence, 0)

    def test_complete_low_risk_profile_can_be_recommended(self) -> None:
        result = score(
            request(
                requestedAmount=1_000_000,
                termMonths=12,
                annualRevenue=12_000_000,
                monthlyExpenses=500_000,
                currentPayments=100_000,
                documentsComplete=True,
                consentBki=True,
            )
        )
        self.assertEqual(result.recommendation, "approve")
        self.assertEqual(result.grade, "A")
        self.assertGreater(result.readiness_index, 80)

    def test_overdue_is_a_hard_stop(self) -> None:
        result = score(
            request(
                bki={"overdueDays": 45, "activeLoans": 1},
                documentsComplete=True,
                consentBki=True,
                requestedAmount=100_000,
                termMonths=12,
                annualRevenue=12_000_000,
            )
        )
        self.assertEqual(result.recommendation, "reject")
        self.assertTrue(any("Просрочка" in reason for reason in result.reasons))


if __name__ == "__main__":
    unittest.main()
