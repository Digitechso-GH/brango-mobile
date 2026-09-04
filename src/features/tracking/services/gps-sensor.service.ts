import { Platform } from "react-native";
import * as Location from "expo-location";
import { GpsCoordinates } from "../types/tracking.types";

/**
 * Servicio puro encargado de dialogar con el hardware GPS del dispositivo
 * y validar permisos de Expo Location.
 */
class GpsSensorService {
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === "granted";
    } catch (error) {
      return false;
    }
  }

  async requestBackgroundPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      return status === "granted";
    } catch (error) {
      return false;
    }
  }

  async isGpsServicesEnabled(): Promise<boolean> {
    if (Platform.OS === "web") return true;
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      return false;
    }
  }

  async getCurrentLocation(): Promise<GpsCoordinates | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) return null;

      const hasServices = await this.isGpsServicesEnabled();

      // 1. Intentar primero obtener la posición actual en vivo
      if (hasServices) {
        try {
          const loc = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500))
          ]);

          if (loc && loc.coords) {
            return {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
          }
        } catch (liveErr) {
          console.log("getCurrentPositionAsync en vivo no disponible, intentando getLastKnownPositionAsync:", liveErr);
        }
      }

      // 2. Fallback a última posición conocida en caché del SO
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown && lastKnown.coords) {
          return {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };
        }
      } catch (cachedErr) {
        console.log("getLastKnownPositionAsync no disponible:", cachedErr);
      }

      return null;
    } catch (error: any) {
      console.error("Error obteniendo ubicación en GpsSensorService:", error);
      return null;
    }
  }
}

export const gpsSensorService = new GpsSensorService();
export default gpsSensorService;
