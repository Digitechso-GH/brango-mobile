import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { ORDER_STATUS_DETAILS, ORDER_STATUS } from "../../../features/orders/constants/order-status";

interface StatusBadgeProps {
  status?: string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status = ORDER_STATUS.PENDING, label }) => {
  const badgeInfo = ORDER_STATUS_DETAILS[status] || ORDER_STATUS_DETAILS[ORDER_STATUS.PENDING];
  const displayLabel = label || badgeInfo.label;

  return (
    <View style={[styles.badge, { backgroundColor: badgeInfo.bg }]}>
      <Text style={[styles.badgeText, { color: badgeInfo.text }]}>{displayLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
