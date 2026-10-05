import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    ArrowLeft,
    Crosshair,
    CheckCircle2,
    Clock,
    MapPin,
    ChevronRight,
    Award,
    Compass,
    Sparkles,
    Shield,
    Flame,
    Timer,
    Building2,
} from "lucide-react-native";
import { router } from "expo-router";
import { api } from "../services";
import theme from "../theme/tokens";
import { useAuth } from "../hooks/useAuth";
import { fonts } from "../constants/typography";
import { useLocationTracking } from "../hooks/useLocationTracking";
import { geofencingService } from "../services";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function MissionsScreen() {
    const { user } = useAuth();
    const { location } = useLocationTracking();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Raw API data
    const [dailyQuests, setDailyQuests] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [questHistory, setQuestHistory] = useState([]);
    const [buildings, setBuildings] = useState([]);

    // UI state
    const [selectedTab, setSelectedTab] = useState("available"); // "available" | "completed" | "all"
    const [categoryFilter, setCategoryFilter] = useState("all"); // "all" | "daily" | "timed"

    const loadData = async () => {
        try {
            const [resQuests, resChallenges, resHistory, resBuildings] = await Promise.all([
                api.get("/api/gamification/quests/active/").catch(() => ({ data: { success: false } })),
                api.get("/api/gamification/challenges/").catch(() => ({ data: { success: false } })),
                api.get("/api/gamification/quests/history/?limit=50").catch(() => ({ data: { success: false } })),
                api.get("/api/buildings/").catch(() => ({ data: { success: false } })),
            ]);

            if (resQuests.data?.success) {
                const qList = resQuests.data.data?.quests || resQuests.data.data || [];
                setDailyQuests(Array.isArray(qList) ? qList : []);
            }

            if (resChallenges.data?.success) {
                const cList = resChallenges.data.data || [];
                setChallenges(Array.isArray(cList) ? cList : []);
            }

            if (resHistory.data?.success) {
                const hList = resHistory.data.data || [];
                setQuestHistory(Array.isArray(hList) ? hList : []);
            }

            if (resBuildings.data?.success) {
                const bList = resBuildings.data.data || [];
                setBuildings(Array.isArray(bList) ? bList : []);
            }
        } catch (error) {
            console.error("Failed to fetch missions:", error);
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
        loadData();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // Calculate distance to building
    const getBuildingDistance = (buildingId) => {
        if (!location || !buildings.length || !buildingId) return null;
        const b = buildings.find((item) => String(item.id) === String(buildingId));
        if (!b || !b.latitude || !b.longitude) return null;
        const dist = geofencingService.calculateDistance(
            location.latitude,
            location.longitude,
            parseFloat(b.latitude),
            parseFloat(b.longitude),
        );
        if (dist === null || isNaN(dist)) return null;
        return dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`;
    };

    // Aggregated Missions lists
    const { availableMissions, completedMissions, allMissions } = useMemo(() => {
        // Available daily quests
        const availDaily = dailyQuests
            .filter((q) => !q.is_completed)
            .map((q) => ({
                ...q,
                type: "daily",
                typeLabel: "DAILY OBJECTIVE",
                is_completed: false,
            }));

        // Available timed challenges (not expired and not completed)
        const now = new Date();
        const availChallenges = challenges
            .filter((c) => {
                const isExpired = c.expires_at ? new Date(c.expires_at) < now : false;
                return !c.is_completed && !isExpired;
            })
            .map((c) => ({
                ...c,
                type: "timed",
                typeLabel: "TIME-LIMITED QUEST",
                is_completed: false,
            }));

        // Completed daily quests for today
        const compDaily = dailyQuests
            .filter((q) => q.is_completed)
            .map((q) => ({
                ...q,
                type: "daily",
                typeLabel: "DAILY OBJECTIVE",
                is_completed: true,
                completed_at: q.completed_at || new Date().toISOString(),
            }));

        // Completed timed challenges
        const compChallenges = challenges
            .filter((c) => c.is_completed)
            .map((c) => ({
                ...c,
                type: "timed",
                typeLabel: "TIME-LIMITED QUEST",
                is_completed: true,
            }));

        // History items from server
        const compHistory = questHistory.map((h) => ({
            id: h.quest_id || h.id,
            title: h.quest_title || h.title,
            hint: h.hint || "Campus mission completed and recorded.",
            reward_points: h.reward_points || h.points || 50,
            target_building: h.target_building,
            target_building_name: h.target_building_name || h.building_name || "Campus Facility",
            difficulty: h.difficulty || "EASY",
            is_completed: true,
            completed_at: h.completed_at || h.time_ago,
            type: "history",
            typeLabel: "MISSION LOG",
        }));

        // Merge completed, deduplicating by ID or title
        const seenCompletedIds = new Set();
        const mergedCompleted = [];

        [...compDaily, ...compChallenges, ...compHistory].forEach((item) => {
            const key = item.id ? String(item.id) : `${item.title}-${item.completed_at}`;
            if (!seenCompletedIds.has(key)) {
                seenCompletedIds.add(key);
                mergedCompleted.push(item);
            }
        });

        const mergedAvailable = [...availDaily, ...availChallenges];
        const mergedAll = [...mergedAvailable, ...mergedCompleted];

        return {
            availableMissions: mergedAvailable,
            completedMissions: mergedCompleted,
            allMissions: mergedAll,
        };
    }, [dailyQuests, challenges, questHistory]);

    // Apply category filtering
    const displayedMissions = useMemo(() => {
        let list = [];
        if (selectedTab === "available") {
            list = availableMissions;
        } else if (selectedTab === "completed") {
            list = completedMissions;
        } else {
            list = allMissions;
        }

        if (categoryFilter === "daily") {
            list = list.filter((m) => m.type === "daily");
        } else if (categoryFilter === "timed") {
            list = list.filter((m) => m.type === "timed");
        }

        return list;
    }, [selectedTab, categoryFilter, availableMissions, completedMissions, allMissions]);

    // EXP Calculation
    const totalExpEarned = useMemo(() => {
        return completedMissions.reduce((acc, curr) => acc + (Number(curr.reward_points) || 0), 0);
    }, [completedMissions]);

    const getDifficultyStyle = (diff) => {
        switch (diff?.toUpperCase()) {
            case "HARD":
                return { label: "HARD", bg: "rgba(220, 38, 38, 0.12)", text: "#dc2626" };
            case "MEDIUM":
                return { label: "MED", bg: "rgba(217, 119, 6, 0.12)", text: "#d97706" };
            default:
                return { label: "EASY", bg: "rgba(22, 163, 74, 0.12)", text: "#16a34a" };
        }
    };

    const formatCompletionDate = (dateStr) => {
        if (!dateStr) return "Cleared recently";
        try {
            const d = new Date(dateStr);
            const today = new Date();
            const isToday =
                d.getDate() === today.getDate() &&
                d.getMonth() === today.getMonth() &&
                d.getFullYear() === today.getFullYear();

            if (isToday) {
                return `Today at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
            }
            return d.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        } catch {
            return "Completed";
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <ArrowLeft size={22} color={theme.colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>Missions & Quests</Text>
                    <Text style={styles.headerSubtitle}>
                        Campus objectives, challenges & achievements
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.colors.primary]}
                        tintColor={theme.colors.primary}
                    />
                }
            >
                {/* Stats Summary Cards */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { borderLeftColor: "#16a34a" }]}>
                        <View style={styles.statHeader}>
                            <CheckCircle2 size={16} color="#16a34a" />
                            <Text style={styles.statLabel}>COMPLETED</Text>
                        </View>
                        <Text style={styles.statValue}>{completedMissions.length}</Text>
                        <Text style={styles.statHint}>Cleared missions</Text>
                    </View>

                    <View style={[styles.statCard, { borderLeftColor: theme.colors.primary }]}>
                        <View style={styles.statHeader}>
                            <Crosshair size={16} color={theme.colors.primary} />
                            <Text style={styles.statLabel}>AVAILABLE</Text>
                        </View>
                        <Text style={styles.statValue}>{availableMissions.length}</Text>
                        <Text style={styles.statHint}>Active objectives</Text>
                    </View>

                    <View style={[styles.statCard, { borderLeftColor: "#f59e0b" }]}>
                        <View style={styles.statHeader}>
                            <Flame size={16} color="#f59e0b" />
                            <Text style={styles.statLabel}>EXP EARNED</Text>
                        </View>
                        <Text style={styles.statValue}>+{totalExpEarned}</Text>
                        <Text style={styles.statHint}>From quests</Text>
                    </View>
                </View>

                {/* Primary Segmented Tabs: Available / Completed / All */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            selectedTab === "available" && styles.tabButtonActive,
                        ]}
                        onPress={() => setSelectedTab("available")}
                    >
                        <Crosshair
                            size={14}
                            color={
                                selectedTab === "available"
                                    ? "#FFFFFF"
                                    : theme.colors.textMuted
                            }
                        />
                        <Text
                            style={[
                                styles.tabText,
                                selectedTab === "available" && styles.tabTextActive,
                            ]}
                        >
                            Available
                        </Text>
                        <View
                            style={[
                                styles.tabBadge,
                                selectedTab === "available" && styles.tabBadgeActive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.tabBadgeText,
                                    selectedTab === "available" && styles.tabBadgeTextActive,
                                ]}
                            >
                                {availableMissions.length}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            selectedTab === "completed" && styles.tabButtonActive,
                        ]}
                        onPress={() => setSelectedTab("completed")}
                    >
                        <CheckCircle2
                            size={14}
                            color={
                                selectedTab === "completed"
                                    ? "#FFFFFF"
                                    : theme.colors.textMuted
                            }
                        />
                        <Text
                            style={[
                                styles.tabText,
                                selectedTab === "completed" && styles.tabTextActive,
                            ]}
                        >
                            Completed
                        </Text>
                        <View
                            style={[
                                styles.tabBadge,
                                selectedTab === "completed" && styles.tabBadgeActive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.tabBadgeText,
                                    selectedTab === "completed" && styles.tabBadgeTextActive,
                                ]}
                            >
                                {completedMissions.length}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            selectedTab === "all" && styles.tabButtonActive,
                        ]}
                        onPress={() => setSelectedTab("all")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                selectedTab === "all" && styles.tabTextActive,
                            ]}
                        >
                            All ({allMissions.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Subcategory Pills: All / Daily / Timed */}
                <View style={styles.subfilterRow}>
                    <TouchableOpacity
                        style={[
                            styles.subfilterPill,
                            categoryFilter === "all" && styles.subfilterPillActive,
                        ]}
                        onPress={() => setCategoryFilter("all")}
                    >
                        <Text
                            style={[
                                styles.subfilterText,
                                categoryFilter === "all" && styles.subfilterTextActive,
                            ]}
                        >
                            All Types
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.subfilterPill,
                            categoryFilter === "daily" && styles.subfilterPillActive,
                        ]}
                        onPress={() => setCategoryFilter("daily")}
                    >
                        <Text
                            style={[
                                styles.subfilterText,
                                categoryFilter === "daily" && styles.subfilterTextActive,
                            ]}
                        >
                            Daily Objectives
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.subfilterPill,
                            categoryFilter === "timed" && styles.subfilterPillActive,
                        ]}
                        onPress={() => setCategoryFilter("timed")}
                    >
                        <Text
                            style={[
                                styles.subfilterText,
                                categoryFilter === "timed" && styles.subfilterTextActive,
                            ]}
                        >
                            Time-Limited
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Mission Cards List */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.loadingText}>Loading campus missions...</Text>
                    </View>
                ) : displayedMissions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        {selectedTab === "available" ? (
                            <>
                                <CheckCircle2 size={48} color="#16a34a" style={{ marginBottom: 12 }} />
                                <Text style={styles.emptyTitle}>All Missions Cleared! 🎉</Text>
                                <Text style={styles.emptySubtitle}>
                                    Great work, Explorer! You have completed all active missions in this category.
                                    Check the Completed tab to review your accomplishments or return tomorrow for fresh daily objectives.
                                </Text>
                            </>
                        ) : selectedTab === "completed" ? (
                            <>
                                <Crosshair size={48} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
                                <Text style={styles.emptyTitle}>No Completed Missions Yet</Text>
                                <Text style={styles.emptySubtitle}>
                                    You have not cleared any missions in this filter yet. Head over to the Available tab and start a mission to earn EXP!
                                </Text>
                            </>
                        ) : (
                            <>
                                <Compass size={48} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
                                <Text style={styles.emptyTitle}>No Missions Found</Text>
                                <Text style={styles.emptySubtitle}>
                                    No campus missions match your current filter selection.
                                </Text>
                            </>
                        )}
                    </View>
                ) : (
                    <View style={styles.missionList}>
                        {displayedMissions.map((mission, index) => {
                            const isCompleted = mission.is_completed;
                            const diffInfo = getDifficultyStyle(mission.difficulty);
                            const distance = getBuildingDistance(mission.target_building);

                            return (
                                <View
                                    key={mission.id || index}
                                    style={[
                                        styles.missionCard,
                                        isCompleted && styles.missionCardCompleted,
                                    ]}
                                >
                                    {/* Top Row: Type Tag + Status/Difficulty + Reward */}
                                    <View style={styles.cardTopRow}>
                                        <View style={styles.tagGroup}>
                                            <View
                                                style={[
                                                    styles.typeBadge,
                                                    mission.type === "timed" && styles.typeBadgeTimed,
                                                ]}
                                            >
                                                {mission.type === "timed" ? (
                                                    <Timer size={10} color="#b45309" />
                                                ) : (
                                                    <Crosshair size={10} color={theme.colors.primary} />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.typeBadgeText,
                                                        mission.type === "timed" && styles.typeBadgeTextTimed,
                                                    ]}
                                                >
                                                    {mission.typeLabel || "MISSION"}
                                                </Text>
                                            </View>

                                            {isCompleted ? (
                                                <View style={styles.completedBadge}>
                                                    <CheckCircle2 size={11} color="#15803d" />
                                                    <Text style={styles.completedBadgeText}>
                                                        COMPLETED
                                                    </Text>
                                                </View>
                                            ) : (
                                                <View
                                                    style={[
                                                        styles.difficultyBadge,
                                                        { backgroundColor: diffInfo.bg },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.difficultyBadgeText,
                                                            { color: diffInfo.text },
                                                        ]}
                                                    >
                                                        {diffInfo.label}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* EXP Reward Pill */}
                                        <View
                                            style={[
                                                styles.rewardPill,
                                                isCompleted && styles.rewardPillCompleted,
                                            ]}
                                        >
                                            <Sparkles
                                                size={11}
                                                color={isCompleted ? "#15803d" : theme.colors.primary}
                                            />
                                            <Text
                                                style={[
                                                    styles.rewardText,
                                                    isCompleted && styles.rewardTextCompleted,
                                                ]}
                                            >
                                                +{mission.reward_points} EXP
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Title */}
                                    <Text style={styles.missionTitle}>
                                        {mission.title}
                                    </Text>

                                    {/* Hint / Description */}
                                    {mission.hint ? (
                                        <Text style={styles.missionHint}>
                                            "{mission.hint}"
                                        </Text>
                                    ) : null}

                                    {/* Target Building & Details */}
                                    <View style={styles.targetSection}>
                                        <View style={styles.targetIconWrap}>
                                            <Building2 size={14} color={theme.colors.textSecondary} />
                                        </View>
                                        <View style={styles.targetDetails}>
                                            <Text style={styles.targetLabel}>TARGET LOCATION</Text>
                                            <Text style={styles.targetName} numberOfLines={1}>
                                                {mission.target_building_name || "Campus Landmark"}
                                            </Text>
                                        </View>
                                        {distance && !isCompleted && (
                                            <View style={styles.distanceBadge}>
                                                <MapPin size={10} color="#b21830" />
                                                <Text style={styles.distanceText}>{distance}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Card Footer: Action / Completion status */}
                                    <View style={styles.cardFooter}>
                                        {isCompleted ? (
                                            <View style={styles.completedFooterRow}>
                                                <View style={styles.completedTimeWrap}>
                                                    <Clock size={12} color="#6b7280" />
                                                    <Text style={styles.completedTimeText}>
                                                        {formatCompletionDate(mission.completed_at)}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.inspectBtn}
                                                    onPress={() => router.push("/(tabs)/buildings")}
                                                >
                                                    <Text style={styles.inspectBtnText}>
                                                        View Map
                                                    </Text>
                                                    <ChevronRight size={14} color={theme.colors.textSecondary} />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.startBtn}
                                                activeOpacity={0.85}
                                                onPress={() =>
                                                    router.push({
                                                        pathname: "/(tabs)/ar",
                                                        params: {
                                                            targetBuildingId: mission.target_building,
                                                            questId: mission.id,
                                                        },
                                                    })
                                                }
                                            >
                                                <Text style={styles.startBtnText}>
                                                    Start Mission in AR
                                                </Text>
                                                <ChevronRight size={16} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: "#FFFFFF",
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 8,
        backgroundColor: "rgba(178, 24, 48, 0.08)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    headerTextWrap: {
        flex: 1,
    },
    headerTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 18,
        color: theme.colors.textPrimary,
        letterSpacing: 0.3,
    },
    headerSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: theme.colors.textMuted,
        marginTop: 1,
    },
    content: {
        flex: 1,
        backgroundColor: "#FAFAFA",
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 36,
    },

    // Summary Stats
    statsRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderLeftWidth: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    statHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 4,
    },
    statLabel: {
        fontFamily: fonts.heading.bold,
        fontSize: 9,
        color: theme.colors.textSecondary,
        letterSpacing: 0.5,
    },
    statValue: {
        fontFamily: fonts.heading.bold,
        fontSize: 18,
        color: theme.colors.textPrimary,
    },
    statHint: {
        fontFamily: fonts.body.regular,
        fontSize: 9,
        color: theme.colors.textMuted,
        marginTop: 2,
    },

    // Tabs
    tabsContainer: {
        flexDirection: "row",
        backgroundColor: "#F1F5F9",
        padding: 4,
        borderRadius: 8,
        marginBottom: 12,
        gap: 6,
    },
    tabButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        borderRadius: 6,
        gap: 6,
    },
    tabButtonActive: {
        backgroundColor: theme.colors.primary,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    tabTextActive: {
        color: "#FFFFFF",
    },
    tabBadge: {
        backgroundColor: "rgba(0,0,0,0.06)",
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
    },
    tabBadgeActive: {
        backgroundColor: "rgba(255,255,255,0.25)",
    },
    tabBadgeText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: theme.colors.textSecondary,
    },
    tabBadgeTextActive: {
        color: "#FFFFFF",
    },

    // Subfilter row
    subfilterRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 16,
    },
    subfilterPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    subfilterPillActive: {
        backgroundColor: "rgba(178, 24, 48, 0.08)",
        borderColor: theme.colors.primary,
    },
    subfilterText: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    subfilterTextActive: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.primary,
    },

    // Mission Cards
    missionList: {
        gap: 12,
    },
    missionCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    missionCardCompleted: {
        backgroundColor: "#FAFAF9",
        borderColor: "#E2E8F0",
    },
    cardTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "between",
        marginBottom: 10,
    },
    tagGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
    },
    typeBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 4,
        backgroundColor: "rgba(178, 24, 48, 0.08)",
    },
    typeBadgeTimed: {
        backgroundColor: "rgba(245, 158, 11, 0.12)",
    },
    typeBadgeText: {
        fontFamily: fonts.heading.bold,
        fontSize: 9,
        color: theme.colors.primary,
        letterSpacing: 0.3,
    },
    typeBadgeTextTimed: {
        color: "#b45309",
    },
    difficultyBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    difficultyBadgeText: {
        fontFamily: fonts.heading.bold,
        fontSize: 9,
        letterSpacing: 0.3,
    },
    completedBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 4,
        backgroundColor: "#DCFCE7",
        borderWidth: 1,
        borderColor: "#BBF7D0",
    },
    completedBadgeText: {
        fontFamily: fonts.heading.bold,
        fontSize: 9,
        color: "#15803d",
        letterSpacing: 0.3,
    },
    rewardPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        backgroundColor: "rgba(178, 24, 48, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(178, 24, 48, 0.2)",
    },
    rewardPillCompleted: {
        backgroundColor: "#DCFCE7",
        borderColor: "#86EFAC",
    },
    rewardText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: theme.colors.primary,
    },
    rewardTextCompleted: {
        color: "#15803d",
    },
    missionTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 15,
        color: theme.colors.textPrimary,
        marginBottom: 6,
        lineHeight: 20,
    },
    missionHint: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontStyle: "italic",
        lineHeight: 17,
        marginBottom: 10,
    },
    targetSection: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        padding: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 12,
        gap: 8,
    },
    targetIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 5,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    targetDetails: {
        flex: 1,
    },
    targetLabel: {
        fontFamily: fonts.heading.bold,
        fontSize: 8,
        color: theme.colors.textMuted,
        letterSpacing: 0.5,
    },
    targetName: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: theme.colors.textPrimary,
    },
    distanceBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    distanceText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: "#b21830",
    },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
        paddingTop: 10,
    },
    startBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.primary,
        paddingVertical: 10,
        borderRadius: 6,
        gap: 6,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 2,
    },
    startBtnText: {
        fontFamily: fonts.heading.bold,
        fontSize: 13,
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
    completedFooterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    completedTimeWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    completedTimeText: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: "#6b7280",
    },
    inspectBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    inspectBtnText: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        color: theme.colors.textSecondary,
    },

    // Empty / Loading states
    loadingContainer: {
        paddingVertical: 48,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    loadingText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: theme.colors.textMuted,
    },
    emptyContainer: {
        paddingVertical: 48,
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    emptyTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: theme.colors.textPrimary,
        marginBottom: 8,
        textAlign: "center",
    },
    emptySubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: theme.colors.textSecondary,
        textAlign: "center",
        lineHeight: 18,
    },
});
