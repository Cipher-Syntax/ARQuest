import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, Trophy } from "lucide-react-native";

import { useThemeColors } from "../../context/ThemeContext";
import { useLeaderboardStyles } from "./leaderboardStyles";

/** Top bar of the Global Rankings screen. */
export default function LeaderboardHeader({ onBack }) {
    const colors = useThemeColors();
    const styles = useLeaderboardStyles();

    return (
        <View style={styles.header}>
            <TouchableOpacity
                onPress={onBack}
                style={styles.backButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <ArrowLeft color="#111827" size={22} />
            </TouchableOpacity>

            <View style={styles.headerTitleWrap}>
                <Text style={styles.title}>GLOBAL RANKINGS</Text>
                <Text style={styles.subtitle}>WMSU Student Explorer Leaderboard</Text>
            </View>

            <View style={styles.trophyIconHeader}>
                <Trophy size={20} color={colors.primary} />
            </View>
        </View>
    );
}
