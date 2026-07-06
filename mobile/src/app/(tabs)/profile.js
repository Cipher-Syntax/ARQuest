import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    DeviceEventEmitter,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    Trophy,
    Medal,
    LogOut,
    ChevronRight,
    User as UserIcon,
    ShieldAlert,
    Settings,
    HelpCircle,
    Award,
    Crosshair,
    Map,
    MessageSquare,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { api } from "../../services/api";
import theme from "../../theme/tokens";
import { useAuth } from "../../hooks/useAuth";
import { AVATARS } from "../../constants/Avatars";
import { fonts } from "../../constants/typography";
import FeedbackModal from "../../components/FeedbackModal";
import { customAlert as Alert } from "../../components/CustomAlert";

export default function ProfileScreen() {
    const { user, logout, checkToken } = useAuth();
    const [myStats, setMyStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [badgeCount, setBadgeCount] = useState(null);
    const [questHistory, setQuestHistory] = useState([]);
    const [myBadges, setMyBadges] = useState([]);
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [rankModalVisible, setRankModalVisible] = useState(false);

    const [refreshing, setRefreshing] = useState(false);

    const ALL_RANKS = [
        { level: 1, title: "Freshman", min_exp: 0, icon: "🎒" },
        { level: 2, title: "Explorer", min_exp: 100, icon: "🗺️" },
        { level: 3, title: "Scout", min_exp: 300, icon: "⛺" },
        { level: 4, title: "Ranger", min_exp: 600, icon: "🦅" },
        { level: 5, title: "Veteran", min_exp: 1000, icon: "⚔️" },
        { level: 6, title: "Campus Legend", min_exp: 2000, icon: "👑" },
    ];

    const loadData = async () => {
        try {
            if (checkToken) await checkToken(); // Refresh global user EXP and rank
            if (user?.role === "student") {
                const resStats = await api.get(
                    "/api/gamification/leaderboard/",
                );
                if (resStats.data.success) {
                    const stats = resStats.data.data.find(
                        (r) => r.username === user.username,
                    );
                    setMyStats(stats);
                }
            }

            const resBadges = await api.get("/api/gamification/badges/");
            if (resBadges.data.success) {
                const allBadges = resBadges.data.data;
                const earnedBadges = allBadges.filter((b) => b.earned);
                setBadgeCount(`${earnedBadges.length}/${allBadges.length}`);
                setMyBadges(allBadges);
            }

            const resHistory = await api.get(
                "/api/gamification/quests/history/",
            );
            if (resHistory.data.success) {
                setQuestHistory(resHistory.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch profile data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    const SettingsRow = ({
        icon: Icon,
        title,
        subtitle,
        onPress,
        destructive,
    }) => (
        <TouchableOpacity style={styles.settingsRow} onPress={onPress}>
            <View
                style={[
                    styles.settingsIconWrapper,
                    destructive && { backgroundColor: "rgba(255, 0, 0, 0.1)" },
                ]}
            >
                <Icon
                    size={22}
                    color={
                        destructive ? theme.colors.error : theme.colors.primary
                    }
                />
            </View>
            <View style={styles.settingsTextWrapper}>
                <Text
                    style={[
                        styles.settingsTitle,
                        destructive && { color: theme.colors.error },
                    ]}
                >
                    {title}
                </Text>
                {subtitle && (
                    <Text style={styles.settingsSubtitle}>{subtitle}</Text>
                )}
            </View>
            <ChevronRight size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.appBar}>
                <Text style={styles.appBarTitle}>Profile</Text>
            </View>

            <ScrollView
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
                {/* --- Player ID Card (#6) --- */}
                <LinearGradient
                    colors={["#8A1538", "#B21830"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.playerCard}
                >
                    <View style={styles.playerCardTop}>
                        {user?.avatar_id &&
                        AVATARS.find((a) => a.id === user.avatar_id)?.source ? (
                            <Image
                                source={
                                    AVATARS.find((a) => a.id === user.avatar_id)
                                        .source
                                }
                                style={styles.playerAvatar}
                            />
                        ) : (
                            <View style={styles.playerAvatar}>
                                <Text style={styles.avatarText}>
                                    {user?.username?.charAt(0).toUpperCase() ||
                                        "?"}
                                </Text>
                            </View>
                        )}
                        <View style={styles.playerInfo}>
                            <Text style={styles.playerUsername}>
                                @{user?.username}
                            </Text>
                            {user?.role === "student" ? (
                                <View style={styles.playerRankBadge}>
                                    <Text style={styles.playerRankIcon}>
                                        {user?.rank_info?.icon || "🎒"}
                                    </Text>
                                    <Text style={styles.playerRoleLabel}>
                                        Lv.{user?.rank_info?.level || 1}{" "}
                                        {user?.rank_info?.title?.toUpperCase() ||
                                            "FRESHMAN"}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.playerRoleLabel}>
                                    {user?.role?.toUpperCase() ||
                                        "PROFESSIONAL"}
                                </Text>
                            )}
                        </View>
                    </View>

                    {user?.role === "student" && (
                        <View style={styles.playerCardBottom}>
                            {loading ? (
                                <ActivityIndicator
                                    size="small"
                                    color={theme.colors.primary}
                                    style={{ padding: 10 }}
                                />
                            ) : (
                                <>
                                    <View style={styles.progressHeader}>
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                            }}
                                        >
                                            <Text style={styles.progressTitle}>
                                                RANK PROGRESS
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() =>
                                                    setRankModalVisible(true)
                                                }
                                                style={{ marginLeft: 6 }}
                                            >
                                                <HelpCircle
                                                    size={14}
                                                    color="rgba(255,255,255,0.7)"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.progressPoints}>
                                            {user.exploration_points} EXP
                                        </Text>
                                    </View>

                                    <View style={styles.progressBarContainer}>
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                {
                                                    width: `${user?.rank_info?.progress_percentage || 0}%`,
                                                },
                                            ]}
                                        />
                                    </View>

                                    <View style={styles.progressFooter}>
                                        <Text style={styles.progressSubtext}>
                                            {user?.rank_info?.next_rank_exp
                                                ? `${user.rank_info.exp_to_next_rank} EXP to next rank`
                                                : "Max Rank Achieved!"}
                                        </Text>
                                        <View style={styles.miniStreak}>
                                            <Text
                                                style={styles.miniStreakFlame}
                                            >
                                                🔥
                                            </Text>
                                            <Text style={styles.miniStreakText}>
                                                {user?.streak_count || 0}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.gamifiedStatsGrid}>
                                        <View style={styles.gamifiedStatBox}>
                                            <Text
                                                style={styles.gamifiedStatLabel}
                                            >
                                                TOTAL QUESTS
                                            </Text>
                                            <Text
                                                style={styles.gamifiedStatValue}
                                            >
                                                {myStats?.quests_completed || 0}
                                            </Text>
                                        </View>
                                        <View style={styles.gamifiedStatBox}>
                                            <Text
                                                style={styles.gamifiedStatLabel}
                                            >
                                                TOTAL BADGES
                                            </Text>
                                            <Text
                                                style={styles.gamifiedStatValue}
                                            >
                                                {badgeCount
                                                    ? badgeCount.split("/")[0]
                                                    : 0}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    )}
                </LinearGradient>

                {/* --- Badge Showcase --- */}
                {user?.role === "student" && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                TOP ACHIEVEMENTS
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push("/badges")}
                                style={styles.seeAllBtn}
                            >
                                <Text style={styles.seeAllText}>VIEW ALL</Text>
                                <ChevronRight
                                    size={14}
                                    color={theme.colors.arHighlight}
                                />
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal={true}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.badgesCarousel}
                        >
                            {myBadges.length > 0 ? (
                                myBadges.map((badge, idx) => (
                                    <TouchableOpacity
                                        key={badge.id || idx}
                                        style={[
                                            styles.badgeItem,
                                            !badge.earned &&
                                                styles.badgeItemLocked,
                                        ]}
                                        onPress={() =>
                                            Alert(
                                                badge.name,
                                                badge.description ||
                                                    "Keep playing to unlock this achievement!",
                                            )
                                        }
                                    >
                                        <View
                                            style={[
                                                styles.badgeIconWrapper,
                                                !badge.earned &&
                                                    styles.badgeIconWrapperLocked,
                                            ]}
                                        >
                                            <Text style={styles.badgeIcon}>
                                                {badge.earned
                                                    ? badge.icon
                                                    : "🔒"}
                                            </Text>
                                        </View>
                                        <Text
                                            style={[
                                                styles.badgeName,
                                                !badge.earned &&
                                                    styles.badgeNameLocked,
                                            ]}
                                            numberOfLines={2}
                                        >
                                            {badge.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>
                                        No badges available.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                )}

                {/* --- Quest History --- */}
                {user?.role === "student" && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>MISSION LOG</Text>
                        <View style={styles.missionLogCard}>
                            {questHistory.length > 0 ? (
                                questHistory.slice(0, 5).map((quest, idx) => (
                                    <View
                                        key={idx}
                                        style={[
                                            styles.missionLogRow,
                                            idx <
                                                Math.min(
                                                    questHistory.length,
                                                    5,
                                                ) -
                                                    1 &&
                                                styles.missionLogDivider,
                                        ]}
                                    >
                                        <Text style={styles.missionLogText}>
                                            <Text
                                                style={styles.missionLogPrefix}
                                            >
                                                [COMPLETED]
                                            </Text>{" "}
                                            {new Date(
                                                quest.time_ago,
                                            ).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "2-digit",
                                                day: "2-digit",
                                            })}
                                        </Text>
                                        <Text style={styles.missionLogText}>
                                            TARGET:{" "}
                                            {quest.target_building ||
                                                quest.building_name}
                                        </Text>
                                        <Text style={styles.missionLogReward}>
                                            REWARD: +{quest.points} EXP
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>
                                        No quests completed recently.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* General Settings */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>GENERAL SETTINGS</Text>
                    <View style={styles.settingsCard}>
                        {user?.role === "student" && (
                            <SettingsRow
                                icon={Trophy}
                                title="View Rankings"
                                subtitle="See where you stand globally"
                                onPress={() => router.push("/leaderboard")}
                            />
                        )}

                        {user?.role === "student" && (
                            <SettingsRow
                                icon={Award}
                                title="My Achievements"
                                subtitle={
                                    badgeCount
                                        ? `${badgeCount} badges earned`
                                        : "View your badges"
                                }
                                onPress={() => router.push("/badges")}
                            />
                        )}

                        {(user?.role === "student" ||
                            user?.role === "professional") && (
                            <SettingsRow
                                icon={Map}
                                title={
                                    user?.role === "professional"
                                        ? "Visited Buildings"
                                        : "Building Discoveries"
                                }
                                subtitle={
                                    user?.role === "professional"
                                        ? "View your building visit history"
                                        : "Check your visited and unvisited campus areas"
                                }
                                onPress={() => router.push("/passport")}
                            />
                        )}

                        <SettingsRow
                            icon={UserIcon}
                            title="Account Settings"
                            subtitle="Update your profile and avatar"
                            onPress={() => router.push("/account-settings")}
                        />

                        <SettingsRow
                            icon={Settings}
                            title="App Preferences"
                            subtitle="Permissions and notifications"
                            onPress={() => {}}
                        />
                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>SUPPORT</Text>
                    <View style={styles.settingsCard}>
                        <SettingsRow
                            icon={MessageSquare}
                            title="Report an Issue / Feedback"
                            subtitle="Help us improve ARQuest"
                            onPress={() => setFeedbackModalVisible(true)}
                        />
                        <SettingsRow
                            icon={HelpCircle}
                            title="Replay Tutorial"
                            subtitle="View the onboarding guide again"
                            onPress={() =>
                                DeviceEventEmitter.emit("show_tutorial")
                            }
                        />
                        <SettingsRow
                            icon={HelpCircle}
                            title="About ARQuest"
                            subtitle="Version 1.0.0"
                            onPress={() => {}}
                        />
                        <SettingsRow
                            icon={ShieldAlert}
                            title="Privacy Policy"
                            onPress={() => {}}
                        />
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <LogOut
                        size={20}
                        color={theme.colors.error}
                        style={{ marginRight: 8 }}
                    />
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
            </ScrollView>

            <FeedbackModal
                visible={feedbackModalVisible}
                onClose={() => setFeedbackModalVisible(false)}
            />

            {/* Rank Guide Modal */}
            {rankModalVisible && (
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            backgroundColor: "rgba(0,0,0,0.6)",
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 100,
                        },
                    ]}
                >
                    <View
                        style={{
                            backgroundColor: theme.colors.surface,
                            width: "85%",
                            borderRadius: theme.radius.xl,
                            padding: 24,
                            maxHeight: "80%",
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: fonts.heading.bold,
                                fontSize: 20,
                                color: theme.colors.textPrimary,
                                marginBottom: 8,
                                textAlign: "center",
                            }}
                        >
                            Rank Progression
                        </Text>
                        <Text
                            style={{
                                fontFamily: fonts.body.regular,
                                fontSize: 13,
                                color: theme.colors.textSecondary,
                                marginBottom: 20,
                                textAlign: "center",
                            }}
                        >
                            Earn EXP by exploring the campus and completing
                            quests to level up your rank!
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {ALL_RANKS.map((rank, index) => {
                                const isCurrentRank =
                                    user?.rank_info?.level === rank.level;
                                const isLocked =
                                    (user?.exploration_points || 0) <
                                    rank.min_exp;
                                return (
                                    <View
                                        key={rank.level}
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            paddingVertical: 12,
                                            borderBottomWidth:
                                                index < ALL_RANKS.length - 1
                                                    ? 1
                                                    : 0,
                                            borderBottomColor:
                                                theme.colors.border,
                                            opacity: isLocked ? 0.6 : 1,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 24,
                                                backgroundColor: isCurrentRank
                                                    ? "rgba(178,24,48,0.1)"
                                                    : theme.colors.surfaceSoft,
                                                justifyContent: "center",
                                                alignItems: "center",
                                                marginRight: 16,
                                                borderWidth: 1,
                                                borderColor: isCurrentRank
                                                    ? theme.colors.primary
                                                    : theme.colors.border,
                                            }}
                                        >
                                            <Text style={{ fontSize: 24 }}>
                                                {rank.icon}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={{
                                                    fontFamily:
                                                        fonts.heading.bold,
                                                    fontSize: 16,
                                                    color: isCurrentRank
                                                        ? theme.colors.primary
                                                        : theme.colors
                                                              .textPrimary,
                                                }}
                                            >
                                                Lv.{rank.level} {rank.title}
                                            </Text>
                                            <Text
                                                style={{
                                                    fontFamily: fonts.body.bold,
                                                    fontSize: 12,
                                                    color: theme.colors
                                                        .textSecondary,
                                                }}
                                            >
                                                {rank.min_exp} EXP Required
                                            </Text>
                                        </View>
                                        {isCurrentRank && (
                                            <View
                                                style={{
                                                    backgroundColor:
                                                        theme.colors.primary,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 4,
                                                    borderRadius: 12,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontFamily:
                                                            fonts.hud.bold,
                                                        color: "#FFF",
                                                        fontSize: 10,
                                                    }}
                                                >
                                                    CURRENT
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            style={{
                                backgroundColor: theme.colors.primary,
                                padding: 14,
                                borderRadius: theme.radius.lg,
                                marginTop: 20,
                                alignItems: "center",
                            }}
                            onPress={() => setRankModalVisible(false)}
                        >
                            <Text
                                style={{
                                    fontFamily: fonts.heading.bold,
                                    color: "#FFFFFF",
                                    fontSize: 16,
                                }}
                            >
                                Close
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
    },
    appBar: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    appBarTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 22,
        fontWeight: "bold",
        color: theme.colors.textPrimary,
        letterSpacing: 0.5,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    playerCard: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.xl,
        overflow: "hidden",
        marginBottom: theme.spacing.xl,
        elevation: 8,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    playerCardTop: {
        flexDirection: "row",
        alignItems: "center",
        padding: theme.spacing.lg,
    },
    playerAvatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: theme.spacing.md,
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    avatarText: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 32,
    },
    playerInfo: {
        flex: 1,
    },
    playerUsername: {
        fontFamily: fonts.heading.bold,
        fontSize: 22,
        color: "#FFFFFF",
        marginBottom: 4,
    },
    playerRankBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    playerRankIcon: {
        fontSize: 16,
    },
    playerRoleLabel: {
        fontFamily: fonts.hud.bold,
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: 12,
        letterSpacing: 1,
    },
    playerCardBottom: {
        backgroundColor: "rgba(0, 0, 0, 0.15)",
        padding: theme.spacing.lg,
    },
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    progressTitle: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 12,
        letterSpacing: 1,
    },
    progressPoints: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 14,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 8,
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 4,
    },
    progressFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    progressSubtext: {
        fontFamily: fonts.body.regular,
        color: "rgba(255, 255, 255, 0.7)",
        fontSize: 12,
    },
    miniStreak: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    miniStreakFlame: {
        fontSize: 12,
    },
    miniStreakText: {
        fontFamily: fonts.hud.bold,
        color: "#FFFFFF",
        fontSize: 10,
    },
    gamifiedStatsGrid: {
        flexDirection: "row",
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.15)",
        paddingTop: 16,
    },
    gamifiedStatBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        paddingVertical: 10,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    gamifiedStatLabel: {
        fontFamily: fonts.hud.bold,
        color: "rgba(255, 255, 255, 0.7)",
        fontSize: 10,
        letterSpacing: 1,
        marginBottom: 4,
    },
    gamifiedStatValue: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 18,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    seeAllBtn: {
        flexDirection: "row",
        alignItems: "center",
    },
    seeAllText: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.arHighlight,
        fontSize: 10,
        letterSpacing: 1,
        marginRight: 2,
    },
    badgesCarousel: {
        paddingVertical: 10,
        paddingHorizontal: 4,
        gap: 16,
    },
    badgeItem: {
        width: 72,
        alignItems: "center",
    },
    badgeItemLocked: {
        opacity: 0.6,
    },
    badgeIconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
        backgroundColor: "rgba(220, 20, 60, 0.1)",
        borderWidth: 2,
        borderColor: "#DC143C",
        shadowColor: "#DC143C",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 4,
    },
    badgeIconWrapperLocked: {
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: "dashed",
        backgroundColor: theme.colors.surfaceSoft,
        shadowOpacity: 0,
        elevation: 0,
    },
    badgeIcon: {
        fontSize: 24,
    },
    badgeName: {
        fontFamily: fonts.heading.medium,
        color: theme.colors.textPrimary,
        fontSize: 10,
        textAlign: "center",
    },
    badgeNameLocked: {
        color: theme.colors.textMuted,
    },
    emptyContainer: {
        padding: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: "100%",
    },
    emptyText: {
        fontFamily: fonts.body.regular,
        color: theme.colors.textMuted,
        fontSize: 12,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 13,
        fontWeight: "bold",
        color: theme.colors.textSecondary,
        marginBottom: 10,
        marginLeft: 4,
        letterSpacing: 1,
    },
    settingsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: "hidden",
    },
    settingsRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    settingsIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(178, 24, 48, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    settingsTextWrapper: {
        flex: 1,
    },
    settingsTitle: {
        fontFamily: fonts.body.bold || fonts.body.medium,
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.textPrimary,
    },
    settingsSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: "row",
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: theme.colors.error,
        marginTop: 10,
    },
    logoutButtonText: {
        color: theme.colors.error,
        fontSize: 16,
        fontWeight: "bold",
    },
    missionLogCard: {
        backgroundColor: theme.colors.surfaceSoft,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.primary,
        padding: 12,
        borderRadius: 4,
    },
    missionLogRow: {
        paddingVertical: 10,
    },
    missionLogDivider: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        borderStyle: "dashed",
    },
    missionLogText: {
        fontFamily: "monospace",
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginBottom: 4,
    },
    missionLogPrefix: {
        color: theme.colors.primary,
        fontWeight: "bold",
    },
    missionLogReward: {
        fontFamily: "monospace",
        color: theme.colors.primary,
        fontWeight: "bold",
        fontSize: 12,
    },
});
