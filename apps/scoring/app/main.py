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


@app.get("/health")
def health() -> Health:
    return Health(status="ok", service="scoring")


@app.post("/v1/score")
def score(req: ScoreRequest) -> ScoreResponse:
    # Заглушка: модель скоринга появится позже.
    return ScoreResponse(inn=req.inn, score=0.5, model="stub")
