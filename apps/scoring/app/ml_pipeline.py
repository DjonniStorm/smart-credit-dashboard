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
from typing import Iterable, Mapping, Sequence


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


@dataclass(frozen=True)
class DriftReport:
    """Мониторинг сдвига score distribution без внешних ML-зависимостей."""

    psi: float
    population_shifted: bool
    baseline_count: int
    current_count: int


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


def calibrate(score: float, calibrator: tuple[Sequence[float], Sequence[float]]) -> float:
    thresholds, probabilities = calibrator
    for threshold, probability in zip(thresholds, probabilities):
        if score <= threshold:
            return max(0.0, min(1.0, probability))
    return max(0.0, min(1.0, probabilities[-1]))


def brier_score(labels: Sequence[int], probabilities: Sequence[float]) -> float:
    if len(labels) != len(probabilities) or not labels:
        raise ValueError("labels и probabilities должны быть непустыми массивами одинаковой длины")
    return sum((probability - label) ** 2 for label, probability in zip(labels, probabilities)) / len(labels)


def log_loss(labels: Sequence[int], probabilities: Sequence[float]) -> float:
    if len(labels) != len(probabilities) or not labels:
        raise ValueError("labels и probabilities должны быть непустыми массивами одинаковой длины")
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


def evaluate_model(
    model: str,
    labels: Sequence[int],
    probabilities: Sequence[float],
    scores: Sequence[float] | None = None,
) -> ModelEvaluation:
    """Единый evaluation contract для baseline и challenger моделей."""
    ranking = scores if scores is not None else probabilities
    return ModelEvaluation(
        model=model,
        brier=round(brier_score(labels, probabilities), 6),
        logloss=round(log_loss(labels, probabilities), 6),
        ece=round(expected_calibration_error(labels, probabilities), 6),
        auc=round(rank_auc(labels, ranking), 6),
    )


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

