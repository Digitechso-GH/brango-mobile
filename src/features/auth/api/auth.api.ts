import { apiClient } from "../../../shared/api/client";
import { API_ENDPOINTS } from "../../../shared/constants/routes";
import { LoginCredentials, LoginResponse } from "../types/auth.types";

export const loginApi = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const res = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
    email: credentials.email.trim(),
    password: credentials.password,
  });

  return res.data.data;
};

export const refreshApi = async (refreshToken: string): Promise<LoginResponse> => {
  const res = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken });
  return res.data.data;
};
