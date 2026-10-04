"""Health check endpoint for monitoring and load balancers."""
from fastapi import APIRouter
from app.core.config import settings
from app.core.exceptions import ModelNotLoadedError
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


@router.get("/model-info")
async def model_info():
    """Return the saved model's non-sensitive training and evaluation summary."""
    if not predictor.is_loaded or predictor._metadata is None:
        raise ModelNotLoadedError().to_http_exception()

    metadata = predictor._metadata
    training_data = metadata.get("training_data", {})
    safe_training_data = {
        key: training_data[key]
        for key in (
            "rows",
            "columns",
            "parsed_null_cells_before_cleaning",
            "whitespace_total_charges",
            "blank_charge_rows_with_zero_tenure",
            "churn_counts",
        )
        if key in training_data
    }
    return {
        "model": metadata.get("model", "Unknown model"),
        "model_status": metadata.get("model_status", "test_placeholder"),
        "decision_threshold": float(metadata.get("decision_threshold", 0.5)),
        "training_data": safe_training_data,
        "split_rows": metadata.get("split_rows", {}),
        "selection": metadata.get("selection", {}),
        "model_comparison": metadata.get("model_comparison", {}),
        "threshold_selection": metadata.get("threshold_selection", {}),
        "test_prevalence": metadata.get("test_prevalence"),
        "test_metrics": metadata.get("test_metrics", {}),
        "test_metrics_95ci": metadata.get("test_metrics_95ci", {}),
        "n_bootstrap": metadata.get("n_bootstrap"),
        "library_versions": metadata.get("library_versions", {}),
    }