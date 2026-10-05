"""Explainability endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from app.schemas import CustomerInput, SHAPExplanation
from app.db.dependencies import UserRole, require_roles
from app.db.models import User
from app.ml.predictor import predictor
from app.ml.explainer import get_explainer
from app.core.exceptions import ModelNotLoadedError, ExplanationError
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["Explainability"])
prediction_access = require_roles(UserRole.STAFF, UserRole.MANAGER, UserRole.PROFESSOR)

@router.post("/explain", response_model=SHAPExplanation)
def explain_churn(customer: CustomerInput, _user: User = Depends(prediction_access)):
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