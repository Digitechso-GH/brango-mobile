import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { socketManager } from "./socketManager";

const LOCATION_TASK_NAME = "BACKGROUND_LOCATION_TASK";

// Variables estáticas para almacenar el ID del pedido que se está rastreando
let activeOrderId: string | null = null;

// 1. Definir la tarea en segundo plano
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error("Error en la tarea de ubicación en segundo plano:", error.message);
    return;
  }

  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[0];
      const { latitude, longitude } = location.coords;
      
      // Enviar coordenadas usando el SocketManager global
      socketManager.sendLocation(
        latitude,
        longitude,
        "30_SEC_INTERVAL",
        activeOrderId || undefined
      );
    }
  }
});

class TrackingService {
  async requestPermissions(): Promise<boolean> {
    // Permisos en primer plano
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") {
      return false;
    }

    // Permisos en segundo plano (Requerido para Android/iOS al minimizar)
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    return bgStatus === "granted";
  }

  async startTracking(orderId: string) {
    activeOrderId = orderId;

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      console.warn("No se concedieron permisos de ubicación en segundo plano.");
      return false;
    }

    // Verificar si la tarea ya está corriendo para evitar duplicaciones
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isStarted) {
      console.log("El rastreo ya estaba activo, actualizando pedidoId.");
      return true;
    }

    console.log("Iniciando Foreground Service y tarea de ubicación en segundo plano...");
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000, // Cada 30 segundos
      distanceInterval: 10, // o cada 10 metros
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Ruta activa",
        notificationBody: "Rastreo de entrega en curso...",
        notificationColor: "#3D5FFF",
      },
    });

    return true;
  }

  async stopTracking() {
    activeOrderId = null;
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    
    if (isStarted) {
      console.log("Deteniendo la tarea de ubicación en segundo plano y Foreground Service...");
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  }
}

export const trackingService = new TrackingService();
export default trackingService;
