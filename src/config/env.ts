import { Platform } from "react-native";

export const API_URL = Platform.select({
  android: "http://10.0.2.2:3001",
  ios: "http://localhost:3001",
  default: "http://localhost:3001",
}) || "http://localhost:3001";

export const TRACKING_EVENTS = {
  LOCATION_UPDATE: "location_update",
  DRIVER_LOCATION: "driver_location",
} as const;

export const LOCATION_EVENTS = {
  INTERVAL_30_SEC: "30_SEC_INTERVAL",
  INTERVAL_5_MIN: "5_MIN_INTERVAL",
} as const;
