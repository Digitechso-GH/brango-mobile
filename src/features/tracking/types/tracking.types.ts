/**
 * Tipos e interfaces de TypeScript estrictas para el módulo de tracking GPS.
 */
export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationPayload {
  latitude: number;
  longitude: number;
  event: string;
  routeAssignmentId?: string;
}

export interface SocketConnectionOptions {
  token: string;
  url: string;
}
