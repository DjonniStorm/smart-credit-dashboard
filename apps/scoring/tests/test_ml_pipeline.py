import unittest

from app.ml_pipeline import (
    brier_score,
    build_feature_snapshot,
    calibrate,
    expected_calibration_error,
    fit_isotonic_calibrator,
    log_loss,
    rank_auc,
    synthetic_pd_dataset,
    drift_report,
    evaluate_model,
    fit_sigmoid_calibrator,
    calibrate_sigmoid,
    select_challenger,
    temporal_split,
)


class MlPipelineTests(unittest.TestCase):
    def test_snapshot_id_is_stable_for_key_order(self) -> None:
        first = build_feature_snapshot({"b": 2, "a": 1})
        second = build_feature_snapshot({"a": 1, "b": 2})
        self.assertEqual(first.snapshot_id, second.snapshot_id)

    def test_isotonic_calibrator_is_monotonic(self) -> None:
        calibrator = fit_isotonic_calibrator([0.1, 0.2, 0.3, 0.4], [1, 0, 0, 1])
        values = [calibrate(score, calibrator) for score in [0.1, 0.2, 0.3, 0.4]]
        self.assertEqual(values, sorted(values))

    def test_metrics_have_expected_ranges(self) -> None:
        labels = [0, 0, 1, 1]
        probabilities = [0.1, 0.2, 0.7, 0.9]
        self.assertLess(brier_score(labels, probabilities), 0.1)
        self.assertLess(log_loss(labels, probabilities), 0.4)
        self.assertLess(expected_calibration_error(labels, probabilities), 0.3)
        self.assertEqual(rank_auc(labels, probabilities), 1.0)

    def test_synthetic_dataset_is_reproducible(self) -> None:
        self.assertEqual(synthetic_pd_dataset(20, seed=11), synthetic_pd_dataset(20, seed=11))

    def test_evaluation_and_drift_report(self) -> None:
        labels = [0, 0, 1, 1]
        probabilities = [0.1, 0.2, 0.7, 0.9]
        evaluation = evaluate_model("challenger", labels, probabilities)
        self.assertEqual(evaluation.model, "challenger")
        self.assertEqual(evaluation.auc, 1.0)
        report = drift_report([0.1, 0.2, 0.3], [0.8, 0.9, 1.0])
        self.assertTrue(report.population_shifted)

    def test_temporal_split_does_not_shuffle(self) -> None:
        scores = list(range(20))
        labels = [index % 2 for index in range(20)]
        split = temporal_split(scores, labels)
        self.assertEqual(split.train[0], 0)
        self.assertEqual(split.test[-1], 19)
        self.assertEqual(len(split.train) + len(split.calibration) + len(split.test), 20)

    def test_sigmoid_calibrator_is_bounded_and_deterministic(self) -> None:
        scores = [0.1, 0.2, 0.8, 0.9] * 20
        labels = [0, 0, 1, 1] * 20
        calibrator = fit_sigmoid_calibrator(scores, labels)
        first = calibrate_sigmoid(0.8, calibrator)
        second = calibrate_sigmoid(0.8, calibrator)
        self.assertEqual(first, second)
        self.assertGreater(first, 0.5)
        self.assertLessEqual(first, 1.0)

    def test_challenger_quality_gate_fails_safe(self) -> None:
        champion = evaluate_model("champion", [0, 0, 1, 1], [0.1, 0.2, 0.7, 0.9])
        challenger = evaluate_model("challenger", [0, 0, 1, 1], [0.2, 0.3, 0.6, 0.8])
        selection = select_challenger(champion, challenger)
        self.assertEqual(selection.selected, "champion")
        self.assertFalse(selection.challenger_eligible)


if __name__ == "__main__":
    unittest.main()

