import { StyleSheet } from "react-native";

import { fonts } from "../../constants/typography";
import { toRgba } from "../../utils/color";
import { useThemedStyles } from "../../hooks/useThemedStyles";

/**
 * Styles for the Explore screen and its panels.
 * Extracted verbatim from app/(tabs)/explore.js; keys are unchanged so the
 * presentational components stay 1:1 with the previous markup.
 */
export const createExploreStyles = (colors, spacing, radius, typography) => StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: spacing.lg,
        paddingBottom: 40,
    },
    header: {
        alignItems: "center",
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
    },
    title: {
        fontFamily: fonts.heading.bold,
        fontSize: 34,
        fontWeight: "900",
        color: colors.primary,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 6,
    },
    radarContainer: {
        alignItems: "center",
        justifyContent: "center",
        height: 250,
        marginBottom: spacing.xl,
    },
    radarRing: {
        position: "absolute",
        width: 170,
        height: 170,
        borderRadius: 85,
        borderWidth: 1,
        borderColor: toRgba(colors.primary, 0.2),
        backgroundColor: toRgba(colors.primary, 0.02),
    },
    radarRingActive: {
        borderColor: toRgba(colors.primary, 0.6),
        backgroundColor: toRgba(colors.primary, 0.08),
    },
    radarDashedRing: {
        position: "absolute",
        width: 210,
        height: 210,
        borderRadius: 105,
        borderWidth: 2,
        borderColor: toRgba(colors.primary, 0.4),
        borderStyle: "dashed",
    },
    radarButtonWrapper: {
        width: 140,
        height: 140,
        borderRadius: 70,
    },
    radarButton: {
        flex: 1,
        borderRadius: 70,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "rgba(255,255,255,0.4)",
    },
    radarButtonText: {
        fontFamily: fonts.heading.bold,
        color: "white",
        fontSize: 15,
        marginTop: 8,
        letterSpacing: 1,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.06)",
        overflow: "hidden",
    },
    cardHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.lg,
    },
    cardTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: colors.textPrimary,
        letterSpacing: 1,
        marginLeft: 10,
    },
    telemetryGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    telemetryPill: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: radius.lg,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    telemetryLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    telemetryValue: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: colors.primary,
    },
    loadingBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg,
    },
    loadingText: {
        fontFamily: fonts.body.medium,
        color: colors.textSecondary,
        marginLeft: spacing.md,
        fontSize: 15,
    },
    divider: {
        height: 1,
        backgroundColor: "#F3F4F6",
        marginVertical: spacing.xl,
    },
    targetBox: {
        flexDirection: "column",
        alignItems: "stretch",
        padding: 16,
        borderRadius: radius.lg,
        borderWidth: 1.5,
    },
    targetSearching: {
        backgroundColor: "#F9FAFB",
        borderColor: "#E5E7EB",
    },
    targetLocked: {
        backgroundColor: "#FFF0F0",
        borderColor: "#FECACA",
    },
    targetUnlocked: {
        backgroundColor: "#10B981", // Clean success green
        borderColor: "#059669",
    },
    targetBuildingImageWrap: {
        width: "100%",
        height: 160,
        marginBottom: spacing.md,
        borderRadius: radius.md,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.9)",
        alignItems: "center",
        justifyContent: "center",
    },
    targetBuildingImage: {
        width: "100%",
        height: "100%",
    },
    targetInfo: {
        width: "100%",
    },
    targetName: {
        fontFamily: fonts.heading.bold,
        fontSize: 18,
        color: colors.textPrimary,
        marginBottom: 6,
        textAlign: "center",
    },
    targetDistance: {
        fontFamily: fonts.body.medium,
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
    },
    targetUnlockGuide: {
        marginTop: spacing.md,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
    },
    targetUnlockGuideTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 11,
        color: colors.primary,
        letterSpacing: 0.6,
    },
    targetUnlockGuideText: {
        fontFamily: fonts.body.medium,
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
    },
    targetOpenScannerButton: {
        marginTop: spacing.xs,
        minHeight: 44,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
    },
    targetOpenScannerButtonText: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: colors.white,
        letterSpacing: 0.5,
    },
    targetContentGuide: {
        marginTop: spacing.md,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: "rgba(255,255,255,0.16)",
        gap: spacing.xs,
    },
    targetContentGuideTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 11,
        color: colors.white,
        letterSpacing: 0.6,
        marginBottom: spacing.xs,
    },
    targetContentGuideText: {
        fontFamily: fonts.body.medium,
        fontSize: 12,
        color: colors.white,
        lineHeight: 17,
    },
    textWhite: {
        color: colors.white,
    },
    noTargetBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backgroundColor: "#F9FAFB",
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderStyle: "dashed",
    },
    noTargetText: {
        fontFamily: fonts.body.medium,
        color: colors.textSecondary,
        fontSize: 15,
    },
    nearbyRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
    },
    nearbyDivider: {
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    nearbyIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    nearbyIconWrapperActive: {
        backgroundColor: colors.primary,
    },
    nearbyInfo: {
        flex: 1,
    },
    nearbyName: {
        fontFamily: fonts.heading.bold,
        color: colors.textPrimary,
        fontSize: 17,
        marginBottom: 6,
    },
    nearbyDistBadge: {
        alignSelf: "flex-start",
        backgroundColor: toRgba(colors.primary, 0.08),
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    nearbyDistance: {
        fontFamily: fonts.body.bold,
        color: colors.primary,
        fontSize: 13,
    },
    navigateBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginLeft: 12,
    },
    navigateText: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 12,
        marginLeft: 6,
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: "#F3F4F6",
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 12,
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 6,
    },
    progressText: {
        fontFamily: fonts.body.medium,
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "right",
    },
    questBriefBox: {
        backgroundColor: colors.white,
        padding: 16,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        marginBottom: 12,
    },
    questHint: {
        fontFamily: fonts.body.regular,
        fontSize: 16,
        color: colors.textPrimary,
        fontStyle: "italic",
        lineHeight: 24,
    },
    compassContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    compassText: {
        fontFamily: fonts.heading.bold,
        fontSize: 15,
        color: colors.primary,
        marginLeft: 8,
    },
    emptyLogText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.textSecondary,
    },
});

export const useExploreStyles = () => useThemedStyles(createExploreStyles);

export default useExploreStyles;