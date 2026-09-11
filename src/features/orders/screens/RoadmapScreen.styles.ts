import { StyleSheet, Platform, StatusBar } from "react-native";
import { colors } from "../../../shared/theme/theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 36),
    paddingBottom: 12,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    flexShrink: 1,
    marginRight: 8,
  },
  map: {
    width: "100%",
    height: "55%",
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
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    color: "#64748B",
    fontWeight: "600",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  logoutBtnDisabled: {
    opacity: 0.5,
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  logoutBtnText: {
    color: "#334155",
    fontSize: 12.5,
    fontWeight: "600",
  },
  logoutBtnTextDisabled: {
    color: "#94A3B8",
  },
  backToRoutesBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingRight: 8,
    gap: 4,
  },
  backToRoutesText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
  },
});
