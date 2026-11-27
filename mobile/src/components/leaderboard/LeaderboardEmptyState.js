import React from "react";
import { Text, View } from "react-native";
import { Trophy } from "lucide-react-native";

import { useLeaderboardStyles } from "./leaderboardStyles";

/**
 * Shared empty/blocked state used by the disabled leaderboard notice and the
 * "no explorers found" list placeholder.
 */
export default function LeaderboardEmptyState({ icon, title, subtitle }) {
    const styles = useLeaderboardStyles();

    return (
        <View style={styles.emptyContainer}>
            {icon || <Trophy size={48} color="#CBD5E1" />}
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptySubtitle}>{subtitle}</Text>
        </View>
    );
}
