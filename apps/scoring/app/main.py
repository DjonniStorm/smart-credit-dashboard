from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="alfa-future scoring", version="0.1.0")


class Health(BaseModel):
    status: Literal["ok"]
    service: Literal["scoring"]


class ScoreRequest(BaseModel):
    """Зеркало ScoreRequest из packages/contracts."""

    inn: str
    egrul: dict[str, object]
    bki: dict[str, object]
    fns: dict[str, object]


class ScoreResponse(BaseModel):
    inn: str
    score: float
    model: str


def _number(payload: dict[str, object], key: str) -> float:
    value = payload.get(key)
    return float(value) if isinstance(value, (int, float)) else 0.0


def _text(payload: dict[str, object], key: str) -> str:
    value = payload.get(key)
    return value if isinstance(value, str) else ""


def calculate_score(req: ScoreRequest) -> float:
    """Детерминированный baseline до подключения ML-модели."""
    score = 50.0
    score += (
        15.0
        if _text(req.egrul, "status").lower() in {"active", "действует"}
        else -25.0
    )

    overdue_days = _number(req.bki, "overdueDays")
    if overdue_days == 0:
        score += 15.0
    elif overdue_days <= 30:
        score -= 5.0
    else:
        score -= 25.0

    tax_debt = _number(req.fns, "taxDebtRub")
    if tax_debt == 0:
        score += 10.0
    elif tax_debt <= 100_000:
        score -= 5.0
    else:
        score -= 20.0

    active_loans = _number(req.bki, "activeLoans")
    score += 5.0 if active_loans <= 3 else -5.0
    return max(0.0, min(100.0, score))


@app.get("/health")
def health() -> Health:
    return Health(status="ok", service="scoring")


@app.post("/v1/score")
def score(req: ScoreRequest) -> ScoreResponse:
    return ScoreResponse(
        inn=req.inn,
        score=calculate_score(req),
        model="rules-baseline-v1",
    )
