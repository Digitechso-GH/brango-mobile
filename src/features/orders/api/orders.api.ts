import { Platform } from "react-native";
import axios from "axios";
import { apiClient } from "../../../shared/api/client";
import { API_ENDPOINTS } from "../../../shared/constants/routes";
import { mapStatusFromBackend, mapStatusToBackend, ORDER_STATUS } from "../constants/order-status";
import { Order } from "../types/orders.types";
import { RouteAssignmentSchema, OrderSchema, PaginatedOrdersResponseSchema } from "../types/orders.schemas";
import { z } from "zod";

export type { Order };

const parseNumberCoordinate = (val: any): number | null => {
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "number" ? val : parseFloat(val);
  return isNaN(num) ? null : num;
};

export const completeRoute = async (routeId: string): Promise<void> => {
  try {
    await apiClient.post(`${API_ENDPOINTS.ROUTES.BASE}/${routeId}/complete`);
  } catch (error: any) {
    console.error("Error al completar la ruta:", error);
    throw error.response?.data || error;
  }
};

export const fetchAssignedOrders = async (driverId?: string): Promise<Order[]> => {
  try {
    const params: any = {};
    if (driverId && driverId.trim() !== "") {
      params.driverId = driverId.trim();
    }

    const res = await apiClient.get(`${API_ENDPOINTS.ORDERS}/today`, { params });

    // 1. Validar estrictamente la estructura { data, meta }
    // El backend globalmente envuelve todo en { success: true, data: {...} }
    const payload = res.data.success !== undefined ? res.data.data : res.data;
    const parsedResponse = PaginatedOrdersResponseSchema.parse(payload);
    const backendOrders = parsedResponse.data;

    return backendOrders.map((o: any): Order => {
      const assignment = o.assignments?.[0];
      const routeAssignmentId = assignment ? String(assignment.id) : String(o.id);

      const rawEvidence = assignment && assignment.evidences && assignment.evidences.length > 0
        ? assignment.evidences[0].s3Url
        : "";

      const displayAddress = o.formattedAddress || o.rawAddress || "—";
      const displayClient = (o.customer?.name || o.recipientName || "—").trim();

      return {
        id: routeAssignmentId,
        code: o.code || "",
        waybill: o.waybill || "",
        client: displayClient,
        recipientName: o.recipientName || "",
        recipientDoc: o.recipientDocument || "",
        recipientPhone: o.recipientPhone || "",
        warehouseContact: o.warehouseContact || "",
        address: displayAddress,
        rawAddress: o.rawAddress || "",
        formattedAddress: o.formattedAddress || null,
        status: assignment ? mapStatusFromBackend(assignment.status) : ORDER_STATUS.PENDING,
        rawState: assignment ? assignment.status : ORDER_STATUS.PENDING,
        reasonText: assignment?.reasonText || assignment?.evidences?.[0]?.signatureText || null,
        signatureText: assignment?.evidences?.[0]?.signatureText || null,
        latitude: parseNumberCoordinate(o.latitude),
        longitude: parseNumberCoordinate(o.longitude),
        originText: assignment?.originAddress || null,
        originLatitude: parseNumberCoordinate(assignment?.originLatitude),
        originLongitude: parseNumberCoordinate(assignment?.originLongitude),
        evidenceUrl: rawEvidence,
        updatedAt: assignment?.updatedAt ?? o.updatedAt,
        sequenceIndex: assignment ? assignment.sequenceIndex : 0,
        stopGroupId: assignment?.stopGroupId || null,
      };
    });
  } catch (error: any) {
    console.error("Error fetching assigned orders:", error.message);
    throw error;
  }
};

export interface UpdateOrderStatusParams {
  orderId?: string;
  routeAssignmentId?: string;
  status: string;
  latitude?: number;
  longitude?: number;
  reasonText?: string;
}

export const updateOrderStatus = async (
  paramsOrId: string | UpdateOrderStatusParams,
  status?: string,
  latitude?: number,
  longitude?: number,
  reasonText?: string
): Promise<any> => {
  let targetId: string;
  let targetStatus: string;
  let targetLat: number | undefined = latitude;
  let targetLng: number | undefined = longitude;
  let targetReason: string | undefined = reasonText;

  if (typeof paramsOrId === "object") {
    targetId = (paramsOrId.routeAssignmentId || paramsOrId.orderId)!;
    targetStatus = paramsOrId.status;
    targetLat = paramsOrId.latitude;
    targetLng = paramsOrId.longitude;
    targetReason = paramsOrId.reasonText;
  } else {
    targetId = paramsOrId;
    targetStatus = status!;
  }

  try {
    const backendStatus = mapStatusToBackend(targetStatus);
    const body: any = { status: backendStatus };
    if (targetLat !== undefined) body.latitude = targetLat;
    if (targetLng !== undefined) body.longitude = targetLng;
    if (targetReason !== undefined && targetReason.trim() !== "") body.reasonText = targetReason;

    const response = await apiClient.put(
      `${API_ENDPOINTS.ORDERS}/${targetId}/status`,
      body
    );
    return response.data;
  } catch (error: any) {
    console.error("Error updating order status:", error.message);
    throw error;
  }
};

async function uploadToR2WithRetry(
  uploadUrl: string,
  photoUri: string,
  contentType: string,
  filename: string,
  maxRetries = 3
): Promise<void> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", contentType);

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Error subiendo foto a R2: HTTP ${xhr.status} - ${xhr.responseText}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Error de conexión de red al subir la evidencia a Cloudflare R2"));
        };

        if (photoUri.startsWith("data:")) {
          try {
            const base64Part = photoUri.split(",")[1] || photoUri;
            const byteChars = atob(base64Part);
            const byteNumbers = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
              byteNumbers[i] = byteChars.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: contentType });
            xhr.send(blob);
          } catch (blobErr: any) {
            xhr.send({ uri: photoUri, type: contentType, name: filename } as any);
          }
        } else {
          xhr.send({ uri: photoUri, type: contentType, name: filename } as any);
        }
      });
      return; // Éxito
    } catch (err: any) {
      lastError = err;
      console.warn(`[Cloudflare R2] Intento ${attempt}/${maxRetries} falló: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 800));
      }
    }
  }

  throw lastError;
}

export const uploadEvidencePhoto = async (
  routeAssignmentId: string,
  photoUri: string,
  signatureText?: string
): Promise<string> => {
  try {
    const extension = photoUri.endsWith(".png") ? "png" : "jpeg";
    const contentType = `image/${extension}`;
    const objectKey = `evidence-${Date.now()}.${extension}`;

    // 1. Obtener Presigned URL del backend
    const presignedRes = await apiClient.post(`${API_ENDPOINTS.ORDERS}/presigned-url`, {
      key: objectKey,
      contentType: contentType,
    });

    const presignedData = presignedRes.data?.data || presignedRes.data || presignedRes;
    const { uploadUrl, publicUrl } = presignedData;

    if (!uploadUrl || !publicUrl) {
      throw new Error("No se pudo obtener la URL de subida de Cloudflare R2");
    }

    // 2. Subir a Cloudflare R2 con reintentos automáticos
    await uploadToR2WithRetry(uploadUrl, photoUri, contentType, objectKey, 3);

    // 3. Registrar la URL en el backend
    const evidenceBody: any = { s3Url: publicUrl };
    if (signatureText) {
      evidenceBody.signatureText = signatureText;
    }

    const finalRes = await apiClient.post(
      `${API_ENDPOINTS.ORDERS}/${routeAssignmentId}/evidence`,
      evidenceBody
    );

    const assignment = finalRes.data?.data || finalRes.data || finalRes;
    if (assignment && assignment.evidences && assignment.evidences.length > 0) {
      return assignment.evidences[0].s3Url;
    }
    return publicUrl;
  } catch (error: any) {
    console.error("Error uploading evidence photo:", error.message);
    throw error;
  }
};

export const uploadGroupEvidencePhoto = async (
  routeAssignmentIds: string[],
  photoUri: string,
  signatureText?: string
): Promise<string> => {
  try {
    const extension = photoUri.endsWith(".png") ? "png" : "jpeg";
    const contentType = `image/${extension}`;
    const objectKey = `evidence-${Date.now()}.${extension}`;

    // 1. Obtener Presigned URL del backend (1 sola llamada a R2)
    const presignedRes = await apiClient.post(`${API_ENDPOINTS.ORDERS}/presigned-url`, {
      key: objectKey,
      contentType: contentType,
    });

    const presignedData = presignedRes.data?.data || presignedRes.data || presignedRes;
    const { uploadUrl, publicUrl } = presignedData;

    if (!uploadUrl || !publicUrl) {
      throw new Error("No se pudo obtener la URL de subida de Cloudflare R2");
    }

    // 2. Subir el archivo físico a Cloudflare R2 con reintentos automáticos
    await uploadToR2WithRetry(uploadUrl, photoUri, contentType, objectKey, 3);

    // 3. Registrar la misma URL en todas las filas de Evidence de las asignaciones consolidadas
    await apiClient.post(`${API_ENDPOINTS.ORDERS}/group-evidence`, {
      assignmentIds: routeAssignmentIds,
      s3Url: publicUrl,
      signatureText: signatureText || undefined,
    });

    return publicUrl;
  } catch (error: any) {
    console.error("Error uploading group evidence photo:", error.message);
    throw error;
  }
};

export const reorderAssignments = async (
  driverId: string,
  routeAssignmentIds: string[]
): Promise<any> => {
  try {
    const response = await apiClient.patch(`${API_ENDPOINTS.ORDERS}/reorder`, {
      driverId,
      routeAssignmentIds,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error reordering assignments:", error.message);
    throw error;
  }
};
