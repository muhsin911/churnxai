import axios from 'axios';
import type { CustomerInput, PredictionResponse, SHAPExplanation } from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const predictChurn = async (customer: CustomerInput): Promise<PredictionResponse> => {
  const { data } = await api.post<PredictionResponse>('/predict', customer);
  return data;
};

export const explainPrediction = async (customer: CustomerInput): Promise<SHAPExplanation> => {
  const { data } = await api.post<SHAPExplanation>('/explain', customer);
  return data;
};

export const healthCheck = async () => {
  const { data } = await api.get('/health');
  return data;
};