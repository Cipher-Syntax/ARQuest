import React, { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
    Animated,
    Image,
    RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";

import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services";
import theme from "../../theme/tokens";
import { fonts } from "../../constants/typography";
import ARGlassCard from "../../components/ar/ARGlassCard";
import ARButton from "../../components/ar/ARButton";
import {
    Trophy,
    Compass,
    Crosshair,
    MapPin,
    Map as MapIcon,
    ScanLine,
    BarChart2,
    ChevronRight,
    Box,
    Activity,
    Timer,
} from "lucide-react-native";
import { router } from "expo-router";
import { useIsFocused } from "../../hooks/useIsFocused";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { geofencingService } from "../../services";

export default function HomeScreen() {
    const isFocused = useIsFocused();
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Carousel
    const scrollX = React.useRef(new Animated.Value(0)).current;
    const webViewRef = React.useRef(null);
    const [webViewReady, setWebViewReady] = useState(false);
    const SCREEN_WIDTH = Dimensions.get("window").width;
    const CAROUSEL_WIDTH = SCREEN_WIDTH; // Bleed to edges
    const ITEM_WIDTH = SCREEN_WIDTH - 40; // Exact width of daily mission card
    const ITEM_SPACING = 12;
    const FULL_ITEM_WIDTH = ITEM_WIDTH + ITEM_SPACING;
    const INSET_HORIZONTAL = (CAROUSEL_WIDTH - ITEM_WIDTH) / 2;

    const { location } = useLocationTracking();
    const [buildings, setBuildings] = useState([]);
    const [nearestBuilding, setNearestBuilding] = useState(null);
    const [distanceToNearest, setDistanceToNearest] = useState(null);

    useEffect(() => {
        // We only want tracking to start manually on Explore tab
        // startTracking();
    }, []);

    // Gamification Backend States
    const [activeQuest, setActiveQuest] = useState(null);

    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const resBuildings = await api.get("/api/buildings/");
            if (resBuildings.data.success) {
                setBuildings(resBuildings.data.data);
            }

            if (user?.role === "student") {
                const resStats = await api.get(
                    "/api/gamification/leaderboard/",
                );
                if (resStats.data.success) {
                    const myStats = resStats.data.data.find(
                        (r) => r.username === user.username,
                    );
                    setStats(myStats);
                }
            }

            const resQuest = await api.get("/api/gamification/quests/active/");
            if (resQuest.data.success) {
                const quests = resQuest.data.data.quests || resQuest.data.data;
                if (quests && quests.length > 0) {
                    const nextQuest = quests.find(q => !q.is_completed) || quests[0];
                    setActiveQuest(nextQuest);
                } else {
                    setActiveQuest(null);
                }
            } else {
                setActiveQuest(null);
            }

            const resChallenges = await api.get(
                "/api/gamification/challenges/",
            );
            if (resChallenges.data.success) {
                setChallenges(resChallenges.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch gamification data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (location && buildings.length > 0) {
            let minDistance = Infinity;
            let nearest = null;

            buildings.forEach((b) => {
                if (b.latitude && b.longitude) {
                    const dist = geofencingService.calculateDistance(
                        location.latitude,
                        location.longitude,
                        parseFloat(b.latitude),
                        parseFloat(b.longitude),
                    );
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearest = b;
                    }
                }
            });

            if (nearest) {
                setNearestBuilding(nearest);
                setDistanceToNearest(Math.round(minDistance));
            }
        }
    }, [location, buildings]);

    useEffect(() => {
        if (webViewReady && webViewRef.current && buildings.length > 0) {
            const message = JSON.stringify({
                type: "update",
                buildings: buildings.slice(0, 5), // Just a few for preview
                unlockedIds: buildings.map((b) => b.id), // Pretend all unlocked for preview map
                mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
                userLocation: location,
            });
            webViewRef.current.postMessage(message);
        }
    }, [webViewReady, buildings, location]);

    const [challenges, setChallenges] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    const mapHtml = require("../../../assets/buildings-map.html");

    return (
        <View style={styles.container}>
            {isFocused && <StatusBar style="light" />}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.colors.primary]}
                        tintColor={"#FFFFFF"}
                    />
                }
            >
                {/* Massive Crimson Header */}
                <LinearGradient
                    colors={["#9b1b30", "#7a1525"]}
                    style={styles.crimsonHeader}
                >
                    <View style={styles.headerTopRow}>
                        <View style={styles.userInfo}>
                            <Text style={styles.greeting}>CAMPUS EXPLORER</Text>
                            <Text style={styles.username}>
                                {user?.username || "Guest"}
                            </Text>
                            {user?.role === "student" && user?.rank_info && (
                                <Text style={styles.userLevel}>
                                    {user.rank_info.icon || "🎒"} Lv.
                                    {user.rank_info.level}{" "}
                                    {user.rank_info.title}
                                </Text>
                            )}
                        </View>
                        <View style={styles.headerRight}>
                            {user?.role === "student" &&
                                user?.streak_count > 0 && (
                                    <View style={styles.streakBadge}>
                                        <Text style={styles.streakFlame}>
                                            🔥
                                        </Text>
                                        <Text style={styles.streakText}>
                                            {user.streak_count}
                                        </Text>
                                    </View>
                                )}
                        </View>
                    </View>

                    {user?.role === "student" && (
                        <View style={styles.expContainer}>
                            <View style={styles.expTextRow}>
                                <Text style={styles.expLabel}>SEASON PROGRESS</Text>
                                <Text style={styles.expValue}>
                                    {stats?.points || 0} PTS
                                </Text>
                            </View>
                            <View style={styles.expBarTrack}>
                                <View
                                    style={[
                                        styles.expBarFill,
                                        { width: "65%" },
                                    ]}
                                />
                            </View>
                        </View>
                    )}
                </LinearGradient>

                <View style={styles.contentArea}>
                    {user?.role === "student" ? (
                        <>
                            {/* --- Daily Mission Hero Card --- */}
                            <View style={styles.heroCard}>
                                <View style={styles.heroTopRow}>
                                    <View style={styles.heroLabelChip}>
                                        <Crosshair
                                            color={theme.colors.primary}
                                            size={14}
                                        />
                                        <Text style={styles.heroChipText}>
                                            DAILY OBJECTIVE
                                        </Text>
                                    </View>
                                    {activeQuest && (
                                        <View style={styles.heroExpBadge}>
                                            <Text style={styles.heroExpText}>
                                                Reward:{" "}
                                                {activeQuest.reward_points} EXP
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Text
                                    style={styles.heroQuestTitle}
                                    numberOfLines={2}
                                >
                                    {loading
                                        ? "Loading..."
                                        : activeQuest
                                          ? activeQuest.title
                                          : "All missions cleared!\nCheck back later for new tasks."}
                                </Text>

                                <View style={styles.heroBottomRow}>
                                    <View style={styles.heroTargetInfo}>
                                        <Text style={styles.heroTargetLabel}>
                                            CURRENT TARGET
                                        </Text>
                                        <Text
                                            style={styles.heroTargetValue}
                                            numberOfLines={1}
                                        >
                                            {activeQuest
                                                ? activeQuest.target_building_name
                                                : "Scanning campus..."}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.heroDeployBtn,
                                            !activeQuest &&
                                                styles.heroDeployBtnDisabled,
                                        ]}
                                        onPress={() =>
                                            router.push({
                                                pathname: "/(tabs)/ar",
                                                params: { targetBuildingId: activeQuest.target_building }
                                            })
                                        }
                                        disabled={!activeQuest}
                                    >
                                        <Text
                                            style={[
                                                styles.heroDeployText,
                                                !activeQuest &&
                                                    styles.heroDeployTextDisabled,
                                            ]}
                                        >
                                            {activeQuest
                                                ? "Start Mission"
                                                : "WAITING"}
                                        </Text>
                                        <ChevronRight
                                            color={
                                                activeQuest
                                                    ? "#FFFFFF"
                                                    : "rgba(138,21,56,0.5)"
                                            }
                                            size={18}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* --- Limited Challenges --- */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>
                                        SPECIAL EVENTS
                                    </Text>
                                    {challenges.length > 1 && (
                                        <View style={styles.swipeHint}>
                                            <Text style={styles.swipeHintText}>
                                                SWIPE
                                            </Text>
                                            <ChevronRight
                                                color={theme.colors.textMuted}
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
                                    snapToInterval={SCREEN_WIDTH - 60}
                                    decelerationRate="fast"
                                >
                                    {challenges.length > 0 ? (
                                        challenges.map((challenge, index) => {
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
                                                <TouchableOpacity
                                                    key={challenge.id}
                                                    style={styles.ticketCard}
                                                    onPress={() =>
                                                        router.push(
                                                            "/(tabs)/ar",
                                                        )
                                                    }
                                                    activeOpacity={0.9}
                                                >
                                                    <View
                                                        style={
                                                            styles.ticketStub
                                                        }
                                                    >
                                                        <Timer
                                                            color="#FFFFFF"
                                                            size={20}
                                                            style={{
                                                                marginBottom: 4,
                                                            }}
                                                        />
                                                        <Text
                                                            style={
                                                                styles.ticketStubValue
                                                            }
                                                        >
                                                            +
                                                            {
                                                                challenge.reward_points
                                                            }
                                                        </Text>
                                                        <Text
                                                            style={
                                                                styles.ticketStubLabel
                                                            }
                                                        >
                                                            EXP
                                                        </Text>
                                                        <View
                                                            style={
                                                                styles.ticketCutoutTop
                                                            }
                                                        />
                                                        <View
                                                            style={
                                                                styles.ticketCutoutBottom
                                                            }
                                                        />
                                                    </View>
                                                    <View
                                                        style={
                                                            styles.ticketBody
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.ticketTitle
                                                            }
                                                            numberOfLines={2}
                                                        >
                                                            {challenge.title}
                                                        </Text>
                                                        <View
                                                            style={
                                                                styles.ticketFooter
                                                            }
                                                        >
                                                            <View>
                                                                <Text
                                                                    style={
                                                                        styles.ticketTargetLabel
                                                                    }
                                                                >
                                                                    EXPIRES AT
                                                                </Text>
                                                                <Text
                                                                    style={
                                                                        styles.ticketTargetValue
                                                                    }
                                                                >
                                                                    {expires.toLocaleTimeString(
                                                                        [],
                                                                        {
                                                                            hour: "2-digit",
                                                                            minute: "2-digit",
                                                                        },
                                                                    )}
                                                                </Text>
                                                            </View>
                                                            <View
                                                                style={
                                                                    styles.ticketDeployBtn
                                                                }
                                                            >
                                                                <Text
                                                                    style={
                                                                        styles.ticketDeployText
                                                                    }
                                                                >
                                                                    START
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })
                                    ) : (
                                        <View
                                            style={[
                                                styles.ticketCard,
                                                { opacity: 0.6 },
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.ticketStub,
                                                    {
                                                        backgroundColor:
                                                            theme.colors
                                                                .textMuted,
                                                        borderColor:
                                                            "rgba(255,255,255,0.1)",
                                                    },
                                                ]}
                                            >
                                                <Timer
                                                    color="#FFFFFF"
                                                    size={20}
                                                    style={{ marginBottom: 4 }}
                                                />
                                                <Text
                                                    style={
                                                        styles.ticketStubValue
                                                    }
                                                >
                                                    ---
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.ticketStubLabel
                                                    }
                                                >
                                                    EXP
                                                </Text>
                                                <View
                                                    style={
                                                        styles.ticketCutoutTop
                                                    }
                                                />
                                                <View
                                                    style={
                                                        styles.ticketCutoutBottom
                                                    }
                                                />
                                            </View>
                                            <View style={styles.ticketBody}>
                                                <Text
                                                    style={[
                                                        styles.ticketTitle,
                                                        {
                                                            color: theme.colors
                                                                .textMuted,
                                                        },
                                                    ]}
                                                    numberOfLines={2}
                                                >
                                                    No active limited events
                                                </Text>
                                                <View
                                                    style={styles.ticketFooter}
                                                >
                                                    <View>
                                                        <Text
                                                            style={
                                                                styles.ticketTargetLabel
                                                            }
                                                        >
                                                            STATUS: IDLE
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.ticketTargetValue,
                                                                {
                                                                    color: theme
                                                                        .colors
                                                                        .textMuted,
                                                                },
                                                            ]}
                                                        >
                                                            STANDBY
                                                        </Text>
                                                    </View>
                                                    <View
                                                        style={[
                                                            styles.ticketDeployBtn,
                                                            {
                                                                backgroundColor:
                                                                    theme.colors
                                                                        .surfaceSoft,
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.ticketDeployText,
                                                                {
                                                                    color: theme
                                                                        .colors
                                                                        .textMuted,
                                                                },
                                                            ]}
                                                        >
                                                            WAITING
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>
                        </>
                    ) : (
                        <View style={styles.heroCard}>
                            <View style={styles.heroTopRow}>
                                <View style={styles.heroLabelChip}>
                                    <Activity
                                        color={theme.colors.primary}
                                        size={14}
                                    />
                                    <Text style={styles.heroChipText}>
                                        ACCREDITOR PORTAL
                                    </Text>
                                </View>
                            </View>

                            <Text
                                style={styles.heroQuestTitle}
                                numberOfLines={2}
                            >
                                Welcome to the Campus AR Tour
                            </Text>

                            <View style={styles.heroBottomRow}>
                                <View style={styles.heroTargetInfo}>
                                    <Text style={styles.heroTargetLabel}>
                                        Access Level
                                    </Text>
                                    <Text
                                        style={styles.heroTargetValue}
                                        numberOfLines={1}
                                    >
                                        All Facilities Unlocked
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Quick Stats Split Row */}
                    {user?.role === "student" && (
                        <View style={styles.splitRow}>
                            <View style={styles.splitCard}>
                                <View style={styles.splitIconWrap}>
                                    <Trophy
                                        color={theme.colors.primary}
                                        size={24}
                                    />
                                </View>
                                <Text style={styles.splitValue}>
                                    #{stats?.rank || "--"}
                                </Text>
                                <Text style={styles.splitLabel}>
                                    Global Rank
                                </Text>
                            </View>

                            <View style={styles.splitCard}>
                                <View style={styles.splitIconWrap}>
                                    <MapPin
                                        color={theme.colors.primary}
                                        size={24}
                                    />
                                </View>
                                <Text style={styles.splitValue}>
                                    {distanceToNearest !== null
                                        ? `${(distanceToNearest / 1000).toFixed(2)}km`
                                        : "--"}
                                </Text>
                                <Text style={styles.splitLabel}>
                                    NEAREST HUB
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Quick Actions */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>TOOLS & NAVIGATION</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.actionGrid}
                        >
                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => router.push("/(tabs)/ar")}
                            >
                                <View style={styles.actionIconWrap}>
                                    <ScanLine
                                        color={theme.colors.primary}
                                        size={24}
                                    />
                                </View>
                                <Text style={styles.actionText}>AR Lens</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => router.push("/(tabs)/buildings")}
                            >
                                <View style={styles.actionIconWrap}>
                                    <MapIcon
                                        color={theme.colors.primary}
                                        size={24}
                                    />
                                </View>
                                <Text style={styles.actionText}>
                                    Map
                                </Text>
                            </TouchableOpacity>

                            {user?.role === "student" && (
                                <>
                                    <TouchableOpacity
                                        style={styles.actionCard}
                                        onPress={() =>
                                            router.push("/leaderboard")
                                        }
                                    >
                                        <View style={styles.actionIconWrap}>
                                            <BarChart2
                                                color={theme.colors.primary}
                                                size={24}
                                            />
                                        </View>
                                        <Text style={styles.actionText}>
                                            Leader
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.actionCard}
                                        onPress={() => router.push("/badges")}
                                    >
                                        <View style={styles.actionIconWrap}>
                                            <Trophy
                                                color={theme.colors.primary}
                                                size={24}
                                            />
                                        </View>
                                        <Text style={styles.actionText}>
                                            Badges
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </ScrollView>
                    </View>

                    {/* --- Campus Radar Preview --- */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Campus Map</Text>
                        <View style={styles.mapPreviewContainer}>
                            <View style={styles.mapPreviewWrapper}>
                                <WebView
                                    ref={webViewRef}
                                    onLoadEnd={() => setWebViewReady(true)}
                                    source={mapHtml}
                                    style={styles.mapPreviewWebview}
                                    javaScriptEnabled={true}
                                    domStorageEnabled={true}
                                    allowFileAccess={true}
                                    allowUniversalAccessFromFileURLs={true}
                                    originWhitelist={["*"]}
                                    showsHorizontalScrollIndicator={false}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled={true}
                                />
                                {/* Touch interceptor to prevent accidental interactions */}
                                <View style={styles.mapTouchInterceptor} />
                            </View>
                            <LinearGradient
                                colors={[
                                    "transparent",
                                    "rgba(249, 250, 251, 0.9)",
                                    "#F9FAFB",
                                ]}
                                style={styles.mapGradientOverlay}
                                pointerEvents="none"
                            />

                            <TouchableOpacity
                                style={styles.mapFullscreenBtn}
                                onPress={() => router.push("/(tabs)/buildings")}
                                activeOpacity={0.9}
                            >
                                <ScanLine
                                    color="#FFFFFF"
                                    size={18}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.mapFullscreenText}>
                                    View Full Map
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB", // Crisp off-white background
    },
    scrollContent: {
        paddingBottom: 60,
    },
    crimsonHeader: {
        paddingTop: 80, // Safe area + padding
        paddingBottom: 50,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        shadowColor: "#9b1b30",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 15,
        zIndex: 10,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    userInfo: {
        flex: 1,
    },
    greeting: {
        fontFamily: fonts.heading.bold,
        color: "rgba(255,255,255,0.7)",
        fontSize: 10,
        letterSpacing: 2,
        marginBottom: 4,
    },
      username: {
          fontFamily: fonts.heading.bold,
          color: "#FFFFFF",
          fontSize: 36,
          letterSpacing: 1,
      },
    userLevel: {
        fontFamily: fonts.body.bold,
        color: "#FFFFFF",
        fontSize: 13,
        marginTop: 4,
        opacity: 0.9,
    },
    headerRight: {
        alignItems: "flex-end",
    },
    streakBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.4)",
    },
    streakFlame: {
        fontSize: 16,
        marginRight: 4,
    },
    streakText: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 14,
    },
    expContainer: {
        marginTop: 10,
    },
    expTextRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    expLabel: {
        fontFamily: fonts.heading.bold,
        color: "rgba(255,255,255,0.8)",
        fontSize: 10,
        letterSpacing: 1,
    },
    expValue: {
        fontFamily: fonts.hud.bold,
        color: "#FFFFFF",
        fontSize: 12,
    },
    expBarTrack: {
        height: 8,
        backgroundColor: "rgba(0,0,0,0.25)",
        borderRadius: 4,
        overflow: "hidden",
    },
    expBarFill: {
        height: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 4,
    },
    contentArea: {
        paddingHorizontal: 20,
        marginTop: -30, // Pull up into the header slightly to overlap
        zIndex: 20,
    },
    heroCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        marginBottom: 24,
    },
    heroTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    heroLabelChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(155, 27, 48, 0.1)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.radius.full,
    },
    heroChipText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: theme.colors.primary,
        letterSpacing: 1.5,
    },
    heroExpBadge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: theme.radius.full,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    heroExpText: {
        fontFamily: fonts.hud.bold,
        fontSize: 12,
        color: "#FFFFFF",
    },
    heroQuestTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 22,
        color: theme.colors.textPrimary,
        lineHeight: 28,
        marginBottom: 20,
    },
    heroBottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    heroTargetInfo: {
        flex: 1,
        marginRight: theme.spacing.md,
    },
    heroTargetLabel: {
        fontFamily: fonts.body.regular,
        fontSize: 10,
        color: theme.colors.textMuted,
        letterSpacing: 1,
        marginBottom: 4,
    },
    heroTargetValue: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: theme.colors.textPrimary,
    },
    heroDeployBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: theme.radius.sm,
        gap: 6,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },
    heroDeployBtnDisabled: {
        backgroundColor: theme.colors.surfaceSoft,
        shadowOpacity: 0,
        elevation: 0,
    },
    heroDeployText: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: "#FFFFFF",
        letterSpacing: 1,
    },
    heroDeployTextDisabled: {
        color: theme.colors.textMuted,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    swipeHint: {
        flexDirection: "row",
        alignItems: "center",
    },
    swipeHintText: {
        fontFamily: fonts.body.bold,
        fontSize: 10,
        color: theme.colors.textMuted,
        marginRight: 2,
    },
    ticketScroll: {
        marginHorizontal: -20, // Break out of parent padding
    },
    ticketScrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20, // Space for shadow
        gap: 16,
    },
    ticketCard: {
        flexDirection: "row",
        width: Dimensions.get("window").width - 76, // Leave a bit of edge for next card hint
        backgroundColor: "#FFFFFF",
        borderRadius: theme.radius.md,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 6,
    },
    ticketStub: {
        width: 70,
        backgroundColor: theme.colors.primary,
        borderTopLeftRadius: theme.radius.md,
        borderBottomLeftRadius: theme.radius.md,
        justifyContent: "center",
        alignItems: "center",
        borderRightWidth: 2,
        borderColor: "rgba(255,255,255,0.2)",
        borderStyle: "dashed",
        paddingVertical: 16,
    },
    ticketStubValue: {
        fontFamily: fonts.hud.bold,
        fontSize: 16,
        color: "#FFFFFF",
    },
    ticketStubLabel: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: "rgba(255,255,255,0.7)",
        letterSpacing: 1,
    },
    ticketCutoutTop: {
        position: "absolute",
        top: -8,
        right: -8,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#F9FAFB", // Match main background
    },
    ticketCutoutBottom: {
        position: "absolute",
        bottom: -8,
        right: -8,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#F9FAFB", // Match main background
    },
    ticketBody: {
        flex: 1,
        padding: 16,
        justifyContent: "space-between",
    },
    ticketTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: theme.colors.textPrimary,
        marginBottom: 12,
        lineHeight: 22,
    },
    ticketFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    ticketTargetLabel: {
        fontFamily: fonts.body.bold,
        fontSize: 9,
        color: theme.colors.textMuted,
        letterSpacing: 1,
        marginBottom: 2,
    },
    ticketTargetValue: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: theme.colors.primary,
    },
    ticketDeployBtn: {
        backgroundColor: "rgba(155, 27, 48, 0.1)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.radius.sm,
    },
    ticketDeployText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: theme.colors.primary,
        letterSpacing: 1,
    },
    splitRow: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 30,
    },
    mapPreviewContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        position: "relative",
        height: 280,
        overflow: "hidden",
    },
    mapPreviewWrapper: {
        flex: 1,
        width: "100%",
        backgroundColor: "#E5E7EB",
    },
    mapPreviewWebview: {
        flex: 1,
        width: "100%",
        height: "100%",
        backgroundColor: "#E5E7EB",
    },
    mapTouchInterceptor: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "transparent",
    },
    mapGradientOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
    },
    mapFullscreenBtn: {
        position: "absolute",
        bottom: 16,
        alignSelf: "center",
        backgroundColor: theme.colors.primary,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    mapFullscreenText: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 12,
        letterSpacing: 1,
    },
    splitCard: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: theme.radius.lg,
        padding: 16,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
    },
    splitIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(155, 27, 48, 0.08)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    splitValue: {
        fontFamily: fonts.heading.bold,
        fontSize: 24,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    splitLabel: {
        fontFamily: fonts.body.bold,
        fontSize: 10,
        color: theme.colors.textMuted,
        letterSpacing: 1,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: theme.colors.textSecondary,
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    actionGrid: {
        flexDirection: "row",
        gap: 16,
        paddingBottom: 10,
    },
    actionCard: {
        width: 100,
        height: 100,
        backgroundColor: "#FFFFFF",
        borderRadius: theme.radius.md,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    actionIconWrap: {
        marginBottom: 12,
    },
    actionText: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: theme.colors.textPrimary,
    },
});
