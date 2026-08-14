import { create } from "zustand";
import { DEFAULT_TRACKING_INTERVAL_MS } from "../constants/tracking.constants";

export interface Location {
  latitude: number;
  longitude: number;
}

interface TrackingState {
  currentRouteId: string | null;
  lastKnownLocation: Location | null;
  isTrackingActive: boolean;
  trackingIntervalMs: number;

  setRouteActive: (routeId: string | null) => void;
  updateLocation: (location: Location) => void;
  setTrackingActive: (active: boolean) => void;
  setTrackingIntervalMs: (ms: number) => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  currentRouteId: null,
  lastKnownLocation: null,
  isTrackingActive: false,
  trackingIntervalMs: DEFAULT_TRACKING_INTERVAL_MS,

  setRouteActive: (routeId) => set({ currentRouteId: routeId }),
  updateLocation: (location) => set({ lastKnownLocation: location }),
  setTrackingActive: (active) => set({ isTrackingActive: active }),
  setTrackingIntervalMs: (ms) => set({ trackingIntervalMs: ms }),
}));
