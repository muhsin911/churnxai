"""Prediction endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.schemas import CustomerInput, PredictionResponse
from app.db.dependencies import DbSession, UserRole, require_roles
from app.db.models import PredictionRecord, User
from app.ml.predictor import predictor
from app.core.exceptions import ModelNotLoadedError, ModelPredictionError
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["Prediction"])
prediction_access = require_roles(UserRole.STAFF, UserRole.MANAGER, UserRole.PROFESSOR)

@router.post("/predict", response_model=PredictionResponse)
def predict_churn(
    customer: CustomerInput,
    db: DbSession,
    user: User = Depends(prediction_access),
) -> PredictionResponse:
    """
    Predicts churn probability for a given customer profile.
    """
    if not predictor.is_loaded:
        raise ModelNotLoadedError().to_http_exception()
    
    try:
        # .model_dump() converts the Pydantic model to a standard dict
        customer_data = customer.model_dump()
        result = predictor.predict(customer_data)
        record = PredictionRecord(
            user_id=user.id,
            model_name=str(result["model_used"]),
            model_status=str((predictor._metadata or {}).get("model_status", "unknown")),
            churn_probability=float(result["churn_probability"]),
            churn_risk=str(result["churn_risk"]),
            predicted_class=bool(result["predicted_class"]),
            decision_threshold=float(result["threshold_used"]),
            input_features=customer_data,
            explanation={"top_positive_drivers": [], "top_negative_drivers": []},
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        result["prediction_id"] = record.id
        return PredictionResponse(**result)
    
    except ModelPredictionError as exc:
        db.rollback()
        raise exc.to_http_exception() from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Prediction or prediction audit persistence failed")
        raise HTTPException(
            status_code=500,
            detail="Prediction could not be completed and recorded.",
        ) from exc