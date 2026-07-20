import { Platform } from "react-native";

const androidUrl = process.env.EXPO_PUBLIC_API_URL_ANDROID || "http://10.0.2.2:3001";
const iosUrl = process.env.EXPO_PUBLIC_API_URL_IOS || "http://localhost:3001";

export const API_URL = Platform.select({
  android: androidUrl,
  ios: iosUrl,
  default: iosUrl,
}) || "http://localhost:3001";

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export const TRACKING_EVENTS = {
  LOCATION_UPDATE: "location_update",
  DRIVER_LOCATION: "driver_location",
} as const;

export const LOCATION_EVENTS = {
  INTERVAL_30_SEC: "30_SEC_INTERVAL",
  INTERVAL_5_MIN: "5_MIN_INTERVAL",
} as const;
