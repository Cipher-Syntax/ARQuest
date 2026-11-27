import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Crown, TrendingUp, Trophy, Users } from "lucide-react-native";

import { useThemeColors } from "../../context/ThemeContext";
import { toRgba } from "../../utils/color";
import { useLeaderboardStyles } from "./leaderboardStyles";

/**
 * The four KPI cards double as quick filters. Tapping Total or Top Score
 * behaves differently from Average/Legends, which toggle themselves off.
 */
export default function LeaderboardMetricCards({
    metrics,
    avgRankDetails,
    activeFilter,
    onSelectFilter,
    onOpenTopStudent,
    filteredCount,
}) {
    const colors = useThemeColors();
    const styles = useLeaderboardStyles();

    return (
        <>
            <View style={styles.metricsGrid}>
                {/* Total Explorers */}
                <TouchableOpacity
                    style={[
                        styles.metricCard,
                        activeFilter === "all" && styles.metricCardActive,
                    ]}
                    onPress={() => onSelectFilter("all")}
                    activeOpacity={0.8}
                >
                    <View style={styles.metricCardAccentWrapper}>
                        <View style={[styles.metricIconWrap, { backgroundColor: toRgba(colors.primary, 0.1) }]}>
                            <Users size={18} color={colors.primary} />
                        </View>
                        <Text style={styles.metricCardEmoji}>👥</Text>
                    </View>
                    <View style={styles.metricCardContent}>
                        <Text style={styles.metricLabel}>TOTAL EXPLORERS</Text>
                        <Text style={styles.metricValueLarge}>{metrics.totalStudents}</Text>
                        <Text style={styles.metricSubLarge}>All registered</Text>
                    </View>
                </TouchableOpacity>

                {/* Top Campus Score */}
                <TouchableOpacity
                    style={[styles.metricCard, styles.metricCardAmber]}
                    onPress={onOpenTopStudent}
                    activeOpacity={0.8}
                >
                    <View style={styles.metricCardAccentWrapper}>
                        <View style={[styles.metricIconWrap, { backgroundColor: "#FEF3C7" }]}>
                            <Trophy size={18} color="#D97706" />
                        </View>
                        <Text style={styles.metricCardEmoji}>🏆</Text>
                    </View>
                    <View style={styles.metricCardContent}>
                        <Text style={styles.metricLabel}>TOP SCORE</Text>
                        <Text style={styles.metricValueLarge}>{metrics.topScore.toLocaleString()} XP</Text>
                        <View style={styles.metricBadgeAmber}>
                            <View style={styles.badgeDotAmber} />
                            <Text style={styles.metricBadgeText}>#1 Champion</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Average Score */}
                <TouchableOpacity
                    style={[
                        styles.metricCard,
                        activeFilter === "above_avg" && styles.metricCardActiveSuccess,
                    ]}
                    onPress={() =>
                        onSelectFilter(activeFilter === "above_avg" ? "all" : "above_avg")
                    }
                    activeOpacity={0.8}
                >
                    <View style={styles.metricCardAccentWrapper}>
                        <View style={[styles.metricIconWrap, { backgroundColor: "#DCFCE7" }]}>
                            <TrendingUp size={18} color="#16A34A" />
                        </View>
                        <Text style={styles.metricCardEmoji}>📊</Text>
                    </View>
                    <View style={styles.metricCardContent}>
                        <Text style={styles.metricLabel}>AVERAGE POINTS</Text>
                        <Text style={styles.metricValueLarge}>{metrics.avgScore.toLocaleString()} XP</Text>
                        <View style={styles.metricBadgeEmerald}>
                            <Text style={styles.metricBadgeIcon}>{avgRankDetails.icon}</Text>
                            <Text style={styles.metricBadgeText}>Typical: {avgRankDetails.title}</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Campus Legends */}
                <TouchableOpacity
                    style={[
                        styles.metricCard,
                        activeFilter === "legends" && styles.metricCardActivePurple,
                    ]}
                    onPress={() =>
                        onSelectFilter(activeFilter === "legends" ? "all" : "legends")
                    }
                    activeOpacity={0.8}
                >
                    <View style={styles.metricCardAccentWrapper}>
                        <View style={[styles.metricIconWrap, { backgroundColor: "#FAF5FF" }]}>
                            <Crown size={18} color="#9333EA" />
                        </View>
                        <Text style={styles.metricCardEmoji}>👑</Text>
                    </View>
                    <View style={styles.metricCardContent}>
                        <Text style={styles.metricLabel}>CAMPUS LEGENDS</Text>
                        <Text style={styles.metricValueLarge}>{metrics.legendsCount}</Text>
                        <View style={styles.metricBadgePurple}>
                            <View style={styles.badgeDotPurple} />
                            <Text style={styles.metricBadgeText}>Max Tier (≥2k XP)</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Filter Notice Banner */}
            {activeFilter !== "all" && (
                <View style={styles.filterBanner}>
                    <Text style={styles.filterBannerText} numberOfLines={1}>
                        Filtering:{" "}
                        <Text style={{ fontWeight: "bold", color: colors.primary }}>
                            {activeFilter === "above_avg"
                                ? `≥ ${metrics.avgScore.toLocaleString()} XP (Above Avg)`
                                : "Campus Legends (≥ 2,000 XP)"}
                        </Text>{" "}
                        • {filteredCount} student{filteredCount === 1 ? "" : "s"}
                    </Text>
                    <TouchableOpacity onPress={() => onSelectFilter("all")}>
                        <Text style={styles.filterBannerReset}>Show All</Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
    );
}
