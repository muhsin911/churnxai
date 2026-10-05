import { useState } from 'react';
import axios from 'axios';
import { predictAndExplain } from '../services/api';
import type { CustomerInput, PredictionResponse, SHAPExplanation } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { AlertCircle, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';

type ApiErrorResponse = {
  detail?: string | { message?: string };
};

const DEFAULT_CUSTOMER: CustomerInput = {
  gender: 'Female',
  SeniorCitizen: 'No',
  Partner: 'Yes',
  Dependents: 'No',
  tenure: 2,
  PhoneService: 'Yes',
  MultipleLines: 'No',
  InternetService: 'DSL',
  OnlineSecurity: 'No',
  OnlineBackup: 'Yes',
  DeviceProtection: 'No',
  TechSupport: 'No',
  StreamingTV: 'No',
  StreamingMovies: 'No',
  Contract: 'Month-to-month',
  PaperlessBilling: 'Yes',
  PaymentMethod: 'Electronic check',
  MonthlyCharges: 85.7,
  TotalCharges: 171.4,
};

export default function Predict() {
  const [customer, setCustomer] = useState<CustomerInput>(DEFAULT_CUSTOMER);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [explanation, setExplanation] = useState<SHAPExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrediction(null);
    setExplanation(null);

    try {
      const result = await predictAndExplain(customer);
      setPrediction(result.prediction);
      setExplanation(result.explanation);
    } catch (err: unknown) {
      const detail = axios.isAxiosError<ApiErrorResponse>(err)
        ? err.response?.data?.detail
        : undefined;
      setError(
        typeof detail === 'string'
          ? detail
          : detail?.message ?? 'Prediction failed. Is the backend running?'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CustomerInput, value: string | number) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const riskColor = {
    Low: 'bg-green-100 text-green-800 border-green-300',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    High: 'bg-orange-100 text-orange-800 border-orange-300',
    Critical: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Predict & Explain Customer Churn</h1>
        <p className="text-slate-600">
          Enter customer details below. The system will predict churn probability and provide a SHAP-based explanation.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Customer Details</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select
                  value={customer.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senior Citizen</label>
                <select
                  value={customer.SeniorCitizen}
                  onChange={(e) => handleChange('SeniorCitizen', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Partner</label>
                <select
                  value={customer.Partner}
                  onChange={(e) => handleChange('Partner', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dependents</label>
                <select
                  value={customer.Dependents}
                  onChange={(e) => handleChange('Dependents', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tenure (months)</label>
                <input
                  type="number"
                  value={customer.tenure}
                  onChange={(e) => handleChange('tenure', parseInt(e.target.value))}
                  min={0}
                  max={72}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contract</label>
                <select
                  value={customer.Contract}
                  onChange={(e) => handleChange('Contract', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option>Month-to-month</option>
                  <option>One year</option>
                  <option>Two year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Charges ($)</label>
                <input
                  type="number"
                  value={customer.MonthlyCharges}
                  onChange={(e) => handleChange('MonthlyCharges', parseFloat(e.target.value))}
                  step={0.1}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Charges ($)</label>
                <input
                  type="number"
                  value={customer.TotalCharges}
                  onChange={(e) => handleChange('TotalCharges', parseFloat(e.target.value))}
                  step={0.1}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Predicting...' : 'Predict & Explain'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {loading && <LoadingSpinner message="Computing SHAP explanations..." />}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {prediction && (
            <div className="bg-white rounded-xl p-6 shadow-sm animate-slide-up">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Prediction Result</h2>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-slate-600">Churn Probability</div>
                  <div className="text-4xl font-bold text-slate-900">
                    {(prediction.churn_probability * 100).toFixed(1)}%
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg border-2 font-bold ${riskColor[prediction.churn_risk as keyof typeof riskColor]}`}>
                  {prediction.churn_risk} Risk
                </div>
              </div>
              <div className="text-sm text-slate-600">
                Predicted class: <span className="font-semibold">{prediction.predicted_class === 1 ? 'Churn' : 'Stay'}</span>
                {' '}| Threshold: {prediction.threshold_used.toFixed(3)}
              </div>
            </div>
          )}

          {explanation && (
            <div className="bg-white rounded-xl p-6 shadow-sm animate-slide-up">
              <h2 className="text-xl font-bold text-slate-900 mb-4">SHAP Explanation</h2>

              {/* Waterfall Plot */}
              <div className="mb-6 flex justify-center">
                <img
                  src={`data:image/png;base64,${explanation.waterfall_image_base64}`}
                  alt="SHAP Waterfall Plot"
                  className="max-h-[60vh] w-full rounded-lg border border-slate-200 object-contain"
                />
              </div>

              {/* Top Drivers */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-600" />
                    Increases Churn Risk
                  </h3>
                  <div className="space-y-2">
                    {explanation.top_positive_drivers.slice(0, 3).map((d, i) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-2">
                        <div className="text-sm font-semibold text-red-900">{d.feature}</div>
                        <div className="text-xs text-red-700">SHAP: {d.shap_value.toFixed(3)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-green-600" />
                    Decreases Churn Risk
                  </h3>
                  <div className="space-y-2">
                    {explanation.top_negative_drivers.slice(0, 3).map((d, i) => (
                      <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <div className="text-sm font-semibold text-green-900">{d.feature}</div>
                        <div className="text-xs text-green-700">SHAP: {d.shap_value.toFixed(3)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interpretation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 whitespace-pre-line">
                    {explanation.interpretation}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}