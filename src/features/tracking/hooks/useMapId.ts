import { Platform } from "react-native";
import { GOOGLE_MAP_IDS } from "../../../shared/config/env";
import { MAP_THEMES, MapThemeType } from "../constants/map.constants";

export type MapTheme = MapThemeType;

/**
 * Hook para obtener el Map ID de Google Cloud.
 * Retorna undefined por defecto para renderizar el mapa estándar original de Google.
 *
 * @param overrideTheme - Tema forzado (opcional).
 * @returns El Map ID o undefined para el mapa por defecto de Google.
 */
export function useMapId(overrideTheme?: MapTheme): string | undefined {
  if (!overrideTheme) {
    return undefined;
  }

  const isAndroid = Platform.OS === "android";
  const isIos = Platform.OS === "ios";

  if (isAndroid) {
    return overrideTheme === MAP_THEMES.DARK
      ? GOOGLE_MAP_IDS.ANDROID_DARK
      : GOOGLE_MAP_IDS.ANDROID_LIGHT;
  }

  if (isIos) {
    return overrideTheme === MAP_THEMES.DARK
      ? GOOGLE_MAP_IDS.IOS_DARK
      : GOOGLE_MAP_IDS.IOS_LIGHT;
  }

  return overrideTheme === MAP_THEMES.DARK
    ? GOOGLE_MAP_IDS.ANDROID_DARK
    : GOOGLE_MAP_IDS.ANDROID_LIGHT;
}

/**
 * Función pura auxiliar para seleccionar un Map ID sin requerir las reglas de Hooks
 */
export function getMapId(theme?: MapTheme): string | undefined {
  if (!theme) return undefined;

  const isAndroid = Platform.OS === "android";
  const isIos = Platform.OS === "ios";

  if (isAndroid) {
    return theme === MAP_THEMES.DARK
      ? GOOGLE_MAP_IDS.ANDROID_DARK
      : GOOGLE_MAP_IDS.ANDROID_LIGHT;
  }

  if (isIos) {
    return theme === MAP_THEMES.DARK
      ? GOOGLE_MAP_IDS.IOS_DARK
      : GOOGLE_MAP_IDS.IOS_LIGHT;
  }

  return theme === MAP_THEMES.DARK
    ? GOOGLE_MAP_IDS.ANDROID_DARK
    : GOOGLE_MAP_IDS.ANDROID_LIGHT;
}
