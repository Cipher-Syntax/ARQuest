import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    Image,
    TextInput,
    ScrollView,
    Modal,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    Trophy,
    ArrowLeft,
    Clock,
    Search,
    Crown,
    Award,
    Users,
    TrendingUp,
    X,
    ChevronRight,
    Flame,
    CheckCircle2,
} from "lucide-react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../services";
import theme from "../theme/tokens";
import { useAuth } from "../hooks/useAuth";
import { fonts } from "../constants/typography";
import { AVATARS } from "../constants/Avatars";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Progression Ranks Matching Web Gamification Engine
const RANKS = [
    { level: 1, title: "Freshman", min_exp: 0, icon: "🎒", color: "#0284C7", bg: "#F0F9FF", border: "#BAE6FD" },
    { level: 2, title: "Explorer", min_exp: 100, icon: "🗺️", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
    { level: 3, title: "Scout", min_exp: 300, icon: "⛺", color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4" },
    { level: 4, title: "Ranger", min_exp: 600, icon: "🦅", color: "#4F46E5", bg: "#EEF2FF", border: "#C7D2FE" },
    { level: 5, title: "Veteran", min_exp: 1000, icon: "⚔️", color: "#9333EA", bg: "#FAF5FF", border: "#E9D5FF" },
    { level: 6, title: "Campus Legend", min_exp: 2000, icon: "👑", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
];

const getRankDetails = (exp = 0, rankInfo = null) => {
    let rank = RANKS[0];
    let nextRank = RANKS[1];

    for (let i = 0; i < RANKS.length; i++) {
        if (exp >= RANKS[i].min_exp) {
            rank = RANKS[i];
            nextRank = i + 1 < RANKS.length ? RANKS[i + 1] : null;
        } else {
            break;
        }
    }

    const currentRankExp = rank.min_exp;
    const nextRankExp = nextRank ? nextRank.min_exp : null;
    const progress = nextRankExp
        ? Math.min(
              100,
              Math.max(
                  0,
                  Math.round(
                      ((exp - currentRankExp) / (nextRankExp - currentRankExp)) * 100
                  )
              )
          )
        : 100;

    return {
        level: rankInfo?.level || rank.level,
        title: rankInfo?.title || rank.title,
        icon: rankInfo?.icon || rank.icon,
        color: rank.color,
        bg: rank.bg,
        border: rank.border,
        currentRankExp,
        nextRankExp,
        progress,
    };
};

export default function LeaderboardScreen() {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Search & Filter state (matching web)
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState("all"); // "all" | "above_avg" | "legends"
    const [selectedStudent, setSelectedStudent] = useState(null);

    const fetchData = async () => {
        try {
            const [leaderboardRes, recentRes] = await Promise.all([
                api.get("/api/gamification/leaderboard/"),
                api.get("/api/gamification/recent-activity/"),
            ]);

            if (leaderboardRes.data?.success) {
                const list = leaderboardRes.data.data || [];
                setLeaderboard(Array.isArray(list) ? list : []);
            }
            if (recentRes.data?.success) {
                const recent = recentRes.data.data || [];
                setRecentActivity(Array.isArray(recent) ? recent : []);
            }
        } catch (error) {
            console.error("Failed to fetch leaderboard data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user && user.role !== "student") {
            router.replace("/(tabs)/explore");
            return;
        }
        fetchData();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Calculate Summary Metrics matching web
    const metrics = useMemo(() => {
        if (!leaderboard.length) {
            return { totalStudents: 0, topScore: 0, avgScore: 0, legendsCount: 0 };
        }
        const totalStudents = leaderboard.length;
        const topScore = leaderboard[0]?.points || 0;
        const totalExp = leaderboard.reduce(
            (acc, u) => acc + (u.points || 0),
            0
        );
        const avgScore = Math.round(totalExp / totalStudents);
        const legendsCount = leaderboard.filter(
            (u) => (u.points || 0) >= 2000
        ).length;
        return { totalStudents, topScore, avgScore, legendsCount };
    }, [leaderboard]);

    const avgRankDetails = useMemo(
        () => getRankDetails(metrics.avgScore),
        [metrics.avgScore]
    );

    // Filter and search logic
    const filteredLeaderboard = useMemo(() => {
        let list = leaderboard;

        if (activeFilter === "above_avg") {
            list = list.filter((u) => (u.points || 0) >= metrics.avgScore);
        } else if (activeFilter === "legends") {
            list = list.filter((u) => (u.points || 0) >= 2000);
        }

        const term = searchTerm.toLowerCase().trim();
        if (!term) return list;

        return list.filter((item) => {
            const first = item.first_name?.toLowerCase() || "";
            const last = item.last_name?.toLowerCase() || "";
            const username = item.username?.toLowerCase() || "";
            const rankTitle = getRankDetails(item.points, item.rank_info).title.toLowerCase();
            return (
                first.includes(term) ||
                last.includes(term) ||
                username.includes(term) ||
                rankTitle.includes(term)
            );
        });
    }, [leaderboard, activeFilter, searchTerm, metrics.avgScore]);

    // Top 3 Podium
    const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
    const firstPlace = top3[0] || null;
    const secondPlace = top3[1] || null;
    const thirdPlace = top3[2] || null;

    // Current user rank
    const myRankItem = useMemo(() => {
        return leaderboard.find((u) => u.username === user?.username) || null;
    }, [leaderboard, user]);

    // Avatar renderer helper
    const renderAvatar = (student, size = 48, borderColor = "#E5E7EB") => {
        if (!student) return null;

        if (student.profile_image) {
            return (
                <Image
                    source={{ uri: student.profile_image }}
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: 2,
                        borderColor: borderColor,
                        backgroundColor: "#FFFFFF",
                    }}
                    resizeMode="cover"
                />
            );
        }

        if (student.avatar_id) {
            const preset = AVATARS.find((a) => a.id === student.avatar_id);
            if (preset?.source) {
                return (
                    <Image
                        source={preset.source}
                        style={{
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            borderWidth: 2,
                            borderColor: borderColor,
                            backgroundColor: "#FFFFFF",
                        }}
                        resizeMode="cover"
                    />
                );
            }
        }

        const letter = (
            student.first_name?.[0] ||
            student.username?.[0] ||
            "?"
        ).toUpperCase();

        return (
            <View
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: "#F1F5F9",
                    borderWidth: 2,
                    borderColor: borderColor,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Text
                    style={{
                        fontFamily: fonts.heading.bold,
                        fontSize: size * 0.42,
                        color: theme.colors.primary,
                    }}
                >
                    {letter}
                </Text>
            </View>
        );
    };

    const getDisplayName = (student) => {
        if (!student) return "";
        if (student.first_name && student.last_name) {
            return `${student.first_name} ${student.last_name}`;
        }
        if (student.first_name) {
            return student.first_name;
        }
        return student.username;
    };

    const renderHeader = () => {
        return (
            <View>
                {/* --- KPI Summary Metric Cards (Interactive Filters) --- */}
                <View style={styles.metricsGrid}>
                    {/* Total Explorers */}
                    <TouchableOpacity
                        style={[
                            styles.metricCard,
                            activeFilter === "all" && styles.metricCardActive,
                        ]}
                        onPress={() => setActiveFilter("all")}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.metricIconWrap, { backgroundColor: "rgba(178, 24, 48, 0.1)" }]}>
                            <Users size={18} color="#B21830" />
                        </View>
                        <View>
                            <Text style={styles.metricLabel}>TOTAL</Text>
                            <Text style={styles.metricValue}>{metrics.totalStudents}</Text>
                            <Text style={styles.metricSub}>Explorers</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Top Campus Score */}
                    <TouchableOpacity
                        style={styles.metricCard}
                        onPress={() => firstPlace && setSelectedStudent({ ...firstPlace, rank: 1 })}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.metricIconWrap, { backgroundColor: "#FEF3C7" }]}>
                            <Trophy size={18} color="#D97706" />
                        </View>
                        <View>
                            <Text style={styles.metricLabel}>TOP SCORE</Text>
                            <Text style={styles.metricValue}>{metrics.topScore.toLocaleString()}</Text>
                            <Text style={[styles.metricSub, { color: "#D97706", fontWeight: "700" }]}>🏆 #1 Lead</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Average Score */}
                    <TouchableOpacity
                        style={[
                            styles.metricCard,
                            activeFilter === "above_avg" && styles.metricCardActiveSuccess,
                        ]}
                        onPress={() => setActiveFilter((prev) => (prev === "above_avg" ? "all" : "above_avg"))}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.metricIconWrap, { backgroundColor: "#DCFCE7" }]}>
                            <TrendingUp size={18} color="#16A34A" />
                        </View>
                        <View>
                            <Text style={styles.metricLabel}>AVG SCORE</Text>
                            <Text style={styles.metricValue}>{metrics.avgScore.toLocaleString()}</Text>
                            <Text style={[styles.metricSub, { color: "#16A34A", fontWeight: "700" }]}>
                                {avgRankDetails.icon} {avgRankDetails.title}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Campus Legends */}
                    <TouchableOpacity
                        style={[
                            styles.metricCard,
                            activeFilter === "legends" && styles.metricCardActivePurple,
                        ]}
                        onPress={() => setActiveFilter((prev) => (prev === "legends" ? "all" : "legends"))}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.metricIconWrap, { backgroundColor: "#FAF5FF" }]}>
                            <Crown size={18} color="#9333EA" />
                        </View>
                        <View>
                            <Text style={styles.metricLabel}>LEGENDS</Text>
                            <Text style={styles.metricValue}>{metrics.legendsCount}</Text>
                            <Text style={[styles.metricSub, { color: "#9333EA", fontWeight: "700" }]}>≥ 2k EXP</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Filter Notice Banner */}
                {activeFilter !== "all" && (
                    <View style={styles.filterBanner}>
                        <Text style={styles.filterBannerText} numberOfLines={1}>
                            Filtering:{" "}
                            <Text style={{ fontWeight: "bold", color: theme.colors.primary }}>
                                {activeFilter === "above_avg"
                                    ? `≥ ${metrics.avgScore.toLocaleString()} XP (Above Avg)`
                                    : "Campus Legends (≥ 2,000 XP)"}
                            </Text>{" "}
                            • {filteredLeaderboard.length} student{filteredLeaderboard.length === 1 ? "" : "s"}
                        </Text>
                        <TouchableOpacity onPress={() => setActiveFilter("all")}>
                            <Text style={styles.filterBannerReset}>Show All</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* --- CAMPUS HALL OF FAME: OLYMPIC TOP 3 PODIUM --- */}
                {top3.length > 0 && !searchTerm && activeFilter === "all" && (
                    <View style={styles.podiumCard}>
                        {/* Podium Header */}
                        <View style={styles.podiumHeader}>
                            <View style={styles.podiumBadge}>
                                <Trophy size={13} color="#B21830" />
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
                                    onPress={() => setSelectedStudent({ ...secondPlace, rank: 2 })}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.podiumAvatarWrap}>
                                        {renderAvatar(secondPlace, 54, "#94A3B8")}
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
                                    onPress={() => setSelectedStudent({ ...firstPlace, rank: 1 })}
                                    activeOpacity={0.85}
                                >
                                    {/* Floating Crown */}
                                    <View style={styles.crownWrap}>
                                        <Text style={{ fontSize: 22 }}>👑</Text>
                                    </View>

                                    <View style={styles.podiumAvatarWrap}>
                                        {renderAvatar(firstPlace, 66, "#F59E0B")}
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
                                    <View style={[styles.podiumExpPill, { backgroundColor: "#B21830", borderColor: "#B21830" }]}>
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
                                    onPress={() => setSelectedStudent({ ...thirdPlace, rank: 3 })}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.podiumAvatarWrap}>
                                        {renderAvatar(thirdPlace, 54, "#D97706")}
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
                )}

                {/* --- Search Bar --- */}
                <View style={styles.searchBar}>
                    <Search size={18} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search student by name or rank..."
                        placeholderTextColor="#94A3B8"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        autoCapitalize="none"
                    />
                    {searchTerm.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchTerm("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X size={16} color="#64748B" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* --- Quick Filter Pills --- */}
                <View style={styles.filterPillsRow}>
                    <TouchableOpacity
                        style={[styles.filterPill, activeFilter === "all" && styles.filterPillActive]}
                        onPress={() => setActiveFilter("all")}
                    >
                        <Text style={[styles.filterPillText, activeFilter === "all" && styles.filterPillTextActive]}>
                            All Explorers ({leaderboard.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterPill, activeFilter === "above_avg" && styles.filterPillActive]}
                        onPress={() => setActiveFilter("above_avg")}
                    >
                        <Text style={[styles.filterPillText, activeFilter === "above_avg" && styles.filterPillTextActive]}>
                            Above Average
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterPill, activeFilter === "legends" && styles.filterPillActive]}
                        onPress={() => setActiveFilter("legends")}
                    >
                        <Text style={[styles.filterPillText, activeFilter === "legends" && styles.filterPillTextActive]}>
                            Legends (≥2k)
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* --- Section Header for Rank List --- */}
                <View style={styles.listHeaderRow}>
                    <Trophy size={16} color={theme.colors.primary} />
                    <Text style={styles.listHeaderTitle}>
                        {searchTerm || activeFilter !== "all" ? "SEARCH RESULTS" : "CAMPUS RANKINGS"}
                    </Text>
                    <Text style={styles.listHeaderCount}>
                        ({filteredLeaderboard.length} explorers)
                    </Text>
                </View>
            </View>
        );
    };

    const renderFooter = () => {
        return (
            <View style={{ marginTop: 24, marginBottom: 50 }}>
                {/* --- Recent Quests Taken Activity Section --- */}
                <View style={styles.sectionHeader}>
                    <Clock size={16} color={theme.colors.primary} />
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
    };

    const renderItem = ({ item, index }) => {
        const isMe = user?.username === item.username;
        const rank = item.rank || index + 1;
        const isTop3 = rank <= 3 && !searchTerm && activeFilter === "all";

        // Hide top 3 from the main list if they are already in the podium (matching web)
        if (isTop3) return null;

        const rankDetails = getRankDetails(item.points, item.rank_info);

        return (
            <TouchableOpacity
                style={[styles.rankRow, isMe && styles.myRankRow]}
                onPress={() => setSelectedStudent({ ...item, rank })}
                activeOpacity={0.8}
            >
                {/* Rank Number Badge */}
                <View style={styles.rankPositionWrap}>
                    <Text style={[styles.rankPositionText, isMe && { color: theme.colors.primary }]}>
                        #{rank}
                    </Text>
                </View>

                {/* Avatar */}
                <View style={styles.avatarWrap}>
                    {renderAvatar(item, 44, isMe ? theme.colors.primary : "#E2E8F0")}
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
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header Bar */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
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
                    <Trophy size={20} color="#B21830" />
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredLeaderboard}
                    keyExtractor={(item) => String(item.id || item.username)}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Trophy size={36} color="#CBD5E1" style={{ marginBottom: 8 }} />
                            <Text style={styles.emptyTitle}>No Explorers Found</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchTerm
                                    ? `No student matching "${searchTerm}"`
                                    : "No explorers match this filter criterion."}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Sticky "My Position" Floating Bottom Bar */}
            {myRankItem && (
                <View style={styles.myRankStickyBar}>
                    <View style={styles.myRankStickyLeft}>
                        <View style={styles.myRankStickyBadge}>
                            <Text style={styles.myRankStickyBadgeText}>
                                #{myRankItem.rank || leaderboard.findIndex((u) => u.username === user?.username) + 1}
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
                        onPress={() => setSelectedStudent({ ...myRankItem, rank: myRankItem.rank })}
                    >
                        <Text style={styles.myRankStickyBtnText}>MY PROFILE</Text>
                        <ChevronRight size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            )}

            {/* --- Student Detail Profile Modal (Matching Web) --- */}
            {selectedStudent && (
                <Modal
                    visible={Boolean(selectedStudent)}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setSelectedStudent(null)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFillObject}
                            onPress={() => setSelectedStudent(null)}
                            activeOpacity={1}
                        />
                        <View style={styles.modalCard}>
                            {/* Modal Close */}
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setSelectedStudent(null)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>

                            {/* Avatar & Rank Ring */}
                            <View style={styles.modalAvatarContainer}>
                                {renderAvatar(selectedStudent, 76, theme.colors.primary)}
                                <View style={styles.modalRankPill}>
                                    <Text style={styles.modalRankPillText}>
                                        RANK #{selectedStudent.rank || "—"}
                                    </Text>
                                </View>
                            </View>

                            {/* Student Name & Username */}
                            <Text style={styles.modalStudentName} numberOfLines={1}>
                                {getDisplayName(selectedStudent)}
                            </Text>
                            <Text style={styles.modalUsername}>
                                @{selectedStudent.username}
                            </Text>

                            {/* Rank Tier Banner */}
                            {(() => {
                                const details = getRankDetails(selectedStudent.points, selectedStudent.rank_info);
                                return (
                                    <View style={[styles.modalTierBanner, { backgroundColor: details.bg, borderColor: details.border }]}>
                                        <Text style={{ fontSize: 18 }}>{details.icon}</Text>
                                        <View>
                                            <Text style={[styles.modalTierTitle, { color: details.color }]}>
                                                Level {details.level} · {details.title}
                                            </Text>
                                            {details.nextRankExp ? (
                                                <Text style={styles.modalTierProgressText}>
                                                    {selectedStudent.points} / {details.nextRankExp} XP to next rank
                                                </Text>
                                            ) : (
                                                <Text style={styles.modalTierProgressText}>
                                                    Maximum Tier Reached! 👑
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })()}

                            {/* Progress Track */}
                            {(() => {
                                const details = getRankDetails(selectedStudent.points, selectedStudent.rank_info);
                                return (
                                    <View style={styles.modalProgressTrack}>
                                        <View
                                            style={[
                                                styles.modalProgressFill,
                                                { width: `${details.progress}%`, backgroundColor: details.color },
                                            ]}
                                        />
                                    </View>
                                );
                            })()}

                            {/* Stats Grid */}
                            <View style={styles.modalStatsGrid}>
                                <View style={styles.modalStatItem}>
                                    <Award size={18} color="#B21830" style={{ marginBottom: 4 }} />
                                    <Text style={styles.modalStatValue}>{selectedStudent.points.toLocaleString()}</Text>
                                    <Text style={styles.modalStatLabel}>TOTAL EXP</Text>
                                </View>
                                <View style={styles.modalStatItem}>
                                    <CheckCircle2 size={18} color="#16A34A" style={{ marginBottom: 4 }} />
                                    <Text style={styles.modalStatValue}>
                                        {selectedStudent.quests_completed || 0}
                                    </Text>
                                    <Text style={styles.modalStatLabel}>QUESTS DONE</Text>
                                </View>
                            </View>

                            {/* Dismiss button */}
                            <TouchableOpacity
                                style={styles.modalDoneBtn}
                                onPress={() => setSelectedStudent(null)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.modalDoneBtnText}>CLOSE</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F1F5F9",
    },
    headerTitleWrap: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: "#111827",
        letterSpacing: 0.6,
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: "#64748B",
        marginTop: 1,
    },
    trophyIconHeader: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: "#FEF2F2",
        alignItems: "center",
        justifyContent: "center",
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },

    // ── Metrics Grid (KPI Cards) ─────────────────────────────────────────────
    metricsGrid: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    metricCard: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        padding: 10,
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    metricCardActive: {
        borderColor: "#B21830",
        backgroundColor: "#FEF2F2",
    },
    metricCardActiveSuccess: {
        borderColor: "#16A34A",
        backgroundColor: "#F0FDF4",
    },
    metricCardActivePurple: {
        borderColor: "#9333EA",
        backgroundColor: "#FAF5FF",
    },
    metricIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    metricLabel: {
        fontSize: 8.5,
        fontFamily: fonts.heading.bold,
        color: "#64748B",
        letterSpacing: 0.5,
    },
    metricValue: {
        fontSize: 14,
        fontFamily: fonts.heading.bold,
        color: "#111827",
        marginTop: 1,
    },
    metricSub: {
        fontSize: 9,
        fontFamily: fonts.body.regular,
        color: "#64748B",
        marginTop: 1,
    },

    filterBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginBottom: 12,
    },
    filterBannerText: {
        flex: 1,
        fontSize: 11,
        fontFamily: fonts.body.regular,
        color: "#475569",
    },
    filterBannerReset: {
        fontSize: 11,
        fontFamily: fonts.body.bold,
        color: "#B21830",
        marginLeft: 8,
    },

    // ── Campus Hall of Fame Podium ──────────────────────────────────────────
    podiumCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingTop: 16,
        paddingHorizontal: 12,
        marginBottom: 16,
        shadowColor: "#B21830",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    podiumHeader: {
        alignItems: "center",
        marginBottom: 14,
    },
    podiumBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#FEF2F2",
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    podiumBadgeText: {
        fontSize: 9.5,
        fontFamily: fonts.heading.bold,
        color: "#B21830",
        letterSpacing: 0.8,
    },
    podiumTitle: {
        fontSize: 16,
        fontFamily: fonts.heading.bold,
        color: "#111827",
        marginTop: 4,
    },
    podiumRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 8,
    },
    podiumCol: {
        flex: 1,
        alignItems: "center",
    },
    podiumColFirst: {
        marginTop: -16,
    },
    crownWrap: {
        marginBottom: -6,
        zIndex: 5,
    },
    podiumAvatarWrap: {
        position: "relative",
        alignItems: "center",
        marginBottom: 6,
    },
    rankPillMini: {
        position: "absolute",
        bottom: -7,
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 10,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    rankPillMiniText: {
        fontSize: 8.5,
        fontFamily: fonts.heading.bold,
    },
    podiumName: {
        fontSize: 11,
        fontFamily: fonts.heading.bold,
        color: "#111827",
        textAlign: "center",
        marginTop: 8,
        maxWidth: 90,
    },
    podiumNameFirst: {
        fontSize: 12,
        color: "#92400E",
    },
    podiumRankTitle: {
        fontSize: 9.5,
        fontFamily: fonts.body.regular,
        color: "#64748B",
        marginTop: 1,
    },
    podiumExpPill: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginTop: 4,
        marginBottom: 8,
    },
    podiumExpText: {
        fontSize: 9.5,
        fontFamily: fonts.heading.bold,
        color: "#334155",
    },
    pedestalBlock: {
        width: "100%",
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    pedestalNumber: {
        fontFamily: fonts.heading.bold,
        fontSize: 32,
        fontWeight: "900",
    },

    // ── Search & Filter ──────────────────────────────────────────────────────
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 12.5,
        fontFamily: fonts.body.regular,
        color: "#111827",
        padding: 0,
    },
    filterPillsRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 14,
    },
    filterPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    filterPillActive: {
        backgroundColor: "#B21830",
        borderColor: "#B21830",
    },
    filterPillText: {
        fontSize: 11,
        fontFamily: fonts.body.bold,
        color: "#64748B",
    },
    filterPillTextActive: {
        color: "#FFFFFF",
    },
    listHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
        paddingHorizontal: 2,
    },
    listHeaderTitle: {
        fontSize: 12,
        fontFamily: fonts.heading.bold,
        color: "#111827",
        letterSpacing: 0.5,
    },
    listHeaderCount: {
        fontSize: 11,
        fontFamily: fonts.body.regular,
        color: "#64748B",
    },

    // ── Rank Row Item ────────────────────────────────────────────────────────
    rankRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        padding: 10,
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    myRankRow: {
        backgroundColor: "#FEF2F2",
        borderColor: "#B21830",
        borderWidth: 1.5,
    },
    rankPositionWrap: {
        width: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    rankPositionText: {
        fontSize: 13,
        fontFamily: fonts.heading.bold,
        color: "#64748B",
    },
    avatarWrap: {
        marginRight: 10,
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 13,
        fontFamily: fonts.heading.bold,
        color: "#111827",
    },
    myStudentName: {
        color: "#B21830",
    },
    youBadge: {
        backgroundColor: "#16A34A",
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
    },
    youBadgeText: {
        color: "#FFFFFF",
        fontSize: 8.5,
        fontFamily: fonts.heading.bold,
    },
    studentUsername: {
        fontSize: 11,
        fontFamily: fonts.body.regular,
        color: "#64748B",
        marginTop: 1,
    },
    rankTierBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 4,
        borderWidth: 1,
        alignSelf: "flex-start",
        marginTop: 4,
    },
    rankTierIcon: {
        fontSize: 10,
    },
    rankTierTitle: {
        fontSize: 9.5,
        fontFamily: fonts.body.bold,
    },
    scoreWrap: {
        alignItems: "flex-end",
    },
    pointsBadge: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    pointsBadgeMy: {
        backgroundColor: "#B21830",
        borderColor: "#B21830",
    },
    pointsText: {
        fontSize: 11.5,
        fontFamily: fonts.heading.bold,
        color: "#111827",
    },
    pointsTextMy: {
        color: "#FFFFFF",
    },
    questsCountText: {
        fontSize: 9.5,
        fontFamily: fonts.body.regular,
        color: "#64748B",
        marginTop: 3,
    },

    // ── Recent Activity Section ──────────────────────────────────────────────
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    sectionTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: "#111827",
        letterSpacing: 0.6,
    },
    recentContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    recentItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 10,
    },
    recentDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#B21830",
        marginTop: 4,
        marginRight: 10,
    },
    recentContent: {
        flex: 1,
    },
    recentUser: {
        color: "#64748B",
        fontSize: 11.5,
        fontFamily: fonts.body.regular,
    },
    recentQuest: {
        color: "#111827",
        fontSize: 12,
        fontFamily: fonts.heading.bold,
        marginTop: 1,
    },
    recentPoints: {
        color: "#16A34A",
        fontSize: 10.5,
        fontFamily: fonts.body.bold,
        marginTop: 2,
    },
    emptyTextSmall: {
        color: "#94A3B8",
        fontStyle: "italic",
        fontSize: 11.5,
        marginLeft: 4,
    },

    emptyContainer: {
        alignItems: "center",
        paddingVertical: 36,
    },
    emptyTitle: {
        fontSize: 14,
        fontFamily: fonts.heading.bold,
        color: "#111827",
    },
    emptySubtitle: {
        fontSize: 12,
        fontFamily: fonts.body.regular,
        color: "#64748B",
        marginTop: 2,
    },

    // ── Sticky "My Rank" Bottom Bar ──────────────────────────────────────────
    myRankStickyBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 2,
        borderTopColor: "#B21830",
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.12,
        shadowRadius: 5,
        elevation: 8,
    },
    myRankStickyLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    myRankStickyBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#B21830",
        alignItems: "center",
        justifyContent: "center",
    },
    myRankStickyBadgeText: {
        color: "#FFFFFF",
        fontFamily: fonts.heading.bold,
        fontSize: 13,
    },
    myRankStickyTitle: {
        fontSize: 9,
        fontFamily: fonts.heading.bold,
        color: "#B21830",
        letterSpacing: 0.6,
    },
    myRankStickyPoints: {
        fontSize: 12,
        fontFamily: fonts.body.bold,
        color: "#111827",
        marginTop: 1,
    },
    myRankStickyBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#B21830",
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    myRankStickyBtnText: {
        color: "#FFFFFF",
        fontSize: 10.5,
        fontFamily: fonts.heading.bold,
        letterSpacing: 0.5,
    },

    // ── Student Detail Modal ─────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalCard: {
        width: "100%",
        maxWidth: 380,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
        position: "relative",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 8,
    },
    modalCloseBtn: {
        position: "absolute",
        top: 14,
        right: 14,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
    },
    modalAvatarContainer: {
        position: "relative",
        alignItems: "center",
        marginTop: 8,
        marginBottom: 10,
    },
    modalRankPill: {
        position: "absolute",
        bottom: -8,
        backgroundColor: "#B21830",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    modalRankPillText: {
        color: "#FFFFFF",
        fontSize: 9,
        fontFamily: fonts.heading.bold,
    },
    modalStudentName: {
        fontSize: 16,
        fontFamily: fonts.heading.bold,
        color: "#111827",
        marginTop: 12,
        textAlign: "center",
    },
    modalUsername: {
        fontSize: 12,
        fontFamily: fonts.body.regular,
        color: "#64748B",
        marginTop: 1,
        marginBottom: 12,
    },
    modalTierBanner: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 8,
    },
    modalTierTitle: {
        fontSize: 12,
        fontFamily: fonts.heading.bold,
    },
    modalTierProgressText: {
        fontSize: 10.5,
        fontFamily: fonts.body.regular,
        color: "#64748B",
        marginTop: 1,
    },
    modalProgressTrack: {
        width: "100%",
        height: 6,
        backgroundColor: "#F1F5F9",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 16,
    },
    modalProgressFill: {
        height: "100%",
        borderRadius: 3,
    },
    modalStatsGrid: {
        width: "100%",
        flexDirection: "row",
        gap: 10,
        marginBottom: 16,
    },
    modalStatItem: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        padding: 10,
        alignItems: "center",
    },
    modalStatValue: {
        fontSize: 15,
        fontFamily: fonts.heading.bold,
        color: "#111827",
    },
    modalStatLabel: {
        fontSize: 8.5,
        fontFamily: fonts.heading.bold,
        color: "#64748B",
        marginTop: 2,
    },
    modalDoneBtn: {
        width: "100%",
        backgroundColor: "#B21830",
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: "center",
    },
    modalDoneBtnText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontFamily: fonts.heading.bold,
        letterSpacing: 0.5,
    },
});
