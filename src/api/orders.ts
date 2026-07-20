import axios from "axios";

// Simulamos llamadas HTTP para desarrollo local (luego se conectará a process.env.API_URL)
const API_URL = "http://localhost:3001/api";

export interface Order {
  id: string;
  guia: string;
  client: string;
  address: string;
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED" | "OBSERVED";
  notes?: string;
}

// Datos semilla mock para cuando el servidor no esté corriendo
const MOCK_ORDERS: Order[] = [
  { id: "PED-1029", guia: "004521", client: "Supermercados Wong", address: "Av. La Marina 123, San Miguel", status: "IN_TRANSIT" },
  { id: "PED-1030", guia: "004522", client: "Tiendas Tambo", address: "Av. Los Proceres 456, Santiago de Surco", status: "PENDING", notes: "Entregar por puerta trasera" },
  { id: "PED-1032", guia: "004524", client: "Bodega Don Pepe", address: "Calle Las Flores 12, Miraflores", status: "PENDING" },
];

export const fetchAssignedOrders = async (token: string): Promise<Order[]> => {
  try {
    // Si estuviéramos conectados con la API real:
    // const res = await axios.get(`${API_URL}/orders/assigned`, {
    //   headers: { Authorization: `Bearer ${token}` }
    // });
    // return res.data.data;
    
    // Simulación:
    await new Promise((resolve) => setTimeout(resolve, 800));
    return MOCK_ORDERS;
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    return MOCK_ORDERS;
  }
};

export const updateOrderStatus = async (
  token: string,
  orderId: string,
  status: Order["status"]
): Promise<Order> => {
  try {
    // const res = await axios.patch(`${API_URL}/orders/${orderId}/status`, { status }, {
    //   headers: { Authorization: `Bearer ${token}` }
    // });
    // return res.data.data;
    
    await new Promise((resolve) => setTimeout(resolve, 500));
    const order = MOCK_ORDERS.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      return order;
    }
    throw new Error("Pedido no encontrado");
  } catch (error) {
    console.error("Error al cambiar estado:", error);
    throw error;
  }
};

export const uploadEvidence = async (
  token: string,
  orderId: string,
  base64Image: string
): Promise<void> => {
  try {
    // const res = await axios.post(`${API_URL}/orders/${orderId}/evidence`, { image: base64Image }, {
    //   headers: { Authorization: `Bearer ${token}` }
    // });
    // return res.data.data;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Evidencia subida con éxito para pedido:", orderId);
  } catch (error) {
    console.error("Error al subir evidencia:", error);
    throw error;
  }
};
