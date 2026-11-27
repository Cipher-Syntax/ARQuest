import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { getRankDetails } from "../../utils/leaderboard";
import { useLeaderboardStyles } from "./leaderboardStyles";

/**
 * Sticky bottom bar showing the signed-in student's position. The caller adds
 * the bottom inset so the bar clears Android's navigation buttons.
 */
export default function MyRankBar({ myRankItem, myRankPosition, bottomInset = 0, onPress }) {
    const styles = useLeaderboardStyles();

    return (
        <View
            style={[
                styles.myRankStickyBar,
                { paddingBottom: Math.max(bottomInset, 10) },
            ]}
        >
            <View style={styles.myRankStickyLeft}>
                <View style={styles.myRankStickyBadge}>
                    <Text style={styles.myRankStickyBadgeText}>
                        #{myRankItem.rank || myRankPosition}
                    </Text>
                </View>
                <View>
                    <Text style={styles.myRankStickyTitle}>YOUR RANKING</Text>
                    <Text style={styles.myRankStickyPoints}>
                        {myRankItem.points.toLocaleString()} XP •{" "}
                        {getRankDetails(myRankItem.points, myRankItem.rank_info).title}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.myRankStickyBtn}
                onPress={onPress}
            >
                <Text style={styles.myRankStickyBtnText}>MY PROFILE</Text>
                <ChevronRight size={14} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
}
