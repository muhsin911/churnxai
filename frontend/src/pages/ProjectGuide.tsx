import { useState } from 'react';
import {
  BookOpen,
  Boxes,
  Braces,
  CheckCircle2,
  CircleHelp,
  FileText,
  GitBranch,
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
  { id: 'viva', label: 'Viva prep', icon: CircleHelp },
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
      ['backend/app/ml/predictor.py', 'Loads the model and produces churn probabilities and risk labels.'],
      ['backend/app/ml/explainer.py', 'Builds local SHAP explanations for predictions.'],
      ['backend/app/schemas/', 'Pydantic request and response shapes used to validate API data.'],
    ],
  },
  {
    title: 'Website and operations',
    icon: GitBranch,
    files: [
      ['frontend/src/pages/', 'Dashboard, prediction, pipeline, and this learning guide.'],
      ['frontend/src/services/api.ts', 'Connects the website to the FastAPI service.'],
      ['frontend/src/components/Navbar.tsx', 'Shared navigation across the website.'],
      ['reports/metrics/model_evaluation.json', 'Saved test metrics and their bootstrap confidence intervals.'],
      ['reports/metrics/model_comparison.csv', 'Cross-validation results for the compared model configurations.'],
      ['reports/figures/', 'EDA charts, confusion matrix, and global/local SHAP visualizations.'],
      ['docker-compose.yml', 'Describes the backend, frontend, MLflow, and supporting database/cache containers.'],
      ['backend/tests/', 'Automated checks for the statistical code, model, API, and data schemas.'],
    ],
  },
];

function ArchitectureDiagram() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <svg
        aria-label="Architecture diagram: CSV and notebooks create a saved model; the React website sends customer data to the FastAPI backend, which returns a prediction and SHAP explanation."
        className="mx-auto h-auto min-w-[760px] max-w-full"
        role="img"
        viewBox="0 0 1000 490"
      >
        <defs>
          <marker id="guide-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 z" fill="#64748b" />
          </marker>
        </defs>
        <text fill="#0f172a" fontSize="19" fontWeight="700" x="40" y="38">A. Build the model (offline)</text>
        <rect fill="#f0fdfa" height="94" rx="14" stroke="#99f6e4" width="210" x="40" y="58" />
        <text fill="#115e59" fontSize="16" fontWeight="700" x="62" y="91">Telco CSV</text>
        <text fill="#475569" fontSize="13" x="62" y="116">7,043 customer rows</text>
        <rect fill="#f0fdfa" height="94" rx="14" stroke="#99f6e4" width="230" x="340" y="58" />
        <text fill="#115e59" fontSize="16" fontWeight="700" x="365" y="91">Analysis + training</text>
        <text fill="#475569" fontSize="13" x="365" y="116">clean · compare · explain</text>
        <rect fill="#f0fdfa" height="94" rx="14" stroke="#99f6e4" width="260" x="660" y="58" />
        <text fill="#115e59" fontSize="16" fontWeight="700" x="685" y="91">Saved model + metadata</text>
        <text fill="#475569" fontSize="13" x="685" y="116">pipeline.joblib · metadata.json</text>
        <path d="M250 105 H330" fill="none" markerEnd="url(#guide-arrow)" stroke="#64748b" strokeWidth="2" />
        <path d="M570 105 H650" fill="none" markerEnd="url(#guide-arrow)" stroke="#64748b" strokeWidth="2" />
        <text fill="#0f172a" fontSize="19" fontWeight="700" x="40" y="205">B. Make and explain a prediction (when used)</text>
        <rect fill="#eff6ff" height="104" rx="14" stroke="#bfdbfe" width="210" x="40" y="226" />
        <text fill="#1e40af" fontSize="16" fontWeight="700" x="64" y="260">React website</text>
        <text fill="#475569" fontSize="13" x="64" y="284">customer form + results</text>
        <rect fill="#eff6ff" height="104" rx="14" stroke="#bfdbfe" width="220" x="340" y="226" />
        <text fill="#1e40af" fontSize="16" fontWeight="700" x="364" y="260">FastAPI</text>
        <text fill="#475569" fontSize="13" x="364" y="284">checks request fields</text>
        <rect fill="#eff6ff" height="104" rx="14" stroke="#bfdbfe" width="220" x="650" y="226" />
        <text fill="#1e40af" fontSize="16" fontWeight="700" x="673" y="260">Model + SHAP</text>
        <text fill="#475569" fontSize="13" x="673" y="284">probability + reasons</text>
        <path d="M250 278 H330" fill="none" markerEnd="url(#guide-arrow)" stroke="#64748b" strokeWidth="2" />
        <path d="M560 278 H640" fill="none" markerEnd="url(#guide-arrow)" stroke="#64748b" strokeWidth="2" />
        <path d="M650 318 H580" fill="none" markerEnd="url(#guide-arrow)" stroke="#64748b" strokeWidth="2" />
        <path d="M340 318 H260" fill="none" markerEnd="url(#guide-arrow)" stroke="#64748b" strokeWidth="2" />
        <text fill="#64748b" fontSize="12" x="269" y="264">customer details</text>
        <text fill="#64748b" fontSize="12" x="561" y="306">request</text>
        <text fill="#64748b" fontSize="12" x="561" y="343">result</text>
        <text fill="#64748b" fontSize="12" x="262" y="343">result shown</text>
        <rect fill="#fff7ed" height="74" rx="12" stroke="#fed7aa" width="920" x="40" y="380" />
        <text fill="#9a3412" fontSize="14" fontWeight="700" x="62" y="410">Experiment records:</text>
        <text fill="#7c2d12" fontSize="13" x="210" y="410">MLflow runs are stored in mlruns/ and viewed with the MLflow UI.</text>
        <text fill="#7c2d12" fontSize="12" x="62" y="435">PostgreSQL, MongoDB, and Redis containers are configured in Docker Compose; application-level persistence is not wired yet.</text>
      </svg>
      <p className="mt-3 text-center text-xs text-slate-500">Scroll sideways on a small screen to see the full diagram.</p>
    </div>
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
              text="A company usually learns that a customer has left only after it happens. ChurnXAI explores whether customer information can give an earlier warning, so a person can decide whether to offer help."
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
                  Docker Compose includes PostgreSQL, MongoDB, and Redis, but the app’s
                  prediction code does not currently save requests or explanations to
                  those databases. Container setup is not the same thing as database
                  integration.
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
          </section>
        )}

        {activeSection === 'architecture' && (
          <section className="space-y-7">
            <SectionHeading
              eyebrow="Architecture"
              title="Two connected halves: learning and serving"
              text="The training half makes a reusable model from historical data. The serving half loads that saved model and answers requests from the website."
            />
            <ArchitectureDiagram />
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-slate-900">Training is like studying</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Notebooks and Python scripts clean data, compare candidate models,
                  evaluate the selected model, and save the fitted pipeline. Training
                  is not repeated for each website prediction.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-slate-900">Serving is like answering</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  React sends a customer form to FastAPI. The API validates the form,
                  asks the saved pipeline for a probability, and can ask SHAP to explain
                  that one result.
                </p>
              </article>
            </div>
          </section>
        )}

        {activeSection === 'diagrams' && (
          <section className="space-y-7">
            <SectionHeading
              eyebrow="Diagrams"
              title="Follow the customer information"
              text="Arrows show the direction of the work. The prediction response travels back to the website."
            />
            <ArchitectureDiagram />
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

        {activeSection === 'viva' && (
          <section className="space-y-7">
            <SectionHeading
              eyebrow="Viva preparation"
              title="A simple way to explain your project"
              text="Use your own words and be honest about what is implemented. This short answer gives you a safe starting point."
            />
            <article className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-teal-700">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                A short presentation answer
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
                  “The project also records model experiment results with MLflow and
                  uses Docker Compose to run the services. Database containers are
                  configured, but saving prediction requests into those databases is
                  future work.”
                </p>
              </blockquote>
            </article>
            <div>
              <h3 className="mb-3 text-lg font-bold text-slate-900">Questions you may be asked</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ['Why predict churn?', 'To give a company an earlier signal so staff can consider helpful retention actions. The model does not make the decision for them.'],
                  ['Why not report accuracy only?', 'The “No churn” group is larger. A model can look accurate while missing many churners, so precision, recall, F1, ROC-AUC, and PR-AUC give a fuller picture.'],
                  ['Why keep a separate test set?', 'It gives one final check on examples that were not used to choose the model or decision threshold.'],
                  ['Why use SHAP?', 'It gives a consistent contribution for each feature in a prediction and supports global or individual explanations. It explains the model, not causation.'],
                  ['What does the threshold do?', 'It changes the probability into a Yes/No class. A lower threshold can catch more churners but may create more false alarms.'],
                  ['Are the databases connected?', 'The containers are declared in Docker Compose, but the application does not currently write prediction or explanation records to them.'],
                ].map(([question, answer]) => (
                  <article className="rounded-xl border border-slate-200 bg-white p-4" key={question}>
                    <h4 className="font-bold text-slate-900">{question}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
                  </article>
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
