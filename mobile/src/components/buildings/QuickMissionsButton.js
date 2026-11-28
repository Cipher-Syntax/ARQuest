import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Floating Quick Missions Button (right side of map).
 * Shows mission count badge when unlocked, lock icon when locked.
 * Hidden during route planning (routeTarget set) and active navigation (isRouteActive).
 */
export function QuickMissionsButton({
    role,
    viewMode,
    isRouteActive,
    routeTarget,
    modalVisible,
    quickQuests,
    isQuickUnlocked,
    dailyProgress,
    onPress,
    styles,
    colors,
}) {
    if (
        role !== "student" ||
        viewMode !== "map" ||
        modalVisible ||
        isRouteActive ||
        routeTarget
    ) {
        return null;
    }

    return (
        <TouchableOpacity
            style={[
                styles.floatingQuickMissionsBtn,
                // routeTarget not directly available here, parent handles bottom offset
            ]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <View style={styles.floatingQuickAvatarWrap}>
                <Image
                    source={require("../../../assets/images/characters/justine_avatar.png")}
                    style={styles.floatingQuickAvatar}
                />
                {isQuickUnlocked ? (
                    <View style={styles.floatingQuestBadge}>
                        <Text style={styles.floatingQuestBadgeText}>
                            {quickQuests.length}
                        </Text>
                    </View>
                ) : (
                    <View style={[styles.floatingQuestBadge, { backgroundColor: "#6B7280" }]}>
                        <Ionicons name="lock-closed" size={9} color="#FFFFFF" />
                    </View>
                )}
            </View>
            <View style={styles.floatingQuickInfo}>
                <Text style={styles.floatingQuickTitle}>MISSIONS</Text>
                <Text style={[styles.floatingQuickSub, isQuickUnlocked && { color: colors.success }]}>
                    {isQuickUnlocked ? "Unlocked 🎯" : "Locked 🔒"}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export default QuickMissionsButton;