# ChurnXAI

Telco customer churn analysis, model training, evaluation, and an explainable FastAPI/React application.

## Data and notebooks

Place the Kaggle Telco Customer Churn CSV at:

```text
data/WA_Fn-UseC_-Telco-Customer-Churn.csv
```

Open these notebooks with the `churnxai` Python kernel and run them in order:

1. `notebooks/01_data_audit_eda.ipynb` audits and cleans the CSV, validates the 11 whitespace-only `TotalCharges` rows (each must have tenure 0), reports the churn-rate Wilson 95% CI, runs 16 categorical chi-square/Cramér's V tests and 3 numeric point-biserial/Cohen's d tests, bootstraps effect-size intervals, and applies Holm and Benjamini-Hochberg corrections. It writes `data/processed/telco_clean.csv`, `data/processed/feature_relevance.csv`, and four EDA figures under `reports/figures/`.
2. `notebooks/02_train_evaluate.ipynb` compares four model families and three imbalance strategies, selects an out-of-fold training threshold, evaluates on a locked test set, calculates bootstrap intervals, logs runs to MLflow, and exports global/local SHAP explanations.

The same reproducible training workflow can be run without Jupyter:

```powershell
conda activate churnxai
python backend/train_model.py
```

The comparison uses one stratified 80/20 train/test split. The training portion is evaluated by repeated stratified CV using average precision (PR-AUC); SMOTE stays inside each imbalanced-learn pipeline. Nadeau–Bengio corrected paired tests compare imbalance strategies. The threshold is selected from out-of-fold training predictions by F1; the held-out test set is evaluated once. PR-AUC, ROC-AUC, F1, confusion counts, and 2,000-resample bootstrap intervals are written to `reports/metrics/model_evaluation.json`; all 12 CV rows are written to `reports/metrics/model_comparison.csv`.

The trained imbalanced-learn pipeline and metadata replace `backend/models/xgb_churn_pipeline.joblib` and `backend/models/model_metadata.json`. The API expects pipeline steps named `pre` and `clf`. Probabilities are raw XGBoost probabilities and have not been separately calibrated; use them with that caveat.

## Run the API and frontend

For local development:

```powershell
conda activate churnxai
cd backend
uvicorn app.main:app --reload
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

For Docker:

```powershell
docker compose up --build -d
```

The React app is served at `http://localhost:3000`; the API is available at `http://localhost:8000`.

## Tests

```powershell
conda activate churnxai
cd backend
pytest tests -q
```
