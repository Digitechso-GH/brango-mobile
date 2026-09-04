import { User } from "../store/useAuthStore";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    unit?: string;
    driverId: string;
  };
}

export type { User };
