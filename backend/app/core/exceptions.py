"""
Custom exception hierarchy for ChurnXAI.
"""
from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class ChurnXAIError(Exception):
    """Base exception for all ChurnXAI errors."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ModelError(ChurnXAIError):
    """Base for all model-related errors."""
    pass


class ModelNotLoadedError(ModelError):
    """Raised when model is not loaded."""

    def __init__(self, message: str = "Model not loaded. Service unavailable."):
        super().__init__(message)

    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "model_not_loaded", "message": self.message},
        )


class ModelNotFoundError(ModelError):
    """Raised when model file is missing."""

    def __init__(self, model_path: str):
        super().__init__(f"Model file not found: {model_path}", {"path": model_path})

    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "model_not_found", "message": self.message},
        )


class ModelPredictionError(ModelError):
    """Raised when prediction fails."""

    def __init__(self, message: str = "Prediction failed", details: Optional[Dict] = None):
        super().__init__(message, details)

    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "prediction_failed", "message": self.message},
        )


class ExplanationError(ChurnXAIError):
    """Raised when SHAP explanation fails."""

    def __init__(self, message: str = "SHAP explanation failed", details: Optional[Dict] = None):
        super().__init__(message, details)

    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "explanation_failed", "message": self.message},
        )


class DataValidationError(ChurnXAIError):
    """Raised when input validation fails."""

    def __init__(self, message: str = "Invalid input data", field_errors: Optional[Dict] = None):
        super().__init__(message, {"field_errors": field_errors or {}})

    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "validation_failed", "message": self.message},
        )