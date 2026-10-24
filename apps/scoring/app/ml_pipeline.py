"""Независимый от ML-библиотеки контур feature snapshot и валидации PD.

Модуль намеренно использует только stdlib: baseline и тестовый synthetic-пайплайн
должны запускаться в demo-окружении без скачивания модели. Позже scorer можно
заменить sklearn/lightgbm-моделью, не меняя контракт snapshot и метрик.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Mapping, Sequence


@dataclass(frozen=True)
class FeatureSnapshot:
    snapshot_id: str
    created_at: str
    values: Mapping[str, float | str | bool | None]
    provenance: Mapping[str, str]


@dataclass(frozen=True)
class ModelEvaluation:
    """Сравнение champion/challenger на одном отложенном наборе."""

    model: str
    brier: float
    logloss: float
    ece: float
    auc: float
    sample_count: int = 0
    positive_rate: float = 0.0
    pr_auc: float = 0.0
    ks: float = 0.0


@dataclass(frozen=True)
class ModelSelection:
    selected: str
    reason: str
    challenger_eligible: bool


@dataclass(frozen=True)
class TemporalSplit:
    train: tuple[float, ...]
    train_labels: tuple[int, ...]
    calibration: tuple[float, ...]
    calibration_labels: tuple[int, ...]
    test: tuple[float, ...]
    test_labels: tuple[int, ...]


@dataclass(frozen=True)
class DriftReport:
    """Мониторинг сдвига score distribution без внешних ML-зависимостей."""

    psi: float
    population_shifted: bool
    baseline_count: int
    current_count: int


@dataclass(frozen=True)
class ConfidenceInterval:
    metric: str
    estimate: float
    lower: float
    upper: float
    samples: int


def fairness_audit(
    labels: Sequence[int], probabilities: Sequence[float], groups: Sequence[str], *, threshold: float = 0.5
) -> dict[str, dict[str, float | int]]:
    """Audit-only group metrics; groups never enter model inference or decisioning."""
    if len(labels) != len(probabilities) or len(labels) != len(groups) or not labels:
        raise ValueError("labels, probabilities и groups должны иметь одинаковый непустой размер")
    validate_binary_dataset(labels, probabilities)
    if not 0 < threshold < 1:
        raise ValueError("threshold должен быть в диапазоне 0..1")
    report: dict[str, dict[str, float | int]] = {}
    for group in sorted(set(groups)):
        indexes = [index for index, value in enumerate(groups) if value == group]
        group_labels = [labels[index] for index in indexes]
        positives = sum(group_labels)
        negatives = len(group_labels) - positives
        predicted_positive = sum(probabilities[index] >= threshold for index in indexes)
        true_positive = sum(
            labels[index] == 1 and probabilities[index] >= threshold for index in indexes
        )
        false_positive = sum(
            labels[index] == 0 and probabilities[index] >= threshold for index in indexes
        )
        report[group] = {
            "sample_count": len(indexes),
            "selection_rate": predicted_positive / len(indexes),
            "tpr": true_positive / positives if positives else 0.0,
            "fpr": false_positive / negatives if negatives else 0.0,
        }
    return report


def _sigmoid(value: float) -> float:
    """Numerically stable sigmoid for calibration and inference."""
    if value >= 0:
        exponent = math.exp(-value)
        return 1.0 / (1.0 + exponent)
    exponent = math.exp(value)
    return exponent / (1.0 + exponent)


def build_feature_snapshot(
    values: Mapping[str, float | str | bool | None],
    provenance: Mapping[str, str] | None = None,
    *,
    created_at: str | None = None,
) -> FeatureSnapshot:
    """Канонически сериализует признаки и создаёт воспроизводимый id."""
    canonical = json.dumps(dict(sorted(values.items())), ensure_ascii=False, separators=(",", ":"))
    snapshot_id = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]
    timestamp = created_at or datetime.now(timezone.utc).isoformat()
    return FeatureSnapshot(
        snapshot_id=snapshot_id,
        created_at=timestamp,
        values=dict(values),
        provenance=dict(provenance or {}),
    )


def fit_isotonic_calibrator(
    scores: Sequence[float], labels: Sequence[int]
) -> tuple[tuple[float, ...], tuple[float, ...]]:
    """PAVA-isotonic calibration для монотонного raw risk score."""
    if len(scores) != len(labels) or not scores:
        raise ValueError("scores и labels должны быть непустыми массивами одинаковой длины")
    if any(not math.isfinite(score) for score in scores):
        raise ValueError("scores должны быть конечными числами")
    validate_binary_dataset(labels)
    points = sorted(zip(scores, labels), key=lambda pair: pair[0])
    blocks: list[list[float]] = []
    for score, label in points:
        blocks.append([float(score), float(score), 1.0, float(label)])
        while len(blocks) >= 2 and blocks[-2][3] / blocks[-2][2] > blocks[-1][3] / blocks[-1][2]:
            right = blocks.pop()
            left = blocks.pop()
            blocks.append([left[0], right[1], left[2] + right[2], left[3] + right[3]])
    thresholds = tuple(block[1] for block in blocks)
    probabilities = tuple(block[3] / block[2] for block in blocks)
    return thresholds, probabilities


def validate_binary_dataset(labels: Sequence[int], probabilities: Sequence[float] | None = None) -> None:
    """Fail closed on malformed labels/probabilities before calculating metrics."""
    if not labels:
        raise ValueError("датасет не должен быть пустым")
    if any(label not in (0, 1) for label in labels):
        raise ValueError("labels должны содержать только 0 и 1")
    if len(set(labels)) < 2:
        raise ValueError("датасет должен содержать оба класса")
    if probabilities is not None:
        if len(probabilities) != len(labels):
            raise ValueError("labels и probabilities должны иметь одинаковую длину")
        if any(not math.isfinite(value) or not 0 <= value <= 1 for value in probabilities):
            raise ValueError("probabilities должны быть конечными и находиться в диапазоне 0..1")


def temporal_split(
    scores: Sequence[float],
    labels: Sequence[int],
    train_ratio: float = 0.6,
    calibration_ratio: float = 0.2,
) -> TemporalSplit:
    """Делит упорядоченный по времени набор без перемешивания."""
    if len(scores) != len(labels) or len(scores) < 10:
        raise ValueError("scores и labels должны иметь одинаковый размер >= 10")
    if not 0 < train_ratio < 1 or not 0 < calibration_ratio < 1 or train_ratio + calibration_ratio >= 1:
        raise ValueError("некорректные доли temporal split")
    train_end = max(2, int(len(scores) * train_ratio))
    calibration_end = max(train_end + 2, int(len(scores) * (train_ratio + calibration_ratio)))
    if calibration_end >= len(scores):
        calibration_end = len(scores) - 2
    split = TemporalSplit(
        train=tuple(scores[:train_end]),
        train_labels=tuple(labels[:train_end]),
        calibration=tuple(scores[train_end:calibration_end]),
        calibration_labels=tuple(labels[train_end:calibration_end]),
        test=tuple(scores[calibration_end:]),
        test_labels=tuple(labels[calibration_end:]),
    )
    validate_binary_dataset(split.train_labels)
    validate_binary_dataset(split.calibration_labels)
    validate_binary_dataset(split.test_labels)
    return split


def calibrate(score: float, calibrator: tuple[Sequence[float], Sequence[float]]) -> float:
    thresholds, probabilities = calibrator
    for threshold, probability in zip(thresholds, probabilities):
        if score <= threshold:
            return max(0.0, min(1.0, probability))
    return max(0.0, min(1.0, probabilities[-1]))


def fit_sigmoid_calibrator(
    scores: Sequence[float], labels: Sequence[int], *, steps: int = 2_000, learning_rate: float = 0.05
) -> tuple[float, float, float, float]:
    """Platt-style one-dimensional sigmoid calibration using deterministic GD."""
    validate_binary_dataset(labels)
    if len(scores) != len(labels) or not scores:
        raise ValueError("scores и labels должны быть непустыми массивами одинаковой длины")
    mean = sum(scores) / len(scores)
    scale = max(1.0, math.sqrt(sum((value - mean) ** 2 for value in scores) / len(scores)))
    normalized = [(value - mean) / scale for value in scores]
    weight, bias = 0.0, 0.0
    for _ in range(steps):
        gradients = [0.0, 0.0]
        for value, label in zip(normalized, labels):
            probability = _sigmoid(weight * value + bias)
            error = probability - label
            gradients[0] += error * value
            gradients[1] += error
        weight -= learning_rate * gradients[0] / len(labels)
        bias -= learning_rate * gradients[1] / len(labels)
    # Store normalization in the tuple so calibration is independent of caller state.
    return weight, bias, mean, scale


def calibrate_sigmoid(score: float, calibrator: tuple[float, float, float, float]) -> float:
    weight, bias, mean, scale = calibrator
    value = (score - mean) / max(1.0, scale)
    probability = _sigmoid(weight * value + bias)
    return max(0.0, min(1.0, probability))


def brier_score(labels: Sequence[int], probabilities: Sequence[float]) -> float:
    if len(labels) != len(probabilities) or not labels:
        raise ValueError("labels и probabilities должны быть непустыми массивами одинаковой длины")
    validate_binary_dataset(labels, probabilities)
    return sum((probability - label) ** 2 for label, probability in zip(labels, probabilities)) / len(labels)


def log_loss(labels: Sequence[int], probabilities: Sequence[float]) -> float:
    if len(labels) != len(probabilities) or not labels:
        raise ValueError("labels и probabilities должны быть непустыми массивами одинаковой длины")
    validate_binary_dataset(labels, probabilities)
    eps = 1e-15
    return -sum(
        label * math.log(max(eps, probability))
        + (1 - label) * math.log(max(eps, 1 - probability))
        for label, probability in zip(labels, probabilities)
    ) / len(labels)


def expected_calibration_error(
    labels: Sequence[int], probabilities: Sequence[float], bins: int = 10
) -> float:
    if len(labels) != len(probabilities) or not labels or bins < 2:
        raise ValueError("некорректные входы ECE")
    validate_binary_dataset(labels, probabilities)
    total = len(labels)
    error = 0.0
    for index in range(bins):
        lower, upper = index / bins, (index + 1) / bins
        selected = [
            position
            for position, probability in enumerate(probabilities)
            if lower <= probability < upper or (index == bins - 1 and probability == upper)
        ]
        if selected:
            confidence = sum(probabilities[position] for position in selected) / len(selected)
            observed = sum(labels[position] for position in selected) / len(selected)
            error += len(selected) / total * abs(confidence - observed)
    return error


def rank_auc(labels: Sequence[int], scores: Sequence[float]) -> float:
    """AUC без sklearn; ties получают половину победы."""
    positives = [(score, label) for score, label in zip(scores, labels) if label == 1]
    negatives = [(score, label) for score, label in zip(scores, labels) if label == 0]
    if not positives or not negatives:
        raise ValueError("AUC требует оба класса")
    wins = sum(1.0 if positive[0] > negative[0] else 0.5 if positive[0] == negative[0] else 0.0 for positive in positives for negative in negatives)
    return wins / (len(positives) * len(negatives))


def precision_recall_auc(labels: Sequence[int], scores: Sequence[float]) -> float:
    """Average-precision style PR-AUC for imbalanced default targets."""
    if len(labels) != len(scores) or not labels:
        raise ValueError("labels и scores должны быть непустыми массивами одинаковой длины")
    validate_binary_dataset(labels)
    positives = sum(labels)
    if not positives:
        raise ValueError("PR-AUC требует положительный класс")
    order = sorted(range(len(scores)), key=lambda index: scores[index], reverse=True)
    true_positives = 0
    area = 0.0
    previous_recall = 0.0
    for rank, index in enumerate(order, start=1):
        if labels[index] == 1:
            true_positives += 1
            recall = true_positives / positives
            precision = true_positives / rank
            area += (recall - previous_recall) * precision
            previous_recall = recall
    return area


def ks_statistic(labels: Sequence[int], scores: Sequence[float]) -> float:
    """Kolmogorov-Smirnov separation between default/non-default scores."""
    if len(labels) != len(scores) or not labels:
        raise ValueError("labels и scores должны быть непустыми массивами одинаковой длины")
    validate_binary_dataset(labels)
    positives = sum(labels)
    negatives = len(labels) - positives
    order = sorted(range(len(scores)), key=lambda index: scores[index], reverse=True)
    seen_positive = seen_negative = 0
    maximum = 0.0
    for index in order:
        if labels[index]:
            seen_positive += 1
        else:
            seen_negative += 1
        maximum = max(maximum, abs(seen_positive / positives - seen_negative / negatives))
    return maximum


def bootstrap_confidence_interval(
    labels: Sequence[int], probabilities: Sequence[float], *, metric: str = "brier",
    iterations: int = 300, seed: int = 7, confidence: float = 0.95,
) -> ConfidenceInterval:
    """Deterministic percentile bootstrap interval for quality-gate reporting."""
    if iterations < 50 or not 0 < confidence < 1:
        raise ValueError("iterations должен быть >= 50, confidence в диапазоне 0..1")
    validate_binary_dataset(labels, probabilities)
    metric_functions = {
        "brier": lambda y, p: brier_score(y, p),
        "logloss": lambda y, p: log_loss(y, p),
        "auc": lambda y, p: rank_auc(y, p),
        "pr_auc": lambda y, p: precision_recall_auc(y, p),
        "ks": lambda y, p: ks_statistic(y, p),
    }
    if metric not in metric_functions:
        raise ValueError(f"неподдерживаемая bootstrap metric: {metric}")
    rng = random.Random(seed)
    values: list[float] = []
    indices = list(range(len(labels)))
    for _ in range(iterations):
        sample = [rng.choice(indices) for _ in indices]
        sample_labels = [labels[index] for index in sample]
        if len(set(sample_labels)) < 2:
            continue
        values.append(metric_functions[metric](sample_labels, [probabilities[index] for index in sample]))
    if len(values) < max(20, iterations // 2):
        raise ValueError("недостаточно валидных bootstrap samples с обоими классами")
    values.sort()
    estimate = metric_functions[metric](labels, probabilities)
    lower_index = int((1 - confidence) / 2 * (len(values) - 1))
    upper_index = int((1 - (1 - confidence) / 2) * (len(values) - 1))
    return ConfidenceInterval(metric, round(estimate, 6), round(values[lower_index], 6), round(values[upper_index], 6), len(values))


def evaluate_model(
    model: str,
    labels: Sequence[int],
    probabilities: Sequence[float],
    scores: Sequence[float] | None = None,
) -> ModelEvaluation:
    """Единый evaluation contract для baseline и challenger моделей."""
    validate_binary_dataset(labels, probabilities)
    if scores is not None and len(scores) != len(labels):
        raise ValueError("scores и labels должны иметь одинаковый размер")
    ranking = scores if scores is not None else probabilities
    return ModelEvaluation(
        model=model,
        brier=round(brier_score(labels, probabilities), 6),
        logloss=round(log_loss(labels, probabilities), 6),
        ece=round(expected_calibration_error(labels, probabilities), 6),
        auc=round(rank_auc(labels, ranking), 6),
        sample_count=len(labels),
        positive_rate=round(sum(labels) / len(labels), 6),
        pr_auc=round(precision_recall_auc(labels, ranking), 6),
        ks=round(ks_statistic(labels, ranking), 6),
    )


def select_challenger(
    champion: ModelEvaluation,
    challenger: ModelEvaluation,
    *,
    min_auc_gain: float = 0.005,
    max_brier_regression: float = 0.005,
    max_ece_regression: float = 0.02,
) -> ModelSelection:
    """Выбирает challenger только при доказанном улучшении без деградации calibration."""
    challenger_eligible = (
        challenger.auc >= champion.auc + min_auc_gain
        and challenger.brier <= champion.brier + max_brier_regression
        and challenger.ece <= champion.ece + max_ece_regression
    )
    if challenger_eligible:
        return ModelSelection(challenger.model, "challenger улучшил discrimination без недопустимой деградации calibration", True)
    return ModelSelection(champion.model, "champion сохранён: challenger не прошёл quality gate", False)


def population_stability_index(
    baseline: Sequence[float], current: Sequence[float], bins: int = 10
) -> float:
    """PSI для score/risk distribution; значения >= .2 считаются сдвигом."""
    if not baseline or not current or bins < 2:
        raise ValueError("baseline/current должны быть непустыми, bins >= 2")
    def histogram(values: Sequence[float]) -> list[float]:
        clipped = [max(0.0, min(1.0, value)) for value in values]
        counts = [0] * bins
        for value in clipped:
            index = min(bins - 1, int(value * bins))
            counts[index] += 1
        total = len(clipped)
        return [max(1e-6, count / total) for count in counts]

    expected, actual = histogram(baseline), histogram(current)
    return sum((a - e) * math.log(a / e) for e, a in zip(expected, actual))


def drift_report(baseline: Sequence[float], current: Sequence[float], threshold: float = 0.2) -> DriftReport:
    psi = population_stability_index(baseline, current)
    return DriftReport(
        psi=round(psi, 6),
        population_shifted=psi >= threshold,
        baseline_count=len(baseline),
        current_count=len(current),
    )


def synthetic_pd_dataset(size: int = 200, seed: int = 7) -> tuple[list[float], list[int]]:
    """Воспроизводимый dataset для smoke/регрессионных тестов, не для обучения production."""
    rng = random.Random(seed)
    scores: list[float] = []
    labels: list[int] = []
    for _ in range(size):
        score = rng.uniform(0, 100)
        default = 1 if rng.random() < max(0.02, 0.45 - score * 0.004) else 0
        scores.append(score)
        labels.append(default)
    return scores, labels

