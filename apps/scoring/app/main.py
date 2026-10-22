from typing import Literal, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .ml_pipeline import drift_report, evaluate_model, synthetic_pd_dataset

app = FastAPI(title="alfa-future scoring", version="0.1.0")


class Health(BaseModel):
    status: Literal["ok"]
    service: Literal["scoring"]


class EgrulInput(BaseModel):
    status: Optional[str] = None


class BkiInput(BaseModel):
    activeLoans: Optional[int] = Field(default=None, ge=0)
    overdueDays: Optional[int] = Field(default=None, ge=0)


class FnsInput(BaseModel):
    taxDebtRub: Optional[float] = Field(default=None, ge=0)


class ScoreRequest(BaseModel):
    """Валидируемые поля ScoreRequest из packages/contracts."""

    inn: str = Field(pattern=r"^\d{10,12}$")
    egrul: EgrulInput
    bki: BkiInput
    fns: FnsInput
    # Данные заявки необязательны для обратной совместимости с company-check.
    # Если их нет, сервис считает только профильный baseline и не одобряет заявку.
    requestedAmount: Optional[float] = Field(default=None, ge=0)
    termMonths: Optional[int] = Field(default=None, ge=0)
    annualRevenue: Optional[float] = Field(default=None, ge=0)
    monthlyExpenses: Optional[float] = Field(default=None, ge=0)
    currentPayments: Optional[float] = Field(default=None, ge=0)
    documentsComplete: bool = False
    consentBki: bool = False
    collateralConfirmed: bool = False


class ScoreFactor(BaseModel):
    id: str
    label: str
    value: str
    impact: float
    source: Optional[str] = None
    confidence: Optional[float] = Field(default=None, ge=0, le=1)


class ScoreResponse(BaseModel):
    inn: str
    score: float
    model: str
    factors: list[ScoreFactor] = Field(default_factory=list)
    model_version: str = "2026-10-23"
    grade: Literal["A", "B", "C", "D"] = "C"
    pd: float = Field(default=0.2, ge=0, le=1)
    risk_band: Literal["low", "moderate", "high"] = "moderate"
    health_index: float = Field(default=0, ge=0, le=100)
    readiness_index: float = Field(default=0, ge=0, le=100)
    confidence: float = Field(default=0, ge=0, le=1)
    recommendation: Literal[
        "approve", "counter_offer", "request_info", "manual_review", "reject"
    ] = "manual_review"
    reasons: list[str] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)
    explainability: list[str] = Field(default_factory=list)
    autonomy_mode: Literal["shadow", "assist", "controlled"] = "shadow"


def _number(payload: BaseModel, key: str) -> Optional[float]:
    value = getattr(payload, key, None)
    return float(value) if isinstance(value, (int, float)) else None


def _text(payload: BaseModel, key: str) -> str:
    value = getattr(payload, key, None)
    return value if isinstance(value, str) else ""


def calculate_score_details(req: ScoreRequest) -> tuple[float, list[ScoreFactor]]:
    """Детерминированный baseline и объяснение вклада каждого источника."""
    score = 50.0
    factors: list[ScoreFactor] = []

    status = _text(req.egrul, "status").strip().lower()
    if status in {"active", "действует", "действующая"}:
        impact = 15.0
        value = "Действующее"
    elif status:
        impact = -25.0
        value = status
    else:
        impact = 0.0
        value = "Нет данных"
    score += impact
    factors.append(ScoreFactor(id="egrul_status", label="Статус ЕГРЮЛ", value=value, impact=impact))

    overdue_days = _number(req.bki, "overdueDays")
    if overdue_days is None:
        impact = 0.0
        value = "Нет данных"
    elif overdue_days == 0:
        impact = 15.0
        value = "Просрочек нет"
    elif overdue_days <= 30:
        impact = -5.0
        value = f"Просрочка {int(overdue_days)} дн."
    else:
        impact = -25.0
        value = f"Просрочка {int(overdue_days)} дн."
    score += impact
    factors.append(ScoreFactor(id="bki_overdue", label="Просрочки БКИ", value=value, impact=impact))

    tax_debt = _number(req.fns, "taxDebtRub")
    if tax_debt is None:
        impact = 0.0
        value = "Нет данных"
    elif tax_debt == 0:
        impact = 10.0
        value = "Задолженности нет"
    elif tax_debt <= 100_000:
        impact = -5.0
        value = f"Долг {tax_debt:,.0f} ₽"
    else:
        impact = -20.0
        value = f"Долг {tax_debt:,.0f} ₽"
    score += impact
    factors.append(ScoreFactor(id="fns_tax_debt", label="Налоговый долг", value=value, impact=impact))

    active_loans = _number(req.bki, "activeLoans")
    if active_loans is None:
        impact = 0.0
        value = "Нет данных"
    elif active_loans <= 3:
        impact = 5.0
        value = f"Активных кредитов: {int(active_loans)}"
    else:
        impact = -5.0
        value = f"Активных кредитов: {int(active_loans)}"
    score += impact
    factors.append(ScoreFactor(id="bki_active_loans", label="Активные кредиты", value=value, impact=impact))

    return max(0.0, min(100.0, score)), factors


def calculate_score(req: ScoreRequest) -> float:
    """Совместимый helper для потребителей baseline без факторов."""
    score, _ = calculate_score_details(req)
    return score


def _derived_result(req: ScoreRequest, score: float) -> dict[str, object]:
    """Риск/готовность для decision engine; не является гарантией одобрения."""
    grade = "A" if score >= 70 else "B" if score >= 55 else "C" if score >= 42 else "D"
    risk_band = "low" if grade == "A" else "moderate" if grade in {"B", "C"} else "high"
    # Демонстрационная монотонная проекция. Калибровка PD появится только после
    # появления размеченного временного датасета и отдельного calibration split.
    pd = max(0.01, min(0.5, 0.35 - score * 0.003))

    overdue = _number(req.bki, "overdueDays")
    tax_debt = _number(req.fns, "taxDebtRub")
    health = score
    if overdue is None or tax_debt is None:
        health -= 8
    if overdue is not None and overdue > 30:
        health -= 20
    if tax_debt is not None and tax_debt > 0:
        health -= 8
    health_index = max(0.0, min(100.0, health))

    readiness_parts = [req.consentBki, req.documentsComplete]
    if req.requestedAmount is not None and req.termMonths is not None:
        readiness_parts.append(True)
    if req.annualRevenue is not None:
        readiness_parts.append(True)
    readiness_index = round(100 * sum(readiness_parts) / len(readiness_parts))
    missing = []
    if not req.consentBki:
        missing.append("согласие на запрос БКИ")
    if not req.documentsComplete:
        missing.append("подтверждающие документы")
    if req.requestedAmount is None or req.termMonths is None:
        missing.append("сумма и срок заявки")
    if req.annualRevenue is None:
        missing.append("годовая выручка")
    confidence = max(0.1, min(1.0, readiness_index / 100))
    reasons: list[str] = []
    next_actions: list[str] = []
    if overdue is not None and overdue > 30:
        recommendation = "reject"
        reasons.append("Просрочка в БКИ больше 30 дней")
        next_actions.append("Проверить причину просрочки и подать новую заявку после погашения")
    elif missing:
        recommendation = "request_info"
        reasons.append("Недостаточно подтверждённых данных")
        next_actions.append("Предоставить: " + ", ".join(missing))
    elif tax_debt is not None and tax_debt > 100_000:
        recommendation = "manual_review"
        reasons.append("Налоговая задолженность требует ручной проверки")
        next_actions.append("Загрузить справку об отсутствии задолженности")
    elif score < 42:
        recommendation = "reject"
        reasons.append("Балл ниже минимального порога")
        next_actions.append("Изменить сумму или срок и повторно пройти проверку")
    elif req.annualRevenue and req.requestedAmount:
        projected_load = (req.currentPayments or 0) + req.requestedAmount / max(
            1, (req.termMonths or 12)
        )
        projected_load = projected_load * 12 / req.annualRevenue
        if projected_load > 0.7:
            recommendation = "counter_offer"
            reasons.append("Запрошенная сумма создаёт высокую долговую нагрузку")
            next_actions.append("Рассмотреть меньшую сумму или больший срок")
        elif score >= 70:
            recommendation = "approve"
            reasons.append("Стоп-факторы отсутствуют, данные подтверждены")
            next_actions.append("Передать рекомендацию менеджеру на подтверждение")
        else:
            recommendation = "manual_review"
            reasons.append("Профиль находится в зоне ручной проверки")
            next_actions.append("Проверить факторы и принять решение сотрудником")
    else:
        recommendation = "manual_review"
        reasons.append("Для рекомендации нужны параметры заявки")
        next_actions.append("Передать сумму, срок и финансовые показатели")

    return {
        "model_version": "2026-10-23",
        "grade": grade,
        "pd": round(pd, 4),
        "risk_band": risk_band,
        "health_index": round(health_index, 1),
        "readiness_index": readiness_index,
        "confidence": round(confidence, 3),
        "recommendation": recommendation,
        "reasons": reasons,
        "next_actions": next_actions,
        "explainability": [
            "Факторы отсортированы по абсолютному влиянию на baseline score",
            "Рекомендация не заменяет решение сотрудника банка",
        ],
        "autonomy_mode": "shadow",
    }


@app.get("/health")
def health() -> Health:
    return Health(status="ok", service="scoring")


@app.post("/v1/score")
def score(req: ScoreRequest) -> ScoreResponse:
    score_value, factors = calculate_score_details(req)
    derived = _derived_result(req, score_value)
    return ScoreResponse(
        inn=req.inn,
        score=score_value,
        model="rules-baseline-v2",
        factors=factors,
        **derived,
    )


@app.get("/v1/models/evaluation")
def model_evaluation() -> dict[str, object]:
    """Регрессионный champion/challenger отчёт для демо и мониторинга."""
    scores, labels = synthetic_pd_dataset(size=200, seed=7)
    probabilities = [max(0.01, min(0.5, 0.35 - value * 0.003)) for value in scores]
    baseline = evaluate_model("rules-baseline-v2", labels, probabilities, scores)
    challenger = evaluate_model("calibrated-challenger-v1", labels, probabilities, scores)
    return {"champion": baseline.__dict__, "challenger": challenger.__dict__, "selected": baseline.model}


@app.post("/v1/models/drift")
def model_drift(payload: dict[str, list[float]]) -> dict[str, object]:
    """Проверяет PSI и сообщает, нужно ли приостановить autonomy."""
    report = drift_report(payload.get("baseline", []), payload.get("current", []))
    return {**report.__dict__, "recommended_action": "pause_autonomy" if report.population_shifted else "continue"}
