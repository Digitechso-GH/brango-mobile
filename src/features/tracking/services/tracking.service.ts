import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { socketClient } from "./socket-client";
import { gpsSensorService } from "./gps-sensor.service";
import { useTrackingStore } from "../store/useTrackingStore";
import { TRACKING_EVENTS, BACKGROUND_LOCATION_TASK } from "../constants/tracking.constants";

let trackingTimer: any = null;
let isPolling = false;

/**
 * Orquestador principal de rastreo GPS que coordina SocketClient
 * y GpsSensorService para mantener la ruta activa transmitiendo por reloj.
 */
class TrackingService {
  getSocket() {
    return socketClient.getSocket();
  }

  sendLocationUpdate(lat: number, lng: number, event?: string, routeAssignmentId?: string) {
    useTrackingStore.getState().updateLocation({ latitude: lat, longitude: lng });
    socketClient.sendLocation(lat, lng, event || TRACKING_EVENTS.INTERVAL_30_SEC, routeAssignmentId);
  }

  async requestPermissions(): Promise<boolean> {
    return gpsSensorService.requestPermissions();
  }

  private async pollCurrentLocation(event?: string) {
    if (isPolling) return;
    isPolling = true;

    try {
      const coords = await gpsSensorService.getCurrentLocation();
      if (coords) {
        const activeRouteId = useTrackingStore.getState().currentRouteId;
        this.sendLocationUpdate(
          coords.latitude,
          coords.longitude,
          event,
          activeRouteId || undefined
        );
      }
    } catch (err) {
      console.error("Error en ciclo de lectura de tracking:", err);
    } finally {
      isPolling = false;
    }
  }

  async startTracking(routeAssignmentId: string, initialLat?: number, initialLng?: number) {
    // 1. Limpieza absoluta de rastreos previos
    await this.stopTracking();
    
    const hasForeground = await this.requestPermissions();
    if (!hasForeground) {
      console.warn("No se concedieron permisos de ubicación en primer plano.");
      return false;
    }

    const hasBackground = await gpsSensorService.requestBackgroundPermissions();
    if (!hasBackground) {
      console.warn("No se concedieron permisos de ubicación en segundo plano.");
    }

    useTrackingStore.getState().setRouteActive(routeAssignmentId);
    useTrackingStore.getState().setTrackingActive(true);

    // 2. Primera emisión garantizada al arrancar la ruta
    if (initialLat !== undefined && initialLng !== undefined) {
      this.sendLocationUpdate(initialLat, initialLng, TRACKING_EVENTS.START_ROUTE, routeAssignmentId);
    } else {
      await this.pollCurrentLocation(TRACKING_EVENTS.START_ROUTE);
    }

    // 3. Registrar geolocalización persistente en segundo plano (Native) o por interval (Web)
    if (Platform.OS !== "web") {
      try {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // Cada 30 segundos
          distanceInterval: 10, // Cada 10 metros
          foregroundService: {
            notificationTitle: "BranGo - Ruta Activa",
            notificationBody: "Compartiendo ubicación en segundo plano con la Torre de Control",
            notificationColor: "#3D5FFF",
          },
          pausesUpdatesAutomatically: false,
        });
        console.log("Servicio de geolocalización en background activado.");
      } catch (err) {
        console.error("Error al iniciar startLocationUpdatesAsync:", err);
      }
    } else {
      trackingTimer = setInterval(() => {
        this.pollCurrentLocation(TRACKING_EVENTS.INTERVAL_30_SEC);
      }, 30000);
    }

    return true;
  }

  async stopTracking() {
    useTrackingStore.getState().setRouteActive(null);
    useTrackingStore.getState().setTrackingActive(false);

    if (Platform.OS !== "web") {
      try {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
          console.log("Servicio de geolocalización en background desactivado.");
        }
      } catch (err) {
        console.error("Error al detener startLocationUpdatesAsync:", err);
      }
    } else {
      if (trackingTimer) {
        clearInterval(trackingTimer);
        trackingTimer = null;
      }
    }
    isPolling = false;
  }
}

export const trackingService = new TrackingService();
export default trackingService;

// DEFINICIÓN DE LA TAREA EN SEGUNDO PLANO (BACKGROUND TASK)
if (Platform.OS !== "web") {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) {
      console.error("Error en BACKGROUND_LOCATION_TASK:", error);
      return;
    }
    if (data) {
      const { locations } = data;
      if (locations && locations.length > 0) {
        const location = locations[0];
        const activeRouteId = useTrackingStore.getState().currentRouteId;
        
        trackingService.sendLocationUpdate(
          location.coords.latitude,
          location.coords.longitude,
          TRACKING_EVENTS.INTERVAL_30_SEC,
          activeRouteId || undefined
        );
      }
    }
  });
}
