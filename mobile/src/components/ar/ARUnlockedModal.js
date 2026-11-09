import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Box, CircleCheck, Map, MapPin } from "lucide-react-native";
import { theme } from "../../theme/tokens";

/**
 * Success modal shown after a QR code unlocks a building.
 *
 * Demo Mode unlocks look and behave exactly like a real unlock; only the
 * tagline tells the exhibitor that the location check was skipped.
 */
export default function ARUnlockedModal({
    visible,
    onDismiss,
    buildingName,
    isDemo,
    alreadyUnlocked,
}) {
    if (!visible) return null;

    const tagline = alreadyUnlocked
        ? "ALREADY UNLOCKED"
        : isDemo
          ? "DEMO UNLOCK"
          : "QR UNLOCKED";

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={onDismiss}
                />
                <View style={styles.card}>
                    <View style={styles.iconWrap}>
                        <CircleCheck size={34} color={theme.colors.primary} />
                    </View>

                    <Text style={styles.tagline}>{tagline}</Text>
                    <Text style={styles.title}>
                        {buildingName || "Building Unlocked"}
                    </Text>

                    <Text style={styles.message}>
                        {alreadyUnlocked
                            ? "This building is already in your collection."
                            : "This building is now unlocked. Its AR content and quests are available."}
                    </Text>

                    <View style={styles.guideBox}>
                        <Text style={styles.guideTitle}>WHERE TO FIND IT</Text>
                        <View style={styles.guideRow}>
                            <Map size={15} color={theme.colors.primary} />
                            <Text style={styles.guideText}>
                                Open the{" "}
                                <Text style={styles.guideStrong}>Maps</Text> tab
                            </Text>
                        </View>
                        <View style={styles.guideRow}>
                            <MapPin size={15} color={theme.colors.primary} />
                            <Text style={styles.guideText}>
                                Tap this building on the map
                            </Text>
                        </View>
                        <View style={styles.guideRow}>
                            <Box size={15} color={theme.colors.primary} />
                            <Text style={styles.guideText}>
                                View 3D Model, Virtual Tour, or Take Quiz
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={onDismiss}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.actionText}>START EXPLORING</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    card: {
        width: "100%",
        maxWidth: 360,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 28,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 12,
    },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: theme.colors.primary + "15",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    tagline: {
        fontSize: 11,
        fontWeight: "700",
        color: theme.colors.primary,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginBottom: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: theme.colors.textPrimary,
        marginBottom: 16,
        textAlign: "center",
    },
    message: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 16,
        width: "100%",
    },
    guideBox: {
        width: "100%",
        backgroundColor: theme.colors.bgSecondary,
        borderRadius: theme.radius.md,
        padding: 14,
        marginBottom: 20,
        gap: 8,
    },
    guideTitle: {
        fontSize: 10,
        fontWeight: "700",
        color: theme.colors.textMuted,
        letterSpacing: 1,
        marginBottom: 2,
    },
    guideRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    guideText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    guideStrong: {
        fontWeight: "700",
        color: theme.colors.textPrimary,
    },
    actionBtn: {
        width: "100%",
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: theme.radius.md,
        alignItems: "center",
    },
    actionText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
});
