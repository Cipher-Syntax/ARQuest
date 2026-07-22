import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../theme/tokens";

export default function BrandedSelfieFrame({ buildingName, visible }) {
    if (!visible) return null;

    const currentDate = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    return (
        <View style={styles.container} pointerEvents="none">
            {/* Top branding bar */}
            <View style={styles.topBar}>
                <Text style={styles.logoText}>ARQuest</Text>
                <Text style={styles.tagline}>Campus Explorer</Text>
            </View>

            {/* Bottom branding bar */}
            <View style={styles.bottomBar}>
                <View style={styles.visitedContainer}>
                    <Text style={styles.visitedLabel}>I visited</Text>
                    <Text style={styles.buildingNameLarge}>{buildingName}</Text>
                </View>
                <Text style={styles.dateText}>{currentDate}</Text>
            </View>

            {/* Decorative corner frames */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: "none",
    },
    topBar: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 16,
        backgroundColor: "rgba(15, 65, 74, 0.85)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 3,
        borderBottomColor: theme.colors.primary,
    },
    logoText: {
        fontSize: 28,
        fontWeight: "700",
        color: theme.colors.textPrimary,
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 12,
        fontWeight: "500",
        color: theme.colors.accent,
        textTransform: "uppercase",
        letterSpacing: 2,
    },
    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 20,
        paddingHorizontal: 24,
        backgroundColor: "rgba(15, 65, 74, 0.85)",
        borderTopWidth: 3,
        borderTopColor: theme.colors.primary,
    },
    visitedContainer: {
        marginBottom: 8,
    },
    visitedLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: theme.colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    buildingNameLarge: {
        fontSize: 24,
        fontWeight: "700",
        color: theme.colors.accent,
    },
    dateText: {
        fontSize: 12,
        fontWeight: "400",
        color: theme.colors.textMuted,
    },
    corner: {
        position: "absolute",
        width: 40,
        height: 40,
        borderColor: theme.colors.accent,
        borderWidth: 3,
    },
    topLeft: {
        top: 50,
        left: 12,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: 50,
        right: 12,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: 12,
        left: 12,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: 12,
        right: 12,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
});
