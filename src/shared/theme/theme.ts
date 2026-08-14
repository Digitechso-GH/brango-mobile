import { StyleSheet } from "react-native";

export const colors = {
  primary: "#3D5FFF",
  primaryHover: "#2B47E0",
  primaryLight: "#F0F4FF",
  primaryBorder: "#C7D2FE",

  surface: "#FFFFFF",
  background: "#F8FAFC",

  border: "#E2E8F0",
  borderSubtle: "#F1F5F9",

  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",

  success: "#10B981",
  successLight: "#ECFDF5",

  danger: "#EF4444",
  dangerLight: "#FEF2F2",

  warning: "#F59E0B",
  warningLight: "#FEF3C7",
};

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
};

export const commonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: {
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
});
