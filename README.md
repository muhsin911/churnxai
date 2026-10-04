# ChurnXAI

Telco customer churn analysis, model training, evaluation, and an explainable FastAPI/React application.

## Data and notebooks

Place the Kaggle Telco Customer Churn CSV at:

```text
data/WA_Fn-UseC_-Telco-Customer-Churn.csv
```

Open these notebooks with the `churnxai` Python kernel and run them in order:

1. `notebooks/01_data_audit_eda.ipynb` audits and cleans the CSV, validates the 11 whitespace-only `TotalCharges` rows (each must have tenure 0), writes `data/processed/telco_clean.csv`, and saves four EDA figures under `reports/figures/`.
2. `notebooks/02_train_evaluate.ipynb` runs model selection, threshold selection, held-out evaluation, bootstrap intervals, and a local SHAP example.

The same reproducible training workflow can be run without Jupyter:

```powershell
conda activate churnxai
python backend/train_model.py
```

The training run uses a stratified 60/20/20 train/validation/test split. XGBoost settings are selected by 5-fold stratified cross-validation using average precision (PR-AUC). The decision threshold is selected on validation data by F1; the held-out test set is reserved for final reporting. PR-AUC, ROC-AUC, F1, confusion counts, and 2,000-resample bootstrap intervals are written to `reports/metrics/model_evaluation.json`.

The trained pipeline and metadata replace `backend/models/xgb_churn_pipeline.joblib` and `backend/models/model_metadata.json`. The API expects pipeline steps named `pre` and `clf`. Probabilities are raw XGBoost probabilities and have not been separately calibrated; use them with that caveat.

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
