"""Leakage-safe comparison of churn classifiers and imbalance strategies."""
from __future__ import annotations

import argparse
import importlib.metadata
import json
import os
import platform
import tempfile
from pathlib import Path
from typing import Any

import joblib
import matplotlib
matplotlib.use("Agg")
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbalancedPipeline
from scipy.stats import t as student_t
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

from statistical_analysis import _adjust_pvalues
from train_model import (
    CATEGORICAL_FEATURES,
    DEFAULT_DATA_PATH,
    DEFAULT_FIGURES_DIR,
    DEFAULT_METRICS_PATH,
    DEFAULT_MODEL_DIR,
    DEFAULT_PROCESSED_PATH,
    FEATURES,
    NUMERIC_FEATURES,
    PROJECT_ROOT,
    load_and_clean_data,
    save_eda_figures,
)


SEED = 42
MODELS = ("Logistic Regression", "Random Forest", "XGBoost", "PyTorch MLP")
IMBALANCE_STRATEGIES = ("none", "class_weight", "smote")


class TorchMLPClassifier(ClassifierMixin, BaseEstimator):
    """Small deterministic CPU MLP with optional positive-class weighting."""

    def __init__(
        self,
        class_weight: bool = False,
        random_state: int = SEED,
        max_epochs: int = 35,
        batch_size: int = 256,
        learning_rate: float = 0.001,
        dropout: float = 0.15,
    ) -> None:
        self.class_weight = class_weight
        self.random_state = random_state
        self.max_epochs = max_epochs
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.dropout = dropout

    def fit(self, features: np.ndarray, target: np.ndarray) -> TorchMLPClassifier:
        import torch
        from torch import nn

        torch.set_num_threads(1)
        torch.manual_seed(self.random_state)
        feature_array = np.asarray(features, dtype=np.float32)
        target_array = np.asarray(target, dtype=np.float32).reshape(-1)
        if np.unique(target_array).size != 2:
            raise ValueError("PyTorch MLP training requires both churn classes")

        self.classes_ = np.array([0, 1])
        self.n_features_in_ = feature_array.shape[1]
        input_tensor = torch.as_tensor(feature_array)
        target_tensor = torch.as_tensor(target_array)
        self.model_ = nn.Sequential(
            nn.Linear(self.n_features_in_, 64),
            nn.ReLU(),
            nn.Dropout(self.dropout),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(self.dropout),
            nn.Linear(32, 1),
        )
        positive_weight = 1.0
        if self.class_weight:
            negatives = float(np.count_nonzero(target_array == 0))
            positives = float(np.count_nonzero(target_array == 1))
            positive_weight = negatives / positives
        loss_function = nn.BCEWithLogitsLoss(
            pos_weight=torch.tensor([positive_weight], dtype=torch.float32)
        )
        optimizer = torch.optim.Adam(self.model_.parameters(), lr=self.learning_rate)
        generator = torch.Generator().manual_seed(self.random_state)

        self.model_.train()
        for _ in range(self.max_epochs):
            order = torch.randperm(input_tensor.shape[0], generator=generator)
            for start in range(0, input_tensor.shape[0], self.batch_size):
                batch_indices = order[start : start + self.batch_size]
                optimizer.zero_grad()
                logits = self.model_(input_tensor[batch_indices]).squeeze(-1)
                loss = loss_function(logits, target_tensor[batch_indices])
                loss.backward()
                optimizer.step()
        self.model_.eval()
        return self

    def predict_proba(self, features: np.ndarray) -> np.ndarray:
        import torch

        self.model_.eval()
        with torch.no_grad():
            inputs = torch.as_tensor(np.asarray(features, dtype=np.float32))
            probabilities = torch.sigmoid(self.model_(inputs).squeeze(-1)).cpu().numpy()
        return np.column_stack((1 - probabilities, probabilities))

    def predict(self, features: np.ndarray) -> np.ndarray:
        return (self.predict_proba(features)[:, 1] >= 0.5).astype("int8")


def _make_pipeline(
    model_name: str,
    strategy: str,
    fit_target: pd.Series,
    seed: int,
    mlp_epochs: int = 35,
) -> ImbalancedPipeline:
    class_counts = fit_target.value_counts()
    positive_weight = float(class_counts[0] / class_counts[1])
    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(drop="if_binary", handle_unknown="ignore", sparse_output=False)),
    ])
    preprocessor = ColumnTransformer([
        ("num", Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]), NUMERIC_FEATURES),
        ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
    ], remainder="drop")

    use_class_weight = strategy == "class_weight"
    if model_name == "Logistic Regression":
        classifier = LogisticRegression(
            C=1.0,
            max_iter=1500,
            solver="lbfgs",
            class_weight="balanced" if use_class_weight else None,
            random_state=seed,
        )
    elif model_name == "Random Forest":
        classifier = RandomForestClassifier(
            n_estimators=180,
            max_features="sqrt",
            min_samples_leaf=2,
            class_weight="balanced" if use_class_weight else None,
            n_jobs=1,
            random_state=seed,
        )
    elif model_name == "XGBoost":
        classifier = XGBClassifier(
            objective="binary:logistic",
            eval_metric="logloss",
            tree_method="hist",
            n_estimators=180,
            max_depth=3,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            reg_lambda=1.0,
            scale_pos_weight=positive_weight if use_class_weight else 1.0,
            n_jobs=1,
            random_state=seed,
        )
    elif model_name == "PyTorch MLP":
        classifier = TorchMLPClassifier(
            class_weight=use_class_weight,
            random_state=seed,
            max_epochs=mlp_epochs,
        )
    else:
        raise ValueError(f"Unsupported model: {model_name}")

    sampler = SMOTE(random_state=seed, k_neighbors=5) if strategy == "smote" else "passthrough"
    return ImbalancedPipeline([
        ("pre", preprocessor),
        ("sampler", sampler),
        ("clf", classifier),
    ])


def _select_threshold(target: np.ndarray, probabilities: np.ndarray) -> tuple[float, float]:
    candidates = np.linspace(0.05, 0.95, 181)
    scored = [
        (
            f1_score(target, probabilities >= threshold, zero_division=0),
            precision_score(target, probabilities >= threshold, zero_division=0),
            -abs(float(threshold) - 0.5),
            float(threshold),
        )
        for threshold in candidates
    ]
    best = max(scored)
    return best[3], best[0]


def _bootstrap_intervals(
    target: np.ndarray,
    probabilities: np.ndarray,
    predictions: np.ndarray,
    n_bootstrap: int,
    seed: int,
) -> dict[str, dict[str, float]]:
    rng = np.random.default_rng(seed)
    scores: dict[str, list[float]] = {"pr_auc": [], "roc_auc": [], "f1": []}
    for _ in range(n_bootstrap):
        indices = rng.integers(0, len(target), size=len(target))
        sample_target = target[indices]
        if np.unique(sample_target).size < 2:
            continue
        scores["pr_auc"].append(float(average_precision_score(sample_target, probabilities[indices])))
        scores["roc_auc"].append(float(roc_auc_score(sample_target, probabilities[indices])))
        scores["f1"].append(float(f1_score(sample_target, predictions[indices], zero_division=0)))
    return {
        metric: {
            "ci_low": float(np.percentile(values, 2.5)),
            "ci_high": float(np.percentile(values, 97.5)),
        }
        for metric, values in scores.items()
    }


def _nadeau_bengio_test(
    first_scores: np.ndarray,
    second_scores: np.ndarray,
    test_train_ratios: np.ndarray,
) -> tuple[float, float, float]:
    """Return mean paired delta, corrected t statistic, and two-sided p-value."""
    differences = first_scores - second_scores
    mean_difference = float(np.mean(differences))
    variance = float(np.var(differences, ddof=1))
    correction = 1.0 / differences.size + float(np.mean(test_train_ratios))
    standard_error = float(np.sqrt(correction * variance))
    if standard_error == 0:
        return mean_difference, 0.0, 1.0
    statistic = mean_difference / standard_error
    p_value = float(2 * student_t.sf(abs(statistic), df=differences.size - 1))
    return mean_difference, float(statistic), p_value


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        json.dump(payload, stream, indent=2, allow_nan=False)
    os.replace(temporary, path)


def _resolve_mlflow_tracking_uri() -> str:
    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI")
    allow_file_store = os.environ.get("MLFLOW_ALLOW_FILE_STORE", "").lower() in {"1", "true", "yes"}
    if tracking_uri is None or (tracking_uri.startswith("file:") and not allow_file_store):
        return "http://127.0.0.1:5000"
    return tracking_uri


def _library_versions() -> dict[str, str]:
    distributions = {
        "imbalanced-learn": "imbalanced-learn",
        "matplotlib": "matplotlib",
        "mlflow": "mlflow",
        "numpy": "numpy",
        "pandas": "pandas",
        "scikit-learn": "scikit-learn",
        "scipy": "scipy",
        "shap": "shap",
        "torch": "torch",
        "xgboost": "xgboost",
    }
    return {
        "python": platform.python_version(),
        **{name: importlib.metadata.version(distribution) for name, distribution in distributions.items()},
    }


def _out_of_fold_probabilities(
    model_name: str,
    strategy: str,
    features: pd.DataFrame,
    target: pd.Series,
    seed: int,
    mlp_epochs: int,
    n_splits: int = 5,
) -> np.ndarray:
    """Produce one leakage-safe OOF probability for every training observation."""
    splitter = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=seed)
    probabilities = np.full(len(target), np.nan, dtype=float)
    for fold, (fit_indices, holdout_indices) in enumerate(splitter.split(features, target)):
        fold_target = target.iloc[fit_indices]
        pipeline = _make_pipeline(model_name, strategy, fold_target, seed + fold, mlp_epochs)
        pipeline.fit(features.iloc[fit_indices], fold_target)
        probabilities[holdout_indices] = pipeline.predict_proba(features.iloc[holdout_indices])[:, 1]
    if not np.isfinite(probabilities).all():
        raise RuntimeError("OOF threshold training failed to predict every training row")
    return probabilities


def _save_shap_artifacts(
    final_pipeline: ImbalancedPipeline,
    test_features: pd.DataFrame,
    test_target: pd.Series,
    probabilities: np.ndarray,
    threshold: float,
    figures_dir: Path,
) -> dict[str, Any]:
    import shap
    import matplotlib.pyplot as plt
    from scipy.special import expit

    figures_dir.mkdir(parents=True, exist_ok=True)
    preprocessor = final_pipeline.named_steps["pre"]
    classifier = final_pipeline.named_steps["clf"]
    transformed = np.asarray(preprocessor.transform(test_features))
    feature_names = list(preprocessor.get_feature_names_out())
    explainer = shap.TreeExplainer(classifier)
    shap_values = explainer.shap_values(transformed)
    if isinstance(shap_values, list):
        shap_values = shap_values[-1]
    if shap_values.ndim == 3:
        shap_values = shap_values[:, :, -1]
    shap_values = np.asarray(shap_values)
    base_value = float(np.ravel(explainer.expected_value)[-1])

    model_probabilities = classifier.predict_proba(transformed)[:, 1]
    additive_probabilities = expit(base_value + shap_values.sum(axis=1))
    max_additivity_error = float(np.max(np.abs(additive_probabilities - model_probabilities)))
    if max_additivity_error >= 1e-3:
        raise RuntimeError(f"SHAP additivity check failed: max probability error {max_additivity_error:.6g}")

    global_explanation = shap.Explanation(
        values=shap_values,
        base_values=np.full(len(test_features), base_value),
        data=transformed,
        feature_names=feature_names,
    )
    shap.plots.beeswarm(global_explanation, max_display=20, show=False)
    global_path = figures_dir / "shap_global_beeswarm.png"
    plt.gcf().savefig(global_path, dpi=140, bbox_inches="tight")
    plt.close(plt.gcf())

    predictions = probabilities >= threshold
    target_values = test_target.to_numpy()
    case_indices: dict[str, int | None] = {
        "tp": next((int(i) for i in range(len(target_values)) if target_values[i] == 1 and predictions[i]), None),
        "tn": next((int(i) for i in range(len(target_values)) if target_values[i] == 0 and not predictions[i]), None),
        "fp": next((int(i) for i in range(len(target_values)) if target_values[i] == 0 and predictions[i]), None),
        "fn": next((int(i) for i in range(len(target_values)) if target_values[i] == 1 and not predictions[i]), None),
        "borderline": int(np.argmin(np.abs(probabilities - threshold))),
    }
    for case_name, row_index in case_indices.items():
        if row_index is None:
            continue
        local = shap.Explanation(
            values=shap_values[row_index],
            base_values=base_value,
            data=transformed[row_index],
            feature_names=feature_names,
        )
        shap.plots.waterfall(local, max_display=12, show=False)
        figure = plt.gcf()
        figure.set_size_inches(12, 7.5)
        figure.subplots_adjust(left=0.45, right=0.98, top=0.92, bottom=0.12)
        figure.savefig(figures_dir / f"shap_local_{case_name}.png", dpi=120)
        plt.close(figure)

    return {
        "base_value_logodds": base_value,
        "output_space": "log-odds",
        "max_probability_additivity_error": max_additivity_error,
        "global_beeswarm": str(global_path),
        "local_waterfalls": {
            key: str(figures_dir / f"shap_local_{key}.png") if value is not None else None
            for key, value in case_indices.items()
        },
    }


def train_and_evaluate(
    data_path: Path = DEFAULT_DATA_PATH,
    model_dir: Path = DEFAULT_MODEL_DIR,
    processed_path: Path = DEFAULT_PROCESSED_PATH,
    figures_dir: Path = DEFAULT_FIGURES_DIR,
    metrics_path: Path = DEFAULT_METRICS_PATH,
    random_state: int = SEED,
    n_bootstrap: int = 2000,
    cv_splits: int = 5,
    cv_repeats: int = 2,
    mlp_epochs: int = 35,
) -> dict[str, Any]:
    """Compare 12 configurations, select XGBoost by repeated-CV PR-AUC, then test once."""
    import mlflow
    from sklearn.model_selection import RepeatedStratifiedKFold

    cleaned, audit = load_and_clean_data(data_path)
    processed_path.parent.mkdir(parents=True, exist_ok=True)
    cleaned.to_csv(processed_path, index=False)
    save_eda_figures(cleaned, figures_dir)

    features = cleaned[FEATURES]
    target = cleaned["Churn"]
    X_train, X_test, y_train, y_test = train_test_split(
        features,
        target,
        test_size=0.2,
        random_state=random_state,
        stratify=target,
    )

    tracking_uri = _resolve_mlflow_tracking_uri()
    mlflow.set_tracking_uri(tracking_uri)
    print(f"Logging MLflow runs to {tracking_uri}")
    mlflow.set_experiment("telco-churn-model-comparison")

    repeated_cv = RepeatedStratifiedKFold(
        n_splits=cv_splits,
        n_repeats=cv_repeats,
        random_state=random_state,
    )
    folds = list(repeated_cv.split(X_train, y_train))
    fold_ratios = np.asarray([len(validation) / len(fit) for fit, validation in folds])
    config_scores: dict[tuple[str, str], np.ndarray] = {}
    comparison_rows: list[dict[str, Any]] = []

    with mlflow.start_run(run_name=f"repeated-cv-comparison-seed-{random_state}"):
        mlflow.log_params({
            "seed": random_state,
            "test_fraction": 0.2,
            "cv": f"{cv_splits}-fold repeated {cv_repeats} times",
            "scoring": "average_precision",
            "configs": len(MODELS) * len(IMBALANCE_STRATEGIES),
            "smote_location": "inside imblearn.Pipeline, fitted separately in each CV training fold",
        })

        for model_name in MODELS:
            for strategy in IMBALANCE_STRATEGIES:
                fold_scores: list[float] = []
                run_name = f"{model_name.lower().replace(' ', '-')}-{strategy}"
                with mlflow.start_run(run_name=run_name, nested=True):
                    mlflow.log_params({
                        "model": model_name,
                        "imbalance_strategy": strategy,
                        "cv_splits": cv_splits,
                        "cv_repeats": cv_repeats,
                        "seed": random_state,
                    })
                    for fold_index, (fit_indices, validation_indices) in enumerate(folds):
                        fold_seed = random_state + fold_index
                        pipeline = _make_pipeline(
                            model_name,
                            strategy,
                            y_train.iloc[fit_indices],
                            fold_seed,
                            mlp_epochs,
                        )
                        pipeline.fit(X_train.iloc[fit_indices], y_train.iloc[fit_indices])
                        fold_probabilities = pipeline.predict_proba(X_train.iloc[validation_indices])[:, 1]
                        score = float(average_precision_score(y_train.iloc[validation_indices], fold_probabilities))
                        fold_scores.append(score)
                        mlflow.log_metric("fold_pr_auc", score, step=fold_index)

                    scores = np.asarray(fold_scores)
                    config_scores[(model_name, strategy)] = scores
                    mean_score = float(np.mean(scores))
                    std_score = float(np.std(scores, ddof=1))
                    mlflow.log_metric("mean_pr_auc", mean_score)
                    mlflow.log_metric("std_pr_auc", std_score)
                    comparison_rows.append({
                        "model": model_name,
                        "imbalance_strategy": strategy,
                        "cv_pr_auc_mean": mean_score,
                        "cv_pr_auc_std": std_score,
                        "cv_fold_scores": json.dumps(fold_scores),
                    })

        overall_winner = max(comparison_rows, key=lambda row: row["cv_pr_auc_mean"])
        xgboost_rows = [row for row in comparison_rows if row["model"] == "XGBoost"]
        deployment_winner = max(xgboost_rows, key=lambda row: row["cv_pr_auc_mean"])

        strategy_tests: list[dict[str, Any]] = []
        strategy_pairs = (("none", "class_weight"), ("none", "smote"), ("class_weight", "smote"))
        for model_name in MODELS:
            for first_strategy, second_strategy in strategy_pairs:
                difference, statistic, p_value = _nadeau_bengio_test(
                    config_scores[(model_name, first_strategy)],
                    config_scores[(model_name, second_strategy)],
                    fold_ratios,
                )
                strategy_tests.append({
                    "model": model_name,
                    "first_strategy": first_strategy,
                    "second_strategy": second_strategy,
                    "mean_pr_auc_difference": difference,
                    "corrected_t_statistic": statistic,
                    "degrees_freedom": len(folds) - 1,
                    "p_value": p_value,
                })
        adjusted_p = _adjust_pvalues(
            np.asarray([test["p_value"] for test in strategy_tests], dtype=float),
            "holm",
        )
        for test, adjusted in zip(strategy_tests, adjusted_p, strict=True):
            test["p_holm"] = float(adjusted)
            test["significant_holm"] = bool(adjusted < 0.05)

        selected_model = "XGBoost"
        selected_strategy = deployment_winner["imbalance_strategy"]
        oof_splitter = StratifiedKFold(n_splits=cv_splits, shuffle=True, random_state=random_state)
        oof_probabilities = np.full(len(y_train), np.nan, dtype=float)
        for fold_index, (fit_indices, holdout_indices) in enumerate(oof_splitter.split(X_train, y_train)):
            fold_pipeline = _make_pipeline(
                selected_model,
                selected_strategy,
                y_train.iloc[fit_indices],
                random_state + 1000 + fold_index,
                mlp_epochs,
            )
            fold_pipeline.fit(X_train.iloc[fit_indices], y_train.iloc[fit_indices])
            oof_probabilities[holdout_indices] = fold_pipeline.predict_proba(X_train.iloc[holdout_indices])[:, 1]
        if not np.isfinite(oof_probabilities).all():
            raise RuntimeError("OOF threshold training failed to predict every training row")
        threshold, oof_f1 = _select_threshold(y_train.to_numpy(), oof_probabilities)
        mlflow.log_metric("xgboost_oof_f1", float(oof_f1))
        mlflow.log_metric("xgboost_oof_threshold", float(threshold))

        final_pipeline = _make_pipeline(selected_model, selected_strategy, y_train, random_state, mlp_epochs)
        final_pipeline.fit(X_train, y_train)
        test_probabilities = final_pipeline.predict_proba(X_test)[:, 1]
        test_predictions = (test_probabilities >= threshold).astype("int8")
        true_negative, false_positive, false_negative, true_positive = confusion_matrix(
            y_test, test_predictions, labels=[0, 1]
        ).ravel()
        metrics: dict[str, Any] = {
            "average_precision": float(average_precision_score(y_test, test_probabilities)),
            "roc_auc": float(roc_auc_score(y_test, test_probabilities)),
            "accuracy": float(accuracy_score(y_test, test_predictions)),
            "balanced_accuracy": float(balanced_accuracy_score(y_test, test_predictions)),
            "precision": float(precision_score(y_test, test_predictions, zero_division=0)),
            "recall": float(recall_score(y_test, test_predictions, zero_division=0)),
            "f1": float(f1_score(y_test, test_predictions, zero_division=0)),
            "brier_score": float(brier_score_loss(y_test, test_probabilities)),
            "confusion_matrix": {
                "true_negative": int(true_negative),
                "false_positive": int(false_positive),
                "false_negative": int(false_negative),
                "true_positive": int(true_positive),
            },
            "decision_threshold": float(threshold),
        }
        intervals = _bootstrap_intervals(
            y_test.to_numpy(),
            test_probabilities,
            test_predictions,
            n_bootstrap,
            random_state,
        )
        intervals["pr_auc"]["value"] = metrics["average_precision"]
        intervals["roc_auc"]["value"] = metrics["roc_auc"]
        intervals["f1"]["value"] = metrics["f1"]

        shap_metadata = _save_shap_artifacts(
            final_pipeline,
            X_test,
            y_test,
            test_probabilities,
            threshold,
            figures_dir,
        )
        for metric_name in ("average_precision", "roc_auc", "f1", "brier_score"):
            mlflow.log_metric(f"heldout_{metric_name}", metrics[metric_name])
        mlflow.log_metric("heldout_threshold", float(threshold))

    comparison_frame = pd.DataFrame(comparison_rows).sort_values(
        ["cv_pr_auc_mean", "model", "imbalance_strategy"], ascending=[False, True, True]
    )
    model_dir.mkdir(parents=True, exist_ok=True)
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    comparison_path = metrics_path.parent / "model_comparison.csv"
    comparison_frame.to_csv(comparison_path, index=False)

    feature_names = list(final_pipeline.named_steps["pre"].get_feature_names_out())
    metadata: dict[str, Any] = {
        "model": "XGBoost (trained on Telco Customer Churn)",
        "model_status": "real_trained",
        "target": "Churn (1 = churned)",
        "random_state": random_state,
        "library_versions": _library_versions(),
        "training_data": audit,
        "split_rows": {"train": int(len(y_train)), "test": int(len(y_test))},
        "split_method": "stratified 80/20 train/test; test split untouched until final evaluation",
        "model_comparison": {
            "configs_compared": len(comparison_rows),
            "model_families": list(MODELS),
            "imbalance_strategies": list(IMBALANCE_STRATEGIES),
            "cv_method": f"{cv_splits}-fold repeated stratified CV, {cv_repeats} repeats; PR-AUC",
            "overall_cv_champion": {
                key: overall_winner[key]
                for key in ("model", "imbalance_strategy", "cv_pr_auc_mean", "cv_pr_auc_std")
            },
            "deployment_xgboost_config": {
                key: deployment_winner[key]
                for key in ("model", "imbalance_strategy", "cv_pr_auc_mean", "cv_pr_auc_std")
            },
            "deployment_policy": "Best XGBoost imbalance strategy by repeated-CV PR-AUC is deployed so the API retains exact TreeSHAP support; the overall winner is reported separately.",
            "nadeau_bengio_strategy_tests": strategy_tests,
            "nadeau_bengio_correction": "SE = sqrt((1/n_folds + mean(n_test/n_train)) * variance(paired fold differences)); Holm-adjusted within-model strategy p-values.",
        },
        "selection": {
            "method": f"{cv_splits}-fold repeated stratified cross-validation; average precision (PR-AUC)",
            "best_cv_average_precision": float(deployment_winner["cv_pr_auc_mean"]),
            "best_params": {"model": "XGBoost", "imbalance_strategy": selected_strategy},
        },
        "threshold_selection": {
            "method": f"maximum F1 on {cv_splits}-fold out-of-fold training predictions; test set not used",
            "oof_f1": float(oof_f1),
        },
        "decision_threshold": float(threshold),
        "imbalance_strategy": selected_strategy,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "transformed_feature_names": feature_names,
        "shap": shap_metadata,
        "shap_output_space": "log-odds",
        "test_prevalence": float(y_test.mean()),
        "test_metrics": metrics,
        "test_metrics_95ci": intervals,
        "n_bootstrap": n_bootstrap,
        "calibration_note": "Raw XGBoost probabilities; no separate probability calibration was applied.",
    }

    model_path = model_dir / "xgb_churn_pipeline.joblib"
    with tempfile.NamedTemporaryFile(dir=model_dir, suffix=".joblib", delete=False) as temporary_file:
        temporary_model_path = Path(temporary_file.name)
    try:
        joblib.dump(final_pipeline, temporary_model_path)
        os.replace(temporary_model_path, model_path)
    finally:
        temporary_model_path.unlink(missing_ok=True)
    metadata_path = model_dir / "model_metadata.json"
    _write_json(metadata_path, metadata)
    _write_json(metrics_path, metadata)

    return {
        "model_path": str(model_path),
        "metadata_path": str(metadata_path),
        "processed_data_path": str(processed_path),
        "metrics_path": str(metrics_path),
        "comparison_path": str(comparison_path),
        "eda_figures": [str(path) for path in sorted(figures_dir.glob("*.png"))],
        "metadata": metadata,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH)
    parser.add_argument("--model-dir", type=Path, default=DEFAULT_MODEL_DIR)
    parser.add_argument("--processed", type=Path, default=DEFAULT_PROCESSED_PATH)
    parser.add_argument("--figures", type=Path, default=DEFAULT_FIGURES_DIR)
    parser.add_argument("--metrics", type=Path, default=DEFAULT_METRICS_PATH)
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--bootstrap", type=int, default=2000)
    parser.add_argument("--cv-repeats", type=int, default=2)
    parser.add_argument("--mlp-epochs", type=int, default=35)
    args = parser.parse_args()
    result = train_and_evaluate(
        data_path=args.data,
        model_dir=args.model_dir,
        processed_path=args.processed,
        figures_dir=args.figures,
        metrics_path=args.metrics,
        random_state=args.seed,
        n_bootstrap=args.bootstrap,
        cv_repeats=args.cv_repeats,
        mlp_epochs=args.mlp_epochs,
    )
    print(json.dumps(result["metadata"], indent=2))
    print(f"\nSaved pipeline to {result['model_path']}")
    print(f"Saved comparison to {result['comparison_path']}")


if __name__ == "__main__":
    main()