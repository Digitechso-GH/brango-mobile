import { StyleSheet, Platform } from "react-native";
import { colors } from "../../../shared/theme/theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerBackButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  errorText: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // Parada Conjunta Block
  groupedCard: {
    backgroundColor: "#F0F5FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  groupedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  groupedTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1E3A8A",
  },
  groupedSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
    lineHeight: 16,
  },
  groupedOrdersList: {
    gap: 8,
  },
  groupedOrderItem: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupedOrderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  groupedOrderCode: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 8,
  },
  groupedOrderClient: {
    fontSize: 12,
    color: "#64748B",
    flexShrink: 1,
  },
  badgePending: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePendingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },
  badgeDelivered: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeDeliveredText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },

  // Information List
  infoList: {
    marginBottom: 22,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  infoIconBox: {
    width: 24,
    marginRight: 12,
    marginTop: 2,
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F172A",
    lineHeight: 18,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },

  infoBanner: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  infoBannerText: {
    fontSize: 12,
    color: "#1D4ED8",
    lineHeight: 16,
    fontWeight: "500",
  },

  // Photo / Evidence
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },
  takePhotoButton: {
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    borderStyle: "dashed",
    borderRadius: 14,
    backgroundColor: "#FAFCFF",
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  takePhotoButtonText: {
    color: colors.primary,
    fontSize: 13.5,
    fontWeight: "600",
    marginTop: 6,
  },
  photoPreviewBox: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  photoImage: {
    width: "100%",
    height: 240,
    resizeMode: "cover",
  },
  retakePhotoButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    alignItems: "center",
  },
  retakePhotoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  // Comment Box
  commentSection: {
    marginBottom: 14,
  },
  commentLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: "#0F172A",
    textAlignVertical: "top",
    minHeight: 80,
  },

  // Footer Buttons
  footerContainer: {
    width: "100%",
  },
  footerPrimaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  footerPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "700",
  },
  footerSecondaryButton: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  footerSecondaryButtonText: {
    color: "#EF4444",
    fontSize: 13.5,
    fontWeight: "600",
  },
});
