import { useState, type ReactNode } from 'react';
import {
  BookOpen,
  Boxes,
  Braces,
  CheckCircle2,
  CircleHelp,
  Database,
  FileText,
  GitBranch,
  KeyRound,
  Lightbulb,
  Network,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';

const sections = [
  { id: 'overview', label: 'Start here', icon: Lightbulb },
  { id: 'architecture', label: 'Architecture', icon: Network },
  { id: 'diagrams', label: 'Diagrams', icon: Workflow },
  { id: 'terms', label: 'Tech words', icon: BookOpen },
  { id: 'implementation', label: 'How it works', icon: Braces },
  { id: 'files', label: 'File guide', icon: FileText },
  { id: 'accounts', label: 'Accounts & data', icon: Database },
  { id: 'viva', label: 'Viva', icon: CircleHelp },
] as const;

type GuideSection = (typeof sections)[number]['id'];

const glossary = [
  ['Customer churn', 'When a customer stops using or paying for a service. The project tries to give the company an early warning.'],
  ['Dataset', 'A table of examples. Here, one row is one telecom customer and columns describe that customer.'],
  ['Feature', 'A piece of information given to the model, such as contract type or months of service.'],
  ['Target / label', 'The answer the model learns to predict. Here it is Churn: Yes or No.'],
  ['Supervised learning', 'Learning from examples that already include the right answer, like studying questions with an answer key.'],
  ['XGBoost', 'A model that builds many small decision trees in sequence. Later trees try to correct earlier mistakes.'],
  ['Model pipeline', 'A repeatable set of steps that prepares customer data and then makes a prediction.'],
  ['One-hot encoding', 'Turns words like “Month-to-month” into computer-readable yes/no columns.'],
  ['Standardization', 'Puts number columns onto comparable scales. This is helpful for models such as logistic regression.'],
  ['Train / test split', 'Keep some examples aside. Train with one part and use the untouched part for a final, fair check.'],
  ['Stratified split', 'Makes the train and test groups keep roughly the same share of churners as the original data.'],
  ['Cross-validation', 'Repeats training and checking on different parts of the training data, so results do not depend on one lucky split.'],
  ['Data leakage', 'Accidentally letting a model see information from its test data while learning. It can make the score look falsely good.'],
  ['SMOTE', 'Makes extra minority-class training examples by interpolating nearby examples. In this project it is used inside training folds only.'],
  ['Class imbalance', 'When one answer is much more common than another. Here, “No churn” appears more often than “Yes churn”.'],
  ['Decision threshold', 'The probability cut-off for calling someone a churner. This project selects it using training-only out-of-fold predictions.'],
  ['Precision', 'Of the customers flagged as likely to leave, how many really left?'],
  ['Recall', 'Of all customers who really left, how many did the model find?'],
  ['F1 score', 'One score that balances precision and recall. It is useful when both missed churners and false alarms matter.'],
  ['ROC-AUC', 'How well the model ranks churners above non-churners across many possible cut-offs.'],
  ['PR-AUC', 'A ranking score focused on finding the less common positive group—in this project, churners.'],
  ['Bootstrap confidence interval', 'Repeatedly resample the test results to estimate a range of plausible metric values, not just one score.'],
  ['Wilson confidence interval', 'A statistical range for a percentage, such as the share of customers who churned. It behaves more reliably than a simple normal-based range for proportions.'],
  ['Hypothesis test / p-value', 'A statistical check of whether an observed pattern could plausibly be random. A p-value is not the probability that a claim is true.'],
  ['Holm / Benjamini–Hochberg', 'Ways to adjust p-values when many statistical tests are run, reducing false discoveries.'],
  ['Chi-square test', 'Checks whether two category-based variables appear related, such as contract type and churn.'],
  ['Cramér’s V', 'A 0-to-1 measure of how strongly two category-based variables are associated.'],
  ['Point-biserial correlation', 'Measures how a numeric value, such as tenure, differs in relation to a two-answer outcome such as churn yes/no.'],
  ['Cohen’s d', 'A standardized way to describe how far apart two group averages are.'],
  ['Nadeau–Bengio corrected t-test', 'A comparison that adjusts for the fact that cross-validation folds overlap, so model comparisons do not treat related fold results as fully independent.'],
  ['SHAP', 'A method that assigns each input feature a contribution to one model prediction. It explains the model, not cause and effect.'],
  ['TreeSHAP', 'A fast SHAP calculation designed for tree models such as XGBoost.'],
  ['FastAPI', 'The Python web server that receives customer details and returns model results.'],
  ['React / TypeScript', 'Tools used to build the website screens; TypeScript helps catch mistakes in the data and code.'],
  ['Pydantic', 'Checks that information sent to the API has the expected fields and types.'],
  ['MLflow', 'Records model experiment runs and their settings and results so they can be inspected later.'],
  ['MLOps', 'Practices and tools for building, tracking, deploying, and maintaining machine-learning systems reliably.'],
  ['API', 'A defined way for two programs to ask each other for information. Here, the website asks the Python service for predictions.'],
  ['Docker Compose', 'Starts the project’s containers together using one configuration file.'],
] as const;

const vivaQuestions = [
  ['What is the title of your project?', 'The title is “Explainable Predictive Analytics: An MLOps Framework for Transparent Customer Retention.” ChurnXAI is the application name. The title highlights prediction, explanation, and the engineering needed to serve a model reliably.'],
  ['What is customer churn?', 'Customer churn happens when a customer stops using a company’s service. In this dataset, the label records whether each telecom customer left. The model learns patterns linked with that historical label; it cannot know future behavior with certainty.'],
  ['What problem does your project address?', 'A company may only notice a customer has left after the event. ChurnXAI tests whether past customer information can provide an earlier risk signal. Staff can use the signal to decide whether a useful retention action is appropriate.'],
  ['What does “XAI” mean?', 'XAI means Explainable Artificial Intelligence: techniques that make a model’s output easier to inspect. This project uses SHAP to show feature contributions for a customer. The explanation is about the model’s reasoning, not proof of real-world cause.'],
  ['What dataset does the project use?', 'The repository contains the Telco Customer Churn dataset, commonly distributed through IBM/Kaggle. Its saved metadata reports 7,043 customer rows and 21 original columns. It is a historical teaching dataset, not a live connection to a telecom provider.'],
  ['What is the target variable?', 'The target is Churn, the answer the model learns to predict. The training code encodes “Yes” as 1 and “No” as 0. The model’s positive-class probability is therefore interpreted as the estimated probability of churn.'],
  ['What are features?', 'Features are the customer details given to the model, such as contract type, service choices, tenure, and charges. The original customer identifier is not used as a behavioral feature. The pipeline prepares numeric and categorical columns before model fitting.'],
  ['How many customers churned in the source dataset?', 'The saved metadata reports 1,869 customers labeled “Yes” and 5,174 labeled “No.” Those counts add to 7,043. They also show why the two outcome classes are not equally represented.'],
  ['Why is class imbalance important here?', 'Non-churners are the majority class, so a model can obtain a seemingly good accuracy by mostly predicting “stay.” That could still miss many customers who churn. We therefore report recall, precision, F1, ROC-AUC, and especially PR-AUC rather than relying on accuracy alone.'],
  ['What data-cleaning issue did you check?', 'There are 11 TotalCharges cells containing whitespace rather than a numeric value. The audit first verifies that every affected record has tenure zero, which is consistent with a new customer. Only then are those values converted to 0.0.'],
  ['What statistical tests are used in EDA?', 'Categorical features use a chi-square test with Cramér’s V as an effect size. Numeric features use point-biserial correlation and Cohen’s d. Bootstrap intervals describe uncertainty in effect sizes, while Holm and Benjamini–Hochberg adjust for multiple tests.'],
  ['What does a Wilson interval describe?', 'A Wilson interval gives a range of plausible values for a population proportion, such as churn prevalence. It is more reliable than a simple normal approximation for proportions. It communicates sampling uncertainty instead of presenting the observed percentage as exact.'],
  ['Why correct for multiple testing?', 'When many features are tested, some can look significant by chance even if no real association exists. Holm controls the family-wise error rate, while Benjamini–Hochberg controls the expected false-discovery proportion. The analysis reports adjusted values so results are not judged from raw p-values alone.'],
  ['What is the purpose of a train/test split?', 'The training portion is used to compare and fit models. The separate test portion is kept aside until the final evaluation, so it acts like unseen data. Using the test set to tune the model or threshold would make the final score optimistic.'],
  ['How large is the locked test set?', 'The saved metadata records 5,634 training rows and 1,409 test rows, an 80/20 split of 7,043 examples. The split is stratified, so both groups retain approximately the same churn share. The test group is reserved for final evaluation.'],
  ['Which model families were compared?', 'The experiment compares Logistic Regression, Random Forest, XGBoost, and a PyTorch multilayer perceptron. These represent different learning approaches, from a linear classifier to ensembles of trees and a neural network. They are evaluated using the same training split and cross-validation folds.'],
  ['Which imbalance strategies were compared?', 'Each model family is assessed with no special imbalance handling, class weighting, and SMOTE oversampling. That creates 12 model/strategy configurations. The results indicate whether the added complexity of weighting or synthetic samples improves the validation score.'],
  ['What is cross-validation?', 'Cross-validation divides the training data into folds, fitting on some folds and checking on another. Repeating this with different folds gives several validation scores instead of one. This makes candidate comparisons less dependent on one lucky train/validation split.'],
  ['How is data leakage prevented?', 'The test set is split off before model fitting and is not used for selection or threshold tuning. Imputation, scaling, one-hot encoding, and optional SMOTE are fitted within each training fold’s pipeline. Validation rows are transformed by fitted steps but are not used to fit those steps.'],
  ['What does SMOTE do?', 'SMOTE creates synthetic minority-class examples by interpolating between nearby churn examples. Here it is a pipeline step, so each cross-validation fold creates synthetic samples only from that fold’s training partition. The validation fold and locked test set remain untouched.'],
  ['What is Nadeau–Bengio correction for?', 'Scores from cross-validation folds are related because their training sets overlap. The Nadeau–Bengio corrected paired t-test increases the uncertainty estimate to account for that dependence. This is more appropriate than pretending every fold score is an independent experiment.'],
  ['How was the final model choice made?', 'The metadata identifies XGBoost without class weighting or SMOTE as the strongest reported XGBoost setup by repeated-CV PR-AUC. It is also the overall comparison champion in the saved run. That choice preserves compatibility with the project’s TreeSHAP explanation implementation.'],
  ['Why does the project emphasize PR-AUC?', 'PR-AUC summarizes precision–recall behavior across probability thresholds and focuses on the positive class, churn. This is useful when churn is less common than staying. A PR-AUC value should still be interpreted with its test prevalence and other metrics.'],
  ['What is a decision threshold?', 'The model produces a probability; the threshold turns it into a class label. At or above the saved threshold, the API predicts churn. The current threshold is about 0.335, so it is lower than the default 0.5 to balance precision and recall for this experiment.'],
  ['How was the threshold selected?', 'The workflow creates out-of-fold predictions for training rows and searches for the threshold with the best F1. The saved threshold is approximately 0.335. The locked test labels were not used to choose it, which keeps final evaluation more independent.'],
  ['What does precision mean?', 'Precision asks: of the customers the model flagged as likely to churn, what fraction actually churned in the test labels? Higher precision means fewer false alarms among flagged customers. Its trade-off is that a stricter threshold may miss some real churners.'],
  ['What does recall mean?', 'Recall asks: of all customers who actually churned, what fraction did the model identify? Higher recall means fewer missed churners. It may also increase false alarms, so business teams need to balance the cost of missed outreach against unnecessary outreach.'],
  ['What does F1 mean?', 'F1 is the harmonic mean of precision and recall. It gives a single score that is high only when both are reasonably strong. It is useful for choosing the project threshold, but business costs may justify optimizing a different target in a real deployment.'],
  ['What are the reported test metrics?', 'The saved locked-test results are precision 0.557, recall 0.727, F1 0.631, ROC-AUC 0.847, PR-AUC 0.665, and accuracy about 0.774. The F1 interval is 0.589–0.667, ROC-AUC interval 0.825–0.868, and PR-AUC interval 0.611–0.713.'],
  ['Why are confidence intervals reported?', 'A test metric depends on the particular sample of customers, so a single number has uncertainty. Bootstrap confidence intervals repeatedly resample test rows to estimate a range of plausible metric values. They do not guarantee that performance on future customers will fall inside the interval.'],
  ['How many bootstrap resamples are used?', 'The saved evaluation metadata records 2,000 bootstrap resamples for the final test metrics. Each resample is drawn from the held-out test predictions and labels. Percentiles of those resampled scores form the reported 95% intervals.'],
  ['What is XGBoost?', 'XGBoost is a gradient-boosted decision-tree algorithm. It builds trees in sequence, with later trees improving the combined prediction by correcting earlier errors. It can model non-linear patterns and interactions in customer features.'],
  ['Why use XGBoost in the deployed system?', 'The saved model comparison selects XGBoost as the best reported configuration, and the API loads that fitted pipeline from the joblib artifact. Tree models also have an efficient SHAP implementation. The actual model name, status, threshold, and metrics are recorded in metadata.'],
  ['What is SHAP?', 'SHAP assigns feature contributions to a prediction relative to a baseline model output. Positive contributions in this implementation push toward higher churn output; negative contributions push the other way. The prediction page displays top drivers and a waterfall visualization.'],
  ['What is TreeSHAP, and how is the explanation checked?', 'TreeSHAP is the efficient SHAP method used for tree models through `shap.TreeExplainer`. During artifact generation, the project checks that the baseline plus SHAP contributions, transformed through the sigmoid, matches the XGBoost probability within a small tolerance. This checks additivity, not causal validity.'],
  ['Does SHAP prove a feature causes churn?', 'No. SHAP explains which inputs influenced this fitted model’s output for a particular example. It does not prove that changing a feature will change whether the person leaves. Causal claims require a suitable study or experiment.'],
  ['What does FastAPI do?', 'FastAPI exposes the Python backend as HTTP endpoints. Pydantic schemas validate the customer request, authentication dependencies check a signed session and role, and route handlers call prediction/explanation code. The API also provides health and model-information endpoints.'],
  ['What does React do?', 'React builds the interactive browser pages: dashboard, prediction form, pipeline explanation, project guide, and prediction history. State updates show the response without reloading the page. TypeScript types the inputs and responses exchanged with the API.'],
  ['What does Pydantic do?', 'Pydantic checks incoming JSON against declared schemas, including required customer features and numeric limits. It also shapes API responses so fields have a consistent format. Authentication and prediction results therefore use explicit contracts rather than arbitrary dictionaries from the browser.'],
  ['How does one prediction travel through the system?', 'The browser submits one request to `/api/v1/predict-and-explain` through Nginx. FastAPI validates the customer and role, runs the model and SHAP explainer, stores one audit record in PostgreSQL, then returns probability, risk band, drivers, and the waterfall image.'],
  ['What does Docker Compose do in this project?', 'Docker Compose connects the frontend/Nginx, FastAPI backend, MLflow UI, and PostgreSQL services on a private bridge network. It declares host ports, persistent volumes, environment variables, and health dependencies. MongoDB and Redis are not needed and have been removed.'],
  ['What is MLflow used for?', 'The training workflow logs its experiment settings and fold/test metrics to the `telco-churn-model-comparison` experiment. The MLflow UI lets you inspect those runs. Its local file store is separate from PostgreSQL, which stores application accounts and prediction history.'],
  ['How is PostgreSQL implemented in the application?', 'SQLAlchemy models define `users` and `prediction_records`; Alembic applies the initial schema migration before the API starts. Login reads and updates user rows, while the combined prediction endpoint commits its result and SHAP data as one transaction.'],
  ['What does each PostgreSQL table store?', '`users` stores a UUID, unique username, Argon2id password hash, role, active state, failed-login count, lockout time, and creation time. `prediction_records` links to a user and stores timestamp, model/threshold, probability/risk/class, a feature snapshot, and SHAP JSON.'],
  ['What are the three roles?', 'Staff can run predictions and view only their own history. Managers are super-admins: they can use the project, review all prediction history, create accounts, see the complete account list, and deactivate other accounts. Deactivation blocks sign-in but preserves audit history; the manager cannot deactivate themselves or the last active manager. Professors can use every project feature and view complete history, but cannot administer accounts.'],
  ['What happens when a manager removes a user?', 'The account is deactivated, not erased. That person can no longer sign in, while their past prediction records stay connected to their account for audit and review. The system also prevents a manager from deactivating their own account or the final active manager.'],
  ['How is each role restricted?', 'The website shows only the routes allowed for a role, and the API independently checks permissions. Staff are restricted to prediction and personal history. Manager and professor accounts can view the project and all history; only managers can use the account-creation API. This prevents browser-only restrictions from being bypassed with a direct API call.'],
  ['How are accounts created and passwords protected?', 'An operator provisions the first manager account with the backend CLI. After signing in, managers can create staff, manager, and professor accounts in the Manage Users page. New passwords must have at least 12 characters and are stored as Argon2id hashes, never as readable text. Five failed login attempts temporarily lock an account.'],
  ['Why use Alembic database migrations?', 'A migration describes a versioned, reviewable change to database tables. Alembic applies migration `0001_users_predictions` once before the API workers start, so four workers do not race to create the same schema. Future schema changes can be added as later revisions.'],
  ['How do role-based history permissions work?', 'Every record has a foreign key to the requesting account. Staff history queries are filtered to the signed-in user; managers and professors can review records from every account. Staff cannot open another account’s detail, and list responses do not return saved raw feature snapshots.'],
  ['What are the main limitations and next improvements?', 'The training data is historical and public, there is no live telecom data feed, and SHAP is not causal. Prediction snapshots need an approved retention/deletion policy, and a real deployment needs HTTPS, secure secrets, backups, monitoring, fairness/calibration checks, and evaluation of actual retention interventions.'],
] as const;

const fileGroups = [
  {
    title: 'Data and analysis',
    icon: Sparkles,
    files: [
      ['data/WA_Fn-UseC_-Telco-Customer-Churn.csv', 'Original customer data used for analysis and training.'],
      ['notebooks/01_data_audit_eda.ipynb', 'Checks data quality, explores patterns, and runs statistical tests.'],
      ['notebooks/02_train_evaluate.ipynb', 'Compares models, chooses a threshold, evaluates the final model, and creates SHAP plots.'],
      ['backend/statistical_analysis.py', 'Reusable cleaning and statistical-analysis functions.'],
      ['backend/model_comparison.py', 'Reusable model comparison, validation, and metric functions.'],
      ['data/processed/telco_clean.csv', 'Cleaned data produced from the raw CSV.'],
      ['data/processed/feature_relevance.csv', 'Statistical test results for the input features.'],
    ],
  },
  {
    title: 'Model and API',
    icon: Boxes,
    files: [
      ['backend/train_model.py', 'Command-line entry point for training and exporting the model.'],
      ['backend/models/xgb_churn_pipeline.joblib', 'Saved fitted pipeline used by the prediction service.'],
      ['backend/models/model_metadata.json', 'Model details, threshold, split information, and evaluation results.'],
      ['backend/app/main.py', 'Creates the FastAPI application and loads the model when the service starts.'],
      ['backend/app/api/predict.py', 'API route that validates a customer and returns a churn prediction.'],
      ['backend/app/api/explain.py', 'API route that returns feature contributions and a SHAP plot.'],
      ['backend/app/api/auth.py', 'Handles login and manager-only creation of staff, manager, and professor accounts.'],
      ['backend/app/api/predictions.py', 'Combines prediction and explanation, saves audit history, and enforces per-role history access.'],
      ['backend/app/db/models.py', 'Defines PostgreSQL user accounts and saved prediction records.'],
      ['backend/app/ml/predictor.py', 'Loads the model and produces churn probabilities and risk labels.'],
      ['backend/app/ml/explainer.py', 'Builds local SHAP explanations for predictions.'],
      ['backend/app/schemas/', 'Pydantic request and response shapes used to validate API data.'],
    ],
  },
  {
    title: 'Website and operations',
    icon: GitBranch,
    files: [
      ['frontend/src/pages/', 'Dashboard, prediction, history, project guide, and manager user creation.'],
      ['frontend/src/pages/UserManagement.tsx', 'Manager-only form for creating staff, manager, and professor accounts.'],
      ['frontend/src/components/RequireAuth.tsx', 'Protects browser routes according to the signed-in user role.'],
      ['frontend/src/auth/', 'Restores login sessions and shares the current account with the React pages.'],
      ['frontend/src/services/api.ts', 'Connects the website to the FastAPI service.'],
      ['frontend/src/components/Navbar.tsx', 'Shared navigation across the website.'],
      ['reports/metrics/model_evaluation.json', 'Saved test metrics and their bootstrap confidence intervals.'],
      ['reports/metrics/model_comparison.csv', 'Cross-validation results for the compared model configurations.'],
      ['reports/figures/', 'EDA charts, confusion matrix, and global/local SHAP visualizations.'],
      ['docker-compose.yml', 'Runs the backend, frontend, MLflow, and PostgreSQL containers together.'],
      ['backend/tests/', 'Automated checks for the statistical code, model, API, and data schemas.'],
    ],
  },
];

function DiagramCanvas({
  label,
  children,
  width,
  height,
}: {
  label: string;
  children: ReactNode;
  width: number;
  height: number;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <svg
        aria-label={label}
        className="mx-auto h-auto max-w-none"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
      >
        {children}
      </svg>
      <p className="mt-3 text-center text-xs text-slate-500">Scroll sideways on a small screen to see the full diagram.</p>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <DiagramCanvas
      height={600}
      label="Detailed architecture showing offline data preparation, model training artifacts, and the online React, Nginx, FastAPI, predictor, explainer, and MLflow services."
      width={1180}
    >
      <defs>
        <marker id="architecture-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 z" fill="#475569" />
        </marker>
        <marker id="architecture-return" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 z" fill="#0f766e" />
        </marker>
      </defs>
      <text fill="#0f172a" fontSize="20" fontWeight="700" x="34" y="36">OFFLINE: data science and model creation</text>
      <rect fill="#f8fafc" height="204" rx="18" stroke="#cbd5e1" width="1110" x="30" y="52" />
      <rect fill="#f0fdfa" height="108" rx="12" stroke="#5eead4" width="184" x="48" y="85" />
      <text fill="#134e4a" fontSize="15" fontWeight="700" x="64" y="115">Raw Telco CSV</text>
      <text fill="#475569" fontSize="12" x="64" y="140">7,043 rows · 21 columns</text>
      <text fill="#475569" fontSize="12" x="64" y="160">Churn is the label</text>
      <rect fill="#f0fdfa" height="108" rx="12" stroke="#5eead4" width="214" x="266" y="85" />
      <text fill="#134e4a" fontSize="15" fontWeight="700" x="282" y="115">Audit + EDA</text>
      <text fill="#475569" fontSize="12" x="282" y="140">cleaning · statistics</text>
      <text fill="#475569" fontSize="12" x="282" y="160">clean CSV + relevance CSV</text>
      <rect fill="#f0fdfa" height="108" rx="12" stroke="#5eead4" width="214" x="514" y="85" />
      <text fill="#134e4a" fontSize="15" fontWeight="700" x="530" y="115">Model comparison</text>
      <text fill="#475569" fontSize="12" x="530" y="140">4 models × 3 strategies</text>
      <text fill="#475569" fontSize="12" x="530" y="160">CV · MLflow · threshold</text>
      <rect fill="#f0fdfa" height="108" rx="12" stroke="#5eead4" width="218" x="762" y="85" />
      <text fill="#134e4a" fontSize="15" fontWeight="700" x="778" y="115">Saved artifacts</text>
      <text fill="#475569" fontSize="12" x="778" y="140">fitted ImbPipeline</text>
      <text fill="#475569" fontSize="12" x="778" y="160">metadata · metrics · SHAP plots</text>
      <path d="M232 139 H256 M480 139 H504 M728 139 H752" fill="none" markerEnd="url(#architecture-arrow)" stroke="#475569" strokeWidth="2" />
      <rect fill="#fff7ed" height="52" rx="10" stroke="#fdba74" width="182" x="1004" y="112" />
      <text fill="#9a3412" fontSize="12" fontWeight="700" x="1020" y="135">MLflow experiment log</text>
      <text fill="#7c2d12" fontSize="11" x="1020" y="153">file store: mlruns/</text>
      <path d="M976 139 H994" fill="none" markerEnd="url(#architecture-arrow)" stroke="#c2410c" strokeWidth="2" />

      <text fill="#0f172a" fontSize="20" fontWeight="700" x="34" y="292">ONLINE: prediction request and explanation</text>
      <rect fill="#eff6ff" height="214" rx="18" stroke="#93c5fd" width="1110" x="30" y="310" />
      <rect fill="#fff" height="108" rx="12" stroke="#93c5fd" width="166" x="48" y="354" />
      <text fill="#1e3a8a" fontSize="14" fontWeight="700" x="62" y="382">Browser</text>
      <text fill="#475569" fontSize="11" x="62" y="404">React + TypeScript</text>
      <text fill="#475569" fontSize="11" x="62" y="424">form + result display</text>
      <rect fill="#fff" height="108" rx="12" stroke="#93c5fd" width="176" x="246" y="354" />
      <text fill="#1e3a8a" fontSize="14" fontWeight="700" x="260" y="382">Nginx frontend</text>
      <text fill="#475569" fontSize="11" x="260" y="404">serves built website</text>
      <text fill="#475569" fontSize="11" x="260" y="424">proxies /api/ to backend</text>
      <rect fill="#fff" height="108" rx="12" stroke="#93c5fd" width="194" x="452" y="354" />
      <text fill="#1e3a8a" fontSize="14" fontWeight="700" x="466" y="382">FastAPI application</text>
      <text fill="#475569" fontSize="11" x="466" y="404">Pydantic · routes · errors</text>
      <text fill="#475569" fontSize="11" x="466" y="424">auth · predict/explain · history</text>
      <rect fill="#fff" height="108" rx="12" stroke="#93c5fd" width="188" x="674" y="354" />
      <text fill="#1e3a8a" fontSize="14" fontWeight="700" x="688" y="382">Predictor singleton</text>
      <text fill="#475569" fontSize="11" x="688" y="404">loads joblib at startup</text>
      <text fill="#475569" fontSize="11" x="688" y="424">probability + risk band</text>
      <rect fill="#fff" height="108" rx="12" stroke="#93c5fd" width="216" x="888" y="354" />
      <text fill="#1e3a8a" fontSize="14" fontWeight="700" x="902" y="382">XGBoost + TreeSHAP</text>
      <text fill="#475569" fontSize="11" x="902" y="404">prediction and contributions</text>
      <text fill="#475569" fontSize="11" x="902" y="424">waterfall PNG encoded for API</text>
      <path d="M214 386 H236 M422 386 H442 M646 386 H664 M862 386 H878" fill="none" markerEnd="url(#architecture-arrow)" stroke="#475569" strokeWidth="2" />
      <path d="M878 435 H664 M442 435 H214" fill="none" markerEnd="url(#architecture-return)" stroke="#0f766e" strokeWidth="2" />
      <text fill="#475569" fontSize="11" x="210" y="371">HTTPS/HTTP page</text>
      <text fill="#475569" fontSize="11" x="421" y="371">JSON request</text>
      <text fill="#0f766e" fontSize="11" x="690" y="456">JSON prediction and explanation return to browser</text>
      <rect fill="#f0fdfa" height="48" rx="10" stroke="#5eead4" width="250" x="424" y="466" />
      <text fill="#134e4a" fontSize="12" fontWeight="700" x="442" y="486">PostgreSQL · users + prediction_records</text>
      <text fill="#475569" fontSize="10" x="442" y="503">login roles, prediction audit, SHAP drivers</text>
      <path d="M549 462 V458 H549 V466" fill="none" markerEnd="url(#architecture-arrow)" stroke="#0f766e" strokeWidth="2" />

      <rect fill="#fff7ed" height="34" rx="10" stroke="#fdba74" width="1110" x="30" y="544" />
      <text fill="#9a3412" fontSize="11" fontWeight="700" x="48" y="566">MLflow experiment files stay in mlruns/. MongoDB and Redis were removed to keep one application database.</text>
    </DiagramCanvas>
  );
}

function TrainingWorkflowDiagram() {
  return (
    <DiagramCanvas height={590} label="Model training diagram showing the data audit, locked stratified split, training-fold preprocessing, three imbalance strategies, four classifiers, cross-validation, out-of-fold threshold, final test evaluation, and output artifacts." width={1080}>
      <defs>
        <marker id="training-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 z" fill="#64748b" />
        </marker>
      </defs>
      <text fill="#0f172a" fontSize="20" fontWeight="700" x="30" y="34">TRAINING WORKFLOW · the held-out test stays outside model selection</text>
      {[
        { x: 30, title: '1 · Raw data', lines: ['Telco CSV', '7,043 rows'], fill: '#f0fdfa', stroke: '#5eead4' },
        { x: 240, title: '2 · Audit + clean', lines: ['validate 11 blanks', 'write clean dataset'], fill: '#f0fdfa', stroke: '#5eead4' },
        { x: 450, title: '3 · Locked split', lines: ['stratified 80 / 20', '5,634 train · 1,409 test'], fill: '#eff6ff', stroke: '#93c5fd' },
      ].map((node) => (
        <g key={node.title}>
          <rect fill={node.fill} height="92" rx="12" stroke={node.stroke} width="182" x={node.x} y="72" />
          <text fill="#0f172a" fontSize="13" fontWeight="700" x={node.x + 13} y="101">{node.title}</text>
          <text fill="#475569" fontSize="11" x={node.x + 13} y="124">{node.lines[0]}</text>
          <text fill="#475569" fontSize="11" x={node.x + 13} y="143">{node.lines[1]}</text>
        </g>
      ))}
      <path d="M212 118 H230 M422 118 H440" fill="none" markerEnd="url(#training-arrow)" stroke="#64748b" strokeWidth="2" />
      <path d="M541 164 V205 H428" fill="none" markerEnd="url(#training-arrow)" stroke="#64748b" strokeWidth="2" />
      <rect fill="#f8fafc" height="265" rx="16" stroke="#94a3b8" width="570" x="28" y="208" />
      <text fill="#0f172a" fontSize="15" fontWeight="700" x="48" y="237">TRAINING SET ONLY · repeated stratified 5-fold CV, 2 repeats</text>
      <rect fill="#fff" height="72" rx="10" stroke="#cbd5e1" width="150" x="48" y="262" />
      <text fill="#334155" fontSize="12" fontWeight="700" x="62" y="288">Fold training rows</text>
      <text fill="#64748b" fontSize="11" x="62" y="310">fit each step here</text>
      <rect fill="#fff" height="72" rx="10" stroke="#cbd5e1" width="170" x="224" y="262" />
      <text fill="#334155" fontSize="12" fontWeight="700" x="238" y="288">Preprocess</text>
      <text fill="#64748b" fontSize="11" x="238" y="310">impute · scale · encode</text>
      <rect fill="#fff7ed" height="72" rx="10" stroke="#fdba74" width="150" x="420" y="262" />
      <text fill="#9a3412" fontSize="12" fontWeight="700" x="434" y="288">Sampler option</text>
      <text fill="#7c2d12" fontSize="11" x="434" y="310">none / weight / SMOTE</text>
      <path d="M198 298 H214 M394 298 H410" fill="none" markerEnd="url(#training-arrow)" stroke="#64748b" strokeWidth="2" />
      <rect fill="#fff" height="68" rx="10" stroke="#cbd5e1" width="508" x="48" y="352" />
      <text fill="#334155" fontSize="12" fontWeight="700" x="62" y="378">Fit one classifier per configuration</text>
      <text fill="#64748b" fontSize="11" x="62" y="399">Logistic Regression · Random Forest · XGBoost · PyTorch MLP</text>
      <path d="M495 334 V345" fill="none" markerEnd="url(#training-arrow)" stroke="#64748b" strokeWidth="2" />
      <text fill="#475569" fontSize="11" x="48" y="440">Score validation fold with PR-AUC; log fold results to MLflow.</text>
      <text fill="#475569" fontSize="11" x="48" y="459">Compare strategies with paired Nadeau–Bengio corrected tests.</text>

      <rect fill="#eff6ff" height="84" rx="12" stroke="#93c5fd" width="216" x="670" y="222" />
      <text fill="#1e3a8a" fontSize="13" fontWeight="700" x="686" y="250">4 · Select XGBoost</text>
      <text fill="#475569" fontSize="11" x="686" y="273">best reported XGBoost CV</text>
      <text fill="#475569" fontSize="11" x="686" y="291">mean PR-AUC about 0.671</text>
      <rect fill="#eff6ff" height="84" rx="12" stroke="#93c5fd" width="216" x="670" y="332" />
      <text fill="#1e3a8a" fontSize="13" fontWeight="700" x="686" y="360">5 · OOF threshold</text>
      <text fill="#475569" fontSize="11" x="686" y="383">training-only predictions</text>
      <text fill="#475569" fontSize="11" x="686" y="401">maximize F1 → 0.335</text>
      <path d="M598 390 H650 V264 H660 M778 314 V322" fill="none" markerEnd="url(#training-arrow)" stroke="#64748b" strokeWidth="2" />

      <rect fill="#fff7ed" height="100" rx="12" stroke="#fdba74" width="176" x="900" y="220" />
      <text fill="#9a3412" fontSize="13" fontWeight="700" x="915" y="248">6 · Locked test</text>
      <text fill="#7c2d12" fontSize="11" x="915" y="271">fit final pipeline on train</text>
      <text fill="#7c2d12" fontSize="11" x="915" y="289">evaluate test once</text>
      <text fill="#7c2d12" fontSize="11" x="915" y="307">2,000 bootstrap samples</text>
      <path d="M632 118 H880 V260 H890" fill="none" markerEnd="url(#training-arrow)" stroke="#b45309" strokeDasharray="6 5" strokeWidth="2" />
      <text fill="#92400e" fontSize="10" x="686" y="138">test set stays untouched until final evaluation</text>
      <path d="M886 374 H894 V320" fill="none" markerEnd="url(#training-arrow)" stroke="#64748b" strokeWidth="2" />

      <rect fill="#f0fdfa" height="104" rx="12" stroke="#5eead4" width="646" x="404" y="468" />
      <text fill="#134e4a" fontSize="13" fontWeight="700" x="422" y="496">7 · Artifacts saved for inspection and serving</text>
      <text fill="#475569" fontSize="11" x="422" y="519">backend/models/xgb_churn_pipeline.joblib · model_metadata.json</text>
      <text fill="#475569" fontSize="11" x="422" y="539">reports/metrics/model_evaluation.json · model_comparison.csv · reports/figures/SHAP plots</text>
      <path d="M988 320 V456 H950 V458" fill="none" markerEnd="url(#training-arrow)" stroke="#64748b" strokeWidth="2" />
    </DiagramCanvas>
  );
}

function PredictionSequenceDiagram() {
  return (
    <DiagramCanvas height={610} label="Sequence diagram showing the browser sending prediction and explanation requests via Nginx to FastAPI, the loaded predictor and TreeSHAP, and the response returning to the user." width={1080}>
      <defs>
        <marker id="sequence-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 z" fill="#475569" />
        </marker>
        <marker id="sequence-return" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 z" fill="#0f766e" />
        </marker>
      </defs>
      <text fill="#0f172a" fontSize="20" fontWeight="700" x="30" y="34">ONE USER ACTION · request and response sequence</text>
      {[
        { x: 80, label: 'User / browser' },
        { x: 300, label: 'Nginx / React' },
        { x: 520, label: 'FastAPI routes' },
        { x: 740, label: 'Predictor' },
        { x: 960, label: 'XGBoost / SHAP' },
      ].map((lane) => (
        <g key={lane.label}>
          <rect fill="#eff6ff" height="48" rx="10" stroke="#93c5fd" width="150" x={lane.x - 70} y="64" />
          <text fill="#1e3a8a" fontSize="12" fontWeight="700" textAnchor="middle" x={lane.x + 5} y="93">{lane.label}</text>
          <path d={`M${lane.x + 5} 118 V560`} stroke="#cbd5e1" strokeDasharray="5 6" strokeWidth="1.5" />
        </g>
      ))}
      {[
        { y: 150, from: 85, to: 305, text: 'Enter customer details' },
        { y: 198, from: 305, to: 525, text: 'POST /api/v1/predict + /explain' },
        { y: 246, from: 525, to: 745, text: 'validate schema; dispatch call' },
        { y: 294, from: 745, to: 965, text: 'probability + SHAP values' },
      ].map((message) => (
        <g key={message.text}>
          <path d={`M${message.from} ${message.y} H${message.to - 9}`} fill="none" markerEnd="url(#sequence-arrow)" stroke="#475569" strokeWidth="2" />
          <rect fill="#fff" height="24" rx="5" width="226" x={(message.from + message.to) / 2 - 113} y={message.y - 26} />
          <text fill="#334155" fontSize="10" textAnchor="middle" x={(message.from + message.to) / 2} y={message.y - 10}>{message.text}</text>
        </g>
      ))}
      <rect fill="#f8fafc" height="76" rx="10" stroke="#cbd5e1" width="170" x="665" y="320" />
      <text fill="#334155" fontSize="11" fontWeight="700" x="679" y="344">Pipeline in memory</text>
      <text fill="#64748b" fontSize="10" x="679" y="363">preprocessor + classifier</text>
      <text fill="#64748b" fontSize="10" x="679" y="380">loaded once at startup</text>
      <path d="M745 294 V312" fill="none" markerEnd="url(#sequence-arrow)" stroke="#475569" strokeWidth="2" />
      <path d="M965 294 V414 H745 V405" fill="none" markerEnd="url(#sequence-return)" stroke="#0f766e" strokeWidth="2" />
      <text fill="#0f766e" fontSize="10" x="824" y="407">prediction probability + explanation</text>
      <path d="M745 405 H525 V454" fill="none" markerEnd="url(#sequence-return)" stroke="#0f766e" strokeWidth="2" />
      <rect fill="#f0fdfa" height="60" rx="10" stroke="#5eead4" width="170" x="440" y="454" />
      <text fill="#134e4a" fontSize="11" fontWeight="700" x="454" y="479">Response schema</text>
      <text fill="#475569" fontSize="10" x="454" y="497">probability · risk · drivers</text>
      <path d="M525 514 V535 H305 V514" fill="none" markerEnd="url(#sequence-return)" stroke="#0f766e" strokeWidth="2" />
      <path d="M305 535 H85 V514" fill="none" markerEnd="url(#sequence-return)" stroke="#0f766e" strokeWidth="2" />
      <text fill="#0f766e" fontSize="10" textAnchor="middle" x="305" y="555">website shows result; plot is returned as base64 PNG</text>
      <text fill="#92400e" fontSize="10" x="32" y="592">The prediction endpoint and explanation endpoint are requested concurrently by the frontend.</text>
    </DiagramCanvas>
  );
}

function DeploymentDiagram() {
  return (
    <DiagramCanvas height={510} label="Docker deployment diagram with local browser ports and Docker Compose network services for frontend Nginx, backend FastAPI, MLflow, and PostgreSQL, with account and prediction tables." width={1080}>
      <defs>
        <marker id="deploy-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 z" fill="#475569" />
        </marker>
      </defs>
      <text fill="#0f172a" fontSize="20" fontWeight="700" x="30" y="34">DOCKER COMPOSE · services share a private bridge network</text>
      <rect fill="#eff6ff" height="72" rx="12" stroke="#93c5fd" width="212" x="30" y="86" />
      <text fill="#1e3a8a" fontSize="14" fontWeight="700" x="49" y="115">Browser on host</text>
      <text fill="#475569" fontSize="11" x="49" y="138">website :3000 · API :8000</text>
      <rect fill="#f8fafc" height="355" rx="18" stroke="#94a3b8" strokeDasharray="7 5" width="792" x="265" y="65" />
      <text fill="#334155" fontSize="13" fontWeight="700" x="285" y="91">churnxai-network · Compose bridge</text>
      <rect fill="#f0fdfa" height="78" rx="11" stroke="#5eead4" width="208" x="290" y="119" />
      <text fill="#134e4a" fontSize="13" fontWeight="700" x="306" y="146">frontend · Nginx</text>
      <text fill="#475569" fontSize="10" x="306" y="166">host :3000 → container :80</text>
      <text fill="#475569" fontSize="10" x="306" y="184">serves Vite production build</text>
      <rect fill="#eff6ff" height="78" rx="11" stroke="#93c5fd" width="208" x="550" y="119" />
      <text fill="#1e3a8a" fontSize="13" fontWeight="700" x="566" y="146">backend · FastAPI</text>
      <text fill="#475569" fontSize="10" x="566" y="166">host :8000 → container :8000</text>
      <text fill="#475569" fontSize="10" x="566" y="184">health check gates frontend start</text>
      <path d="M242 123 H280" fill="none" markerEnd="url(#deploy-arrow)" stroke="#475569" strokeWidth="2" />
      <path d="M498 158 H540" fill="none" markerEnd="url(#deploy-arrow)" stroke="#475569" strokeWidth="2" />
      <text fill="#64748b" fontSize="10" x="501" y="146">/api/* proxy</text>

      <rect fill="#fff7ed" height="75" rx="11" stroke="#fdba74" width="208" x="290" y="232" />
      <text fill="#9a3412" fontSize="13" fontWeight="700" x="306" y="259">mlflow · tracking UI</text>
      <text fill="#7c2d12" fontSize="10" x="306" y="279">host :5000 · backed by ./mlruns</text>
      <text fill="#7c2d12" fontSize="10" x="306" y="297">runs logged during training</text>

      <rect fill="#f0fdfa" height="75" rx="11" stroke="#5eead4" width="208" x="550" y="232" />
      <text fill="#134e4a" fontSize="13" fontWeight="700" x="566" y="259">PostgreSQL</text>
      <text fill="#475569" fontSize="10" x="566" y="279">host :5432 · persistent volume</text>
      <text fill="#475569" fontSize="10" x="566" y="297">API reads and writes via SQLAlchemy</text>
      <rect fill="#fff" height="75" rx="11" stroke="#5eead4" width="208" x="290" y="337" />
      <text fill="#134e4a" fontSize="13" fontWeight="700" x="306" y="364">users table</text>
      <text fill="#475569" fontSize="10" x="306" y="384">username · password hash · role</text>
      <text fill="#475569" fontSize="10" x="306" y="402">active status · login lockout</text>
      <rect fill="#fff" height="75" rx="11" stroke="#5eead4" width="208" x="550" y="337" />
      <text fill="#134e4a" fontSize="13" fontWeight="700" x="566" y="364">prediction_records</text>
      <text fill="#475569" fontSize="10" x="566" y="384">owner · time · model · probability</text>
      <text fill="#475569" fontSize="10" x="566" y="402">input snapshot · SHAP explanation</text>
      <path d="M654 197 V222" fill="none" markerEnd="url(#deploy-arrow)" stroke="#0f766e" strokeWidth="2" />
      <path d="M654 307 V328 M498 372 H540" fill="none" markerEnd="url(#deploy-arrow)" stroke="#0f766e" strokeWidth="2" />

      <rect fill="#f8fafc" height="355" rx="18" stroke="#cbd5e1" width="273" x="803" y="65" />
      <text fill="#334155" fontSize="13" fontWeight="700" x="823" y="91">Mounted model/data</text>
      <rect fill="#fff" height="70" rx="10" stroke="#cbd5e1" width="232" x="823" y="119" />
      <text fill="#334155" fontSize="11" fontWeight="700" x="839" y="145">./backend/models → /app/models</text>
      <text fill="#64748b" fontSize="10" x="839" y="167">joblib pipeline + metadata JSON</text>
      <rect fill="#fff" height="70" rx="10" stroke="#cbd5e1" width="232" x="823" y="211" />
      <text fill="#334155" fontSize="11" fontWeight="700" x="839" y="237">./data → /app/data</text>
      <text fill="#64748b" fontSize="10" x="839" y="259">dataset available to backend</text>
      <rect fill="#fff" height="70" rx="10" stroke="#cbd5e1" width="232" x="823" y="303" />
      <text fill="#334155" fontSize="11" fontWeight="700" x="839" y="329">./mlruns → /mlruns</text>
      <text fill="#64748b" fontSize="10" x="839" y="351">experiment files and UI store</text>
      <path d="M758 158 H812" fill="none" markerEnd="url(#deploy-arrow)" stroke="#64748b" strokeWidth="2" />
      <text fill="#134e4a" fontSize="11" fontWeight="700" x="285" y="459">Alembic migrations run before FastAPI starts; authentication and predictions use PostgreSQL on the live request path.</text>
      <text fill="#475569" fontSize="10" x="285" y="481">Volumes retain database data across restarts. Back up and test restores before replacing a database volume.</text>
    </DiagramCanvas>
  );
}

function DatabaseSchemaDiagram() {
  return (
    <DiagramCanvas
      height={370}
      label="PostgreSQL entity relationship diagram: a user owns zero or more prediction records; the records store a customer feature snapshot and JSON SHAP explanation."
      width={1000}
    >
      <defs>
        <marker id="schema-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 z" fill="#0f766e" />
        </marker>
      </defs>
      <text fill="#0f172a" fontSize="20" fontWeight="700" x="30" y="34">POSTGRESQL DATA MODEL · one user can request many predictions</text>
      <rect fill="#eff6ff" height="250" rx="14" stroke="#93c5fd" width="360" x="40" y="64" />
      <rect fill="#1e40af" height="42" rx="14" width="360" x="40" y="64" />
      <text fill="#fff" fontSize="16" fontWeight="700" x="60" y="91">users</text>
      <text fill="#334155" fontSize="12" x="60" y="131">id · UUID primary key</text>
      <text fill="#334155" fontSize="12" x="60" y="155">username · unique account name</text>
      <text fill="#334155" fontSize="12" x="60" y="179">password_hash · Argon2id hash only</text>
      <text fill="#334155" fontSize="12" x="60" y="203">role · staff | manager | professor</text>
      <text fill="#334155" fontSize="12" x="60" y="227">is_active · failed attempts · locked_until</text>
      <text fill="#334155" fontSize="12" x="60" y="251">created_at · account creation timestamp</text>
      <text fill="#334155" fontSize="11" fontWeight="700" x="60" y="289">Provisioned by an operator; there is no public sign-up.</text>

      <rect fill="#f0fdfa" height="250" rx="14" stroke="#5eead4" width="420" x="540" y="64" />
      <rect fill="#0f766e" height="42" rx="14" width="420" x="540" y="64" />
      <text fill="#fff" fontSize="16" fontWeight="700" x="560" y="91">prediction_records</text>
      <text fill="#334155" fontSize="12" x="560" y="131">id · UUID primary key</text>
      <text fill="#334155" fontSize="12" x="560" y="155">user_id · foreign key → users.id</text>
      <text fill="#334155" fontSize="12" x="560" y="179">created_at · model name/status · threshold</text>
      <text fill="#334155" fontSize="12" x="560" y="203">churn_probability · risk band · class</text>
      <text fill="#334155" fontSize="12" x="560" y="227">input_features · JSON feature snapshot</text>
      <text fill="#334155" fontSize="12" x="560" y="251">explanation · JSON SHAP contributions</text>
      <path d="M400 170 H530" fill="none" markerEnd="url(#schema-arrow)" stroke="#0f766e" strokeWidth="2" />
      <text fill="#0f766e" fontSize="11" fontWeight="700" textAnchor="middle" x="465" y="158">1 user → many records</text>
      <text fill="#64748b" fontSize="11" x="40" y="344">Foreign keys link an audit record to its creator; an owner/time index makes staff history queries efficient.</text>
    </DiagramCanvas>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <header className="max-w-3xl">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">{title}</h2>
      <p className="mt-3 leading-7 text-slate-600">{text}</p>
    </header>
  );
}

function ProjectGuide() {
  const [activeSection, setActiveSection] = useState<GuideSection>('overview');

  return (
    <div className="space-y-8 pb-12">
      <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-7 text-white sm:p-10">
        <div className="flex items-center gap-2 text-sm font-semibold text-teal-200">
          <BookOpen className="h-4 w-4" />
          THE BEGINNER-FRIENDLY PROJECT GUIDE
        </div>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
          Understand ChurnXAI, one simple idea at a time.
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-teal-50">
          Imagine a phone company has thousands of customers. This project learns
          from old customer records to spot who might leave, then shows which
          details influenced its guess. It gives staff a clue—not a guaranteed
          answer or an automatic decision.
        </p>
      </header>

      <nav aria-label="Project guide sections" className="sticky top-[72px] z-30 -mx-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="flex min-w-max gap-1" role="tablist">
          {sections.map((section) => {
            const Icon = section.icon;
            const selected = activeSection === section.id;
            return (
              <button
                aria-controls={`guide-panel-${section.id}`}
                aria-selected={selected}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  selected ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
                id={`guide-tab-${section.id}`}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                role="tab"
                type="button"
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div
        aria-labelledby={`guide-tab-${activeSection}`}
        className="min-h-[420px]"
        id={`guide-panel-${activeSection}`}
        role="tabpanel"
        tabIndex={0}
      >
        {activeSection === 'overview' && (
          <section className="space-y-7">
            <SectionHeading
              eyebrow="Start here"
              title="What problem does the project solve?"
              text="A company usually learns that a customer has left only after it happens. ChurnXAI uses 7,043 historical telecom customer records to explore whether customer information can give an earlier warning, so a person can decide whether to offer help."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['1. Learn', 'Study past customers where the company already knows who left.'],
                ['2. Estimate', 'For a new customer, estimate the chance that they may leave.'],
                ['3. Explain', 'Show the details that pushed this model’s estimate up or down.'],
              ].map(([title, text]) => (
                <article className="rounded-2xl border border-slate-200 bg-white p-5" key={title}>
                  <h3 className="font-bold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl bg-teal-50 p-6">
                <h3 className="font-bold text-teal-950">What is actually in this repository?</h3>
                <p className="mt-2 text-sm leading-6 text-teal-900">
                  The raw data, cleaned data, analysis outputs, trained model, FastAPI
                  service, React website, evaluation results, and SHAP figures are present.
                  The metadata marks the saved model as <strong>real_trained</strong>.
                </p>
              </article>
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h3 className="font-bold text-amber-950">Important honest limitation</h3>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  PostgreSQL now stores individual account roles and prediction audit
                  records. MongoDB and Redis have been removed; MLflow tracking remains
                  a separate experiment store rather than a second application database.
                </p>
              </article>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900">A few verified project facts</h3>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ['7,043', 'customer records'],
                  ['21', 'original columns'],
                  ['12', 'model/strategy combinations compared'],
                  ['1,409', 'customers in the locked test set'],
                ].map(([value, label]) => (
                  <div className="rounded-xl bg-slate-50 p-4" key={label}>
                    <div className="text-2xl font-bold text-teal-800">{value}</div>
                    <div className="mt-1 text-xs text-slate-600">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-bold text-slate-900">What goes into the model?</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The original table has 21 columns: a customer ID, 19 customer
                  attributes, and the Churn answer. The ID is not a behavioral
                  predictor. The fitted model uses 3 numeric inputs—tenure,
                  MonthlyCharges, and TotalCharges—and 16 categorical inputs such
                  as Contract, InternetService, and PaymentMethod.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-bold text-slate-900">What is the final model’s test result?</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The saved test results give F1 = 0.631 (95% interval 0.589–0.667),
                  precision = 0.557, recall = 0.727, ROC-AUC = 0.847
                  (0.825–0.868), and PR-AUC = 0.665 (0.611–0.713). These are
                  estimates on this test split, not a guarantee for new customers.
                </p>
              </article>
            </div>
          </section>
        )}

        {activeSection === 'architecture' && (
          <section className="space-y-7">
            <SectionHeading
              eyebrow="Architecture"
              title="From files and model code to a running prediction service"
              text="This is the actual repository architecture: data-science scripts create artifacts offline; a separately running React website calls FastAPI, which loads and uses those artifacts."
            />
            <ArchitectureDiagram />
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Data science layer', 'notebooks/01_data_audit_eda.ipynb calls reusable audit/statistics code. notebooks/02_train_evaluate.ipynb and backend/model_comparison.py compare candidates and produce the artifacts.'],
                ['Application/API layer', 'app/main.py creates FastAPI and loads the predictor during startup. app/api/router.py joins health, predict, and explain routes under /api/v1.'],
                ['ML inference layer', 'app/ml/predictor.py holds the fitted pipeline and metadata. app/ml/explainer.py uses the loaded tree classifier and its preprocessor to produce SHAP results.'],
                ['Contract and validation layer', 'app/schemas/customer.py defines allowed customer inputs; response.py defines prediction and explanation output shapes. Invalid inputs are rejected before inference.'],
                ['Presentation layer', 'React pages render the dashboard, prediction form, pipeline view, and guide. services/api.ts uses Axios; Nginx serves the built site and forwards /api/ calls.'],
                ['Operations layer', 'docker-compose.yml coordinates containers and health dependencies. MLflow records training runs. Database/cache services are declared but not used for prediction persistence.'],
              ].map(([title, text]) => (
                <article className="rounded-2xl border border-slate-200 bg-white p-5" key={title}>
                  <h3 className="font-bold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900">API contract at a glance</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ['GET /api/v1/health', 'Reports whether the API is healthy and the model is loaded.'],
                  ['GET /api/v1/model-info', 'Returns non-sensitive saved model, split, threshold, and evaluation metadata.'],
                  ['POST /api/v1/predict · /explain', 'Accepts a validated customer profile; returns a prediction or a SHAP explanation.'],
                ].map(([route, details]) => (
                  <article className="rounded-xl bg-slate-50 p-4" key={route}>
                    <code className="break-words text-xs font-bold text-teal-800">{route}</code>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{details}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeSection === 'diagrams' && (
          <section className="space-y-7">
            <SectionHeading
              eyebrow="Diagrams"
              title="Three diagrams: training, a prediction request, and deployment"
              text="These diagrams show the actual stages and components, not just a high-level picture. Each label corresponds to code, files, or services in this repository."
            />
            <article className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">1. Data and model training</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">The dashed amber path marks the held-out test set: it is reserved until final evaluation. Cleaning, transformations, and optional SMOTE are learned only in training.</p>
              </div>
              <TrainingWorkflowDiagram />
            </article>
            <article className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">2. One prediction: sequence diagram</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Read from top to bottom. The browser calls prediction and explanation routes, then renders the returned data and explanation image.</p>
              </div>
              <PredictionSequenceDiagram />
            </article>
            <article className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">3. Docker deployment and network</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Host ports are different from internal service ports. Dashed database outlines highlight containers that are configured but not connected to prediction writes.</p>
              </div>
              <DeploymentDiagram />
            </article>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900">One prediction, step by step</h3>
              <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'A staff member enters customer details in the React form.',
                  'Pydantic checks that the fields and values have the expected shape.',
                  'FastAPI passes the customer to the already-loaded model pipeline.',
                  'The pipeline estimates a churn probability; the threshold turns it into Yes or No.',
                  'SHAP calculates which features moved this model prediction up or down.',
                  'The website displays the risk estimate and explanation for a human to review.',
                ].map((step, index) => (
                  <li className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700" key={step}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {activeSection === 'terms' && (
          <section className="space-y-7">
            <SectionHeading
              eyebrow="Technical words"
              title="A small dictionary in everyday language"
              text="You do not need to memorize every definition. Start with churn, feature, model, threshold, test set, and SHAP."
            />
            <div className="grid gap-3 md:grid-cols-2">
              {glossary.map(([term, definition]) => (
                <article className="rounded-xl border border-slate-200 bg-white p-4" key={term}>
                  <h3 className="font-bold text-slate-900">{term}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{definition}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeSection === 'implementation' && (
          <section className="space-y-7">
            <SectionHeading
              eyebrow="How it works"
              title="From raw records to a checked prediction"
              text="Each stage has a job. Keeping them in order helps make the final result repeatable and avoids giving the model unfair hints."
            />
            <ol className="space-y-3">
              {[
                ['Check and clean', 'The analysis validates the unusual blank TotalCharges records before replacing them with zero, then writes a cleaned dataset.'],
                ['Study patterns', 'The EDA reports a Wilson confidence interval for churn prevalence; uses chi-square/Cramér’s V for categories and point-biserial/Cohen’s d for numeric features; bootstraps effect-size intervals; and corrects p-values for multiple tests.'],
                ['Separate training and final test data', 'An 80/20 stratified split reserves 1,409 customers for final evaluation. The test portion is not used to select the model or threshold.'],
                ['Compare candidates fairly', 'Four model families are compared with three imbalance strategies (12 configurations) using repeated stratified CV. Nadeau–Bengio corrected tests compare strategies, and SMOTE stays inside the training pipeline.'],
                ['Choose a usable cut-off', 'The decision threshold is selected to maximize F1 on out-of-fold training predictions; the saved value is about 0.335.'],
                ['Evaluate once on held-out customers', 'The selected model is measured on the locked test set. PR-AUC, ROC-AUC, F1, precision, recall, and bootstrap 95% intervals are reported.'],
                ['Save and explain', 'The fitted XGBoost pipeline and metadata are saved for the API. TreeSHAP explains individual model predictions.'],
                ['Serve results', 'FastAPI validates requests and uses the saved artifacts; the React frontend gives people a way to submit data and read results.'],
              ].map(([title, detail], index) => (
                <li className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5" key={title}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 font-bold text-teal-800">{index + 1}</span>
                  <div>
                    <h3 className="font-bold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <h3 className="font-bold text-sky-950">What do the saved test results say?</h3>
              <p className="mt-2 text-sm leading-6 text-sky-900">
                On the locked test data: precision 0.557, recall 0.727, F1 0.631
                (95% bootstrap interval 0.589–0.667), ROC-AUC 0.847
                (0.825–0.868), and PR-AUC 0.665 (0.611–0.713). The intervals remind
                us that scores are estimates, not perfect guarantees. Accuracy alone
                is not enough because most customers in this dataset did not churn.
              </p>
              <p className="mt-2 text-xs text-sky-800">Source: reports/metrics/model_evaluation.json</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900">The test confusion matrix in plain language</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                At the selected threshold, the held-out test set had 819 correct
                “stay” predictions, 272 correctly detected churners, 216 false
                alarms, and 102 missed churners. A false alarm means the model
                predicted churn but the customer did not churn in the recorded label;
                a missed churner means it predicted stay but the customer churned.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                {[
                  ['819', 'true negatives'],
                  ['272', 'true positives'],
                  ['216', 'false positives'],
                  ['102', 'false negatives'],
                ].map(([value, label]) => (
                  <div className="rounded-xl bg-slate-50 p-3" key={label}>
                    <div className="text-xl font-bold text-slate-900">{value}</div>
                    <div className="text-xs text-slate-600">{label}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                The dataset’s majority class is “No churn”: 5,174 of 7,043 customers
                (about 73.5%). That is why accuracy alone can be misleading. The
                reported test accuracy is about 77.4%, but recall (0.727) and
                precision (0.557) help explain what happens specifically to churn cases.
              </p>
            </div>
            <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <p className="text-sm leading-6 text-amber-950">
                SHAP describes what influenced this model’s output. It does not prove
                that changing a feature will cause a customer to stay. A real retention
                action should be checked with domain knowledge and, where possible, an experiment.
              </p>
            </div>
          </section>
        )}

        {activeSection === 'files' && (
          <section className="space-y-7">
            <SectionHeading
              eyebrow="File guide"
              title="Where to look when someone asks “which file does that?”"
              text="Think of the repository as a workshop: data is the material, notebooks are the lab book, the saved model is the learned tool, and the API and website let people use it."
            />
            {fileGroups.map((group) => {
              const Icon = group.icon;
              return (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" key={group.title}>
                  <h3 className="flex items-center gap-2 bg-slate-50 px-5 py-4 font-bold text-slate-900">
                    <Icon aria-hidden="true" className="h-4 w-4 text-teal-700" />
                    {group.title}
                  </h3>
                  <ul className="divide-y divide-slate-100">
                    {group.files.map(([path, purpose]) => (
                      <li className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(250px,0.9fr)_1.1fr] sm:gap-5" key={path}>
                        <code className="break-all text-xs font-semibold text-teal-800">{path}</code>
                        <span className="text-sm leading-6 text-slate-600">{purpose}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </section>
        )}

        {activeSection === 'accounts' && (
          <section className="space-y-7">
            <SectionHeading
              eyebrow="Accounts and PostgreSQL"
              title="One database for logins, permissions, and prediction history"
              text="PostgreSQL is the application's system of record. A login identifies a person, the role controls what that person can do, and a prediction is saved as one auditable event."
            />
            <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <KeyRound aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
              <p className="text-sm leading-6 text-sky-950">
                MongoDB and Redis are removed. This project has structured account
                records and audit rows, so a single relational database is easier to
                learn, back up, secure, and explain. MLflow still stores experiment
                tracking separately in its own <code>mlruns/</code> file store.
              </p>
            </div>
            <DatabaseSchemaDiagram />
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <h3 className="bg-slate-50 px-5 py-4 font-bold text-slate-900">What each role is allowed to do</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-5 py-3">Role</th><th className="px-5 py-3">Project guide</th><th className="px-5 py-3">Predictions</th><th className="px-5 py-3">History</th><th className="px-5 py-3">Create accounts</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr><td className="px-5 py-4 font-bold">Staff</td><td className="px-5 py-4">Blocked</td><td className="px-5 py-4">Can run</td><td className="px-5 py-4">Own records only</td><td className="px-5 py-4">Manager only</td></tr>
                    <tr><td className="px-5 py-4 font-bold">Manager</td><td className="px-5 py-4">Can read</td><td className="px-5 py-4">Can run</td><td className="px-5 py-4">All account history</td><td className="px-5 py-4">Can create every role</td></tr>
                    <tr><td className="px-5 py-4 font-bold">Professor</td><td className="px-5 py-4">Can read</td><td className="px-5 py-4">Can run</td><td className="px-5 py-4">All account history</td><td className="px-5 py-4">Blocked</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="border-t border-slate-100 px-5 py-4 text-xs leading-5 text-slate-500">
                Permissions are checked in both the website routes and the API. Hiding a
                button alone is not security: someone could otherwise call an API directly.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-bold text-slate-900">What happens during login?</h3>
                <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>1. The API looks up the lowercase username in PostgreSQL.</li>
                  <li>2. Argon2id verifies the entered password against a one-way password hash; the original password is never stored.</li>
                  <li>3. The API issues a signed, eight-hour session in an HttpOnly, SameSite=Strict cookie.</li>
                  <li>4. Every protected API request validates the session and loads the user's current role from PostgreSQL.</li>
                  <li>5. Five failed attempts temporarily lock the account; errors do not reveal whether a username exists.</li>
                </ol>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-bold text-slate-900">What happens when a prediction is requested?</h3>
                <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>1. FastAPI confirms the account is signed in as staff, manager, or professor and validates the customer form.</li>
                  <li>2. The loaded model produces a probability; TreeSHAP produces the matching explanation.</li>
                  <li>3. In one database transaction, SQLAlchemy writes the owner, time, model, score, threshold, feature snapshot, and SHAP JSON.</li>
                  <li>4. The UI gets the result only after the audit row commits successfully.</li>
                  <li>5. Staff history filters to its owner; managers and professors can review all accounts’ history. Only managers can create accounts.</li>
                </ol>
              </article>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900">Set it up locally with Docker Compose</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Make a private root <code>.env</code> file from the example, replace the
                database password and JWT signing key with random values, and never
                commit that file. The Compose startup applies the versioned Alembic
                migration before the API workers begin.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-teal-100"><code>{`Copy-Item .env.example .env
# Edit .env and replace both placeholder secrets.
docker compose up --build -d

# Bootstrap the first manager; this command securely prompts for a password.
docker compose exec backend python -m app.cli create-user --username manager1 --role manager
# Sign in as manager1, then use Manage Users to create the other accounts.`}</code></pre>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Open the site and sign in as the bootstrap manager. The manager can
                create the other roles from Manage Users; there is no public sign-up
                page, so visitors cannot grant themselves manager permissions.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-bold text-amber-950">Data privacy and operational limits</h3>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                The audit table stores the submitted service/billing feature snapshot
                and explanation, but the current form does not ask for name, email,
                or customer ID. Treat the snapshots as sensitive business data,
                restrict database access, set an explicit retention/deletion policy,
                rotate backups, and use HTTPS with Secure cookies before real deployment.
                History currently has no automatic expiry job.
              </p>
            </div>
          </section>
        )}

        {activeSection === 'viva' && (
          <section className="space-y-7">
            <SectionHeading
              eyebrow="Viva"
              title="50 viva questions and answers"
              text="Use these as revision notes, not a script to memorize. The answers are based on this repository; be clear about limitations as well as completed features."
            />
            <article className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-teal-700">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                Short project introduction
              </div>
              <blockquote className="mt-5 space-y-4 text-base leading-8 text-slate-700">
                <p>
                  “My project is called ChurnXAI. Customer churn means a customer
                  stops using a company’s service. I built a system that uses past
                  telecom customer data to estimate whether a customer may leave.”
                </p>
                <p>
                  “I first checked and cleaned the data, then compared machine-learning
                  models using training-only cross-validation. I kept a separate test
                  group for the final check. The selected model is saved as a pipeline
                  and loaded by a FastAPI backend.”
                </p>
                <p>
                  “A React website sends customer information to the API and displays
                  a probability and a SHAP explanation. SHAP helps us see which input
                  details influenced the model, but it does not prove why a customer
                  will leave. A person should review the result.”
                </p>
                <p>
                  “The project records training experiments in MLflow and uses Docker
                  Compose to run the services. PostgreSQL stores individual accounts
                  and successful prediction/explanation records. Staff can make
                  predictions and see only their own history. Managers can create
                  accounts and see all history. Professors can use the project but
                  cannot create users. MongoDB and Redis are not needed here.”
                </p>
              </blockquote>
            </article>
            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">Viva question bank</h3>
                <span className="rounded-full bg-teal-100 px-3 py-1 text-sm font-bold text-teal-800">{vivaQuestions.length} questions</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {vivaQuestions.map(([question, answer], index) => (
                  <details className="group rounded-xl border border-slate-200 bg-white p-4 open:border-teal-300 open:bg-teal-50/40" key={question}>
                    <summary className="cursor-pointer list-none font-bold text-slate-900 marker:hidden">
                      <span className="mr-2 text-teal-700">{String(index + 1).padStart(2, '0')}.</span>
                      {question}
                      <span aria-hidden="true" className="float-right ml-2 text-teal-700 group-open:hidden">+</span>
                      <span aria-hidden="true" className="float-right ml-2 hidden text-teal-700 group-open:inline">−</span>
                    </summary>
                    <p className="mt-3 border-t border-slate-200 pt-3 text-sm leading-6 text-slate-700">{answer}</p>
                  </details>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900 p-5 text-sm leading-6 text-slate-200">
              <strong className="text-white">Good viva habit:</strong> If you are unsure,
              describe what you can verify in the code and artifacts. For example:
              “The containers are configured, but database logging is not implemented yet.”
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ProjectGuide;
