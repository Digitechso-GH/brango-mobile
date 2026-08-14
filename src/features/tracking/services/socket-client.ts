import { io, Socket } from "socket.io-client";
import { API_URL } from "../../../shared/config/env";
import { TRACKING_EVENTS } from "../constants/tracking.constants";
import { LocationPayload } from "../types/tracking.types";

/**
 * Cliente pura y exclusivamente responsable de gestionar el ciclo de vida
 * y emisión de paquetes de Socket.io hacia el backend.
 */
class SocketClient {
  private socket: Socket | null = null;
  private activeToken: string | null = null;

  connect(token: string) {
    if (!token) return;
    this.activeToken = token;

    if (this.socket?.connected) return;

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    this.socket.on("connect", () => {
      console.log("WebSocket conectado con éxito.");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("WebSocket desconectado:", reason);
    });

    this.socket.on("connect_error", (err) => {
      console.log("Error de conexión WebSocket:", err.message);
    });
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    this.activeToken = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log("WebSocket desconectado manualmente.");
    }
  }

  sendLocation(latitude: number, longitude: number, event?: string, routeAssignmentId?: string): boolean {
    if (!this.socket?.connected && this.activeToken) {
      this.connect(this.activeToken);
    }

    if (this.socket?.connected) {
      const payload: LocationPayload = {
        latitude,
        longitude,
        event: event || TRACKING_EVENTS.INTERVAL_30_SEC,
      };
      if (routeAssignmentId) {
        payload.routeAssignmentId = routeAssignmentId;
      }
      this.socket.emit(TRACKING_EVENTS.LOCATION_UPDATE, payload);
      console.log(`Ubicación enviada por socket: (${latitude}, ${longitude})`);
      return true;
    }

    console.log("Socket no conectado. No se pudo enviar ubicación.");
    return false;
  }
}

export const socketClient = new SocketClient();
export default socketClient;
