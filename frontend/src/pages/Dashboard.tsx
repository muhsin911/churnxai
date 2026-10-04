import { Brain, Target, TrendingUp, Shield, Database, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const features = [
    {
      icon: Brain,
      title: 'Explainable AI',
      description: 'SHAP-based explanations for every prediction, showing exactly why a customer is at risk.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Target,
      title: 'Statistical Rigor',
      description: 'Chi-square tests, bootstrap CIs, Nadeau-Bengio corrected t-tests. Every claim has a number.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Predictions',
      description: 'FastAPI backend serves predictions in milliseconds with full SHAP waterfall visualizations.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Shield,
      title: 'MLOps Framework',
      description: 'MLflow tracks every experiment. Reproducible, versioned, and auditable.',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Database,
      title: 'Data-Centric QA',
      description: 'Statistical hypothesis testing grounds feature selection in evidence, not assumptions.',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      icon: Sparkles,
      title: 'Business Intelligence',
      description: 'Actionable counterfactual suggestions: "Reduce monthly charges by $20 to lower churn risk by 15%."',
      color: 'from-pink-500 to-rose-500',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-slate-900 rounded-2xl p-12 mb-8 text-white shadow-xl">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">
            Explainable Predictive Analytics for Customer Retention
          </h1>
          <p className="text-lg text-primary-100 mb-6">
            A production-grade MLOps framework integrating SHAP-driven feature attribution,
            automated experiment tracking, and real-time observability.
          </p>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="text-2xl font-bold">XGBoost</div>
              <div className="text-xs text-primary-200">Champion Model</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="text-2xl font-bold">SHAP</div>
              <div className="text-xs text-primary-200">Explainability</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="text-2xl font-bold">MLflow</div>
              <div className="text-xs text-primary-200">Experiment Tracking</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}