import axios from "axios";
import { API_URL } from "../config/env";

export interface Order {
  id: string;
  codigo: string;
  guia: string;
  client: string;
  address: string;
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED" | "OBSERVED";
  notes?: string;
}

// Convertir estados del backend al formato móvil
const mapStatusFromBackend = (status: string): Order["status"] => {
  if (status === "PENDING") return "PENDING";
  if (status === "IN_TRANSIT") return "IN_TRANSIT";
  if (status === "DELIVERED") return "DELIVERED";
  if (status === "FAILED") return "OBSERVED";
  return "PENDING";
};

// Convertir estados del móvil al formato backend
const mapStatusToBackend = (status: Order["status"]): string => {
  if (status === "PENDING") return "PENDING";
  if (status === "IN_TRANSIT") return "IN_TRANSIT";
  if (status === "DELIVERED") return "DELIVERED";
  if (status === "OBSERVED") return "FAILED";
  return "PENDING";
};

export const fetchAssignedOrders = async (
  token: string,
  driverId: string,
): Promise<Order[]> => {
  try {
    const res = await axios.get(`${API_URL}/orders`, {
      params: { driverId },
      headers: { Authorization: `Bearer ${token}` },
    });

    const backendOrders = res.data.data || [];
    return backendOrders.map((o: any) => ({
      id: o.id,
      codigo: o.codigo,
      guia: o.guia || "",
      client: o.cliente?.nombre || "Cliente",
      address: o.direccionOriginal,
      status: mapStatusFromBackend(o.estado),
      notes: o.documentoDestinatario ? `Destinatario DNI: ${o.documentoDestinatario}` : "",
    }));
  } catch (error: any) {
    console.error("Error al obtener pedidos:", error.message);
    throw error;
  }
};

export const updateOrderStatus = async (
  token: string,
  orderId: string,
  status: Order["status"],
  userId: string,
): Promise<Order> => {
  try {
    const backendStatus = mapStatusToBackend(status);
    const res = await axios.put(
      `${API_URL}/orders/${orderId}/status`,
      { estado: backendStatus, userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const o = res.data.data;
    return {
      id: o.id,
      codigo: o.codigo,
      guia: o.guia || "",
      client: o.cliente?.nombre || "Cliente",
      address: o.direccionOriginal,
      status: mapStatusFromBackend(o.estado),
    };
  } catch (error: any) {
    console.error("Error al cambiar estado:", error.message);
    throw error;
  }
};

export const uploadEvidence = async (
  token: string,
  orderId: string,
  base64Image: string,
): Promise<void> => {
  try {
    await axios.post(
      `${API_URL}/orders/${orderId}/evidence`,
      { urlImagen: `data:image/jpeg;base64,${base64Image}` },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("Evidencia subida con éxito para pedido:", orderId);
  } catch (error: any) {
    console.error("Error al subir evidencia:", error.message);
    throw error;
  }
};
