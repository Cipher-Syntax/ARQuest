import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { fonts } from "../../constants/typography";
import { useThemeColors } from "../../context/ThemeContext";
import { useExploreStyles } from "./exploreStyles";

/** One daily quest brief. */
export default function DailyQuestCard({ quest, spacing, colors, onPress }) {
    const styles = useExploreStyles();

    let badgeColor = "#CD7F32"; // Bronze for Easy
    let difficultyLabel = "EASY";
    if (quest.difficulty === "MEDIUM") {
        badgeColor = "#C0C0C0";
        difficultyLabel = "MEDIUM";
    }
    if (quest.difficulty === "HARD") {
        badgeColor = "#FFD700";
        difficultyLabel = "HARD";
    }

    return (
        <View
            style={{
                marginBottom: spacing.md,
                opacity: quest.is_completed ? 0.5 : 1,
            }}
        >
            <View style={[styles.questBriefBox, { borderColor: badgeColor, borderWidth: 1 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Text
                        style={{
                            fontFamily: fonts.heading.bold,
                            color: colors.textPrimary,
                            fontSize: 16,
                            flex: 1,
                        }}
                    >
                        {quest.title}
                    </Text>
                    <View style={{ backgroundColor: badgeColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ color: "#FFF", fontFamily: fonts.heading.bold, fontSize: 10 }}>{difficultyLabel}</Text>
                    </View>
                </View>
                <Text
                    style={{
                        fontFamily: fonts.body.regular,
                        color: colors.textSecondary,
                        fontSize: 13,
                        marginBottom: 8,
                    }}
                >
                    Target: {quest.target_building_name}
                </Text>
                {quest.hint && (
                    <Text style={styles.questHint}>
                        Hint: "{quest.hint}"
                    </Text>
                )}
                {quest.is_completed && (
                    <Text style={{ fontFamily: fonts.heading.bold, color: colors.success, fontSize: 12, marginTop: 4 }}>
                        ✓ COMPLETED
                    </Text>
                )}
                {!quest.is_completed && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <View style={[styles.compassContainer, { marginTop: 0 }]}>
                            <Ionicons name="gift" size={18} color={colors.primary} />
                            <Text style={styles.compassText}>
                                Reward: {quest.reward_points} EXP
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={{
                                backgroundColor: colors.primary,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 6,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                            }}
                            onPress={onPress}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="compass" size={14} color="#FFF" />
                            <Text style={{ fontFamily: fonts.heading.bold, color: "#FFF", fontSize: 11, letterSpacing: 0.5 }}>
                                START MISSION
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}