"""Tests for the repeated-CV model-comparison building blocks."""
import numpy as np
import pandas as pd
import pytest
from imblearn.over_sampling import SMOTE

from model_comparison import (
    IMBALANCE_STRATEGIES,
    MODELS,
    TorchMLPClassifier,
    _make_pipeline,
    _nadeau_bengio_test,
    _resolve_mlflow_tracking_uri,
)


def test_all_model_strategy_pipelines_preserve_api_steps_and_scope_smote():
    target = pd.Series([0] * 20 + [1] * 10)
    pipelines = [
        _make_pipeline(model, strategy, target, seed=42)
        for model in MODELS
        for strategy in IMBALANCE_STRATEGIES
    ]

    assert len(pipelines) == 12
    assert all(list(pipeline.named_steps) == ["pre", "sampler", "clf"] for pipeline in pipelines)
    assert sum(isinstance(pipeline.named_steps["sampler"], SMOTE) for pipeline in pipelines) == 4


def test_nadeau_bengio_paired_correction_detects_consistent_difference():
    first_scores = np.array([0.70, 0.72, 0.71, 0.73, 0.72])
    second_scores = np.array([0.60, 0.61, 0.62, 0.60, 0.61])
    test_train_ratios = np.full(5, 0.25)

    difference, statistic, p_value = _nadeau_bengio_test(
        first_scores, second_scores, test_train_ratios
    )

    assert difference == pytest.approx(0.108)
    assert statistic > 0
    assert 0 <= p_value <= 1


def test_torch_mlp_returns_two_class_probabilities():
    features = np.random.default_rng(42).normal(size=(40, 4)).astype(np.float32)
    target = np.tile([0, 1], 20)
    classifier = TorchMLPClassifier(max_epochs=2, random_state=42).fit(features, target)

    probabilities = classifier.predict_proba(features[:5])

    assert probabilities.shape == (5, 2)
    assert np.allclose(probabilities.sum(axis=1), 1.0)
    assert np.isfinite(probabilities).all()


def test_mlflow_defaults_to_compose_server_when_file_store_is_disabled(monkeypatch):
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "file:///D:/churnxai/mlruns")
    monkeypatch.delenv("MLFLOW_ALLOW_FILE_STORE", raising=False)

    assert _resolve_mlflow_tracking_uri() == "http://127.0.0.1:5000"


def test_mlflow_preserves_explicit_tracking_uri_or_file_store_opt_in(monkeypatch):
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://mlflow.internal:5000")
    assert _resolve_mlflow_tracking_uri() == "http://mlflow.internal:5000"

    monkeypatch.setenv("MLFLOW_TRACKING_URI", "file:///tmp/mlruns")
    monkeypatch.setenv("MLFLOW_ALLOW_FILE_STORE", "true")
    assert _resolve_mlflow_tracking_uri() == "file:///tmp/mlruns"