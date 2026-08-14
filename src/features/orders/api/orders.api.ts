import { Platform } from "react-native";
import axios from "axios";
import { apiClient } from "../../../shared/api/client";
import { API_ENDPOINTS } from "../../../shared/config/env";
import { mapStatusFromBackend, mapStatusToBackend } from "../constants/order-status";
import { Order } from "../types/orders.types";
import { RouteAssignmentSchema, OrderSchema } from "../types/orders.schemas";
import { z } from "zod";

export type { Order };

const parseNumberCoordinate = (val: any): number | null => {
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "number" ? val : parseFloat(val);
  return isNaN(num) ? null : num;
};

export const fetchAssignedOrders = async (driverId?: string): Promise<Order[]> => {
  try {
    const params: any = { todayOnly: true };
    if (driverId && driverId.trim() !== "") {
      params.driverId = driverId.trim();
    }

    const res = await apiClient.get(API_ENDPOINTS.ORDERS, { params });
    const rawData = res.data;
    const backendOrders = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.data)
      ? rawData.data
      : [];

    return backendOrders.map((o: any): Order => {
      // 1. Validar estrictamente los datos que provienen del Backend usando Zod
      OrderSchema.parse(o);
      if (o.assignments) {
        z.array(RouteAssignmentSchema).parse(o.assignments);
      }

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
        status: assignment ? mapStatusFromBackend(assignment.status) : "PENDING",
        rawState: assignment ? assignment.status : "PENDING",
        reasonText: assignment?.status === "OBSERVED" ? assignment?.reasonText || null : null,
        latitude: parseNumberCoordinate(o.latitude),
        longitude: parseNumberCoordinate(o.longitude),
        originText: assignment?.originAddress || null,
        originLatitude: parseNumberCoordinate(assignment?.originLatitude),
        originLongitude: parseNumberCoordinate(assignment?.originLongitude),
        evidenceUrl: rawEvidence,
        updatedAt: assignment?.updatedAt ?? o.updatedAt,
        sequenceIndex: assignment ? assignment.sequenceIndex : 0,
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

export const uploadEvidencePhoto = async (
  routeAssignmentId: string,
  photoUri: string,
  signatureText?: string
): Promise<string> => {
  try {
    const filename = photoUri.split("/").pop() || `evidence_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const contentType = match ? `image/${match[1]}` : "image/jpeg";

    // 1. Obtener Presigned URL del backend
    const presignedRes = await apiClient.post(`${API_ENDPOINTS.ORDERS}/presigned-url`, {
      key: `evidence-${Date.now()}-${filename}`,
    });
    
    const presignedData = presignedRes.data?.data || presignedRes.data || presignedRes;
    const { uploadUrl, publicUrl } = presignedData;

    if (!uploadUrl || !publicUrl) {
      throw new Error("No se pudo obtener la URL de subida de Cloudflare R2");
    }

    // 2. Preparar el binario
    const response = await fetch(photoUri);
    const fileBody = await response.blob();

    // 3. Subir el archivo físico directamente a Cloudflare R2
    const r2Response = await fetch(uploadUrl, {
      method: "PUT",
      body: fileBody,
      headers: {
        "Content-Type": contentType,
      },
    });

    if (!r2Response.ok) {
      throw new Error(`Error subiendo foto a R2: ${r2Response.statusText}`);
    }

    // 4. Registrar la URL en el backend
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
