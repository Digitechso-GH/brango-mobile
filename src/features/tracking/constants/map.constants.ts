/**
 * Constantes centralizadas para temas y configuración de mapas.
 */
export const MAP_THEMES = {
  LIGHT: "light",
  DARK: "dark",
} as const;

export type MapThemeType = (typeof MAP_THEMES)[keyof typeof MAP_THEMES];
