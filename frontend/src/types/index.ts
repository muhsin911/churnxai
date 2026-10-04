export interface CustomerInput {
  gender: 'Male' | 'Female';
  SeniorCitizen: 'Yes' | 'No';
  Partner: 'Yes' | 'No';
  Dependents: 'Yes' | 'No';
  tenure: number;
  PhoneService: 'Yes' | 'No';
  MultipleLines: 'Yes' | 'No' | 'No phone service';
  InternetService: 'DSL' | 'Fiber optic' | 'No';
  OnlineSecurity: 'Yes' | 'No' | 'No internet service';
  OnlineBackup: 'Yes' | 'No' | 'No internet service';
  DeviceProtection: 'Yes' | 'No' | 'No internet service';
  TechSupport: 'Yes' | 'No' | 'No internet service';
  StreamingTV: 'Yes' | 'No' | 'No internet service';
  StreamingMovies: 'Yes' | 'No' | 'No internet service';
  Contract: 'Month-to-month' | 'One year' | 'Two year';
  PaperlessBilling: 'Yes' | 'No';
  PaymentMethod: 'Electronic check' | 'Mailed check' | 'Bank transfer (automatic)' | 'Credit card (automatic)';
  MonthlyCharges: number;
  TotalCharges: number;
}

export interface PredictionResponse {
  customerID?: string;
  churn_probability: number;
  churn_risk: 'Low' | 'Medium' | 'High' | 'Critical';
  predicted_class: 0 | 1;
  confidence: string;
  model_used: string;
  threshold_used: number;
}

export interface SHAPDriver {
  feature: string;
  shap_value: number;
  direction: string;
}

export interface SHAPExplanation {
  customerID?: string;
  churn_probability: number;
  base_value_logodds: number;
  base_value_probability: number;
  shap_values: Record<string, number>;
  top_positive_drivers: SHAPDriver[];
  top_negative_drivers: SHAPDriver[];
  waterfall_image_base64: string;
  interpretation: string;
}

export interface ModelMetricInterval {
  value?: number;
  ci_low: number;
  ci_high: number;
}

export interface ModelInfo {
  model: string;
  model_status: string;
  decision_threshold: number;
  training_data: {
    rows?: number;
    columns?: number;
    whitespace_total_charges?: number;
    blank_charge_rows_with_zero_tenure?: number;
    churn_counts?: Record<string, number>;
  };
  split_rows: Record<string, number>;
  selection: {
    method?: string;
    best_cv_average_precision?: number;
    best_params?: Record<string, string | number>;
  };
  threshold_selection: {
    method?: string;
    validation_f1?: number;
  };
  test_prevalence?: number;
  test_metrics?: {
    average_precision?: number;
    roc_auc?: number;
    accuracy?: number;
    balanced_accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    brier_score?: number;
  };
  test_metrics_95ci?: Record<string, ModelMetricInterval>;
  n_bootstrap?: number;
}