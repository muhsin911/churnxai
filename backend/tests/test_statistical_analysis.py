"""Tests for churn-rate intervals and feature-screening statistics."""
import numpy as np
import pandas as pd
import pytest

from statistical_analysis import _adjust_pvalues, feature_relevance_tests, wilson_interval


def test_wilson_interval_contains_observed_churn_rate():
    lower, upper = wilson_interval(successes=1869, observations=7043)

    assert lower == pytest.approx(0.2552, abs=0.0001)
    assert upper == pytest.approx(0.2758, abs=0.0001)


def test_holm_and_bh_adjustments_preserve_input_order():
    p_values = np.array([0.01, 0.04, 0.03])

    assert _adjust_pvalues(p_values, "holm") == pytest.approx([0.03, 0.06, 0.06])
    assert _adjust_pvalues(p_values, "bh") == pytest.approx([0.03, 0.04, 0.04])


def test_feature_relevance_returns_effects_intervals_and_adjustments():
    frame = pd.DataFrame({
        "plan": np.tile(["A", "A", "B", "B"], 10),
        "monthly": np.tile([20.0, 40.0, 70.0, 100.0], 10),
        "Churn": np.tile([0, 0, 1, 1], 10),
    })

    results = feature_relevance_tests(
        frame,
        categorical_features=["plan"],
        numeric_features=["monthly"],
        bootstrap_resamples=100,
        seed=42,
    )

    assert results["feature"].tolist() == ["monthly", "plan"]
    assert results["p_holm"].between(0, 1).all()
    assert results["p_bh"].between(0, 1).all()
    assert results["effect_ci_low"].notna().all()
    assert results["effect_ci_high"].notna().all()
    assert results["effect_ci_low"].le(results["effect_ci_high"]).all()