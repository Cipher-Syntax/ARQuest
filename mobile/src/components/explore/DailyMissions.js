import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fonts } from "../../constants/typography";
import { useThemeColors } from "../../context/ThemeContext";
import { useExploreStyles } from "./exploreStyles";
import DailyQuestCard from "./DailyQuestCard";
import WeeklyChallenge from "./WeeklyChallenge";

/** Daily Missions section with weekly challenge + quest list. */
export default function DailyMissions({
    activeQuests,
    weeklyProgress,
    onQuestPress,
}) {
    const colors = useThemeColors();
    const styles = useExploreStyles();

    return (
        <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
                <Text
                    style={[
                        styles.cardTitle,
                        { color: colors.textPrimary, fontSize: 20, fontFamily: fonts.heading.bold },
                    ]}
                >
                    Daily Missions
                </Text>
                <View style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ color: "#FFF", fontFamily: fonts.heading.bold, fontSize: 10, letterSpacing: 1 }}>
                        {activeQuests.length} TASKS
                    </Text>
                </View>
            </View>

            <WeeklyChallenge weeklyProgress={weeklyProgress} />

            {activeQuests.length > 0 ? (
                activeQuests.map((quest) => (
                    <DailyQuestCard
                        key={quest.id}
                        quest={quest}
                        spacing={styles}
                        colors={colors}
                        onPress={() => onQuestPress(quest)}
                    />
                ))
            ) : (
                <Text style={styles.emptyLogText}>
                    No active missions. Check back later!
                </Text>
            )}
        </View>
    );
}