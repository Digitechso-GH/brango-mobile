import React, { useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { ORDER_STATUS } from "../constants/order-status";
import { OrderCardProps, Order } from "../types/orders.types";

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  index,
  isActive,
  isLocked,
  onFocusOrder,
  onSelectOrder,
  onMoveUp,
  onMoveDown,
}) => {
  const lastTapRef = useRef<number | null>(null);

  const handleTap = () => {
    if (isLocked) return;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      lastTapRef.current = null;
      if (onSelectOrder) {
        onSelectOrder(order.id);
      }
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          lastTapRef.current = null;
          if (onFocusOrder) {
            onFocusOrder(order);
          }
        }
      }, 250);
    }
  };

  const cleanText = (text?: string | null) => {
    if (!text) return "";
    return text.replace(/\s*-\s*Matriz/gi, "").replace(/\s*Matriz/gi, "").trim();
  };

  const clientName = cleanText(order.client || order.recipientName || `Pedido #${order.code}`);
  const address = cleanText(order.address || "—");

  // Color del Pin SVG según el estado:
  const getPinColor = (status?: string) => {
    switch (status) {
      case ORDER_STATUS.IN_TRANSIT:
        return "#F59E0B";
      case ORDER_STATUS.DELIVERED:
        return "#10B981";
      case ORDER_STATUS.OBSERVED:
      case ORDER_STATUS.FAILED:
        return "#EF4444";
      case ORDER_STATUS.PENDING:
      default:
        return "#94A3B8";
    }
  };

  const pinColor = getPinColor(order.status);

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={[
          styles.card,
          isActive && styles.activeCard,
          isLocked && styles.lockedCard,
        ]}
        onPress={handleTap}
        disabled={isLocked}
        activeOpacity={0.75}
      >
        {/* 1. Número Circular (Izquierda) */}
        <View style={[styles.numberCircle, isActive && styles.activeNumberCircle]}>
          <Text style={[styles.numberText, isActive && styles.activeNumberText]}>
            {index + 1}
          </Text>
        </View>

        {/* 2. Información del Pedido: Cliente y Dirección (Centro) */}
        <View style={styles.contentContainer}>
          {order.groupedOrders && order.groupedOrders.length > 1 && (
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>
                PARADA COMPARTIDA ({order.groupedOrders.length})
              </Text>
            </View>
          )}
          <Text style={styles.titleText} numberOfLines={1}>
            {clientName}
          </Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {address}
          </Text>
          {order.groupedOrders && order.groupedOrders.length > 1 && (
            <View style={styles.groupedOrdersRow}>
              {order.groupedOrders.map((sub, idx) => (
                <View key={sub.id || idx} style={styles.orderChip}>
                  <Text style={styles.orderChipText}>
                    #{sub.code}{sub.waybill ? ` · ${sub.waybill}` : ""}
                  </Text>
                  {sub.status === ORDER_STATUS.DELIVERED && (
                    <Text style={styles.orderChipDelivered}>✓</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 3. SVG del Pin de Ubicación Oficial BranGo (Derecha) */}
        <View style={styles.pinContainer}>
          <Svg viewBox="0 0 100 120" width={20} height={24} fill="none">
            <Path
              d="M50 0C22.3858 0 0 22.3858 0 50C0 82.5 50 120 50 120C50 120 100 82.5 100 50C100 22.3858 77.6142 0 50 0Z"
              fill={pinColor}
            />
          </Svg>
        </View>
      </TouchableOpacity>

    </View>
  );
};

export interface RouteGroup {
  id: string;
  name: string;
  status: "PENDING" | "IN_TRANSIT" | "COMPLETED" | "OBSERVED";
  date: string;
  sequenceIndex?: number;
  overviewPolyline?: string | null;
  orders: Order[];
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  observedOrders?: number;
  originSedeName?: string;
}

interface RouteCardProps {
  route: RouteGroup;
  onSelectRoute: (routeId: string) => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({ route, onSelectRoute }) => {
  const isInTransit = route.status === "IN_TRANSIT";
  const isCompleted = route.status === "COMPLETED";

  const getStatusBadge = () => {
    if (isInTransit) {
      return { label: "En Curso", bg: "#FEF3C7", text: "#D97706" };
    }
    if (isCompleted) {
      return { label: "✓ Completada", bg: "#ECFDF5", text: "#059669" };
    }
    return { label: "Pendiente", bg: "#F1F5F9", text: "#64748B" };
  };

  const badge = getStatusBadge();

  return (
    <TouchableOpacity
      style={[
        styles.routeCard,
        isInTransit && styles.inTransitRouteCard,
      ]}
      onPress={() => onSelectRoute(route.id)}
      activeOpacity={0.75}
    >
      {/* 1. Header de la Cartilla de Ruta (Ícono, Nombre, Badge de Estado) */}
      <View style={styles.routeHeaderRow}>
        <View style={styles.routeIconContainer}>
          <Ionicons name={isInTransit ? "car-outline" : "map-outline"} size={22} color={isInTransit ? "#D97706" : "#3D5FFF"} />
        </View>

        <View style={styles.routeTitleContainer}>
          <Text style={styles.routeNameText} numberOfLines={1}>
            {route.name}
          </Text>
        </View>

        <View style={[styles.routeBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.routeBadgeText, { color: badge.text }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.routeDivider} />

      {/* 2. Métricas Reales y Flecha Limpia */}
      <View style={styles.routeFooterRow}>
        <View style={styles.routeStatsContainer}>
          <View style={styles.routeStatPill}>
            <Text style={styles.routeStatPillLabel}>Total:</Text>
            <Text style={styles.routeStatPillValue}>{route.totalOrders}</Text>
          </View>

          {route.pendingOrders > 0 && (
            <View style={[styles.routeStatPill, styles.routePendingPill]}>
              <Text style={styles.routePendingText}>
                {route.pendingOrders} Pendientes
              </Text>
            </View>
          )}

          {route.completedOrders > 0 && (
            <View style={[styles.routeStatPill, styles.routeCompletedPill]}>
              <Text style={styles.routeCompletedText}>
                {route.completedOrders} Entregados
              </Text>
            </View>
          )}

          {!!route.observedOrders && route.observedOrders > 0 && (
            <View style={[styles.routeStatPill, { backgroundColor: "#FEF2F2" }]}>
              <Text style={{ fontSize: 11, color: "#EF4444", fontWeight: "800" }}>
                {route.observedOrders} Observados
              </Text>
            </View>
          )}
        </View>

        <View style={styles.routeArrowContainer}>
          <Text style={styles.routeArrowText}>➔</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  activeCard: {
    borderColor: "#3D5FFF",
    backgroundColor: "#F0F4FF",
  },
  lockedCard: {
    opacity: 0.45,
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  activeNumberCircle: {
    backgroundColor: "#E2E8F0",
  },
  numberText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  activeNumberText: {
    color: "#475569",
  },
  contentContainer: {
    flex: 1,
    marginHorizontal: 14,
    justifyContent: "center",
  },
  titleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 3,
  },
  addressText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
  },
  pinContainer: {
    width: 28,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  reorderContainer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    gap: 4,
  },
  reorderBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  reorderBtnText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "bold",
  },
  routeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  inTransitRouteCard: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  routeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  routeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  routeTitleContainer: {
    flex: 1,
  },
  routeNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  routeOriginText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
  },
  routeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  routeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  routeDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  routeFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeStatsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  routeStatPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  routeStatPillLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  routeStatPillValue: {
    fontSize: 11,
    color: "#0F172A",
    fontWeight: "800",
  },
  routePendingPill: {
    backgroundColor: "#F1F5F9",
  },
  routePendingText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "800",
  },
  routeCompletedPill: {
    backgroundColor: "#ECFDF5",
  },
  routeCompletedText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "800",
  },
  routeArrowContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  routeActionPrompt: {
    fontSize: 12,
    fontWeight: "800",
    color: "#3D5FFF",
  },
  routeArrowText: {
    fontSize: 12,
    color: "#3D5FFF",
    fontWeight: "bold",
  },
  groupBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 3,
  },
  groupBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: 0.5,
  },
  groupedOrdersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 5,
  },
  orderChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    gap: 2,
  },
  orderChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
  },
  orderChipDelivered: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10B981",
  },
});
