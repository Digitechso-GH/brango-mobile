import { Platform } from "react-native";

const rawWebUrl = process.env.EXPO_PUBLIC_API_URL_WEB;
const rawAndroidUrl = process.env.EXPO_PUBLIC_API_URL_ANDROID;
const rawIosUrl = process.env.EXPO_PUBLIC_API_URL_IOS;

const resolvedUrl = Platform.select({
  web: rawWebUrl,
  android: rawAndroidUrl,
  ios: rawIosUrl,
  default: rawAndroidUrl || rawIosUrl || rawWebUrl,
});

// Fallback seguro a producción si el build de EAS no inyectó variables de entorno
const FALLBACK_PROD_URL = "https://api.brango.syncrodg.com";

export const API_URL = resolvedUrl || FALLBACK_PROD_URL;
if (!resolvedUrl) {
  console.warn("[env] Advertencia: Variables EXPO_PUBLIC_API_URL_* no presentes, usando URL de respaldo:", API_URL);
}



export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Configuración de Map IDs de Google Cloud para Cloud-based Map Styling dinámico
 * organizados por Plataforma (Android / iOS) y Tema (Claro / Oscuro).
 */
export const GOOGLE_MAP_IDS = {
  ANDROID_LIGHT: process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID_ANDROID_LIGHT || "",
  ANDROID_DARK: process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID_ANDROID_DARK || "",
  IOS_LIGHT: process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID_IOS_LIGHT || "",
  IOS_DARK: process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID_IOS_DARK || "",
} as const;

export const TRACKING_EVENTS = {
  LOCATION_UPDATE: "location_update",
  DRIVER_LOCATION: "driver_location",
} as const;

export const LOCATION_EVENTS = {
  INTERVAL_30_SEC: "30_SEC_INTERVAL",
  INTERVAL_5_MIN: "5_MIN_INTERVAL",
} as const;
