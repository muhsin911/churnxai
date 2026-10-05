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

For the integrated login, prediction audit history, and PostgreSQL database, Docker
Compose is the recommended way to run the whole project:

```powershell
Copy-Item .env.example .env
# Edit .env: set separate random 64-character hex values for POSTGRES_PASSWORD and JWT_SECRET_KEY.
docker compose up --build --remove-orphans -d
```

On startup, the backend waits for PostgreSQL, applies the Alembic schema migration,
checks the database connection, then loads the model. The site is at
`http://localhost:3000`; MLflow is at `http://localhost:5000`.
PostgreSQL is reachable by the API over the private Compose network and is not
published on a host port. The frontend, API, and MLflow ports bind to localhost
only, which is appropriate for this local demonstration. `--remove-orphans` removes the old MongoDB/Redis
containers from this Compose project without deleting their volumes.

If upgrading an existing PostgreSQL data volume, remember that changing
`POSTGRES_PASSWORD` in `.env` does not change the password inside an already
initialized database. Keep the configured password in sync with that database or
change the database role password deliberately before starting the new backend;
do not delete the volume to work around a login mismatch.

Create the first manager account from the backend container. The CLI prompts for a
password without echoing it; use a strong password of at least 12 characters:

```powershell
docker compose exec backend python -m app.cli create-user --username manager1 --role manager
```

Roles are enforced by the API as well as the React routes:

- **Staff:** use prediction and review only their own prediction history. Other pages, including the project guide, are not available.
- **Manager:** super-admin access to project pages, prediction and complete history. Managers can create staff, manager, and professor accounts from **Manage Users**.
- **Professor:** access to all project pages, prediction and complete history, but cannot create accounts.

There is no public account registration. An operator provisions the first manager
with the CLI, after which managers create accounts in the UI. Sessions use a
short-lived signed HttpOnly cookie; passwords are stored as Argon2id hashes. Five
failed password attempts temporarily lock an account. Set `AUTH_COOKIE_SECURE=true`
when serving the site over HTTPS.

Managers can see account roles, active status, and creation dates; reset passwords
for other accounts; and reactivate deactivated accounts. Existing sessions are
invalidated when an account is deactivated or its password is reset.

For account removal, managers can choose between reversible deactivation,
permanent account deletion with prediction history unlinked from the username, or
permanent deletion of both the account and its prediction history. Unlinked history
still contains its customer-feature snapshot and explanation, so this is not a
promise that all retained data is anonymous or safe for every privacy policy.
Permanent deletion cannot be undone. Managers cannot remove their own account or
the last active manager.

### What PostgreSQL stores

- `users`: UUID, unique username, Argon2id password hash, role, active status,
  failed-login count, lockout timestamp, and creation time.
- `prediction_records`: UUID, optional requesting user, timestamp, model/version, probability,
  risk band, predicted class, decision threshold, submitted feature snapshot, and
  JSON SHAP explanation.

The combined prediction endpoint commits the result and explanation as one audit
record before returning the response. Staff history is scoped to its owner; managers
and professors can review all account summaries, including unlinked history. The history response deliberately
excludes raw customer feature snapshots. Those snapshots are still stored for auditability, so
restrict database access and establish a retention/deletion policy before using real
customer data. The project does not yet have automatic expiry.

SQLAlchemy defines the database models; Alembic revision
`backend/migrations/versions/0001_users_and_prediction_records.py` creates the
initial schema, and `0002_account_lifecycle.py` adds session invalidation and allows
prediction history to be retained without its deleted account link. Docker runs
`alembic upgrade head` before Uvicorn workers start. Add future
schema changes as new migration revisions; do not delete the persistent PostgreSQL
volume to apply a schema change.

MongoDB and Redis have been removed. They were not used by the application and are
unnecessary for the current project. MLflow continues to track training experiments
in its separate `mlruns/` store.

For local frontend development, first start the PostgreSQL service using the
configured root `.env`, then run `npm ci` and `npm run dev` in `frontend/`. The
backend needs the same `DATABASE_URL` and `JWT_SECRET_KEY` values as Compose and
must run `alembic upgrade head` before `uvicorn app.main:app --reload`.

### Suggested study order

1. Read the **Project Guide → Start here** and **Tech words** sections.
2. Follow **Architecture** and the three **Diagrams** from offline training to an API response.
3. Study **Accounts & data** to learn the roles, login security, tables, and migration.
4. Use **File guide** to locate the implementation for each stage.
5. Expand the 50 **Viva** answers and practice explaining them in your own words.

## Tests

```powershell
conda activate churnxai
cd backend
pytest tests -q
```
