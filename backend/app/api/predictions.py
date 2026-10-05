"""Role-protected prediction history and combined inference endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import ExplanationError, ModelNotLoadedError, ModelPredictionError
from app.db.dependencies import DbSession, UserRole, require_roles
from app.db.models import PredictionRecord, User
from app.ml.explainer import get_explainer
from app.ml.predictor import predictor
from app.schemas import CustomerInput, PredictionResponse, SHAPExplanation
from app.schemas.predictions import PredictionExperience, PredictionHistoryItem, PredictionHistoryResponse
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["Predictions"])
history_access = require_roles(UserRole.STAFF, UserRole.MANAGER, UserRole.PROFESSOR)


def _history_item(record: PredictionRecord, username: str | None = None) -> PredictionHistoryItem:
    """Convert a private audit row to the minimized history response."""
    explanation = record.explanation
    return PredictionHistoryItem(
        id=record.id,
        created_at=record.created_at,
        username=username,
        model_name=record.model_name,
        model_status=record.model_status,
        churn_probability=record.churn_probability,
        churn_risk=record.churn_risk,
        predicted_class=record.predicted_class,
        decision_threshold=record.decision_threshold,
        top_positive_drivers=explanation["top_positive_drivers"],
        top_negative_drivers=explanation["top_negative_drivers"],
    )


@router.post("/predict-and-explain", response_model=PredictionExperience)
def predict_and_explain(
    customer: CustomerInput,
    db: DbSession,
    user: User = Depends(history_access),
) -> PredictionExperience:
    """Run both model operations and persist one complete audit event."""
    if not predictor.is_loaded:
        raise ModelNotLoadedError().to_http_exception()

    try:
        customer_data = customer.model_dump()
        prediction = predictor.predict(customer_data)
        explanation_engine = get_explainer(predictor._pipeline, predictor._metadata)
        explanation = explanation_engine.explain(customer_data)
        persisted_explanation = {
            "top_positive_drivers": explanation["top_positive_drivers"],
            "top_negative_drivers": explanation["top_negative_drivers"],
            "base_value_logodds": explanation["base_value_logodds"],
            "base_value_probability": explanation["base_value_probability"],
            "shap_values": explanation["shap_values"],
            "interpretation": explanation["interpretation"],
        }
        record = PredictionRecord(
            user_id=user.id,
            model_name=str(prediction["model_used"]),
            model_status=str((predictor._metadata or {}).get("model_status", "unknown")),
            churn_probability=float(prediction["churn_probability"]),
            churn_risk=str(prediction["churn_risk"]),
            predicted_class=bool(prediction["predicted_class"]),
            decision_threshold=float(prediction["threshold_used"]),
            input_features=customer_data,
            explanation=persisted_explanation,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        prediction_response = {**prediction, "prediction_id": record.id}
        return PredictionExperience(
            prediction_id=record.id,
            prediction=PredictionResponse(**prediction_response),
            explanation=SHAPExplanation(**explanation),
        )
    except (ModelPredictionError, ExplanationError) as exc:
        db.rollback()
        raise exc.to_http_exception() from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Prediction audit persistence failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prediction could not be completed and recorded.",
        ) from exc


@router.get(
    "/predictions",
    response_model=PredictionHistoryResponse,
    response_model_exclude_none=True,
)
def prediction_history(
    db: DbSession,
    user: User = Depends(history_access),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> PredictionHistoryResponse:
    """Return the current user's records, or organization-wide records to managers."""
    organization_view = user.role in {
        UserRole.MANAGER.value,
        UserRole.PROFESSOR.value,
    }
    if organization_view:
        statement = select(PredictionRecord, User.username).outerjoin(
            User, User.id == PredictionRecord.user_id
        )
        count_statement = select(func.count(PredictionRecord.id))
    else:
        statement = select(PredictionRecord).where(PredictionRecord.user_id == user.id)
        count_statement = select(func.count(PredictionRecord.id)).where(
            PredictionRecord.user_id == user.id
        )
    statement = statement.order_by(PredictionRecord.created_at.desc(), PredictionRecord.id.desc())
    rows = db.execute(statement).all()
    total = int(db.scalar(count_statement) or 0)
    return PredictionHistoryResponse(
        items=[
            _history_item(row[0], row[1] if organization_view else None)
            for row in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/predictions/{prediction_id}",
    response_model=PredictionHistoryItem,
    response_model_exclude_none=True,
)
def prediction_history_detail(
    prediction_id: UUID,
    db: DbSession,
    user: User = Depends(history_access),
) -> PredictionHistoryItem:
    """Return a prediction detail only to its owner or a manager."""
    record = db.get(PredictionRecord, prediction_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction record not found.")
    organization_view = user.role in {
        UserRole.MANAGER.value,
        UserRole.PROFESSOR.value,
    }
    if not organization_view and record.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction record not found.")
    owner = db.get(User, record.user_id)
    return _history_item(record, owner.username if organization_view and owner else None)
