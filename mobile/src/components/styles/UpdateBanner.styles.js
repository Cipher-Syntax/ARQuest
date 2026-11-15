import { StyleSheet } from "react-native";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { fonts } from "../../constants/typography";
import { toRgba } from "../../utils/color";

export const createUpdateBannerStyles = (colors, spacing, radius, typography) => StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.70)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    modalCard: {
        width: "100%",
        maxWidth: 360,
        borderRadius: 6, // Strict 6px standard
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 6, // Strict 6px standard
        backgroundColor: toRgba(colors.primary, 0.08), // WMSU Crimson soft tint
        borderWidth: 1,
        borderColor: toRgba(colors.primary, 0.18),
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        alignSelf: "center",
    },
    headerRow: {
        marginBottom: 20,
        alignItems: "center",
    },
    title: {
        fontFamily: fonts?.heading?.bold || "System",
        color: colors.textPrimary,
        fontWeight: "800",
        fontSize: 18,
        marginBottom: 6,
        textAlign: "center",
        letterSpacing: 0.3,
    },
    subtitle: {
        fontFamily: fonts?.body?.regular || "System",
        color: colors.textSecondary,
        fontWeight: "400",
        fontSize: 13,
        lineHeight: 19,
        textAlign: "center",
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        width: "100%",
    },
    updateButton: {
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: 6, // Strict 6px standard
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    singleButton: {
        flex: 0,
        minWidth: 160,
        alignSelf: "center",
    },
    updateButtonDisabled: {
        opacity: 0.7,
    },
    updateButtonText: {
        fontFamily: fonts?.heading?.bold || "System",
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 13,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    updatingContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dismissButton: {
        minHeight: 44,
        borderRadius: 6, // Strict 6px standard
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "transparent",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
        flex: 1,
    },
    dismissButtonDisabled: {
        opacity: 0.6,
    },
    dismissText: {
        fontFamily: fonts?.heading?.bold || "System",
        color: colors.textSecondary,
        fontWeight: "700",
        fontSize: 13,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
});

export const useUpdateBannerStyles = () =>
    useThemedStyles(createUpdateBannerStyles);
