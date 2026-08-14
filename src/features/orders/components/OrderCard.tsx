import React, { useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ORDER_STATUS } from "../constants/order-status";
import { OrderCardProps } from "../types/orders.types";

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
          <Text style={styles.titleText} numberOfLines={1}>
            {clientName}
          </Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {address}
          </Text>
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

      {/* Botones de Reordenación flotantes a la izquierda, visibles sólo si está pendiente */}
      {!isLocked && order.status === ORDER_STATUS.PENDING && (onMoveUp || onMoveDown) && (
        <View style={styles.reorderContainer}>
          {onMoveUp && (
            <TouchableOpacity style={styles.reorderBtn} onPress={onMoveUp} activeOpacity={0.7}>
              <Text style={styles.reorderBtnText}>▲</Text>
            </TouchableOpacity>
          )}
          {onMoveDown && (
            <TouchableOpacity style={styles.reorderBtn} onPress={onMoveDown} activeOpacity={0.7}>
              <Text style={styles.reorderBtnText}>▼</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
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
});
