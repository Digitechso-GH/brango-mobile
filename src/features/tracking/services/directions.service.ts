import { GOOGLE_MAPS_API_KEY } from "../../../shared/config/env";

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Decodifica el string comprimido de Google Maps Overview Polyline
 * a un arreglo de coordenadas [{ latitude, longitude }]
 */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

/**
 * Consulta a la API de Google Maps Directions para obtener la ruta navegable por calles
 */
export async function getStreetRoute(origin: LatLng, destination: LatLng): Promise<LatLng[]> {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return [origin, destination];
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.routes && data.routes.length > 0) {
      const points = data.routes[0]?.overview_polyline?.points;
      if (points) {
        return decodePolyline(points);
      }
    }
  } catch (error) {
    console.log("Error consultando la ruta en Google Directions:", error);
  }

  // Fallback si no hay clave de API de Direcciones o falla la red: linea directa entre los 2 puntos
  return [origin, destination];
}

export async function getFullStreetPath(waypoints: LatLng[]): Promise<LatLng[]> {
  if (!waypoints || waypoints.length < 2) return waypoints || [];

  if (!GOOGLE_MAPS_API_KEY) {
    return waypoints;
  }

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const intermediates = waypoints.slice(1, -1);

  let waypointsParam = "";
  if (intermediates.length > 0) {
    const joined = intermediates.map((w) => `${w.latitude},${w.longitude}`).join("|");
    waypointsParam = `&waypoints=${joined}`;
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}${waypointsParam}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.routes && data.routes.length > 0) {
      const points = data.routes[0]?.overview_polyline?.points;
      if (points) {
        return decodePolyline(points);
      }
    }
  } catch (error) {
    console.log("Error consultando la ruta anidada completa:", error);
  }

  return waypoints;
}

