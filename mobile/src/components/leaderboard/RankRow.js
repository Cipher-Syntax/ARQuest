import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "../../context/ThemeContext";
import { getDisplayName, getRankDetails } from "../../utils/leaderboard";
import StudentAvatar from "./StudentAvatar";
import { useLeaderboardStyles } from "./leaderboardStyles";

/** One ranked student row. */
function RankRow({ item, rank, isMe, onSelect }) {
    const colors = useThemeColors();
    const styles = useLeaderboardStyles();
    const rankDetails = getRankDetails(item.points, item.rank_info);

    return (
        <TouchableOpacity
            style={[styles.rankRow, isMe && styles.myRankRow]}
            onPress={() => onSelect({ ...item, rank })}
            activeOpacity={0.8}
        >
            {/* Rank Number Badge */}
            <View style={styles.rankPositionWrap}>
                <Text style={[styles.rankPositionText, isMe && { color: colors.primary }]}>
                    #{rank}
                </Text>
            </View>

            {/* Avatar */}
            <View style={styles.avatarWrap}>
                <StudentAvatar
                    student={item}
                    size={44}
                    borderColor={isMe ? colors.primary : "#E2E8F0"}
                />
            </View>

            {/* Student Info */}
            <View style={styles.studentInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Text style={[styles.studentName, isMe && styles.myStudentName]} numberOfLines={1}>
                        {getDisplayName(item)}
                    </Text>
                    {isMe && (
                        <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>YOU</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.studentUsername} numberOfLines={1}>
                    @{item.username}
                </Text>

                {/* Rank Tier Badge */}
                <View style={[styles.rankTierBadge, { backgroundColor: rankDetails.bg, borderColor: rankDetails.border }]}>
                    <Text style={styles.rankTierIcon}>{rankDetails.icon}</Text>
                    <Text style={[styles.rankTierTitle, { color: rankDetails.color }]}>
                        {rankDetails.title}
                    </Text>
                </View>
            </View>

            {/* Score & Quests */}
            <View style={styles.scoreWrap}>
                <View style={[styles.pointsBadge, isMe && styles.pointsBadgeMy]}>
                    <Text style={[styles.pointsText, isMe && styles.pointsTextMy]}>
                        {item.points.toLocaleString()} XP
                    </Text>
                </View>
                {item.quests_completed !== undefined && (
                    <Text style={styles.questsCountText}>
                        {item.quests_completed} cleared
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

export default React.memo(RankRow);
