"""Tests for the ML Explainer module."""
import pytest
import numpy as np
import pandas as pd
from unittest.mock import patch, MagicMock

from app.ml.explainer import ChurnExplainer, get_explainer
from app.core.exceptions import ExplanationError


class TestChurnExplainer:
    @pytest.fixture
    def mock_pipeline(self):
        """Provides a mocked scikit-learn pipeline."""
        pipeline = MagicMock()
        
        # Mock preprocessor
        preprocessor = MagicMock()
        preprocessor.get_feature_names_out.return_value = ["tenure", "MonthlyCharges", "Contract_Month-to-month"]
        preprocessor.transform.return_value = np.array([[2.0, 85.0, 1.0]])
        pipeline.named_steps = {"pre": preprocessor, "clf": MagicMock()}
        
        # Mock classifier
        clf = MagicMock()
        clf.n_features_in_ = 3
        clf.predict_proba.return_value = np.array([[0.2, 0.8]]) # 80% churn
        pipeline.named_steps["clf"] = clf
        
        return pipeline

    @pytest.fixture
    def metadata(self):
        return {
            "categorical_features": ["Contract"],
            "decision_threshold": 0.5
        }

    @patch("app.ml.explainer.shap.TreeExplainer")
    @patch("app.ml.explainer.shap.Explanation")
    @patch("app.ml.explainer.plt.figure")
    @patch("app.ml.explainer.shap.plots.waterfall")
    @patch("app.ml.explainer.plt.close")
    @patch("app.ml.explainer.io.BytesIO")
    @patch("app.ml.explainer.base64.b64encode")
    def test_explain_success(self, mock_b64, mock_bytesio, mock_close,
                             mock_waterfall, mock_fig, mock_shap_exp, mock_tree_exp, 
                             mock_pipeline, metadata):
        """Test that the explainer returns a properly formatted explanation."""
        # Setup mocks
        mock_explainer = MagicMock()
        mock_explainer.shap_values.return_value = [np.array([0.1, 0.2, 0.5])] # SHAP values
        mock_explainer.expected_value = np.array([-1.0])
        mock_tree_exp.return_value = mock_explainer
        
        mock_b64.return_value.decode.return_value = "fake_base64_image_string"
        mock_buf = MagicMock()
        mock_buf.read.return_value = b"fake_image_bytes"
        mock_bytesio.return_value = mock_buf

        # Initialize explainer
        explainer = get_explainer(mock_pipeline, metadata)
        
        # Act
        customer_data = {"tenure": 2, "MonthlyCharges": 85.0, "Contract": "Month-to-month"}
        result = explainer.explain(customer_data)

        # Assert
        assert result["churn_probability"] == 0.8
        assert "waterfall_image_base64" in result
        assert result["waterfall_image_base64"] == "fake_base64_image_string"
        assert len(result["top_positive_drivers"]) <= 5
        assert "Risk Level:" in result["interpretation"]
        assert np.array_equal(
            mock_shap_exp.call_args.kwargs["data"],
            np.array([2.0, 85.0, 1.0]),
        )
        assert mock_shap_exp.call_args.kwargs["feature_names"] == [
            "tenure", "MonthlyCharges", "Contract Month-to-month"
        ]
        mock_fig.return_value.subplots_adjust.assert_called_once_with(
            left=0.45, right=0.98, top=0.88, bottom=0.12
        )
        assert "bbox_inches" not in mock_fig.return_value.savefig.call_args.kwargs
        assert mock_close.called # Ensures matplotlib memory is cleaned up

    def test_singleton_pattern(self, mock_pipeline, metadata):
        """Test that get_explainer returns the same instance."""
        with patch("app.ml.explainer.shap.TreeExplainer"):
            exp1 = get_explainer(mock_pipeline, metadata)
            exp2 = get_explainer(mock_pipeline, metadata)
            assert exp1 is exp2