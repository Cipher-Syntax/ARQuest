import React from "react";
import { Dimensions, ScrollView, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { useThemeColors } from "../../context/ThemeContext";
import ChallengeIdleTicket from "./ChallengeIdleTicket";
import ChallengeTicket from "./ChallengeTicket";
import { useHomeStyles } from "./homeStyles";

/** TIME-LIMITED QUESTS rail; hides expired and already-completed tickets. */
export default function LimitedChallenges({ challenges }) {
    const colors = useThemeColors();
    const styles = useHomeStyles();
    const screenWidth = Dimensions.get("window").width;

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                    TIME-LIMITED QUESTS
                </Text>
                {challenges.length > 1 && (
                    <View style={styles.swipeHint}>
                        <Text style={styles.swipeHintText}>
                            SWIPE
                        </Text>
                        <ChevronRight
                            color={colors.textMuted}
                            size={12}
                        />
                    </View>
                )}
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.ticketScroll}
                contentContainerStyle={
                    styles.ticketScrollContent
                }
                snapToInterval={screenWidth - 60}
                decelerationRate="fast"
            >
                {challenges.length > 0 ? (
                    challenges.map((challenge) => {
                        const expires = new Date(
                            challenge.expires_at,
                        );
                        const isExpired =
                            expires < new Date();
                        if (
                            isExpired ||
                            challenge.is_completed
                        )
                            return null;

                        return (
                            <ChallengeTicket
                                key={challenge.id}
                                challenge={challenge}
                                expiresAt={expires}
                            />
                        );
                    })
                ) : (
                    <ChallengeIdleTicket />
                )}
            </ScrollView>
        </View>
    );
}
