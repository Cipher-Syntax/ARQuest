import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

export const GeoStatusIndicator = ({
    status,
    buildingName,
    permissionDenied,
    mockedGPS,
    onRetry,
    // Optional guidance line for the "inside" state. Callers that own an
    // explicit unlock flow (Explore) pass a hint; AR leaves it unset.
    insideSubText = null,
}) => {
    const colors = useThemeColors();
    const styles = useThemedStyles(createStyles);
    const getStatusConfig = () => {
        if (permissionDenied) {
            return {
                color: colors.error,
                bg: "#FFF0F0",
                border: "#FFCACA",
                text: "Location access denied.",
                subText: "Enable GPS in device settings to unlock buildings.",
                icon: "warning",
                actionLabel: "Open Settings",
                onAction: () => Linking.openSettings(),
            };
        }

        if (mockedGPS) {
            return {
                color: colors.error,
                bg: "#FFF0F0",
                border: "#FFCACA",
                text: "Fake GPS Detected",
                subText: "Disable mock location apps to use ARQuest.",
                icon: "ban",
                actionLabel: "Open Settings",
                onAction: () => Linking.openSettings(),
            };
        }

        switch (status) {
            case "inside":
                return {
                    color: colors.primary,
                    bg: "#FFF5F5",
                    border: "rgba(127,3,3,0.2)",
                    text: buildingName ? `Inside ${buildingName}` : "Inside Building",
                    subText: insideSubText,
                    icon: "location",
                    actionLabel: null,
                    onAction: null,
                };
            case "nearby":
                return {
                    color: colors.accent,
                    bg: "#F0F8FB",
                    border: "rgba(150,192,206,0.3)",
                    text: buildingName ? `Near ${buildingName}` : "Near Building",
                    subText: "Keep moving closer to unlock.",
                    icon: "navigate",
                    actionLabel: null,
                    onAction: null,
                };
            case "weak_signal":
                return {
                    color: "#CC8800",
                    bg: "#FFFBF0",
                    border: "#FFE5A0",
                    text: "Weak GPS Signal",
                    subText: "Accuracy too low to verify your location (>50m). Step outside or find open sky.",
                    icon: "cellular",
                    actionLabel: "Retry GPS",
                    onAction: onRetry,
                };
            case "loading":
                return {
                    color: colors.textSecondary,
                    bg: "#F5F5F5",
                    border: "rgba(0,0,0,0.08)",
                    text: "Getting Location...",
                    subText: null,
                    icon: "time-outline",
                    actionLabel: null,
                    onAction: null,
                };
            default:
                return {
                    color: colors.textSecondary,
                    bg: "#F5F5F5",
                    border: "rgba(0,0,0,0.08)",
                    text: "Outside Campus",
                    subText: null,
                    icon: "map-outline",
                    actionLabel: null,
                    onAction: null,
                };
        }
    };

    const config = getStatusConfig();

    return (
        <View style={[styles.container, { borderLeftColor: config.color, backgroundColor: config.bg, borderColor: config.border }]}>
            <Ionicons name={config.icon} size={20} color={config.color} style={styles.icon} />
            <View style={styles.textGroup}>
                <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
                {config.subText && (
                    <Text style={[styles.subText, { color: config.color }]}>{config.subText}</Text>
                )}
            </View>
            {config.actionLabel && config.onAction && (
                <TouchableOpacity
                    style={[styles.actionButton, { borderColor: config.color }]}
                    onPress={config.onAction}
                    activeOpacity={0.75}
                >
                    <Text style={[styles.actionText, { color: config.color }]}>{config.actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const createStyles = (colors, spacing, radius, typography) => StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderRadius: radius.md,
        marginVertical: spacing.xs,
    },
    icon: {
        marginRight: spacing.sm,
    },
    textGroup: {
        flex: 1,
    },
    text: {
        fontSize: typography.sm,
        fontWeight: "600",
    },
    subText: {
        fontSize: 12,
        fontWeight: "400",
        marginTop: 2,
        opacity: 0.8,
    },
    actionButton: {
        borderWidth: 1,
        borderRadius: radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginLeft: spacing.sm,
    },
    actionText: {
        fontSize: 12,
        fontWeight: "700",
    },
});
