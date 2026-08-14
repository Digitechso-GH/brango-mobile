export const ORDER_STATUS = {
  PENDING: "PENDING",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  OBSERVED: "OBSERVED",
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export const MOBILE_STATUS_MAP = ORDER_STATUS;

export const mapStatusFromBackend = (status?: string): OrderStatus => {
  if (!status) return ORDER_STATUS.PENDING;
  const upper = status.toUpperCase();
  if (upper === ORDER_STATUS.IN_TRANSIT) return ORDER_STATUS.IN_TRANSIT;
  if (upper === ORDER_STATUS.DELIVERED) return ORDER_STATUS.DELIVERED;
  if (upper === ORDER_STATUS.FAILED) return ORDER_STATUS.FAILED;
  if (upper === ORDER_STATUS.OBSERVED) return ORDER_STATUS.OBSERVED;
  return ORDER_STATUS.PENDING;
};

export const mapStatusToBackend = (status?: string): string => {
  if (!status) return ORDER_STATUS.PENDING;
  return mapStatusFromBackend(status);
};

export const ORDER_STATUS_DETAILS: Record<
  string,
  { label: string; pinColor: string; bg: string; text: string }
> = {
  [ORDER_STATUS.PENDING]: {
    label: "Pendiente",
    pinColor: "#64748B",
    bg: "#F1F5F9",
    text: "#475569",
  },
  [ORDER_STATUS.IN_TRANSIT]: {
    label: "En camino",
    pinColor: "#EF4444",
    bg: "#FFFBEB",
    text: "#D97706",
  },
  [ORDER_STATUS.DELIVERED]: {
    label: "Entregado",
    pinColor: "#10B981",
    bg: "#ECFDF5",
    text: "#059669",
  },
  [ORDER_STATUS.FAILED]: {
    label: "Observado",
    pinColor: "#EF4444",
    bg: "#FEF2F2",
    text: "#DC2626",
  },
  [ORDER_STATUS.OBSERVED]: {
    label: "Observado",
    pinColor: "#EF4444",
    bg: "#FEF2F2",
    text: "#DC2626",
  },
};
