"""Tests for Pydantic API schemas."""
import pytest
from pydantic import ValidationError

from app.schemas.customer import CustomerInput
from app.schemas.response import PredictionResponse, SHAPExplanation, SHAPDriver


class TestCustomerInputSchema:
    def test_valid_input(self):
        """Test that valid data passes validation."""
        data = {
            "gender": "Female", "SeniorCitizen": "No", "Partner": "Yes", "Dependents": "No",
            "tenure": 12, "PhoneService": "Yes", "MultipleLines": "No", "InternetService": "DSL",
            "OnlineSecurity": "No", "OnlineBackup": "Yes", "DeviceProtection": "No", "TechSupport": "No",
            "StreamingTV": "No", "StreamingMovies": "No", "Contract": "Month-to-month",
            "PaperlessBilling": "Yes", "PaymentMethod": "Electronic check",
            "MonthlyCharges": 85.70, "TotalCharges": 1020.00
        }
        # Should not raise an error
        customer = CustomerInput(**data)
        assert customer.tenure == 12
        assert customer.MonthlyCharges == 85.70

    def test_invalid_tenure_type(self):
        """Test that a string for tenure fails validation."""
        data = {
            "gender": "Female", "SeniorCitizen": "No", "Partner": "Yes", "Dependents": "No",
            "tenure": "twelve",  # INVALID: should be int
            "PhoneService": "Yes", "MultipleLines": "No", "InternetService": "DSL",
            "OnlineSecurity": "No", "OnlineBackup": "Yes", "DeviceProtection": "No", "TechSupport": "No",
            "StreamingTV": "No", "StreamingMovies": "No", "Contract": "Month-to-month",
            "PaperlessBilling": "Yes", "PaymentMethod": "Electronic check",
            "MonthlyCharges": 85.70, "TotalCharges": 1020.00
        }
        with pytest.raises(ValidationError) as exc_info:
            CustomerInput(**data)
        assert "tenure" in str(exc_info.value)

    def test_invalid_tenure_range(self):
        """Test that tenure < 0 fails validation."""
        data = {
            "gender": "Female", "SeniorCitizen": "No", "Partner": "Yes", "Dependents": "No",
            "tenure": -5,  # INVALID: ge=0
            "PhoneService": "Yes", "MultipleLines": "No", "InternetService": "DSL",
            "OnlineSecurity": "No", "OnlineBackup": "Yes", "DeviceProtection": "No", "TechSupport": "No",
            "StreamingTV": "No", "StreamingMovies": "No", "Contract": "Month-to-month",
            "PaperlessBilling": "Yes", "PaymentMethod": "Electronic check",
            "MonthlyCharges": 85.70, "TotalCharges": 1020.00
        }
        with pytest.raises(ValidationError) as exc_info:
            CustomerInput(**data)
        assert "greater than or equal to 0" in str(exc_info.value).lower()


class TestResponseSchemas:
    def test_prediction_response(self):
        """Test PredictionResponse schema."""
        data = {
            "churn_probability": 0.85,
            "churn_risk": "Critical",
            "predicted_class": 1,
            "confidence": "High",
            "model_used": "XGBoost",
            "threshold_used": 0.5
        }
        resp = PredictionResponse(**data)
        assert resp.churn_probability == 0.85
        assert resp.churn_risk == "Critical"

    def test_shap_explanation(self):
        """Test SHAPExplanation schema."""
        data = {
            "churn_probability": 0.85,
            "base_value_logodds": -1.0,
            "base_value_probability": 0.27,
            "shap_values": {"tenure": -0.5, "Contract_Month-to-month": 0.8},
            "top_positive_drivers": [{"feature": "Contract_Month-to-month", "shap_value": 0.8, "direction": "Increases churn risk"}],
            "top_negative_drivers": [{"feature": "tenure", "shap_value": -0.5, "direction": "Decreases churn risk"}],
            "waterfall_image_base64": "fake_base64_string",
            "interpretation": "High risk due to contract type."
        }
        resp = SHAPExplanation(**data)
        assert len(resp.top_positive_drivers) == 1
        assert resp.top_positive_drivers[0].feature == "Contract_Month-to-month"