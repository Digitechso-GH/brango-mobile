import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { socketClient } from "./socket-client";
import { gpsSensorService } from "./gps-sensor.service";
import { useTrackingStore } from "../store/useTrackingStore";
import { TRACKING_EVENTS, BACKGROUND_LOCATION_TASK } from "../constants/tracking.constants";
import { apiClient } from "../../../shared/api/client";

let trackingTimer: any = null;
let isPolling = false;

/**
 * Orquestador principal de rastreo GPS que coordina SocketClient
 * y GpsSensorService para mantener la ruta activa transmitiendo por reloj.
 */
class TrackingService {
  private lastEmissionTime = 0;

  getSocket() {
    return socketClient.getSocket();
  }

  async fetchConfiguredInterval(): Promise<number> {
    try {
      const res = await apiClient.get("/orders/config");
      const conf = res.data?.data || res.data;
      let ms = 60000;
      if (conf?.gps_ping_interval === "5s") ms = 5000;
      else if (conf?.gps_ping_interval === "1m") ms = 60000;
      else if (conf?.gps_ping_interval === "2m") ms = 120000;

      useTrackingStore.getState().setTrackingIntervalMs(ms);
      console.log(`[Tracking] Intervalo GPS sincronizado del servidor: ${conf?.gps_ping_interval} (${ms}ms)`);
      this.initSocketListeners();
      return ms;
    } catch (e) {
      console.warn("[Tracking] No se pudo obtener config de GPS, usando valor del store");
      this.initSocketListeners();
      return useTrackingStore.getState().trackingIntervalMs || 60000;
    }
  }

  initSocketListeners() {
    const socket = socketClient.getSocket();
    if (socket) {
      socket.off("config:updated");
      socket.on("config:updated", async (conf: Record<string, string>) => {
        if (conf?.gps_ping_interval) {
          let ms = 60000;
          if (conf.gps_ping_interval === "5s") ms = 5000;
          else if (conf.gps_ping_interval === "1m") ms = 60000;
          else if (conf.gps_ping_interval === "2m") ms = 120000;

          useTrackingStore.getState().setTrackingIntervalMs(ms);
          console.log(`[Tracking] Configuración actualizada vía WebSocket: ${conf.gps_ping_interval} (${ms}ms)`);

          if (useTrackingStore.getState().isTrackingActive) {
            await this.restartLocationUpdates(ms);
          }
        }
      });
    }
  }

  async restartLocationUpdates(pingIntervalMs: number) {
    if (Platform.OS !== "web") {
      try {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        }
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: pingIntervalMs,
          distanceInterval: 0, // 0 metros para que emita por tiempo incluso detenido
          foregroundService: {
            notificationTitle: "BranGo - Ruta Activa",
            notificationBody: "Compartiendo ubicación en segundo plano con la Torre de Control",
            notificationColor: "#3D5FFF",
          },
          pausesUpdatesAutomatically: false,
        });
        console.log(`[Tracking] Servicio de fondo reiniciado en caliente (${pingIntervalMs}ms).`);
      } catch (err) {
        console.error("Error al reiniciar startLocationUpdatesAsync:", err);
      }
    } else {
      if (trackingTimer) {
        clearInterval(trackingTimer);
      }
      trackingTimer = setInterval(() => {
        this.pollCurrentLocation(TRACKING_EVENTS.INTERVAL_30_SEC);
      }, pingIntervalMs);
    }
  }

  sendLocationUpdate(lat: number, lng: number, event?: string, routeAssignmentId?: string) {
    const isLifecycleEvent = event === TRACKING_EVENTS.START_ROUTE || event === TRACKING_EVENTS.ROUTE_COMPLETED;
    const intervalMs = useTrackingStore.getState().trackingIntervalMs || 60000;
    const now = Date.now();

    // Throttling estricto: si no es inicio/fin de ruta y no ha transcurrido el intervalo configurado, ignorar el ping redundante
    if (!isLifecycleEvent && now - this.lastEmissionTime < intervalMs - 1000) {
      useTrackingStore.getState().updateLocation({ latitude: lat, longitude: lng });
      return;
    }

    this.lastEmissionTime = now;
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

    // 3. Obtener la configuración más fresca del servidor
    const pingIntervalMs = await this.fetchConfiguredInterval();

    // 4. Registrar geolocalización persistente
    if (Platform.OS !== "web") {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: pingIntervalMs,
          distanceInterval: 0, // 0 metros: el intervalo de tiempo rige incluso con el vehículo detenido
          foregroundService: {
            notificationTitle: "BranGo - Ruta Activa",
            notificationBody: "Compartiendo ubicación en segundo plano con la Torre de Control",
            notificationColor: "#3D5FFF",
          },
          pausesUpdatesAutomatically: false,
        });
        console.log(`Servicio de geolocalización en background activado (${pingIntervalMs}ms).`);
      } catch (err) {
        console.error("Error al iniciar startLocationUpdatesAsync:", err);
      }
    } else {
      trackingTimer = setInterval(() => {
        this.pollCurrentLocation(TRACKING_EVENTS.INTERVAL_30_SEC);
      }, pingIntervalMs);
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
