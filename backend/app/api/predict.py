"""Prediction endpoint."""
from fastapi import APIRouter, HTTPException
from app.schemas import CustomerInput, PredictionResponse
from app.ml.predictor import predictor
from app.core.exceptions import ModelNotLoadedError, ModelPredictionError
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["Prediction"])

@router.post("/predict", response_model=PredictionResponse)
async def predict_churn(customer: CustomerInput):
    """
    Predicts churn probability for a given customer profile.
    """
    if not predictor.is_loaded:
        raise ModelNotLoadedError().to_http_exception()
    
    try:
        # .model_dump() converts the Pydantic model to a standard dict
        result = predictor.predict(customer.model_dump())
        return PredictionResponse(**result)
    
    except ModelPredictionError as e:
        raise e.to_http_exception()
    except Exception as e:
        logger.error(f"Unexpected error in /predict: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during prediction")