"""Prediction history and combined predict/explain API schemas."""
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from app.schemas.response import PredictionResponse, SHAPExplanation, SHAPDriver


class PredictionExperience(BaseModel):
    """Prediction and its local explanation, stored as one audit event."""

    prediction_id: UUID
    prediction: PredictionResponse
    explanation: SHAPExplanation


class PredictionHistoryItem(BaseModel):
    """A history row that deliberately omits submitted customer feature values."""

    id: UUID
    created_at: datetime
    username: str | None = None
    model_name: str
    model_status: str
    churn_probability: float
    churn_risk: str
    predicted_class: bool
    decision_threshold: float
    top_positive_drivers: list[SHAPDriver]
    top_negative_drivers: list[SHAPDriver]

    model_config = {"protected_namespaces": ()}


class PredictionHistoryResponse(BaseModel):
    """Page of user-owned or manager-visible audit events."""

    items: list[PredictionHistoryItem]
    total: int
    limit: int
    offset: int
