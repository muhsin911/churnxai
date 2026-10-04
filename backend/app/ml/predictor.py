"""
Machine Learning Predictor Module.
Handles loading the trained model and metadata, and serves predictions.
Uses a class-based approach to encapsulate state and ensure the model 
is loaded only once (lazy initialization).
"""
import json
import joblib
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional

from app.core.config import settings
from app.core.exceptions import ModelNotFoundError, ModelNotLoadedError, ModelPredictionError
from app.utils.logging import get_logger
from app.utils.timing import timing_decorator

logger = get_logger(__name__)


class ChurnPredictor:
    """
    Encapsulates the trained ML model and its metadata.
    
    OOP Concept: Encapsulation. The model and metadata are hidden inside 
    this class, and external code can only interact via the `predict` method.
    """

    def __init__(self):
        self._pipeline: Optional[Any] = None
        self._metadata: Optional[Dict[str, Any]] = None
        self._is_loaded: bool = False

    @property
    def is_loaded(self) -> bool:
        """Thread-safe check if the model is loaded."""
        return self._is_loaded

    @timing_decorator
    def load(self) -> None:
        """
        Loads the model pipeline and metadata from disk.
        Called once at application startup.
        """
        if self._is_loaded:
            logger.info("Model already loaded. Skipping.")
            return

        if not settings.MODEL_PATH.exists():
            raise ModelNotFoundError(str(settings.MODEL_PATH))
        
        if not settings.METADATA_PATH.exists():
            raise ModelNotFoundError(str(settings.METADATA_PATH))

        try:
            logger.info(f"Loading model from: {settings.MODEL_PATH}")
            self._pipeline = joblib.load(settings.MODEL_PATH)
            
            logger.info(f"Loading metadata from: {settings.METADATA_PATH}")
            with open(settings.METADATA_PATH, "r", encoding="utf-8") as f:
                self._metadata = json.load(f)
            
            self._is_loaded = True
            logger.info(
                f"✅ Model loaded successfully: {self._metadata.get('model')} "
                f"(Threshold: {self._metadata.get('decision_threshold')})"
            )
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise ModelNotLoadedError(f"Failed to initialize model: {e}")

    @timing_decorator
    def predict(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predicts churn probability for a single customer.
        
        Args:
            customer_data: Dictionary of customer features.
            
        Returns:
            Dictionary containing probability, risk level, and predicted class.
        """
        if not self._is_loaded or self._pipeline is None or self._metadata is None:
            raise ModelNotLoadedError()

        try:
            # 1. Convert dict to DataFrame (required by scikit-learn/XGBoost)
            df = pd.DataFrame([customer_data])

            # 2. Ensure categorical columns are strings (prevents OneHotEncoder errors)
            cat_cols = self._metadata.get("categorical_features", [])
            for col in cat_cols:
                if col in df.columns:
                    df[col] = df[col].astype(str)

            # 3. Get probability of the positive class (Churn = 1)
            probas = self._pipeline.predict_proba(df)
            churn_prob = float(probas[0, 1])

            # 4. Determine risk level based on probability thresholds
            risk_level = self._classify_risk(churn_prob)

            # 5. Get the decision threshold from metadata
            threshold = float(self._metadata.get("decision_threshold", 0.5))
            predicted_class = 1 if churn_prob >= threshold else 0

            return {
                "churn_probability": round(churn_prob, 4),
                "churn_risk": risk_level,
                "predicted_class": predicted_class,
                "confidence": "High" if churn_prob > 0.8 or churn_prob < 0.2 else "Medium",
                "model_used": self._metadata.get("model", "XGBoost"),
                "threshold_used": threshold,
            }

        except Exception as e:
            logger.error(f"Prediction failed for data {customer_data}: {e}")
            raise ModelPredictionError(details={"error": str(e)})

    def _classify_risk(self, probability: float) -> str:
        """Helper method to categorize risk based on probability."""
        if probability < 0.25:
            return "Low"
        elif probability < 0.50:
            return "Medium"
        elif probability < 0.75:
            return "High"
        else:
            return "Critical"


# Singleton instance to be imported and used across the app
# OOP Concept: Singleton Pattern. Ensures only one instance of the predictor exists.
predictor = ChurnPredictor()