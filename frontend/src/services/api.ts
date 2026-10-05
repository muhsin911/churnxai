import axios from 'axios';
import type {
  AuthUser,
  CreateUserRequest,
  CustomerInput,
  ManagedUserList,
  ModelInfo,
  PredictionExperience,
  PredictionHistoryResponse,
  PredictionResponse,
  SHAPExplanation,
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  withCredentials: true,
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

export const predictAndExplain = async (customer: CustomerInput): Promise<PredictionExperience> => {
  const { data } = await api.post<PredictionExperience>('/predict-and-explain', customer);
  return data;
};

export const login = async (username: string, password: string): Promise<AuthUser> => {
  const { data } = await api.post<AuthUser>('/auth/login', { username, password });
  return data;
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
};

export const createUser = async (request: CreateUserRequest): Promise<AuthUser> => {
  const { data } = await api.post<AuthUser>('/auth/users', request);
  return data;
};

export const getManagedUsers = async (): Promise<ManagedUserList> => {
  const { data } = await api.get<ManagedUserList>('/auth/users');
  return data;
};

export const deactivateUser = async (userId: string): Promise<void> => {
  await api.delete(`/auth/users/${userId}`);
};

export const reactivateUser = async (userId: string): Promise<void> => {
  await api.post(`/auth/users/${userId}/reactivate`);
};

export const resetUserPassword = async (userId: string, password: string): Promise<void> => {
  await api.post(`/auth/users/${userId}/reset-password`, { password });
};

export const permanentlyDeleteUser = async (
  userId: string,
  historyAction: 'anonymize' | 'delete',
): Promise<void> => {
  await api.post(`/auth/users/${userId}/permanent-delete`, {
    history_action: historyAction,
  });
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

export const getPredictionHistory = async (
  limit = 25,
  offset = 0
): Promise<PredictionHistoryResponse> => {
  const { data } = await api.get<PredictionHistoryResponse>('/predictions', {
    params: { limit, offset },
  });
  return data;
};

export const healthCheck = async () => {
  const { data } = await api.get('/health');
  return data;
};

export const getModelInfo = async (): Promise<ModelInfo> => {
  const { data } = await api.get<ModelInfo>('/model-info');
  return data;
};