"""
PlayProof Scoring Service - FastAPI placeholder

This service will handle ML-based scoring of verification events using XGBoost.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

app = FastAPI(
    title="PlayProof Scoring Service",
    description="ML-based scoring for human verification events",
    version="0.1.0"
)


class VerificationResult(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    REGENERATE = "REGENERATE"
    STEP_UP = "STEP_UP"


class Event(BaseModel):
    type: str
    timestamp: float
    data: dict


class ScoringRequest(BaseModel):
    session_id: str
    events: List[Event]


class ScoringResponse(BaseModel):
    result: VerificationResult
    confidence: float
    details: Optional[dict] = None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "playproof-scoring"}


@app.post("/score", response_model=ScoringResponse)
async def score(request: ScoringRequest):
    """
    Score verification events and return pass/fail decision.
    
    TODO: Implement XGBoost model scoring
    """
    # Placeholder - always returns PASS with high confidence
    return ScoringResponse(
        result=VerificationResult.PASS,
        confidence=0.95,
        details={"placeholder": True, "events_received": len(request.events)}
    )
