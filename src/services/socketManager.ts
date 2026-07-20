import { io, Socket } from "socket.io-client";
import { API_URL, TRACKING_EVENTS, LOCATION_EVENTS } from "../config/env";

class SocketManager {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(API_URL, {
      auth: { token },
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

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log("WebSocket desconectado manualmente.");
    }
  }

  sendLocation(latitud: number, longitud: number, evento?: string, pedidoId?: string) {
    if (this.socket?.connected) {
      this.socket.emit(TRACKING_EVENTS.LOCATION_UPDATE, {
        latitud,
        longitud,
        evento: evento || LOCATION_EVENTS.INTERVAL_30_SEC,
        pedidoId,
      });
      console.log(`Ubicación enviada por socket: (${latitud}, ${longitud})`);
      return true;
    }
    console.log("Socket no conectado. No se pudo enviar ubicación.");
    return false;
  }
}

export const socketManager = new SocketManager();
export default socketManager;
