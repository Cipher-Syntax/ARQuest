import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Trophy } from "lucide-react-native";

import { useThemeColors } from "../../context/ThemeContext";
import { getDisplayName, getRankDetails } from "../../utils/leaderboard";
import StudentAvatar from "./StudentAvatar";
import { useLeaderboardStyles } from "./leaderboardStyles";

/**
 * Campus Hall of Fame podium. Hidden while a search term or quick filter is
 * active so the list shows the full result set.
 */
export default function LeaderboardPodium({ top3, searchTerm, activeFilter, onSelectStudent }) {
    const colors = useThemeColors();
    const styles = useLeaderboardStyles();

    const firstPlace = top3[0] || null;
    const secondPlace = top3[1] || null;
    const thirdPlace = top3[2] || null;

    if (!(top3.length > 0 && !searchTerm && activeFilter === "all")) return null;

    return (
        <View style={styles.podiumCard}>
            {/* Podium Header */}
            <View style={styles.podiumHeader}>
                <View style={styles.podiumBadge}>
                    <Trophy size={13} color={colors.primary} />
                    <Text style={styles.podiumBadgeText}>CAMPUS HALL OF FAME</Text>
                </View>
                <Text style={styles.podiumTitle}>Top Explorer Champions</Text>
            </View>

            {/* 3 Pedestal Layout */}
            <View style={styles.podiumRow}>
                {/* 2nd Place (Silver - Left) */}
                {secondPlace ? (
                    <TouchableOpacity
                        style={styles.podiumCol}
                        onPress={() => onSelectStudent({ ...secondPlace, rank: 2 })}
                        activeOpacity={0.85}
                    >
                        <View style={styles.podiumAvatarWrap}>
                            <StudentAvatar student={secondPlace} size={54} borderColor="#94A3B8" />
                            <View style={[styles.rankPillMini, { backgroundColor: "#E2E8F0", borderColor: "#94A3B8" }]}>
                                <Text style={[styles.rankPillMiniText, { color: "#334155" }]}>🥈 #2</Text>
                            </View>
                        </View>

                        <Text style={styles.podiumName} numberOfLines={1}>
                            {getDisplayName(secondPlace)}
                        </Text>
                        <Text style={styles.podiumRankTitle} numberOfLines={1}>
                            {getRankDetails(secondPlace.points, secondPlace.rank_info).title}
                        </Text>
                        <View style={styles.podiumExpPill}>
                            <Text style={styles.podiumExpText}>
                                {secondPlace.points.toLocaleString()} XP
                            </Text>
                        </View>

                        {/* Silver Pedestal */}
                        <LinearGradient
                            colors={["#E2E8F0", "#CBD5E1", "#94A3B8"]}
                            style={[styles.pedestalBlock, { height: 95 }]}
                        >
                            <Text style={[styles.pedestalNumber, { color: "#64748B" }]}>2</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.podiumCol} />
                )}

                {/* 1st Place (Gold - Center - Elevated) */}
                {firstPlace ? (
                    <TouchableOpacity
                        style={[styles.podiumCol, styles.podiumColFirst]}
                        onPress={() => onSelectStudent({ ...firstPlace, rank: 1 })}
                        activeOpacity={0.85}
                    >
                        {/* Floating Crown */}
                        <View style={styles.crownWrap}>
                            <Text style={{ fontSize: 22 }}>👑</Text>
                        </View>

                        <View style={styles.podiumAvatarWrap}>
                            <StudentAvatar student={firstPlace} size={66} borderColor="#F59E0B" />
                            <View style={[styles.rankPillMini, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
                                <Trophy size={10} color="#B45309" />
                                <Text style={[styles.rankPillMiniText, { color: "#92400E" }]}>#1 LEAD</Text>
                            </View>
                        </View>

                        <Text style={[styles.podiumName, styles.podiumNameFirst]} numberOfLines={1}>
                            {getDisplayName(firstPlace)}
                        </Text>
                        <Text style={[styles.podiumRankTitle, { color: "#D97706", fontWeight: "700" }]} numberOfLines={1}>
                            {getRankDetails(firstPlace.points, firstPlace.rank_info).title}
                        </Text>
                        <View style={[styles.podiumExpPill, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                            <Text style={[styles.podiumExpText, { color: "#FFFFFF" }]}>
                                {firstPlace.points.toLocaleString()} XP
                            </Text>
                        </View>

                        {/* Gold Pedestal */}
                        <LinearGradient
                            colors={["#FDE68A", "#F59E0B", "#D97706"]}
                            style={[styles.pedestalBlock, { height: 130 }]}
                        >
                            <Text style={[styles.pedestalNumber, { color: "#78350F" }]}>1</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.podiumCol} />
                )}

                {/* 3rd Place (Bronze - Right) */}
                {thirdPlace ? (
                    <TouchableOpacity
                        style={styles.podiumCol}
                        onPress={() => onSelectStudent({ ...thirdPlace, rank: 3 })}
                        activeOpacity={0.85}
                    >
                        <View style={styles.podiumAvatarWrap}>
                            <StudentAvatar student={thirdPlace} size={54} borderColor="#D97706" />
                            <View style={[styles.rankPillMini, { backgroundColor: "#FFEDD5", borderColor: "#FB923C" }]}>
                                <Text style={[styles.rankPillMiniText, { color: "#9A3412" }]}>🥉 #3</Text>
                            </View>
                        </View>

                        <Text style={styles.podiumName} numberOfLines={1}>
                            {getDisplayName(thirdPlace)}
                        </Text>
                        <Text style={styles.podiumRankTitle} numberOfLines={1}>
                            {getRankDetails(thirdPlace.points, thirdPlace.rank_info).title}
                        </Text>
                        <View style={styles.podiumExpPill}>
                            <Text style={styles.podiumExpText}>
                                {thirdPlace.points.toLocaleString()} XP
                            </Text>
                        </View>

                        {/* Bronze Pedestal */}
                        <LinearGradient
                            colors={["#FED7AA", "#FB923C", "#EA580C"]}
                            style={[styles.pedestalBlock, { height: 75 }]}
                        >
                            <Text style={[styles.pedestalNumber, { color: "#7C2D12" }]}>3</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.podiumCol} />
                )}
            </View>
        </View>
    );
}
