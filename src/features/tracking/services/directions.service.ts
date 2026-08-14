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

/**
 * Recorre una serie de puntos de paso (waypoints) y obtiene la ruta navegable por calles completa
 */
export async function getFullStreetPath(waypoints: LatLng[]): Promise<LatLng[]> {
  if (!waypoints || waypoints.length < 2) return waypoints || [];
  const fullPath: LatLng[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const segment = await getStreetRoute(waypoints[i], waypoints[i + 1]);
    if (i === 0) {
      fullPath.push(...segment);
    } else {
      fullPath.push(...segment.slice(1));
    }
  }

  return fullPath;
}

