import { useEffect, useState } from 'react';
import { getModelInfo } from '../services/api';
import type { ModelInfo } from '../types';
import {
  Activity,
  BarChart3,
  Brain,
  Check,
  CircleAlert,
  Database,
  GitBranch,
  Layers3,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

const stages = [
  {
    title: 'Source data',
    label: 'CSV present',
    state: 'available',
    icon: Database,
    summary: 'The Telco Customer Churn CSV is in the repository.',
    detail:
      'The raw file contains customer profile, service, billing, and Churn columns. The API does not read this CSV on each request; it is a source for analysis and model training.',
    artifact: 'data/WA_Fn-UseC_-Telco-Customer-Churn.csv',
  },
  {
    title: 'Cleaning',
    label: 'Completed',
    state: 'available',
    icon: Sparkles,
    summary: 'The shared cleaner validates and fixes the source charge values.',
    detail:
      'It verifies the 11 whitespace-only TotalCharges records all have tenure 0 before converting those charges to 0.0. It also converts SeniorCitizen to Yes/No and Churn to 1/0.',
    artifact: 'data/processed/telco_clean.csv',
  },
  {
    title: 'Explore and visualize',
    label: 'Notebook executed',
    state: 'available',
    icon: BarChart3,
    summary: 'The EDA notebook creates and saves four exploratory figures.',
    detail:
      'It compares label counts, churn rate by contract, tenure by outcome, and monthly charges by outcome. The plots are snapshots of the source data, not causal conclusions.',
    artifact: 'notebooks/01_data_audit_eda.ipynb · reports/figures/',
  },
  {
    title: 'Train and evaluate',
    label: 'Loading model report',
    state: 'placeholder',
    icon: Layers3,
    summary: 'Training and evaluation results are loaded from the saved model metadata.',
    detail:
      'The notebook selects XGBoost settings by 5-fold stratified cross-validation, selects a decision threshold on validation data, and evaluates once on a held-out test split.',
    artifact: 'notebooks/02_train_evaluate.ipynb · reports/metrics/model_evaluation.json',
  },
  {
    title: 'Calculate probability',
    label: 'Validation threshold',
    state: 'active',
    icon: SlidersHorizontal,
    summary: 'The pipeline returns P(Churn = Yes); the saved validation threshold sets the class decision.',
    detail:
      'The API calls predict_proba(customer)[0, 1]. It predicts Churn when that probability is at least the configured threshold. Risk labels use separate bands: Low <25%, Medium 25–<50%, High 50–<75%, Critical ≥75%.',
    artifact: 'backend/models/model_metadata.json → decision_threshold',
  },
  {
    title: 'Explain with SHAP',
    label: 'API active',
    state: 'active',
    icon: Brain,
    summary: 'TreeExplainer returns local feature contributions and a waterfall image.',
    detail:
      'Customer values are transformed by the saved preprocessor before the classifier is explained. SHAP contributions describe how this model moves its output from a baseline; they are not proof of cause and effect.',
    artifact: 'POST /api/v1/explain',
  },
  {
    title: 'Serve the result',
    label: 'Docker active',
    state: 'active',
    icon: GitBranch,
    summary: 'FastAPI serves predictions; the React page submits customer details and displays results.',
    detail:
      'At startup, the backend loads the joblib pipeline and metadata. The frontend calls /predict and /explain through the API, then shows probability, risk, top drivers, and the SHAP waterfall.',
    artifact: 'frontend → FastAPI → saved pipeline',
  },
] as const;

const statusClasses = {
  available: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  missing: 'bg-rose-50 text-rose-800 border-rose-200',
  partial: 'bg-amber-50 text-amber-800 border-amber-200',
  placeholder: 'bg-orange-50 text-orange-800 border-orange-200',
  active: 'bg-sky-50 text-sky-800 border-sky-200',
};

export default function Pipeline() {
  const [selectedStage, setSelectedStage] = useState(0);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [modelInfoError, setModelInfoError] = useState(false);

  useEffect(() => {
    let active = true;
    getModelInfo()
      .then((info) => {
        if (active) setModelInfo(info);
      })
      .catch(() => {
        if (active) setModelInfoError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const stage = stages[selectedStage];
  const StageIcon = stage.icon;
  const isRealModel = modelInfo?.model_status === 'real_trained';
  const stageLabel = selectedStage === 3 && modelInfo
    ? isRealModel ? 'Real model trained' : 'Test placeholder'
    : selectedStage === 4 && modelInfo
      ? `Threshold ${modelInfo.decision_threshold.toFixed(3)}`
      : stage.label;
  const stageState: keyof typeof statusClasses = selectedStage === 3 && modelInfo
    ? isRealModel ? 'active' : 'placeholder'
    : stage.state;
  const stageSummary = selectedStage === 3 && modelInfo
    ? modelInfo.model
    : selectedStage === 4 && modelInfo
      ? `Validation selected a decision threshold of ${modelInfo.decision_threshold.toFixed(3)}.`
      : stage.summary;
  const stageDetail = selectedStage === 3 && modelInfo
    ? `The best 5-fold CV average precision was ${modelInfo.selection.best_cv_average_precision?.toFixed(3) ?? 'not reported'}. ${modelInfo.split_rows.test ?? 'Unknown'} customers were reserved for final held-out testing.`
    : selectedStage === 4 && modelInfo
      ? `${modelInfo.threshold_selection.method ?? 'Threshold selection method not reported.'} Validation F1: ${modelInfo.threshold_selection.validation_f1?.toFixed(3) ?? 'not reported'}. Test metrics use this fixed threshold.`
      : stage.detail;

  return (
    <div className="space-y-10 pb-10">
      <header className="border-b border-slate-200 pb-7">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal-700">
          <Activity className="h-4 w-4" />
          PROJECT TRACE
        </div>
        <h1 className="max-w-3xl text-3xl font-bold text-slate-950 sm:text-4xl">
          From customer data to a churn decision
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          See where the CSV is, what the API actually uses, and which analysis
          steps still need to be run.
        </p>
      </header>

      <section aria-label="Dataset snapshot" className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-5 flex items-center gap-2">
            <Database className="h-5 w-5 text-teal-700" />
            <h2 className="text-lg font-bold text-slate-900">Raw dataset snapshot</h2>
          </div>
          <p className="break-all font-mono text-xs text-slate-500">
            data/WA_Fn-UseC_-Telco-Customer-Churn.csv
          </p>
          <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-4">
            <div className="pr-3">
              <div className="text-2xl font-bold text-slate-900">7,043</div>
              <div className="text-xs text-slate-500">customers</div>
            </div>
            <div className="px-3">
              <div className="text-2xl font-bold text-slate-900">21</div>
              <div className="text-xs text-slate-500">columns</div>
            </div>
            <div className="pl-3">
              <div className="text-2xl font-bold text-rose-700">11</div>
              <div className="text-xs text-slate-500">blank charge strings</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            These figures were read from the CSV. The blank values are whitespace,
            not parsed nulls, so they need explicit handling before numeric training.
          </p>
        </div>

        <div className="border-l-2 border-teal-600 pl-5 lg:pl-7">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">Churn label split</h3>
            <span className="text-xs text-slate-500">from raw CSV</span>
          </div>
          <div
            role="img"
            aria-label="Churn label split: 5,174 customers did not churn and 1,869 customers churned"
            className="mt-4 flex h-4 overflow-hidden rounded-sm bg-slate-200"
          >
            <div className="h-full bg-teal-600" style={{ width: '73.46%' }} />
            <div className="h-full bg-rose-500" style={{ width: '26.54%' }} />
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="h-2.5 w-2.5 bg-teal-600" />
              No churn <strong>5,174 (73.5%)</strong>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="h-2.5 w-2.5 bg-rose-500" />
              Churn <strong>1,869 (26.5%)</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 py-7">
        <div className="mb-5 flex items-start gap-3">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="font-bold text-slate-900">What is currently running</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
              {modelInfo
                ? isRealModel
                  ? `The API is using ${modelInfo.model}, trained on the downloaded CSV. Its held-out metrics below come from an untouched test split; probabilities are not separately calibrated.`
                  : `The API is using ${modelInfo.model}, which is a test placeholder. Run the training notebook to replace it with a model fitted to the CSV.`
                : modelInfoError
                  ? 'Could not load model-run metadata. The dataset audit and notebook workflow remain available below.'
                  : 'Loading the active model and evaluation summary…'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-700" /> CSV found</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-700" /> EDA and training notebooks available</span>
          <span className="inline-flex items-center gap-1.5">
            {isRealModel ? <Check className="h-4 w-4 text-emerald-700" /> : <CircleAlert className="h-4 w-4 text-orange-700" />}
            {modelInfo ? (isRealModel ? 'Real model active' : 'Test model active') : 'Model status loading'}
          </span>
        </div>
      </section>

      {modelInfo?.test_metrics && (
        <section aria-label="Held-out model evaluation" className="border-b border-slate-200 pb-7">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Held-out test performance</h2>
            <span className="text-xs text-slate-500">
              {modelInfo.split_rows.test?.toLocaleString()} customers · {modelInfo.n_bootstrap?.toLocaleString()} bootstrap resamples
            </span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-200 border-y border-slate-200 py-4 sm:grid-cols-4">
            {[
              ['PR-AUC', modelInfo.test_metrics.average_precision],
              ['ROC-AUC', modelInfo.test_metrics.roc_auc],
              ['F1', modelInfo.test_metrics.f1],
              ['Threshold', modelInfo.decision_threshold],
            ].map(([label, value]) => (
              <div key={label} className="px-3 first:pl-0">
                <div className="text-2xl font-bold text-slate-900">
                  {typeof value === 'number' ? value.toFixed(3) : '—'}
                </div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            95% bootstrap CIs: PR-AUC {modelInfo.test_metrics_95ci?.pr_auc?.ci_low.toFixed(3)}–{modelInfo.test_metrics_95ci?.pr_auc?.ci_high.toFixed(3)};
            {' '}ROC-AUC {modelInfo.test_metrics_95ci?.roc_auc?.ci_low.toFixed(3)}–{modelInfo.test_metrics_95ci?.roc_auc?.ci_high.toFixed(3)}.
          </p>
        </section>
      )}

      <section>
        <div className="mb-5">
          <p className="text-xs font-bold text-teal-700">THE WORKFLOW</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">Seven stages, with current status</h2>
        </div>
        <div className="grid gap-7 lg:grid-cols-[minmax(230px,0.8fr)_minmax(0,1.7fr)]">
          <nav aria-label="Pipeline stages" className="space-y-1">
            {stages.map((item, index) => {
              const Icon = item.icon;
              const isSelected = selectedStage === index;
              const navigationLabel = index === 3 && modelInfo
                ? isRealModel ? 'Real model trained' : 'Test placeholder'
                : index === 4 && modelInfo
                  ? `Threshold ${modelInfo.decision_threshold.toFixed(3)}`
                  : item.label;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setSelectedStage(index)}
                  aria-current={isSelected ? 'step' : undefined}
                  className={`flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-teal-700 bg-teal-50 text-teal-950'
                      : 'border-transparent text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{index + 1}. {item.title}</span>
                    <span className="block truncate text-xs text-slate-500">{navigationLabel}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <article aria-live="polite" className="min-w-0 border-t-2 border-teal-700 bg-white py-5 sm:px-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <StageIcon className="h-6 w-6 text-teal-700" />
                <p className="text-xs font-bold uppercase text-slate-500">Stage {selectedStage + 1}</p>
              </div>
              <span className={`border px-2.5 py-1 text-xs font-semibold ${statusClasses[stageState]}`}>
                {stageLabel}
              </span>
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-950">{stage.title}</h3>
            <p className="mt-2 text-base font-medium text-slate-700">{stageSummary}</p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{stageDetail}</p>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-xs font-bold uppercase text-slate-500">Artifact / implementation</p>
              <p className="mt-1 break-words font-mono text-xs text-slate-700">{stage.artifact}</p>
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-8 border-t border-slate-200 pt-8 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-teal-700" />
            <h2 className="text-xl font-bold text-slate-950">How the probability becomes a decision</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The model estimates <span className="font-mono text-slate-800">P(Churn = Yes | customer features)</span>.
            The saved threshold is a decision rule, not how the probability itself is learned.
          </p>
          <div className="mt-5 flex items-center gap-3 border-l-2 border-slate-300 py-2 pl-4">
            <span className="font-mono text-sm text-slate-800">p ≥ {modelInfo?.decision_threshold.toFixed(3) ?? '…'}</span>
            <span className="text-sm text-slate-600">→ predict churn (class 1)</span>
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-700" />
            <h3 className="font-bold text-slate-900">Risk display bands</h3>
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:grid-cols-4">
            <div className="border-t-2 border-emerald-600 pt-2"><dt className="font-semibold">Low</dt><dd className="text-slate-500">&lt; 25%</dd></div>
            <div className="border-t-2 border-amber-500 pt-2"><dt className="font-semibold">Medium</dt><dd className="text-slate-500">25–&lt;50%</dd></div>
            <div className="border-t-2 border-orange-500 pt-2"><dt className="font-semibold">High</dt><dd className="text-slate-500">50–&lt;75%</dd></div>
            <div className="border-t-2 border-rose-600 pt-2"><dt className="font-semibold">Critical</dt><dd className="text-slate-500">≥ 75%</dd></div>
          </dl>
        </div>
      </section>
    </div>
  );
}