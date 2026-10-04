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
    """

    def __init__(self, pipeline, metadata: Dict[str, Any]):
        self.pipeline = pipeline
        self.metadata = metadata
        
        # Extract preprocessor and classifier from the pipeline
        self.preprocessor = self.pipeline.named_steps["pre"]
        self.clf = self.pipeline.named_steps["clf"]
        
        # Initialize TreeExplainer (fast and exact for XGBoost)
        try:
            self.explainer = shap.TreeExplainer(self.clf)
            self.base_value = float(np.ravel(self.explainer.expected_value)[-1])
            
            # DYNAMIC FEATURE NAME MAPPING (Prevents IndexErrors with dummy models)
            n_features = self.clf.n_features_in_
            if hasattr(self.preprocessor, "get_feature_names_out"):
                all_feat_names = list(self.preprocessor.get_feature_names_out())
                # If metadata has more names than the model actually uses, slice it down
                if len(all_feat_names) >= n_features:
                    self.feature_names = all_feat_names[:n_features]
                else:
                    self.feature_names = all_feat_names
            else:
                # Fallback for models without proper preprocessing steps
                self.feature_names = [f"feature_{i}" for i in range(n_features)]
                
            logger.info(f"✅ SHAP TreeExplainer initialized. Base value (log-odds): {self.base_value:.4f}")
            logger.info(f"📊 Explainer mapped to {len(self.feature_names)} features.")
        except Exception as e:
            logger.error(f"Failed to initialize SHAP explainer: {e}")
            raise ExplanationError("Failed to initialize SHAP explainer")

    @timing_decorator
    def explain(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates a full SHAP explanation for a single customer.
        """
        try:
            # 1. Preprocess the input
            df = pd.DataFrame([customer_data])
            for col in self.metadata.get("categorical_features", []):
                if col in df.columns:
                    df[col] = df[col].astype(str)
            
            X_processed = self.preprocessor.transform(df)
            
            # 2. Get model probability
            proba = float(self.clf.predict_proba(X_processed)[0, 1])
            
            # 3. Compute SHAP values
            shap_values = self.explainer.shap_values(X_processed)[0]
            
            # Handle SHAP output shape variations
            if isinstance(shap_values, list):
                shap_values = shap_values[-1]
            if shap_values.ndim == 2:
                shap_values = shap_values[-1] if shap_values.shape[0] == 2 else shap_values[0]
            
            # 4. SAFELY build feature -> SHAP value mapping (Prevents IndexErrors)
            n_shap = len(shap_values)
            n_feats = len(self.feature_names)
            
            if n_shap != n_feats:
                if n_shap > n_feats:
                    shap_values = shap_values[:n_feats]
                else:
                    padding = np.zeros(n_feats - n_shap)
                    shap_values = np.concatenate([shap_values, padding])
                    
            shap_dict = {
                feat: float(shap_values[i]) 
                for i, feat in enumerate(self.feature_names)
            }
            
            # 5. Identify top drivers
            sorted_features = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
            
            top_positive = [
                {"feature": feat, "shap_value": val, "direction": "Increases churn risk"}
                for feat, val in sorted_features if val > 0
            ][:5]
            
            top_negative = [
                {"feature": feat, "shap_value": val, "direction": "Decreases churn risk"}
                for feat, val in sorted_features if val < 0
            ][:5]
            
            # 6. Generate waterfall plot (base64)
            waterfall_b64 = self._generate_waterfall(shap_values, X_processed, proba)
            
            # 7. Interpretation
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

    def _generate_waterfall(self, shap_values: np.ndarray, processed_data: Any, proba: float) -> str:
        """Generates a SHAP waterfall plot and returns it as a base64-encoded PNG string."""
        feature_values = (
            processed_data.toarray()[0]
            if hasattr(processed_data, "toarray")
            else np.asarray(processed_data)[0]
        )
        explanation = shap.Explanation(
            values=shap_values,
            base_values=self.base_value,
            data=feature_values,
            feature_names=self.feature_names,
        )
        
        fig = plt.figure(figsize=(10, 6))
        shap.plots.waterfall(explanation, max_display=12, show=False)
        plt.title(
            f"SHAP Waterfall — P(churn) = {proba:.3f}\n"
            f"(Base {1/(1+np.exp(-self.base_value)):.3f} + contributions = {proba:.3f})",
            fontsize=12, fontweight="bold"
        )
        plt.tight_layout()
        
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=120, bbox_inches="tight")
        plt.close(fig) # Prevent memory leaks
        
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    def _interpret(self, top_positive: List[Dict], top_negative: List[Dict], proba: float) -> str:
        """Generates a plain-English, business-friendly interpretation."""
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
    global explainer_instance
    if explainer_instance is None:
        explainer_instance = ChurnExplainer(pipeline, metadata)
    return explainer_instance