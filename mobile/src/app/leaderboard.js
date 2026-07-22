import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trophy, ArrowLeft, Clock } from "lucide-react-native";
import { router } from "expo-router";
import { api } from "../services";
import theme from "../theme/tokens";
import { useAuth } from "../hooks/useAuth";
import { fonts } from "../constants/typography";

export default function LeaderboardScreen() {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const [leaderboardRes, recentRes] = await Promise.all([
                api.get("/api/gamification/leaderboard/"),
                api.get("/api/gamification/recent-activity/"),
            ]);

            if (leaderboardRes.data.success) {
                setLeaderboard(leaderboardRes.data.data);
            }
            if (recentRes.data.success) {
                setRecentActivity(recentRes.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch gamification data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const renderHeader = () => {
        if (leaderboard.length === 0) return null;

        const top3 = leaderboard.slice(0, 3);
        const podiumOrder = [
            top3.length > 1 ? top3[1] : null,
            top3.length > 0 ? top3[0] : null,
            top3.length > 2 ? top3[2] : null,
        ];

        return (
            <View>
                {/* --- PODIUM --- */}
                <View style={styles.podiumContainer}>
                    {podiumOrder.map((student, index) => {
                        if (!student) {
                            return (
                                <View
                                    key={`empty-${index}`}
                                    style={styles.podiumItem}
                                />
                            );
                        }

                        const isFirst = index === 1;
                        const rankStr = isFirst ? "1" : index === 0 ? "2" : "3";
                        const height = isFirst ? 140 : index === 0 ? 100 : 80;
                        const color = isFirst
                            ? "#FFD700"
                            : index === 0
                              ? "#C0C0C0"
                              : "#CD7F32";

                        return (
                            <View
                                key={student.username}
                                style={styles.podiumItem}
                            >
                                <Text
                                    style={styles.podiumUsername}
                                    numberOfLines={1}
                                >
                                    {student.username}
                                </Text>
                                <Text style={styles.podiumPoints}>
                                    {student.points} pts
                                </Text>
                                <View
                                    style={[
                                        styles.podiumBlock,
                                        { height, backgroundColor: color },
                                    ]}
                                >
                                    <Text style={styles.podiumRank}>
                                        {rankStr}
                                    </Text>
                                    {isFirst && (
                                        <Trophy
                                            color="#000"
                                            size={32}
                                            style={{ marginTop: 10 }}
                                        />
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* --- RECENT QUESTS TAKEN --- */}
                <View style={styles.sectionHeader}>
                    <Clock size={20} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>RECENT QUESTS TAKEN</Text>
                </View>

                {recentActivity.length > 0 ? (
                    <View style={styles.recentContainer}>
                        {recentActivity.map((activity, idx) => (
                            <View key={idx} style={styles.recentItem}>
                                <View style={styles.recentDot} />
                                <View style={styles.recentContent}>
                                    <Text style={styles.recentUser}>
                                        <Text style={{ fontWeight: "bold" }}>
                                            @{activity.username}
                                        </Text>{" "}
                                        completed
                                    </Text>
                                    <Text style={styles.recentQuest}>
                                        "{activity.quest_title}" at{" "}
                                        {activity.building_name}
                                    </Text>
                                    <Text style={styles.recentPoints}>
                                        +{activity.points} Points
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

                {/* --- OTHER TOP EXPLORERS --- */}
                <View
                    style={[
                        styles.sectionHeader,
                        { marginTop: 30, marginBottom: 15 },
                    ]}
                >
                    <Trophy size={20} color={theme.colors.textSecondary} />
                    <Text
                        style={[
                            styles.sectionTitle,
                            { color: theme.colors.textSecondary },
                        ]}
                    >
                        OTHER TOP EXPLORERS
                    </Text>
                </View>
                {leaderboard.length <= 3 && (
                    <Text style={styles.emptyTextSmall}>
                        No other explorers have joined the ranks yet.
                    </Text>
                )}
            </View>
        );
    };

    const renderItem = ({ item }) => {
        const isMe = user?.username === item.username;
        const isTop3 = item.rank <= 3;

        if (isTop3) return null;

        return (
            <View style={[styles.rankRow, isMe && styles.myRankRow]}>
                <View style={styles.rankNumberContainer}>
                    <Text
                        style={[styles.rankNumber, isMe && styles.myRankText]}
                    >
                        #{item.rank}
                    </Text>
                </View>
                <View style={styles.rankInfo}>
                    <Text
                        style={[styles.rankUsername, isMe && styles.myRankText]}
                    >
                        {item.username} {isMe && "(You)"}
                    </Text>
                    {item.rank_info && (
                        <Text style={styles.rankLevelText}>
                            {item.rank_info.icon} Lv.{item.rank_info.level}{" "}
                            {item.rank_info.title}
                        </Text>
                    )}
                </View>
                <Text style={[styles.rankPoints, isMe && styles.myRankText]}>
                    {item.points} pts
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <ArrowLeft color={theme.colors.textPrimary} size={24} />
                </TouchableOpacity>
                <Trophy size={24} color={theme.colors.primary} />
                <Text style={styles.title}>GLOBAL RANKINGS</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                    />
                </View>
            ) : (
                <FlatList
                    data={leaderboard}
                    keyExtractor={(item) => item.username}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
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
                        <Text
                            style={{
                                textAlign: "center",
                                marginTop: 20,
                                color: theme.colors.textMuted,
                            }}
                        >
                            No rankings available.
                        </Text>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.bgPrimary,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: 5,
    },
    title: {
        fontFamily: fonts.heading.bold,
        flex: 1,
        fontSize: 20,
        fontWeight: "900",
        color: theme.colors.primary,
        marginLeft: 10,
        letterSpacing: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    podiumContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end",
        height: 220,
        marginBottom: 30,
        marginTop: 10,
    },
    podiumItem: {
        flex: 1,
        alignItems: "center",
        marginHorizontal: 4,
    },
    podiumUsername: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    podiumPoints: {
        fontFamily: fonts.hud.medium,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        fontWeight: "600",
    },
    podiumBlock: {
        width: "100%",
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        alignItems: "center",
        paddingTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    podiumRank: {
        fontFamily: fonts.hud.bold,
        fontSize: 24,
        fontWeight: "900",
        color: theme.colors.textSecondary,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        fontWeight: "900",
        color: theme.colors.primary,
        letterSpacing: 1,
        marginLeft: 8,
    },
    recentContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    recentItem: {
        flexDirection: "row",
        marginBottom: 16,
    },
    recentDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.primary,
        marginTop: 5,
        marginRight: 12,
    },
    recentContent: {
        flex: 1,
    },
    recentUser: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        marginBottom: 2,
    },
    recentQuest: {
        color: theme.colors.textPrimary,
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 2,
    },
    recentPoints: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: "bold",
    },
    emptyTextSmall: {
        color: theme.colors.textMuted,
        fontStyle: "italic",
        marginLeft: 12,
        fontSize: 13,
    },
    rankRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: theme.radius.md,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    myRankRow: {
        backgroundColor: "rgba(178, 24, 48, 0.1)",
        borderColor: theme.colors.primary,
        borderWidth: 2,
    },
    rankNumberContainer: {
        width: 40,
    },
    rankNumber: {
        fontFamily: fonts.hud.bold,
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.textSecondary,
    },
    rankInfo: {
        flex: 1,
    },
    rankUsername: {
        fontFamily: fonts.heading.medium,
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.textPrimary,
    },
    rankPoints: {
        fontFamily: fonts.hud.bold,
        fontSize: 16,
        fontWeight: "900",
        color: theme.colors.primary,
    },
    myRankText: {
        color: theme.colors.primary,
    },
    rankLevelText: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
});
