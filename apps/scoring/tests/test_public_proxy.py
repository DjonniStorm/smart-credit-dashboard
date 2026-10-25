import csv
import tempfile
import unittest
from pathlib import Path

from training.train_public_proxy import load_artifact, predict, train


class PublicProxyTrainingTests(unittest.TestCase):
    def test_training_writes_explicitly_non_production_artifact(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "loans.csv"
            artifact_path = Path(directory) / "artifact.json"
            with source.open("w", newline="", encoding="utf-8") as stream:
                writer = csv.DictWriter(stream, fieldnames=["issue_d", "revenue", "dti_n", "loan_amnt", "fico_n", "experience_c", "Default"])
                writer.writeheader()
                for index in range(120):
                    writer.writerow({
                        "issue_d": f"{2015 + index // 12:04d}-{index % 12 + 1:02d}",
                        "revenue": 50_000 + index * 100,
                        "dti_n": 10 + index % 20,
                        "loan_amnt": 5_000 + index * 10,
                        "fico_n": 650 + index % 100,
                        "experience_c": index % 2,
                        "Default": int(index % 3 == 0),
                    })
            artifact = train(source, artifact_path)
            self.assertFalse(artifact.production_eligible)
            self.assertEqual(artifact.dataset_scope, "public_proxy:lendingclub_granting_model")
            self.assertTrue(artifact_path.exists())

    def test_artifact_inference_returns_pd_and_contributions(self) -> None:
        artifact = load_artifact(Path("apps/scoring/artifacts/public-proxy-logistic.json"))
        self.assertEqual(artifact.validation["sample_count"], 4000)
        self.assertGreater(artifact.validation["auc"], 0.5)
        probability, contributions = predict(
            artifact,
            {"revenue": 100_000, "dti_n": 8, "loan_amnt": 5_000, "fico_n": 760, "experience_c": 1},
        )
        self.assertGreaterEqual(probability, 0)
        self.assertLessEqual(probability, 1)
        self.assertEqual(set(contributions), set(artifact.features))


if __name__ == "__main__":
    unittest.main()
