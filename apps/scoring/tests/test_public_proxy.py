import csv
import tempfile
import unittest
from pathlib import Path

from training.train_public_proxy import train


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


if __name__ == "__main__":
    unittest.main()
