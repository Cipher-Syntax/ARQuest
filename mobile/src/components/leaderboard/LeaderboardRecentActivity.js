import React from "react";
import { Text, View } from "react-native";
import { Clock } from "lucide-react-native";

import { useThemeColors } from "../../context/ThemeContext";
import { useLeaderboardStyles } from "./leaderboardStyles";

/** Footer feed of the five most recent quest completions. */
export default function LeaderboardRecentActivity({ recentActivity }) {
    const colors = useThemeColors();
    const styles = useLeaderboardStyles();

    return (
        <View style={{ marginTop: 24, marginBottom: 50 }}>
            <View style={styles.sectionHeader}>
                <Clock size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>RECENT QUESTS TAKEN</Text>
            </View>

            {recentActivity.length > 0 ? (
                <View style={styles.recentContainer}>
                    {recentActivity.slice(0, 5).map((activity, idx) => (
                        <View key={idx} style={styles.recentItem}>
                            <View style={styles.recentDot} />
                            <View style={styles.recentContent}>
                                <Text style={styles.recentUser}>
                                    <Text style={{ fontWeight: "bold", color: "#111827" }}>
                                        @{activity.username}
                                    </Text>{" "}
                                    completed
                                </Text>
                                <Text style={styles.recentQuest} numberOfLines={1}>
                                    "{activity.quest_title}" at {activity.building_name}
                                </Text>
                                <Text style={styles.recentPoints}>
                                    +{activity.points} EXP Earned
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <Text style={styles.emptyTextSmall}>
                    No quests completed yet today.
                </Text>
            )}
        </View>
    );
}
