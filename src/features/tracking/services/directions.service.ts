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

// Caché en memoria para evitar llamadas redundantes a la API de Google Directions
const streetRouteCache = new Map<string, LatLng[]>();

function getCacheKey(points: LatLng[]): string {
  // Redondear a 4 decimales (~11 metros de tolerancia) para agrupar puntos idénticos o casi idénticos
  return points.map((p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`).join(";");
}

/**
 * Consulta a la API de Google Maps Routes (v2) para obtener la ruta navegable por calles
 */
export async function getStreetRoute(origin: LatLng, destination: LatLng): Promise<LatLng[]> {
  return getFullStreetPath([origin, destination]);
}

export async function getFullStreetPath(waypoints: LatLng[]): Promise<LatLng[]> {
  if (!waypoints || waypoints.length < 2) return waypoints || [];

  if (!GOOGLE_MAPS_API_KEY) {
    return waypoints;
  }

  // Verificar caché antes de consumir la cuota de Google
  const cacheKey = getCacheKey(waypoints);
  if (streetRouteCache.has(cacheKey)) {
    return streetRouteCache.get(cacheKey)!;
  }

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const intermediates = waypoints.slice(1, -1);

  const body: any = {
    origin: {
      location: {
        latLng: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      },
    },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
  };

  if (intermediates.length > 0) {
    body.intermediates = intermediates.map((w) => ({
      location: {
        latLng: {
          latitude: w.latitude,
          longitude: w.longitude,
        },
      },
    }));
  }

  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      const points = data.routes[0]?.polyline?.encodedPolyline;
      if (points) {
        const decoded = decodePolyline(points);
        if (streetRouteCache.size > 50) {
          const first = streetRouteCache.keys().next().value;
          if (first) streetRouteCache.delete(first);
        }
        streetRouteCache.set(cacheKey, decoded);
        return decoded;
      }
    }
  } catch (error) {
    console.log("Error consultando Google Routes API:", error);
  }

  return waypoints;
}

