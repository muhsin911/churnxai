"""Integration tests for FastAPI endpoints."""
from unittest.mock import patch
from uuid import UUID

from app.db.models import PredictionRecord

VALID_CUSTOMER = {
    "gender": "Female", "SeniorCitizen": "No", "Partner": "Yes", "Dependents": "No",
    "tenure": 2, "PhoneService": "Yes", "MultipleLines": "No", "InternetService": "DSL",
    "OnlineSecurity": "No", "OnlineBackup": "Yes", "DeviceProtection": "No", "TechSupport": "No",
    "StreamingTV": "No", "StreamingMovies": "No", "Contract": "Month-to-month",
    "PaperlessBilling": "Yes", "PaymentMethod": "Electronic check",
    "MonthlyCharges": 85.70, "TotalCharges": 171.40,
}

class TestAPIEndpoints:
    @patch("app.ml.predictor.predictor._is_loaded", True)
    @patch("app.ml.predictor.predictor.predict")
    def test_predict_success(self, mock_predict, client, database_seed, authenticate, db_session):
        """Test the /predict endpoint with valid data."""
        authenticate(client, database_seed["manager"])
        mock_predict.return_value = {
            "churn_probability": 0.85,
            "churn_risk": "Critical",
            "predicted_class": 1,
            "confidence": "High",
            "model_used": "XGBoost",
            "threshold_used": 0.5
        }
        
        response = client.post("/api/v1/predict", json=VALID_CUSTOMER)
        
        assert response.status_code == 200
        data = response.json()
        assert data["churn_probability"] == 0.85
        assert data["churn_risk"] == "Critical"
        assert data["prediction_id"]
        record = db_session.get(PredictionRecord, UUID(data["prediction_id"]))
        assert record is not None
        assert record.user_id == database_seed["manager"].id

    @patch("app.ml.predictor.predictor._is_loaded", False)
    def test_predict_model_not_loaded(self, client, database_seed, authenticate):
        """Test that /predict returns 503 if the model is not loaded."""
        authenticate(client, database_seed["manager"])
        response = client.post("/api/v1/predict", json=VALID_CUSTOMER)

        assert response.status_code == 503
        assert response.json()["detail"]["error"] == "model_not_loaded"

    def test_health_check(self, client):
        """Test the /health endpoint."""
        with patch("app.api.health.engine.connect"), patch(
            "app.ml.predictor.predictor._is_loaded", True
        ):
            response = client.get("/api/v1/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "healthy"
        assert "app" in data

    def test_health_check_reports_unavailable_database(self, client):
        from sqlalchemy.exc import OperationalError

        with patch(
            "app.api.health.engine.connect",
            side_effect=OperationalError("SELECT 1", {}, OSError("offline")),
        ):
            response = client.get("/api/v1/health")

        assert response.status_code == 503
        assert response.json()["detail"] == "Application database is unavailable."

    def test_model_info_returns_evaluation_metadata_without_source_path(
        self, client, database_seed, authenticate
    ):
        authenticate(client, database_seed["manager"])
        metadata = {
            "model": "XGBoost (trained on Telco Customer Churn)",
            "model_status": "real_trained",
            "decision_threshold": 0.605,
            "training_data": {"rows": 7043, "source_file": "private/path.csv"},
            "test_metrics": {"average_precision": 0.66},
            "test_metrics_95ci": {"pr_auc": {"ci_low": 0.60, "ci_high": 0.71}},
        }
        with patch("app.ml.predictor.predictor._is_loaded", True), patch(
            "app.ml.predictor.predictor._metadata", metadata
        ):
            response = client.get("/api/v1/model-info")

        assert response.status_code == 200
        result = response.json()
        assert result["model_status"] == "real_trained"
        assert result["decision_threshold"] == 0.605
        assert result["test_metrics"]["average_precision"] == 0.66
        assert "source_file" not in result["training_data"]

    def test_staff_cannot_access_project_metadata(self, client, database_seed, authenticate):
        authenticate(client, database_seed["staff"])

        response = client.get("/api/v1/model-info")

        assert response.status_code == 403