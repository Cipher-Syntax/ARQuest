import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Sparkles, Unlock } from "lucide-react-native";
import { theme } from "../../theme/tokens";

/**
 * Success modal shown after a QR code unlocks a building.
 *
 * Demo Mode unlocks are labelled so exhibitors (and visitors) know the unlock
 * does not require being near the building and will revert when demo ends.
 */
export default function ARUnlockedModal({
    visible,
    onDismiss,
    buildingName,
    isDemo,
    alreadyUnlocked,
}) {
    if (!visible) return null;

    const accent = isDemo ? "#B45309" : theme.colors.primary;
    const tagline = alreadyUnlocked
        ? "ACCESS ALREADY ACTIVE"
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
                    <View
                        style={[
                            styles.iconWrap,
                            { backgroundColor: accent + "15" },
                        ]}
                    >
                        {isDemo ? (
                            <Sparkles size={32} color={accent} />
                        ) : (
                            <Unlock size={32} color={accent} />
                        )}
                    </View>

                    <Text style={[styles.tagline, { color: accent }]}>
                        {tagline}
                    </Text>
                    <Text style={styles.title}>
                        {buildingName || "Building Unlocked"}
                    </Text>

                    <Text style={styles.message}>
                        {alreadyUnlocked
                            ? "This building is already available in your collection."
                            : isDemo
                              ? "Demo Mode skipped the location check, so this unlock works from anywhere. It is kept separate from real progress and reverts when Demo Mode is turned off."
                              : "You are within range of this building. Its AR content and quests are now available."}
                    </Text>

                    {isDemo && !alreadyUnlocked && (
                        <View style={styles.noteBox}>
                            <Text style={styles.noteText}>
                                DEMO UNLOCK — NOT SAVED TO REAL PROGRESS
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: accent }]}
                        onPress={onDismiss}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.actionText}>
                            {alreadyUnlocked ? "GOT IT" : "START EXPLORING"}
                        </Text>
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
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    tagline: {
        fontSize: 11,
        fontWeight: "700",
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
        marginBottom: 20,
        width: "100%",
    },
    noteBox: {
        width: "100%",
        backgroundColor: "#B45309" + "12",
        borderRadius: theme.radius.md,
        padding: 12,
        marginBottom: 20,
    },
    noteText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#B45309",
        textAlign: "center",
        letterSpacing: 0.5,
    },
    actionBtn: {
        width: "100%",
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
