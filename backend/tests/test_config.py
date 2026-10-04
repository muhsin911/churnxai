"""Tests for configuration and exceptions."""
import pytest
from app.core.config import Settings, settings
from app.core.exceptions import ModelNotLoadedError, ModelNotFoundError, DataValidationError


class TestSettings:
    def test_default_values(self):
        assert settings.APP_NAME == "ChurnXAI API"
        assert settings.APP_VERSION == "1.0.0"
        assert settings.API_PORT == 8000

    def test_paths_are_absolute(self):
        assert settings.BASE_DIR.is_absolute()
        assert settings.MODEL_DIR.is_absolute()

    def test_model_paths(self):
        assert settings.MODEL_PATH.name == "xgb_churn_pipeline.joblib"
        assert settings.METADATA_PATH.name == "model_metadata.json"

    def test_cors_origins(self):
        assert "http://localhost:5173" in settings.CORS_ORIGINS


class TestExceptions:
    def test_model_not_loaded(self):
        err = ModelNotLoadedError()
        http_exc = err.to_http_exception()
        assert http_exc.status_code == 503

    def test_model_not_found(self):
        err = ModelNotFoundError("/path/to/model.joblib")
        http_exc = err.to_http_exception()
        assert http_exc.status_code == 500

    def test_validation_error(self):
        err = DataValidationError("Bad input", {"tenure": "must be >= 0"})
        http_exc = err.to_http_exception()
        assert http_exc.status_code == 422