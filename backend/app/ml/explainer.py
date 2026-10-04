"""
Machine Learning Explainer Module.
Handles SHAP explanation generation for individual predictions.
"""
import io
import base64
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import shap
from typing import Dict, Any, List

from app.core.exceptions import ExplanationError
from app.utils.logging import get_logger
from app.utils.timing import timing_decorator

logger = get_logger(__name__)


class ChurnExplainer:
    """
    Encapsulates the SHAP explainer and generates local explanations.
    
    OOP Concept: Encapsulation. Hides the complexity of SHAP value computation,
    plot generation, and base64 encoding behind a simple `explain` method.
    """

    def __init__(self, pipeline, metadata: Dict[str, Any]):
        """
        Initializes the explainer using the trained pipeline and metadata.
        
        Args:
            pipeline: The trained scikit-learn/XGBoost pipeline.
            metadata: Dictionary containing model metadata (features, threshold, etc.).
        """
        self.pipeline = pipeline
        self.metadata = metadata
        
        # Extract preprocessor and classifier from the pipeline
        self.preprocessor = self.pipeline.named_steps["pre"]
        self.clf = self.pipeline.named_steps["clf"]
        
        # Get the exact feature names after OneHotEncoding
        self.feature_names = list(self.preprocessor.get_feature_names_out())
        
        # Initialize TreeExplainer (fast and exact for XGBoost)
        try:
            self.explainer = shap.TreeExplainer(self.clf)
            self.base_value = float(np.ravel(self.explainer.expected_value)[-1])
            logger.info(f"✅ SHAP TreeExplainer initialized. Base value (log-odds): {self.base_value:.4f}")
        except Exception as e:
            logger.error(f"Failed to initialize SHAP explainer: {e}")
            raise ExplanationError("Failed to initialize SHAP explainer")

    @timing_decorator
    def explain(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates a full SHAP explanation for a single customer.
        
        Args:
            customer_data: Dictionary of customer features.
            
        Returns:
            Dictionary containing SHAP values, top drivers, waterfall plot (base64), 
            and a plain-English interpretation.
        """
        try:
            # 1. Preprocess the input (mimics the pipeline's transform step)
            df = pd.DataFrame([customer_data])
            for col in self.metadata.get("categorical_features", []):
                if col in df.columns:
                    df[col] = df[col].astype(str)
            
            X_processed = self.preprocessor.transform(df)
            
            # 2. Get model probability (for reference)
            proba = float(self.clf.predict_proba(X_processed)[0, 1])
            
            # 3. Compute SHAP values
            shap_values = self.explainer.shap_values(X_processed)[0]
            
            # Handle SHAP output shape (sometimes returns list for multi-class, we want class 1)
            if isinstance(shap_values, list):
                shap_values = shap_values[-1]
            if shap_values.ndim == 2:
                shap_values = shap_values[-1] if shap_values.shape[0] == 2 else shap_values[0]
            
            # 4. Build feature -> SHAP value mapping
            shap_dict = {
                feat: float(shap_values[i]) 
                for i, feat in enumerate(self.feature_names)
            }
            
            # 5. Identify top positive (toward churn) and negative (toward stay) drivers
            sorted_features = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
            
            top_positive = [
                {"feature": feat, "shap_value": val, "direction": "Increases churn risk"}
                for feat, val in sorted_features if val > 0
            ][:5]
            
            top_negative = [
                {"feature": feat, "shap_value": val, "direction": "Decreases churn risk"}
                for feat, val in sorted_features if val < 0
            ][:5]
            
            # 6. Generate waterfall plot (in-memory, base64 encoded)
            waterfall_b64 = self._generate_waterfall(shap_values, df, proba)
            
            # 7. Generate plain-English interpretation
            interpretation = self._interpret(top_positive, top_negative, proba)
            
            return {
                "churn_probability": proba,
                "base_value_logodds": self.base_value,
                "base_value_probability": float(1 / (1 + np.exp(-self.base_value))),
                "shap_values": shap_dict,
                "top_positive_drivers": top_positive,
                "top_negative_drivers": top_negative,
                "waterfall_image_base64": waterfall_b64,
                "interpretation": interpretation,
            }
            
        except Exception as e:
            logger.error(f"SHAP explanation failed for data {customer_data}: {e}")
            raise ExplanationError(details={"error": str(e)})

    def _generate_waterfall(self, shap_values: np.ndarray, raw_data: pd.DataFrame, proba: float) -> str:
        """
        Generates a SHAP waterfall plot and returns it as a base64-encoded PNG string.
        
        Why base64? It allows the image to be embedded directly in the JSON API response,
        eliminating the need for temporary file storage or a separate image server.
        """
        # Build a SHAP Explanation object
        explanation = shap.Explanation(
            values=shap_values,
            base_values=self.base_value,
            data=raw_data.iloc[0].values if hasattr(raw_data, 'iloc') else raw_data.values[0],
            feature_names=self.feature_names,
        )
        
        # Create the plot
        fig = plt.figure(figsize=(10, 6))
        shap.plots.waterfall(explanation, max_display=12, show=False)
        plt.title(
            f"SHAP Waterfall — P(churn) = {proba:.3f}\n"
            f"(Base {1/(1+np.exp(-self.base_value)):.3f} + contributions = {proba:.3f})",
            fontsize=12, fontweight="bold"
        )
        plt.tight_layout()
        
        # Save to an in-memory buffer
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=120, bbox_inches="tight")
        plt.close(fig) # Crucial: prevent memory leaks in long-running servers
        
        # Encode to base64
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    def _interpret(self, top_positive: List[Dict], top_negative: List[Dict], proba: float) -> str:
        """
        Generates a plain-English, business-friendly interpretation of the SHAP values.
        """
        if proba >= 0.75:
            risk_level = "CRITICAL"
            action = "Immediate retention intervention required."
        elif proba >= 0.50:
            risk_level = "HIGH"
            action = "Proactive retention outreach recommended."
        elif proba >= 0.25:
            risk_level = "MODERATE"
            action = "Monitor closely; consider engagement campaigns."
        else:
            risk_level = "LOW"
            action = "Customer is stable; maintain current service quality."

        pos_text = ""
        if top_positive:
            features = ", ".join([f"**{d['feature']}**" for d in top_positive[:3]])
            pos_text = f" The primary churn drivers are {features}."

        neg_text = ""
        if top_negative:
            features = ", ".join([f"**{d['feature']}**" for d in top_negative[:3]])
            neg_text = f" Retention factors include {features}."

        return (
            f"🎯 **Risk Level: {risk_level}** (P(churn) = {proba:.1%})\n\n"
            f"{action}{pos_text}{neg_text}\n\n"
            f"**Counterfactual suggestion:** To reduce churn risk, focus on "
            f"improving the top positive drivers (e.g., offer a longer contract, "
            f"add TechSupport, or reduce MonthlyCharges)."
        )


# Singleton instance
explainer_instance = None

def get_explainer(pipeline, metadata: Dict[str, Any]) -> ChurnExplainer:
    """
    Factory function to ensure only one explainer instance is created.
    """
    global explainer_instance
    if explainer_instance is None:
        explainer_instance = ChurnExplainer(pipeline, metadata)
    return explainer_instance