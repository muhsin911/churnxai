"""Database models for application users and prediction audit records."""
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utc_now() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class User(Base):
    """An individually provisioned application account."""

    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class PredictionRecord(Base):
    """A prediction audit event owned by the user who requested it."""

    __tablename__ = "prediction_records"
    __table_args__ = (
        Index("ix_prediction_records_owner_created", "user_id", "created_at"),
        Index("ix_prediction_records_created_at", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    model_name: Mapped[str] = mapped_column(String(160), nullable=False)
    model_status: Mapped[str] = mapped_column(String(40), nullable=False)
    churn_probability: Mapped[float] = mapped_column(Float, nullable=False)
    churn_risk: Mapped[str] = mapped_column(String(20), nullable=False)
    predicted_class: Mapped[bool] = mapped_column(Boolean, nullable=False)
    decision_threshold: Mapped[float] = mapped_column(Float, nullable=False)
    input_features: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    explanation: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
