import { create } from "zustand";

interface User {
  id: string;
  name: string;
  email: string;
  plate: string;
}

interface Location {
  latitude: number;
  longitude: number;
}

interface AppState {
  user: User | null;
  token: string | null;
  currentRouteId: string | null;
  lastKnownLocation: Location | null;
  isTrackingActive: boolean;
  
  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  setRouteActive: (routeId: string | null) => void;
  updateLocation: (location: Location) => void;
  setTrackingActive: (active: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: null,
  currentRouteId: null,
  lastKnownLocation: null,
  isTrackingActive: false,

  login: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null, currentRouteId: null, isTrackingActive: false }),
  setRouteActive: (routeId) => set({ currentRouteId: routeId }),
  updateLocation: (location) => set({ lastKnownLocation: location }),
  setTrackingActive: (active) => set({ isTrackingActive: active }),
}));
