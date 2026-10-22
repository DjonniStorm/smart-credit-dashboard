from typing import Literal, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

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


class ScoreFactor(BaseModel):
    id: str
    label: str
    value: str
    impact: float


class ScoreResponse(BaseModel):
    inn: str
    score: float
    model: str
    factors: list[ScoreFactor] = Field(default_factory=list)


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


@app.get("/health")
def health() -> Health:
    return Health(status="ok", service="scoring")


@app.post("/v1/score")
def score(req: ScoreRequest) -> ScoreResponse:
    score_value, factors = calculate_score_details(req)
    return ScoreResponse(
        inn=req.inn,
        score=score_value,
        model="rules-baseline-v1",
        factors=factors,
    )
