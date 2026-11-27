import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";

import { fonts } from "../../constants/typography";
import { useThemeColors } from "../../context/ThemeContext";
import { useExploreStyles } from "./exploreStyles";

/** Weekly challenge progress bar. */
export default function WeeklyChallenge({ weeklyProgress }) {
    const colors = useThemeColors();
    const styles = useExploreStyles();

    const pct = Math.min((weeklyProgress.completed / weeklyProgress.target) * 100, 100);

    return (
        <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontFamily: fonts.heading.bold, color: colors.textSecondary, fontSize: 12 }}>WEEKLY CHALLENGE</Text>
                <Text style={{ fontFamily: fonts.heading.bold, color: colors.primary, fontSize: 12 }}>
                    {weeklyProgress.completed} / {weeklyProgress.target}
                </Text>
            </View>
            <View style={styles.progressBarContainer}>
                <LinearGradient
                    colors={["#FFD700", "#FFA500"]}
                    style={[
                        styles.progressBarFill,
                        { width: `${pct}%` },
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                />
            </View>
        </View>
    );
}