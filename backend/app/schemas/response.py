"""
Pydantic schemas for API responses.
Defines the exact contract for what the API returns to the frontend.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class PredictionResponse(BaseModel):
    """Response schema for the /predict endpoint."""
    customerID: Optional[str] = Field(None, description="Optional customer identifier")
    churn_probability: float = Field(..., description="Probability of churn (0.0 to 1.0)")
    churn_risk: str = Field(..., description="Risk level: Low, Medium, High, or Critical")
    predicted_class: int = Field(..., description="0 = Stay, 1 = Churn")
    confidence: str = Field(..., description="Model confidence: High or Medium")
    model_used: str = Field(..., description="Name of the model used for prediction")
    threshold_used: float = Field(..., description="Decision threshold applied")

    # Fix the Pydantic V2 warning for fields starting with "model_"
    model_config = {
        "protected_namespaces": ()
    }


class SHAPDriver(BaseModel):
    """Schema for a single SHAP feature driver."""
    feature: str = Field(..., description="Name of the feature")
    shap_value: float = Field(..., description="SHAP value in log-odds")
    direction: str = Field(..., description="Increases churn risk or Decreases churn risk")


class SHAPExplanation(BaseModel):
    """Response schema for the /explain endpoint."""
    customerID: Optional[str] = Field(None, description="Optional customer identifier")
    churn_probability: float = Field(..., description="Probability of churn (0.0 to 1.0)")
    base_value_logodds: float = Field(..., description="SHAP base value in log-odds space")
    base_value_probability: float = Field(..., description="SHAP base value converted to probability")
    shap_values: Dict[str, float] = Field(..., description="Mapping of feature names to their SHAP values")
    top_positive_drivers: List[SHAPDriver] = Field(..., description="Top features pushing prediction toward churn")
    top_negative_drivers: List[SHAPDriver] = Field(..., description="Top features pushing prediction toward retention")
    waterfall_image_base64: str = Field(..., description="Base64-encoded PNG string of the SHAP waterfall plot")
    interpretation: str = Field(..., description="Plain-English, business-friendly explanation of the prediction")