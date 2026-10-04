"""Health check endpoint for monitoring and load balancers."""
from fastapi import APIRouter
from app.core.config import settings
from app.ml.predictor import predictor

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """
    Returns the health status of the API and whether the ML model is loaded.
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "model_loaded": predictor.is_loaded
    }