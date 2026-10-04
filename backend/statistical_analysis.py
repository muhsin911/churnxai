"""Statistical screening utilities for the Telco churn EDA notebook."""
from __future__ import annotations

from typing import Any, Literal

import numpy as np
import pandas as pd
from scipy.stats import chi2_contingency, pointbiserialr


def wilson_interval(successes: int, observations: int, confidence_z: float = 1.959963984540054) -> tuple[float, float]:
    """Return a two-sided Wilson score interval for a binomial proportion."""
    if observations <= 0:
        raise ValueError("observations must be positive")
    if successes < 0 or successes > observations:
        raise ValueError("successes must be between zero and observations")
    if confidence_z <= 0:
        raise ValueError("confidence_z must be positive")

    proportion = successes / observations
    z_squared = confidence_z**2
    denominator = 1 + z_squared / observations
    center = (proportion + z_squared / (2 * observations)) / denominator
    half_width = confidence_z * np.sqrt(
        proportion * (1 - proportion) / observations
        + z_squared / (4 * observations**2)
    ) / denominator
    return max(0.0, float(center - half_width)), min(1.0, float(center + half_width))


def _cramers_v(counts: np.ndarray) -> float:
    """Calculate bias-unadjusted Cramer's V from a contingency table."""
    active_rows = counts.sum(axis=1) > 0
    active_columns = counts.sum(axis=0) > 0
    observed = counts[np.ix_(active_rows, active_columns)].astype(float)
    total = observed.sum()
    dimension = min(observed.shape[0] - 1, observed.shape[1] - 1)
    if total == 0 or dimension <= 0:
        return float("nan")

    expected = np.outer(observed.sum(axis=1), observed.sum(axis=0)) / total
    chi_squared = np.sum(np.square(observed - expected) / expected)
    return float(np.sqrt(chi_squared / (total * dimension)))


def _bootstrap_cramers_v(
    counts: np.ndarray,
    bootstrap_resamples: int,
    rng: np.random.Generator,
) -> tuple[float, float]:
    total = int(counts.sum())
    probabilities = counts.ravel() / total
    samples = rng.multinomial(total, probabilities, size=bootstrap_resamples)
    estimates = np.fromiter(
        (_cramers_v(sample.reshape(counts.shape)) for sample in samples),
        dtype=float,
        count=bootstrap_resamples,
    )
    estimates = estimates[np.isfinite(estimates)]
    if estimates.size == 0:
        return float("nan"), float("nan")
    lower, upper = np.percentile(estimates, [2.5, 97.5])
    return float(lower), float(upper)


def _cohens_d(reference: np.ndarray, churned: np.ndarray) -> float:
    reference_count = reference.size
    churned_count = churned.size
    if reference_count < 2 or churned_count < 2:
        return float("nan")
    pooled_variance = (
        (reference_count - 1) * np.var(reference, ddof=1)
        + (churned_count - 1) * np.var(churned, ddof=1)
    ) / (reference_count + churned_count - 2)
    if pooled_variance <= 0:
        return float("nan")
    return float((np.mean(churned) - np.mean(reference)) / np.sqrt(pooled_variance))


def _bootstrap_cohens_d(
    reference: np.ndarray,
    churned: np.ndarray,
    bootstrap_resamples: int,
    rng: np.random.Generator,
) -> tuple[float, float]:
    estimates = np.empty(bootstrap_resamples, dtype=float)
    for index in range(bootstrap_resamples):
        reference_sample = rng.choice(reference, size=reference.size, replace=True)
        churned_sample = rng.choice(churned, size=churned.size, replace=True)
        estimates[index] = _cohens_d(reference_sample, churned_sample)
    estimates = estimates[np.isfinite(estimates)]
    if estimates.size == 0:
        return float("nan"), float("nan")
    lower, upper = np.percentile(estimates, [2.5, 97.5])
    return float(lower), float(upper)


def _adjust_pvalues(p_values: np.ndarray, method: Literal["holm", "bh"]) -> np.ndarray:
    """Adjust a family of p-values with Holm step-down or Benjamini-Hochberg."""
    if p_values.ndim != 1 or not np.isfinite(p_values).all():
        raise ValueError("p_values must be a finite one-dimensional array")
    if ((p_values < 0) | (p_values > 1)).any():
        raise ValueError("p_values must be between zero and one")

    count = p_values.size
    order = np.argsort(p_values)
    sorted_values = p_values[order]
    if method == "holm":
        factors = count - np.arange(count)
        adjusted_sorted = np.maximum.accumulate(sorted_values * factors)
    else:
        ranks = np.arange(1, count + 1)
        raw_adjusted = sorted_values * count / ranks
        adjusted_sorted = np.minimum.accumulate(raw_adjusted[::-1])[::-1]
    adjusted = np.empty(count, dtype=float)
    adjusted[order] = np.minimum(adjusted_sorted, 1.0)
    return adjusted


def feature_relevance_tests(
    data: pd.DataFrame,
    categorical_features: list[str],
    numeric_features: list[str],
    target_column: str = "Churn",
    bootstrap_resamples: int = 2000,
    seed: int = 42,
    alpha: float = 0.05,
) -> pd.DataFrame:
    """Test categorical and numeric associations with churn and adjust p-values.

    Categorical features use a Pearson chi-square test and Cramer's V. Numeric
    features use point-biserial correlation and Cohen's d. Percentile bootstrap
    intervals are computed for Cramer's V and Cohen's d, resampling within the
    observed groups for the latter.
    """
    if bootstrap_resamples < 1:
        raise ValueError("bootstrap_resamples must be positive")
    if not 0 < alpha < 1:
        raise ValueError("alpha must be between zero and one")
    missing_columns = sorted(set(categorical_features + numeric_features + [target_column]) - set(data.columns))
    if missing_columns:
        raise ValueError(f"Missing analysis columns: {missing_columns}")

    target = pd.to_numeric(data[target_column], errors="raise").to_numpy(dtype=np.int8)
    if set(np.unique(target)) != {0, 1}:
        raise ValueError("Target must contain both binary classes encoded as 0 and 1")

    rng = np.random.default_rng(seed)
    rows: list[dict[str, Any]] = []

    for feature in categorical_features:
        values = data[feature].astype("string").fillna("<missing>").astype(str)
        contingency = pd.crosstab(values, target).reindex(columns=[0, 1], fill_value=0)
        counts = contingency.to_numpy(dtype=int)
        chi_squared, p_value, degrees_freedom, expected = chi2_contingency(counts, correction=False)
        effect = _cramers_v(counts)
        effect_low, effect_high = _bootstrap_cramers_v(counts, bootstrap_resamples, rng)
        rows.append({
            "feature": feature,
            "feature_type": "categorical",
            "test": "Pearson chi-square",
            "statistic": float(chi_squared),
            "degrees_freedom": int(degrees_freedom),
            "p_value": float(p_value),
            "effect_size_name": "Cramer's V",
            "effect_size": effect,
            "effect_ci_low": effect_low,
            "effect_ci_high": effect_high,
            "minimum_expected_count": float(expected.min()),
        })

    for feature in numeric_features:
        values = pd.to_numeric(data[feature], errors="coerce")
        valid = values.notna().to_numpy()
        feature_values = values.to_numpy(dtype=float)[valid]
        feature_target = target[valid]
        if not np.isfinite(feature_values).all():
            raise ValueError(f"Feature {feature} contains non-finite values")
        test_result = pointbiserialr(feature_target, feature_values)
        reference = feature_values[feature_target == 0]
        churned = feature_values[feature_target == 1]
        effect = _cohens_d(reference, churned)
        effect_low, effect_high = _bootstrap_cohens_d(reference, churned, bootstrap_resamples, rng)
        rows.append({
            "feature": feature,
            "feature_type": "numeric",
            "test": "Point-biserial correlation",
            "statistic": float(test_result.statistic),
            "degrees_freedom": int(feature_values.size - 2),
            "p_value": float(test_result.pvalue),
            "effect_size_name": "Cohen's d (churn - no churn)",
            "effect_size": effect,
            "effect_ci_low": effect_low,
            "effect_ci_high": effect_high,
            "minimum_expected_count": float("nan"),
        })

    results = pd.DataFrame(rows)
    p_values = results["p_value"].to_numpy(dtype=float)
    results["p_holm"] = _adjust_pvalues(p_values, "holm")
    results["p_bh"] = _adjust_pvalues(p_values, "bh")
    results["drop_candidate"] = results["p_holm"] >= alpha
    results["significant_holm"] = results["p_holm"] < alpha
    return results.sort_values(["p_holm", "feature"], ignore_index=True)