import { create } from "zustand";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { socketClient } from "../../tracking/services/socket-client";
import { refreshApi } from "../api/auth.api";

export interface User {
  id: string;
  name: string;
  email: string;
  plate: string;
  driverId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const setSecureToken = async (key: string, value: string) => {
  try {
    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync(key, value);
    } else {
      localStorage.setItem(key, value);
    }
  } catch (err) {
    console.error("Error setting secure token:", err);
  }
};

const getSecureToken = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS !== "web") {
      return await SecureStore.getItemAsync(key);
    } else {
      return localStorage.getItem(key);
    }
  } catch (err) {
    console.error("Error getting secure token:", err);
    return null;
  }
};

const removeSecureToken = async (key: string) => {
  try {
    if (Platform.OS !== "web") {
      await SecureStore.deleteItemAsync(key);
    } else {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error("Error deleting secure token:", err);
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (user, token, refreshToken) => {
    socketClient.connect(token);
    set({ user, token, isAuthenticated: true });
    if (refreshToken) {
      await setSecureToken("refresh_token", refreshToken);
    }
  },

  logout: async () => {
    try {
      const { trackingService } = require("../../tracking/services/tracking.service");
      trackingService.stopTracking();
    } catch (e) {}
    socketClient.disconnect();
    set({ user: null, token: null, isAuthenticated: false });
    await removeSecureToken("refresh_token");
  },

  refreshToken: async () => {
    const currentRefreshToken = await getSecureToken("refresh_token");
    if (!currentRefreshToken) {
      return false;
    }
    try {
      const res = await refreshApi(currentRefreshToken);
      if (res && res.token) {
        set({ token: res.token });
        if (res.refreshToken) {
          await setSecureToken("refresh_token", res.refreshToken);
        }
        // Reconectar el Socket
        socketClient.connect(res.token);
        console.log("Renovación de token y reconexión de socket completadas con éxito.");
        return true;
      }
    } catch (e) {
      console.error("Error renovando token automáticamente:", e);
    }
    return false;
  },
}));
