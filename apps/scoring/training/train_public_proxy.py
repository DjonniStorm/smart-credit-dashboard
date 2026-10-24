"""Train a reproducible public-proxy PD model from the Zenodo LendingClub CSV.

This intentionally uses only the standard library. The artifact is a challenger for
shadow/evaluation only; it is never eligible to become the production champion.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path

from app.ml_pipeline import calibrate, evaluate_model, fit_isotonic_calibrator


FEATURES = ("revenue", "dti_n", "loan_amnt", "fico_n", "experience_c")


@dataclass(frozen=True)
class ProxyArtifact:
    model: str
    version: str
    dataset_scope: str
    target: str
    production_eligible: bool
    features: tuple[str, ...]
    means: tuple[float, ...]
    scales: tuple[float, ...]
    weights: tuple[float, ...]
    bias: float
    train_count: int
    positive_rate: float
    validation: dict[str, float | int]
    calibration_method: str
    calibration_thresholds: tuple[float, ...]
    calibration_probabilities: tuple[float, ...]


def load_artifact(path: Path) -> ProxyArtifact:
    """Load and validate a previously trained proxy artifact."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    artifact = ProxyArtifact(**payload)
    if artifact.production_eligible or artifact.dataset_scope.startswith("production"):
        raise ValueError("public-proxy artifact cannot be production eligible")
    if tuple(artifact.features) != FEATURES:
        raise ValueError("несовместимая схема public-proxy features")
    if len(artifact.weights) != len(artifact.features):
        raise ValueError("некорректное число model weights")
    required_metrics = {"brier", "logloss", "ece", "auc", "pr_auc", "ks", "sample_count"}
    if not required_metrics.issubset(artifact.validation):
        raise ValueError("artifact не содержит holdout validation metrics")
    if int(artifact.validation["sample_count"]) <= 0:
        raise ValueError("artifact validation sample_count должен быть положительным")
    if not 0 <= float(artifact.validation["auc"]) <= 1:
        raise ValueError("artifact validation AUC вне диапазона")
    if artifact.calibration_method != "isotonic":
        raise ValueError("неподдерживаемый calibration method")
    if len(artifact.calibration_thresholds) != len(artifact.calibration_probabilities) or not artifact.calibration_thresholds:
        raise ValueError("artifact calibration curve повреждён")
    return artifact


def predict(artifact: ProxyArtifact, values: dict[str, float]) -> tuple[float, dict[str, float]]:
    """Return PD and additive local contributions for a proxy artifact."""
    missing = [feature for feature in artifact.features if feature not in values]
    if missing:
        raise ValueError(f"отсутствуют признаки: {', '.join(missing)}")
    raw_probability, contributions = _raw_predict(artifact, values)
    probability = calibrate(raw_probability, (artifact.calibration_thresholds, artifact.calibration_probabilities))
    return max(0.0, min(1.0, probability)), contributions


def _raw_predict(artifact: ProxyArtifact, values: dict[str, float]) -> tuple[float, dict[str, float]]:
    missing = [feature for feature in artifact.features if feature not in values]
    if missing:
        raise ValueError(f"отсутствуют признаки: {', '.join(missing)}")
    contributions = {
        feature: artifact.weights[index] * ((float(values[feature]) - artifact.means[index]) / artifact.scales[index])
        for index, feature in enumerate(artifact.features)
    }
    linear_score = artifact.bias + sum(contributions.values())
    return _sigmoid(linear_score), contributions


def _predict_row(artifact: ProxyArtifact, values: list[float]) -> float:
    probability, _ = predict(artifact, dict(zip(artifact.features, values)))
    return probability


def _predict_row_raw(artifact: ProxyArtifact, values: list[float]) -> float:
    probability, _ = _raw_predict(artifact, dict(zip(artifact.features, values)))
    return probability


def _number(row: dict[str, str], key: str) -> float | None:
    try:
        value = float(row.get(key, ""))
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) else None


def read_rows(path: Path, *, max_rows: int = 20_000) -> list[tuple[str, list[float], int]]:
    rows: list[tuple[str, list[float], int]] = []
    with path.open(newline="", encoding="utf-8-sig") as stream:
        for row in csv.DictReader(stream):
            target = row.get("Default", "").strip().lower()
            if target not in {"0", "1"}:
                continue
            values = [_number(row, feature) for feature in FEATURES]
            issue_date = row.get("issue_d", "")
            if any(value is None for value in values) or not issue_date:
                continue
            rows.append((issue_date, [float(value) for value in values if value is not None], int(target)))
    if len(rows) < 100 or len({label for _, _, label in rows}) < 2:
        raise ValueError("CSV должен содержать минимум 100 валидных строк и оба класса Default")
    ordered = sorted(rows, key=lambda item: item[0])
    if len(ordered) > max_rows:
        stride = len(ordered) / max_rows
        ordered = [ordered[int(index * stride)] for index in range(max_rows)]
    return ordered


def _sigmoid(value: float) -> float:
    if value >= 0:
        exponent = math.exp(-value)
        return 1.0 / (1.0 + exponent)
    exponent = math.exp(value)
    return exponent / (1.0 + exponent)


def _fit_logistic(features: list[list[float]], labels: list[int], steps: int = 2_500) -> tuple[list[float], float]:
    means = [sum(row[index] for row in features) / len(features) for index in range(len(FEATURES))]
    scales = [max(1.0, math.sqrt(sum((row[index] - means[index]) ** 2 for row in features) / len(features))) for index in range(len(FEATURES))]
    normalized = [[(value - means[index]) / scales[index] for index, value in enumerate(row)] for row in features]
    weights = [0.0] * len(FEATURES)
    bias = 0.0
    for _ in range(steps):
        gradient = [0.0] * len(FEATURES)
        bias_gradient = 0.0
        for row, label in zip(normalized, labels):
            error = _sigmoid(sum(weight * value for weight, value in zip(weights, row)) + bias) - label
            for index, value in enumerate(row):
                gradient[index] += error * value
            bias_gradient += error
        for index in range(len(weights)):
            weights[index] -= 0.08 * gradient[index] / len(normalized)
        bias -= 0.08 * bias_gradient / len(normalized)
    return means + scales, weights + [bias]


def train(path: Path, output: Path, *, max_rows: int = 20_000) -> ProxyArtifact:
    rows = read_rows(path, max_rows=max_rows)
    train_end = max(20, int(len(rows) * 0.6))
    calibration_end = max(train_end + 20, int(len(rows) * 0.8))
    train_rows = rows[:train_end]
    calibration_rows = rows[train_end:calibration_end]
    validation_rows = rows[calibration_end:]
    stats, coefficients = _fit_logistic(
        [features for _, features, _ in train_rows], [label for _, _, label in train_rows], steps=600
    )
    means = tuple(stats[: len(FEATURES)])
    scales = tuple(stats[len(FEATURES) :])
    provisional = ProxyArtifact(
        model="public-proxy-logistic-v1",
        version="2026-10-24",
        dataset_scope="public_proxy:lendingclub_granting_model",
        target="Default (charged_off=1, fully_paid=0)",
        production_eligible=False,
        features=FEATURES,
        means=means,
        scales=scales,
        weights=tuple(coefficients[: len(FEATURES)]),
        bias=coefficients[-1],
        train_count=len(train_rows),
        positive_rate=sum(label for _, _, label in train_rows) / len(train_rows),
        validation={},
        calibration_method="isotonic",
        calibration_thresholds=(),
        calibration_probabilities=(),
    )
    calibration_raw = [_predict_row_raw(provisional, features) for _, features, _ in calibration_rows]
    calibration_curve = fit_isotonic_calibrator(calibration_raw, [label for _, _, label in calibration_rows])
    provisional = ProxyArtifact(
        **{
            **asdict(provisional),
            "calibration_thresholds": tuple(calibration_curve[0]),
            "calibration_probabilities": tuple(calibration_curve[1]),
        }
    )
    validation_labels = [label for _, _, label in validation_rows]
    validation_probabilities = [_predict_row(provisional, features) for _, features, _ in validation_rows]
    validation_report = evaluate_model(
        provisional.model,
        validation_labels,
        validation_probabilities,
        validation_probabilities,
    )
    artifact = ProxyArtifact(
        **{**asdict(provisional), "validation": asdict(validation_report)}
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(asdict(artifact), indent=2) + "\n", encoding="utf-8")
    return artifact


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("csv", type=Path)
    parser.add_argument("--output", type=Path, default=Path("artifacts/public-proxy-logistic.json"))
    parser.add_argument("--max-rows", type=int, default=20_000)
    args = parser.parse_args()
    artifact = train(args.csv, args.output, max_rows=args.max_rows)
    print(json.dumps(asdict(artifact), indent=2))


if __name__ == "__main__":
    main()
