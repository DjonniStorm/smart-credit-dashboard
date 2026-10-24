import unittest

from app.main import (
    ScoreRequest,
    calculate_score,
    calculate_score_details,
    model_evaluation,
    model_registry,
    score,
)


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
        self.assertEqual(calculate_score(request(consentBki=True)), 95.0)

    def test_mock_egrul_status_variants_are_active(self) -> None:
        for status in ("Действующее", "действующая", "ACTIVE", " Действует "):
            _, factors = calculate_score_details(request(egrul={"status": status}))
            self.assertEqual(factors[0].impact, 15.0, status)

    def test_negated_status_is_not_active(self) -> None:
        _, factors = calculate_score_details(request(egrul={"status": "Не действует"}))
        self.assertEqual(factors[0].impact, -25.0)

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

    def test_result_contains_reproducible_snapshot_and_provenance(self) -> None:
        first = score(request(consentBki=True))
        second = score(request(consentBki=True))
        self.assertEqual(first.feature_snapshot_id, second.feature_snapshot_id)
        self.assertTrue(first.feature_snapshot_id.startswith("fs-"))
        self.assertEqual(first.policy_version, "policy-baseline-v2")
        self.assertTrue(first.computed_at)
        self.assertEqual(first.factors[0].source, "egrul")
        self.assertEqual(first.factors[1].source, "bki")


def complete(**overrides: object) -> ScoreRequest:
    data: dict[str, object] = {
        "requestedAmount": 1_000_000,
        "termMonths": 12,
        "annualRevenue": 12_000_000,
        "documentsComplete": True,
        "consentBki": True,
    }
    data.update(overrides)
    return request(**data)


class IndexTests(unittest.TestCase):
    def test_readiness_counts_missing_terms_and_revenue(self) -> None:
        result = score(request(documentsComplete=True, consentBki=True))
        self.assertEqual(result.readiness_index, 50)
        self.assertEqual(result.recommendation, "request_info")

    def test_zero_amount_term_or_revenue_is_not_provided(self) -> None:
        result = score(complete(requestedAmount=0, termMonths=0, annualRevenue=0))
        self.assertEqual(result.readiness_index, 50)
        self.assertEqual(result.recommendation, "request_info")

    def test_indices_are_independent(self) -> None:
        base = score(complete())
        unready = score(complete(documentsComplete=False))
        self.assertEqual(base.health_index, unready.health_index)
        sick = score(complete(fns={"taxDebtRub": 500_000}))
        self.assertEqual(base.readiness_index, sick.readiness_index)
        self.assertLess(sick.health_index, base.health_index)

    def test_indices_stay_in_range(self) -> None:
        worst = score(
            request(
                egrul={"status": "Ликвидирована"},
                bki={"overdueDays": 365, "activeLoans": 9},
                fns={"taxDebtRub": 10_000_000},
            )
        )
        for value in (worst.health_index, worst.readiness_index):
            self.assertGreaterEqual(value, 0)
            self.assertLessEqual(value, 100)
        self.assertTrue(0.1 <= worst.confidence <= 1)

    def test_empty_sources_do_not_reject(self) -> None:
        result = score(complete(egrul={}, bki={}, fns={}))
        self.assertNotEqual(result.recommendation, "reject")
        self.assertEqual(result.risk_band, "moderate")

    def test_confidence_drops_when_sources_are_unavailable(self) -> None:
        full = score(complete())
        empty = score(complete(egrul={}, bki={}, fns={}))
        self.assertEqual(full.confidence, 1.0)
        self.assertLess(empty.confidence, full.confidence)

    def test_deterministic(self) -> None:
        self.assertEqual(score(complete()), score(complete()))


class SourceGapTests(unittest.TestCase):
    def test_no_bki_data_never_approves(self) -> None:
        result = score(complete(bki={}))
        self.assertEqual(result.recommendation, "manual_review")
        self.assertIn("БКИ", result.missing_sources)

    def test_no_fns_data_never_approves(self) -> None:
        result = score(complete(fns={}))
        self.assertEqual(result.recommendation, "manual_review")
        self.assertIn("ФНС", result.missing_sources)

    def test_no_egrul_status_never_approves(self) -> None:
        result = score(complete(egrul={}))
        self.assertEqual(result.recommendation, "manual_review")

    def test_all_sources_present_can_approve(self) -> None:
        result = score(complete())
        self.assertEqual(result.recommendation, "approve")
        self.assertEqual(result.missing_sources, [])

    def test_overdue_without_consent_is_not_a_reject(self) -> None:
        result = score(complete(consentBki=False, bki={"overdueDays": 45, "activeLoans": 1}))
        self.assertNotEqual(result.recommendation, "reject")
        self.assertEqual(result.recommendation, "request_info")
        self.assertIn("БКИ", result.missing_sources)
        factor = next(f for f in result.factors if f.id == "bki_overdue")
        self.assertEqual(factor.impact, 0)

    def test_overdue_with_consent_rejects(self) -> None:
        result = score(complete(consentBki=True, bki={"overdueDays": 45, "activeLoans": 1}))
        self.assertEqual(result.recommendation, "reject")

    def test_bki_without_consent_lowers_coverage_and_score(self) -> None:
        with_consent = score(complete())
        without = score(complete(consentBki=False))
        self.assertLess(without.confidence, with_consent.confidence)
        self.assertLess(without.score, with_consent.score)


class ModelEndpointTests(unittest.TestCase):
    def test_evaluation_uses_temporal_split_and_quality_gate(self) -> None:
        report = model_evaluation()
        self.assertEqual(report["split"], {"train": 360, "calibration": 120, "test": 120})
        self.assertEqual(report["selected"], report["selection"]["selected"])
        self.assertEqual(report["champion"]["sample_count"], 120)
        self.assertEqual(report["challenger"]["sample_count"], 120)

    def test_registry_keeps_challenger_in_shadow(self) -> None:
        registry = model_registry()
        self.assertEqual(registry["champion"]["status"], "active")
        self.assertEqual(registry["challengers"][0]["status"], "shadow")


if __name__ == "__main__":
    unittest.main()
