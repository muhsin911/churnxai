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