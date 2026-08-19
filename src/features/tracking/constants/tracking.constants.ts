/**
 * Constantes centralizadas para el módulo de tracking GPS y WebSockets.
 */
export const TRACKING_EVENTS = {
  LOCATION_UPDATE: "location:update",
  START_ROUTE: "START_ROUTE",
  INTERVAL_30_SEC: "30_SEC_INTERVAL",
  ROUTE_COMPLETED: "ROUTE_COMPLETED",
} as const;

export type TrackingEventType = (typeof TRACKING_EVENTS)[keyof typeof TRACKING_EVENTS];

export const TRACKING_INTERVALS = {
  TEST_5_SEC: 5000,     // 5 segundos (Modo Testeo / Prueba en vivo)
  ONE_MIN: 60000,       // 1 minuto (Alta precisión)
  TWO_MIN: 120000,      // 2 minutos (Recomendado producción)
} as const;

export const DEFAULT_TRACKING_INTERVAL_MS = TRACKING_INTERVALS.ONE_MIN;

export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";
