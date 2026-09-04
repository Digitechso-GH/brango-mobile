import { MOBILE_STATUS_MAP } from "../constants/order-status";

export interface SedeOrigen {
  id?: string;
  nombre?: string;
}

export interface Order {
  id: string;
  code: string;
  waybill: string;
  client: string;
  recipientName?: string;
  recipientDoc?: string;
  recipientPhone?: string;
  warehouseContact?: string;
  address: string;
  rawAddress: string;
  formattedAddress?: string | null;
  status: keyof typeof MOBILE_STATUS_MAP;
  rawState?: string;
  reasonText?: string | null;
  latitude: number | null;
  longitude: number | null;
  originText?: string | null;
  originLatitude?: number | null;
  originLongitude?: number | null;
  evidenceUrl?: string;
  originSede?: SedeOrigen;
  updatedAt?: string;
  sequenceIndex?: number;
  stopGroupId?: string | null;
  groupedOrders?: Order[];
}

export interface OrderCardProps {
  order: Order;
  index: number;
  isActive?: boolean;
  isLocked?: boolean;
  onFocusOrder?: (order: Order) => void;
  onSelectOrder?: (orderId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}
