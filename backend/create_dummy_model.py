import os
import sys
import json
import traceback

try:
    import joblib
    import pandas as pd
    import numpy as np
    from pathlib import Path
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler, OneHotEncoder
    from sklearn.compose import ColumnTransformer
    from xgboost import XGBClassifier

    print("🚀 Starting dummy model creation...")
    
    # Resolve paths based on current working directory
    BASE_DIR = Path(os.getcwd())
    MODEL_DIR = BASE_DIR / "models"
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    print(f"📁 Target directory: {MODEL_DIR.absolute()}")

    # 1. Create dummy pipeline
    num_cols = ["tenure", "MonthlyCharges", "TotalCharges"]
    cat_cols = ["Contract", "InternetService", "PaymentMethod", "gender", "SeniorCitizen", 
                "Partner", "Dependents", "PhoneService", "MultipleLines", "OnlineSecurity", 
                "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV", 
                "StreamingMovies", "PaperlessBilling"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_cols),
            # sparse_output=False ensures it returns a dense array, avoiding some SHAP/sklearn version clashes
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols) 
        ],
        remainder="drop"
    )

    dummy_clf = XGBClassifier(n_estimators=10, max_depth=2, random_state=42)
    pipeline = Pipeline(steps=[("pre", preprocessor), ("clf", dummy_clf)])

    # Dummy data (2 rows just to initialize the pipeline structure)
    dummy_X = pd.DataFrame({
        "tenure": [10, 20], "MonthlyCharges": [50.0, 80.0], "TotalCharges": [500.0, 1600.0],
        "Contract": ["Month-to-month", "Two year"], "InternetService": ["DSL", "Fiber optic"],
        "PaymentMethod": ["Electronic check", "Bank transfer (automatic)"],
        "gender": ["Female", "Male"], "SeniorCitizen": ["No", "No"], "Partner": ["Yes", "No"],
        "Dependents": ["No", "Yes"], "PhoneService": ["Yes", "Yes"], "MultipleLines": ["No", "No"],
        "OnlineSecurity": ["No", "Yes"], "OnlineBackup": ["Yes", "No"], "DeviceProtection": ["No", "Yes"],
        "TechSupport": ["No", "Yes"], "StreamingTV": ["No", "Yes"], "StreamingMovies": ["No", "Yes"],
        "PaperlessBilling": ["Yes", "No"]
    })
    dummy_y = [0, 1]

    print("⏳ Fitting dummy pipeline (this takes 1 second)...")
    pipeline.fit(dummy_X, dummy_y)

    model_path = MODEL_DIR / "xgb_churn_pipeline.joblib"
    joblib.dump(pipeline, model_path)
    print(f"✅ Saved dummy pipeline to: {model_path}")

    # 2. Create dummy metadata
    metadata = {
        "model": "XGBoost (Dummy for API Testing)",
        "imbalance_strategy": "class_weight",
        "seed": 42,
        "decision_threshold": 0.5,
        "target": "Churn (1 = churned)",
        "numeric_features": num_cols,
        "categorical_features": cat_cols,
        "transformed_feature_names": list(preprocessor.get_feature_names_out()),
        "shap_base_value_logodds": -1.0,
        "shap_output_space": "log-odds",
        "test_metrics_95ci": {
            "pr_auc": {"value": 0.85, "ci_low": 0.82, "ci_high": 0.88},
            "roc_auc": {"value": 0.82, "ci_low": 0.79, "ci_high": 0.85}
        },
        "n_bootstrap": 2000,
        "test_prevalence": 0.265,
        "calibration_note": "This is a dummy model for API/Frontend testing."
    }

    meta_path = MODEL_DIR / "model_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"✅ Saved dummy metadata to: {meta_path}")
    print("\n🎉 SUCCESS! You can now start the API.")

except Exception as e:
    print(f"\n❌ ERROR OCCURRED:\n{e}")
    traceback.print_exc()
    sys.exit(1)