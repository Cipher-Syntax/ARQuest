import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fonts } from "../../constants/typography";
import { useThemeColors } from "../../context/ThemeContext";
import { useExploreStyles } from "./exploreStyles";

/** Campus Explorer progress bar (unlocked / total buildings). */
export default function ProgressTracker({
    unlockedCount,
    totalBuildings,
}) {
    const colors = useThemeColors();
    const styles = useExploreStyles();

    const progressPercentage =
        totalBuildings > 0 ? (unlockedCount / totalBuildings) * 100 : 0;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
                <Text
                    style={[
                        styles.cardTitle,
                        {
                            color: colors.textPrimary,
                            fontSize: 20,
                            fontFamily: fonts.heading.bold,
                        },
                    ]}
                >
                    Campus Explorer
                </Text>
            </View>
            <Text
                style={{
                    fontFamily: fonts.body.regular,
                    color: colors.textSecondary,
                    fontSize: 14,
                    marginBottom: 16,
                }}
            >
                Collect stamps from every landmark
            </Text>
            <Text
                style={{
                    fontFamily: fonts.heading.bold,
                    color: colors.textPrimary,
                    fontSize: 24,
                    marginBottom: 12,
                }}
            >
                {unlockedCount}{" "}
                <Text
                    style={{
                        fontFamily: fonts.body.regular,
                        fontSize: 14,
                        color: colors.textSecondary,
                    }}
                >
                    / {totalBuildings || 15}
                </Text>
            </Text>
            <View style={styles.progressBarContainer}>
                <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={[
                        styles.progressBarFill,
                        { width: `${progressPercentage}%` },
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                />
            </View>
        </View>
    );
}