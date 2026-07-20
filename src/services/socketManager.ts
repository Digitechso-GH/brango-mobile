import { io, Socket } from "socket.io-client";
import { Platform } from "react-native";

const API_URL = Platform.select({
  android: "http://10.0.2.2:3001",
  ios: "http://localhost:3001",
  default: "http://localhost:3001",
});

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
      this.socket.emit("location_update", {
        latitud,
        longitud,
        evento: evento || "30_SEC_INTERVAL",
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
