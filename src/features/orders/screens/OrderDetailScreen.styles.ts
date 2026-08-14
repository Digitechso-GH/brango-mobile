import { StyleSheet, Platform } from "react-native";
import { colors, commonStyles, shadows } from "../../../shared/theme/theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    ...commonStyles.header,
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    paddingBottom: 12,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerBackIcon: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonText: {
    color: colors.surface,
    fontWeight: "700",
  },
  card: {
    ...commonStyles.card,
    marginBottom: 14,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  tableRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.borderSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  tableLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tableValue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "right",
    flexShrink: 1,
  },
  tableValueAddress: {
    maxWidth: "60%",
  },
  tableRowDivider: {
    height: 1,
    backgroundColor: colors.background,
    marginVertical: 2,
  },
  infoBanner: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  infoBannerText: {
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 16,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 16,
  },
  takePhotoButton: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primaryBorder,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  takePhotoButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  takePhotoSubtext: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  photoPreviewBox: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoImage: {
    width: "100%",
    height: 260,
    resizeMode: "contain",
  },
  retakePhotoButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: "center",
  },
  retakePhotoText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "700",
  },
  textArea: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.textPrimary,
    textAlignVertical: "top",
  },
  footerButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  halfBtn: {
    flex: 1,
  },
});
