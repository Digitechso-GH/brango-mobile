import axios from "axios";
import { API_URL } from "../config/env";

export const apiClient = axios.create({
  baseURL: API_URL,
});

// Interceptor de peticiones HTTP: adjunta automáticamente el token Bearer JWT desde Zustand Store
// Se utiliza require diferido para evitar el require cycle (useAuthStore -> auth.api -> client -> useAuthStore)
apiClient.interceptors.request.use(
  (config) => {
    try {
      const { useAuthStore } = require("../../features/auth/store/useAuthStore");
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      // Ignorar si el store aún no está disponible durante la inicialización
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuestas para refrescar automáticamente el JWT expirado (401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { useAuthStore } = require("../../features/auth/store/useAuthStore");
        const success = await useAuthStore.getState().refreshToken();
        if (success) {
          const newToken = useAuthStore.getState().token;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (err) {
        console.error("Fallo la auto-renovación de token en interceptor:", err);
      }
      
      try {
        const { useAuthStore } = require("../../features/auth/store/useAuthStore");
        await useAuthStore.getState().logout();
      } catch (logoutErr) {
        console.error("Error al cerrar sesión desde interceptor:", logoutErr);
      }
    }
    return Promise.reject(error);
  }
);
