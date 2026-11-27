import React from "react";
import { Text, View } from "react-native";
import { Trophy } from "lucide-react-native";

import { useThemeColors } from "../../context/ThemeContext";
import { useLeaderboardStyles } from "./leaderboardStyles";

/** "Campus Rankings" / "Search Results" divider above the ranked list. */
export default function RankListHeader({ filteredCount, isFiltering }) {
    const colors = useThemeColors();
    const styles = useLeaderboardStyles();

    return (
        <View style={styles.listHeaderRow}>
            <Trophy size={16} color={colors.primary} />
            <Text style={styles.listHeaderTitle}>
                {isFiltering ? "SEARCH RESULTS" : "CAMPUS RANKINGS"}
            </Text>
            <Text style={styles.listHeaderCount}>
                ({filteredCount} explorers)
            </Text>
        </View>
    );
}
