"""Explainability endpoint."""
from fastapi import APIRouter, HTTPException
from app.schemas import CustomerInput, SHAPExplanation
from app.ml.predictor import predictor
from app.ml.explainer import get_explainer
from app.core.exceptions import ModelNotLoadedError, ExplanationError
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["Explainability"])

@router.post("/explain", response_model=SHAPExplanation)
async def explain_churn(customer: CustomerInput):
    """
    Generates a SHAP explanation for a given customer profile.
    """
    if not predictor.is_loaded:
        raise ModelNotLoadedError().to_http_exception()
    
    try:
        # Get the singleton explainer instance, initialized with the loaded pipeline
        explainer = get_explainer(predictor._pipeline, predictor._metadata)
        result = explainer.explain(customer.model_dump())
        return SHAPExplanation(**result)
    
    except ExplanationError as e:
        raise e.to_http_exception()
    except Exception as e:
        logger.error(f"Unexpected error in /explain: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during explanation")