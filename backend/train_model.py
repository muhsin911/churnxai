"""Clean, train, and evaluate the Telco churn model from the source CSV."""
from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path
from typing import Any

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
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
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.base import clone
from xgboost import XGBClassifier


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_PATH = PROJECT_ROOT / "data" / "WA_Fn-UseC_-Telco-Customer-Churn.csv"
DEFAULT_MODEL_DIR = PROJECT_ROOT / "backend" / "models"
DEFAULT_PROCESSED_PATH = PROJECT_ROOT / "data" / "processed" / "telco_clean.csv"
DEFAULT_FIGURES_DIR = PROJECT_ROOT / "reports" / "figures"
DEFAULT_METRICS_PATH = PROJECT_ROOT / "reports" / "metrics" / "model_evaluation.json"

NUMERIC_FEATURES = ["tenure", "MonthlyCharges", "TotalCharges"]
CATEGORICAL_FEATURES = [
    "Contract",
    "InternetService",
    "PaymentMethod",
    "gender",
    "SeniorCitizen",
    "Partner",
    "Dependents",
    "PhoneService",
    "MultipleLines",
    "OnlineSecurity",
    "OnlineBackup",
    "DeviceProtection",
    "TechSupport",
    "StreamingTV",
    "StreamingMovies",
    "PaperlessBilling",
]
FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def load_and_clean_data(data_path: Path = DEFAULT_DATA_PATH) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Read the raw CSV and apply only explicit, validated transformations."""
    raw = pd.read_csv(data_path)
    required_columns = set(FEATURES + ["customerID", "Churn"])
    missing_columns = sorted(required_columns.difference(raw.columns))
    if missing_columns:
        raise ValueError(f"Dataset is missing required columns: {missing_columns}")

    total_charges = raw["TotalCharges"].astype("string").str.strip()
    blank_charges = total_charges.isna() | total_charges.eq("")
    tenure = pd.to_numeric(raw["tenure"], errors="coerce")
    if blank_charges.any() and not tenure.loc[blank_charges].eq(0).all():
        raise ValueError("Blank TotalCharges values are only replaced with 0 when tenure is 0.")

    churn_labels = raw["Churn"].astype("string").str.strip().str.lower()
    churn = churn_labels.map({"no": 0, "yes": 1})
    if churn.isna().any():
        raise ValueError("Churn must contain only 'Yes' or 'No'.")

    senior_labels = raw["SeniorCitizen"].astype("string").str.strip().str.lower()
    senior_citizen = senior_labels.map({"0": "No", "1": "Yes", "no": "No", "yes": "Yes"})
    if senior_citizen.isna().any():
        raise ValueError("SeniorCitizen must contain only 0/1 or Yes/No values.")

    cleaned = raw[FEATURES + ["Churn"]].copy()
    cleaned["TotalCharges"] = pd.to_numeric(total_charges.mask(blank_charges, "0"), errors="raise")
    for column in NUMERIC_FEATURES[:-1]:
        cleaned[column] = pd.to_numeric(cleaned[column], errors="raise")
    cleaned["SeniorCitizen"] = senior_citizen.to_numpy()
    for column in CATEGORICAL_FEATURES:
        if column != "SeniorCitizen":
            values = cleaned[column].astype("string").str.strip()
            cleaned[column] = values.mask(values.eq(""), pd.NA).astype(object)
    cleaned["Churn"] = churn.astype("int8").to_numpy()

    audit = {
        "source_file": str(Path(data_path).resolve()),
        "rows": int(len(raw)),
        "columns": int(raw.shape[1]),
        "parsed_null_cells_before_cleaning": int(raw.isna().sum().sum()),
        "whitespace_total_charges": int(blank_charges.sum()),
        "blank_charge_rows_with_zero_tenure": int((blank_charges & tenure.eq(0)).sum()),
        "churn_counts": {
            "No": int((cleaned["Churn"] == 0).sum()),
            "Yes": int((cleaned["Churn"] == 1).sum()),
        },
    }
    return cleaned, audit


def save_eda_figures(data: pd.DataFrame, figures_dir: Path = DEFAULT_FIGURES_DIR) -> list[Path]:
    """Save compact, reproducible EDA plots from the cleaned dataset."""
    figures_dir.mkdir(parents=True, exist_ok=True)
    labels = data["Churn"].map({0: "No churn", 1: "Churn"})
    outputs: list[Path] = []

    fig, ax = plt.subplots(figsize=(6, 4))
    counts = labels.value_counts().reindex(["No churn", "Churn"])
    ax.bar(counts.index, counts.values, color=["#0f766e", "#e11d48"])
    ax.set(title="Customer churn labels", ylabel="Customers")
    fig.tight_layout()
    path = figures_dir / "churn_distribution.png"
    fig.savefig(path, dpi=140)
    plt.close(fig)
    outputs.append(path)

    fig, ax = plt.subplots(figsize=(7, 4))
    contract_rate = data.groupby("Contract", observed=False)["Churn"].mean().sort_values(ascending=False)
    ax.bar(contract_rate.index.astype(str), contract_rate.values * 100, color="#0f766e")
    ax.set(title="Churn rate by contract", ylabel="Churn rate (%)")
    fig.tight_layout()
    path = figures_dir / "churn_by_contract.png"
    fig.savefig(path, dpi=140)
    plt.close(fig)
    outputs.append(path)

    fig, ax = plt.subplots(figsize=(7, 4))
    for churn_value, label, color in [(0, "No churn", "#0f766e"), (1, "Churn", "#e11d48")]:
        ax.hist(
            data.loc[data["Churn"] == churn_value, "tenure"],
            bins=24,
            alpha=0.65,
            label=label,
            color=color,
        )
    ax.set(title="Tenure by churn outcome", xlabel="Tenure (months)", ylabel="Customers")
    ax.legend()
    fig.tight_layout()
    path = figures_dir / "tenure_by_churn.png"
    fig.savefig(path, dpi=140)
    plt.close(fig)
    outputs.append(path)

    fig, ax = plt.subplots(figsize=(7, 4))
    charge_groups = [data.loc[data["Churn"] == value, "MonthlyCharges"] for value in (0, 1)]
    ax.boxplot(charge_groups, tick_labels=["No churn", "Churn"], showfliers=False)
    ax.set(title="Monthly charges by churn outcome", ylabel="Monthly charges")
    fig.tight_layout()
    path = figures_dir / "monthly_charges_by_churn.png"
    fig.savefig(path, dpi=140)
    plt.close(fig)
    outputs.append(path)
    return outputs


def _select_threshold(y_true: pd.Series, probabilities: np.ndarray) -> tuple[float, float]:
    candidates = np.linspace(0.05, 0.95, 181)
    scored = [
        (
            f1_score(y_true, probabilities >= threshold, zero_division=0),
            precision_score(y_true, probabilities >= threshold, zero_division=0),
            -abs(float(threshold) - 0.5),
            float(threshold),
        )
        for threshold in candidates
    ]
    best = max(scored)
    return best[3], best[0]


def _bootstrap_intervals(
    y_true: np.ndarray,
    probabilities: np.ndarray,
    predictions: np.ndarray,
    n_bootstrap: int,
    seed: int,
) -> dict[str, dict[str, float]]:
    rng = np.random.default_rng(seed)
    scores: dict[str, list[float]] = {"pr_auc": [], "roc_auc": [], "f1": []}
    for _ in range(n_bootstrap):
        indices = rng.integers(0, len(y_true), size=len(y_true))
        sample_y = y_true[indices]
        if np.unique(sample_y).size < 2:
            continue
        scores["pr_auc"].append(float(average_precision_score(sample_y, probabilities[indices])))
        scores["roc_auc"].append(float(roc_auc_score(sample_y, probabilities[indices])))
        scores["f1"].append(float(f1_score(sample_y, predictions[indices], zero_division=0)))

    return {
        metric: {
            "ci_low": float(np.percentile(values, 2.5)),
            "ci_high": float(np.percentile(values, 97.5)),
        }
        for metric, values in scores.items()
    }


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        json.dump(payload, stream, indent=2, allow_nan=False)
    os.replace(temporary, path)


def train_and_evaluate(
    data_path: Path = DEFAULT_DATA_PATH,
    model_dir: Path = DEFAULT_MODEL_DIR,
    processed_path: Path = DEFAULT_PROCESSED_PATH,
    figures_dir: Path = DEFAULT_FIGURES_DIR,
    metrics_path: Path = DEFAULT_METRICS_PATH,
    random_state: int = 42,
    n_bootstrap: int = 2000,
) -> dict[str, Any]:
    """Select XGBoost settings on train CV, tune threshold on validation, test once."""
    cleaned, audit = load_and_clean_data(data_path)
    processed_path.parent.mkdir(parents=True, exist_ok=True)
    cleaned.to_csv(processed_path, index=False)
    save_eda_figures(cleaned, figures_dir)

    X = cleaned[FEATURES]
    y = cleaned["Churn"]
    X_development, X_test, y_development, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state, stratify=y
    )
    X_train, X_validation, y_train, y_validation = train_test_split(
        X_development,
        y_development,
        test_size=0.25,
        random_state=random_state,
        stratify=y_development,
    )

    class_counts = y_train.value_counts()
    scale_pos_weight = float(class_counts[0] / class_counts[1])
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), NUMERIC_FEATURES),
            (
                "cat",
                Pipeline([
                    ("imputer", SimpleImputer(strategy="most_frequent")),
                    ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                ]),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )
    pipeline = Pipeline([
        ("pre", preprocessor),
        (
            "clf",
            XGBClassifier(
                objective="binary:logistic",
                eval_metric="logloss",
                tree_method="hist",
                n_jobs=1,
                random_state=random_state,
                scale_pos_weight=scale_pos_weight,
            ),
        ),
    ])
    search = GridSearchCV(
        pipeline,
        param_grid={
            "clf__n_estimators": [200, 350],
            "clf__max_depth": [3, 5],
            "clf__learning_rate": [0.05],
        },
        scoring="average_precision",
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state),
        n_jobs=1,
        refit=True,
        return_train_score=False,
    )
    search.fit(X_train, y_train)

    validation_probabilities = search.best_estimator_.predict_proba(X_validation)[:, 1]
    threshold, validation_f1 = _select_threshold(y_validation, validation_probabilities)

    X_train_validation = pd.concat([X_train, X_validation])
    y_train_validation = pd.concat([y_train, y_validation])
    final_class_counts = y_train_validation.value_counts()
    final_model = clone(search.best_estimator_)
    final_model.set_params(clf__scale_pos_weight=float(final_class_counts[0] / final_class_counts[1]))
    final_model.fit(X_train_validation, y_train_validation)

    test_probabilities = final_model.predict_proba(X_test)[:, 1]
    test_predictions = (test_probabilities >= threshold).astype("int8")
    tn, fp, fn, tp = confusion_matrix(y_test, test_predictions, labels=[0, 1]).ravel()
    y_test_array = y_test.to_numpy()
    metrics = {
        "average_precision": float(average_precision_score(y_test, test_probabilities)),
        "roc_auc": float(roc_auc_score(y_test, test_probabilities)),
        "accuracy": float(accuracy_score(y_test, test_predictions)),
        "balanced_accuracy": float(balanced_accuracy_score(y_test, test_predictions)),
        "precision": float(precision_score(y_test, test_predictions, zero_division=0)),
        "recall": float(recall_score(y_test, test_predictions, zero_division=0)),
        "f1": float(f1_score(y_test, test_predictions, zero_division=0)),
        "brier_score": float(brier_score_loss(y_test, test_probabilities)),
        "confusion_matrix": {"true_negative": int(tn), "false_positive": int(fp), "false_negative": int(fn), "true_positive": int(tp)},
        "decision_threshold": float(threshold),
    }
    intervals = _bootstrap_intervals(
        y_test_array,
        test_probabilities,
        test_predictions,
        n_bootstrap=n_bootstrap,
        seed=random_state,
    )
    intervals["pr_auc"]["value"] = metrics["average_precision"]
    intervals["roc_auc"]["value"] = metrics["roc_auc"]
    intervals["f1"]["value"] = metrics["f1"]

    feature_names = list(final_model.named_steps["pre"].get_feature_names_out())
    metadata: dict[str, Any] = {
        "model": "XGBoost (trained on Telco Customer Churn)",
        "model_status": "real_trained",
        "target": "Churn (1 = churned)",
        "random_state": random_state,
        "training_data": audit,
        "split_rows": {
            "train": int(len(X_train)),
            "validation": int(len(X_validation)),
            "train_plus_validation": int(len(X_train_validation)),
            "test": int(len(X_test)),
        },
        "selection": {
            "method": "5-fold stratified cross-validation; average precision (PR-AUC)",
            "best_cv_average_precision": float(search.best_score_),
            "best_params": search.best_params_,
        },
        "threshold_selection": {
            "method": "maximum F1 on validation split; test split not used",
            "validation_f1": float(validation_f1),
        },
        "decision_threshold": float(threshold),
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "transformed_feature_names": feature_names,
        "shap_output_space": "log-odds",
        "test_prevalence": float(y_test.mean()),
        "test_metrics": metrics,
        "test_metrics_95ci": intervals,
        "n_bootstrap": n_bootstrap,
        "calibration_note": "Raw XGBoost probabilities; no separate probability calibration was applied.",
    }

    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / "xgb_churn_pipeline.joblib"
    with tempfile.NamedTemporaryFile(dir=model_dir, suffix=".joblib", delete=False) as temporary_file:
        temporary_model_path = Path(temporary_file.name)
    try:
        joblib.dump(final_model, temporary_model_path)
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
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--bootstrap", type=int, default=2000)
    args = parser.parse_args()
    result = train_and_evaluate(
        data_path=args.data,
        model_dir=args.model_dir,
        processed_path=args.processed,
        figures_dir=args.figures,
        metrics_path=args.metrics,
        random_state=args.seed,
        n_bootstrap=args.bootstrap,
    )
    print(json.dumps(result["metadata"], indent=2))
    print(f"\nSaved pipeline to {result['model_path']}")
    print(f"Saved processed data to {result['processed_data_path']}")
    print(f"Saved evaluation to {result['metrics_path']}")


if __name__ == "__main__":
    main()