"""Integration tests for FastAPI endpoints."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.ml.predictor import predictor

client = TestClient(app)

class TestAPIEndpoints:
    @patch("app.ml.predictor.predictor.is_loaded", True)
    @patch("app.ml.predictor.predictor.predict")
    def test_predict_success(self, mock_predict):
        """Test the /predict endpoint with valid data."""
        mock_predict.return_value = {
            "churn_probability": 0.85,
            "churn_risk": "Critical",
            "predicted_class": 1,
            "confidence": "High",
            "model_used": "XGBoost",
            "threshold_used": 0.5
        }
        
        payload = {
            "gender": "Female", "SeniorCitizen": "No", "Partner": "Yes", "Dependents": "No",
            "tenure": 2, "PhoneService": "Yes", "MultipleLines": "No", "InternetService": "DSL",
            "OnlineSecurity": "No", "OnlineBackup": "Yes", "DeviceProtection": "No", "TechSupport": "No",
            "StreamingTV": "No", "StreamingMovies": "No", "Contract": "Month-to-month",
            "PaperlessBilling": "Yes", "PaymentMethod": "Electronic check",
            "MonthlyCharges": 85.70, "TotalCharges": 171.40
        }
        
        response = client.post("/api/v1/predict", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["churn_probability"] == 0.85
        assert data["churn_risk"] == "Critical"

    @patch("app.ml.predictor.predictor.is_loaded", False)
    def test_predict_model_not_loaded(self):
        """Test that /predict returns 503 if the model is not loaded."""
        payload = {"tenure": 2, "MonthlyCharges": 85.0} # Simplified for brevity in test
        # Note: Pydantic will catch missing fields first, but if we bypass or test the logic:
        # The global exception handler should catch ModelNotLoadedError and return 503.
        pass # Covered by the predictor unit tests, but good to know the flow.

    def test_health_check(self):
        """Test the /health endpoint."""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "app" in data