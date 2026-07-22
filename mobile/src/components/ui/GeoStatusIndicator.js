import React from "react";
import { View, Text, StyleSheet } from "react-native";
import theme from "../theme/tokens";

export const GeoStatusIndicator = ({
    status,
    buildingName,
    permissionDenied,
}) => {
    const getStatusConfig = () => {
        if (permissionDenied) {
            return {
                color: theme.colors.error,
                text: "Location Permission Denied",
                icon: "⚠️",
            };
        }

        switch (status) {
            case "inside":
                return {
                    color: theme.colors.primary,
                    text: buildingName
                        ? `Inside ${buildingName}`
                        : "Inside Building",
                    icon: "📍",
                };
            case "nearby":
                return {
                    color: theme.colors.accent,
                    text: buildingName
                        ? `Near ${buildingName}`
                        : "Near Building",
                    icon: "📌",
                };
            case "weak_signal":
                return {
                    color: theme.colors.warning,
                    text: "Weak GPS Signal",
                    icon: "📶",
                };
            case "loading":
                return {
                    color: theme.colors.textSecondary,
                    text: "Getting Location...",
                    icon: "⏳",
                };
            default:
                return {
                    color: theme.colors.textSecondary,
                    text: "Outside Campus",
                    icon: "🗺️",
                };
        }
    };

    const config = getStatusConfig();

    return (
        <View style={[styles.container, { borderLeftColor: config.color }]}>
            <Text style={styles.icon}>{config.icon}</Text>
            <Text style={[styles.text, { color: config.color }]}>
                {config.text}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderLeftWidth: 4,
        borderRadius: theme.radius.sm,
        marginVertical: theme.spacing.xs,
    },
    icon: {
        fontSize: 20,
        marginRight: theme.spacing.sm,
    },
    text: {
        fontSize: theme.typography.md,
        fontWeight: "600",
    },
});
