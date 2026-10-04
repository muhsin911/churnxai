"""Tests for the ML Predictor module."""
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
import numpy as np  # <-- ADDED: Required for mocking NumPy array returns

from app.ml.predictor import ChurnPredictor
from app.core.exceptions import ModelNotFoundError, ModelNotLoadedError


class TestChurnPredictor:
    @pytest.fixture
    def predictor(self):
        """Provides a fresh predictor instance for each test."""
        return ChurnPredictor()

    @patch("app.ml.predictor.settings")
    @patch("app.ml.predictor.joblib.load")
    @patch("builtins.open", new_callable=MagicMock)
    def test_load_success(self, mock_open, mock_joblib, mock_settings, predictor):
        """Test that the model and metadata load correctly."""
        # Setup mocks
        mock_settings.MODEL_PATH.exists.return_value = True
        mock_settings.METADATA_PATH.exists.return_value = True
        mock_joblib.return_value = MagicMock()
        mock_open.return_value.__enter__.return_value.read.return_value = '{"model": "XGBoost", "decision_threshold": 0.5}'

        # Act
        predictor.load()

        # Assert
        assert predictor.is_loaded is True
        assert predictor._metadata["model"] == "XGBoost"
        mock_joblib.assert_called_once()

    @patch("app.ml.predictor.settings")
    def test_load_model_not_found(self, mock_settings, predictor):
        """Test that ModelNotFoundError is raised if model file is missing."""
        mock_settings.MODEL_PATH.exists.return_value = False
        mock_settings.MODEL_PATH = Path("/fake/path.joblib")

        with pytest.raises(ModelNotFoundError):
            predictor.load()

    def test_predict_not_loaded(self, predictor):
        """Test that predicting without loading raises an error."""
        with pytest.raises(ModelNotLoadedError):
            predictor.predict({"tenure": 12, "MonthlyCharges": 50.0})

    @patch("app.ml.predictor.settings")
    @patch("app.ml.predictor.joblib.load")
    @patch("builtins.open", new_callable=MagicMock)
    def test_predict_success(self, mock_open, mock_joblib, mock_settings, predictor):
        """Test a successful prediction with unambiguous boundary values."""
        # Setup mocks
        mock_settings.MODEL_PATH.exists.return_value = True
        mock_settings.METADATA_PATH.exists.return_value = True
        
        # Mock the pipeline's predict_proba method
        mock_pipeline = MagicMock()
        # FIX: Return 85% churn probability. 
        # This unambiguously triggers "Critical" risk (>= 0.75) and "High" confidence (> 0.8).
        mock_pipeline.predict_proba.return_value = np.array([[0.15, 0.85]])  
        mock_joblib.return_value = mock_pipeline
        
        mock_open.return_value.__enter__.return_value.read.return_value = (
            '{"model": "XGBoost", "decision_threshold": 0.5, "categorical_features": ["Contract"]}'
        )

        predictor.load()
        
        # Act
        result = predictor.predict({"tenure": 2, "Contract": "Month-to-month", "MonthlyCharges": 85.0})

        # Assert
        assert result["churn_probability"] == 0.85
        assert result["churn_risk"] == "Critical"      # 0.85 >= 0.75
        assert result["predicted_class"] == 1          # 0.85 >= 0.5 threshold
        assert result["confidence"] == "High"          # 0.85 > 0.8