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


if __name__ == "__main__":
    unittest.main()

