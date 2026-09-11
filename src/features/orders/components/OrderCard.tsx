import Svg, { Path, Circle } from "react-native-svg";
import React, { useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

  const isInTransit = order.status === ORDER_STATUS.IN_TRANSIT;
  const isDelivered = order.status === ORDER_STATUS.DELIVERED;
  const isObserved = order.status === ORDER_STATUS.OBSERVED || order.status === ORDER_STATUS.FAILED;

  const getCardStyle = () => {
    if (isInTransit) return styles.inTransitCard;
    if (isDelivered) return styles.deliveredCard;
    if (isObserved) return styles.observedCard;
    if (isActive) return styles.activeCard;
    return null;
  };

  const getNumberCircleStyle = () => {
    if (isInTransit) return styles.inTransitNumberCircle;
    if (isDelivered) return styles.deliveredNumberCircle;
    if (isObserved) return styles.observedNumberCircle;
    if (isActive) return styles.activeNumberCircle;
    return null;
  };

  const getNumberTextStyle = () => {
    if (isInTransit || isActive) return styles.whiteNumberText;
    if (isDelivered) return styles.deliveredNumberText;
    if (isObserved) return styles.observedNumberText;
    return null;
  };

  const getChevronColor = () => {
    if (isInTransit) return "#D97706";
    if (isDelivered) return "#059669";
    if (isObserved) return "#DC2626";
    if (isActive) return "#3D5FFF";
    return "#CBD5E1";
  };

  const stopNumber = (typeof order.sequenceIndex === "number" && order.sequenceIndex > 0)
    ? order.sequenceIndex
    : (index + 1);

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={[
          styles.card,
          getCardStyle(),
          isLocked && styles.lockedCard,
        ]}
        onPress={handleTap}
        disabled={isLocked}
        activeOpacity={0.75}
      >
        {/* 1. Número Circular (Izquierda) */}
        <View style={[styles.numberCircle, getNumberCircleStyle()]}>
          <Text style={[styles.numberText, getNumberTextStyle()]}>
            {stopNumber}
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

        {/* 3. Doble flechita para indicar visualmente los 2 taps hacia el detalle del pedido */}
        <TouchableOpacity
          onPress={() => onSelectOrder && onSelectOrder(order.id)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.chevronButton}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="chevron-double-right" size={20} color={getChevronColor()} />
        </TouchableOpacity>
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
      return { label: "En curso", bg: "#FEF3C7", text: "#D97706" };
    }
    if (isCompleted) {
      return { label: "Completada", bg: "#ECFDF5", text: "#059669" };
    }
    return { label: "Pendiente", bg: "#F1F5F9", text: "#64748B" };
  };

  const badge = getStatusBadge();

  const getSubtitle = () => {
    if (isCompleted) {
      return `${route.totalOrders} ${route.totalOrders === 1 ? "pedido entregado" : "pedidos entregados"}`;
    }
    if (route.pendingOrders > 0) {
      return `${route.pendingOrders} ${route.pendingOrders === 1 ? "pedido pendiente" : "pedidos pendientes"}`;
    }
    if (route.completedOrders > 0) {
      return `${route.completedOrders} ${route.completedOrders === 1 ? "pedido entregado" : "pedidos entregados"}`;
    }
    return `${route.totalOrders} ${route.totalOrders === 1 ? "pedido" : "pedidos"}`;
  };

  const iconBg = isInTransit ? "#FEF3C7" : isCompleted ? "#DCFCE7" : "#F1F5F9";
  const iconColor = isInTransit ? "#D97706" : isCompleted ? "#059669" : "#64748B";

  return (
    <TouchableOpacity
      style={[
        styles.routeCard,
        isInTransit && styles.inTransitRouteCard,
        isCompleted && styles.completedRouteCard,
      ]}
      onPress={() => onSelectRoute(route.id)}
      activeOpacity={0.75}
    >
      <View style={[styles.routeIconCircle, { backgroundColor: iconBg }]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 18c0-3.5 2.5-6 6.5-6h1c4 0 6.5-2.5 6.5-6"
            stroke={iconColor}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <Circle cx={5} cy={18} r={2.8} fill={iconColor} />
          <Circle cx={19} cy={6} r={2.8} fill={iconColor} />
        </Svg>
      </View>

      <View style={styles.routeMainInfo}>
        <View style={styles.routeTitleRow}>
          <Text style={styles.routeNameText} numberOfLines={1}>
            {route.name}
          </Text>
          <View style={[styles.routeBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.routeBadgeText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        <Text style={styles.routeSubtitleText}>
          {getSubtitle()}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={isInTransit ? "#D97706" : "#CBD5E1"}
      />
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
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inTransitCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1.5,
  },
  deliveredCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  observedCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  activeCard: {
    borderColor: "#3D5FFF",
    backgroundColor: "#F0F4FF",
    borderWidth: 1.5,
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
  inTransitNumberCircle: {
    backgroundColor: "#F59E0B",
  },
  deliveredNumberCircle: {
    backgroundColor: "#D1FAE5",
  },
  observedNumberCircle: {
    backgroundColor: "#FEE2E2",
  },
  activeNumberCircle: {
    backgroundColor: "#3D5FFF",
  },
  numberText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  whiteNumberText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  deliveredNumberText: {
    color: "#059669",
    fontWeight: "800",
  },
  observedNumberText: {
    color: "#DC2626",
    fontWeight: "800",
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
  chevronButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  groupBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  groupBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: 0.3,
  },
  groupedOrdersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  orderChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  orderChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  orderChipDelivered: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10B981",
  },
  routeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inTransitRouteCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1.5,
  },
  completedRouteCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  routeIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  routeMainInfo: {
    flex: 1,
    justifyContent: "center",
  },
  routeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeNameText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  routeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  routeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  routeSubtitleText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
});
