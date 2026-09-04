import { StyleSheet, Platform } from "react-native";
import { colors } from "../../../shared/theme/theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 52 : 34,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  map: {
    width: "100%",
    height: "50%",
  },
  listContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  countBadgeText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  logoutBtn: {
    marginLeft: "auto",
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  logoutBtnDisabled: {
    backgroundColor: "#E2E8F0",
  },
  logoutBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  backToRoutesBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  backToRoutesText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
});
