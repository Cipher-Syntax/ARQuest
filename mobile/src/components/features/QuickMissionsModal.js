import React, { useRef, useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    Animated,
    Image,
    FlatList,
} from "react-native";
import {
    Crosshair,
    ChevronRight,
    ArrowLeft,
    X,
    Lock,
    Trophy,
    Building2,
    CheckCircle2,
    MapPin,
} from "lucide-react-native";
import theme from "../../theme/tokens";
import { fonts } from "../../constants/typography";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MISSIONS_CARD_HEIGHT = Math.min(SCREEN_HEIGHT * 0.58, 480);
const MISSIONS_CHAR_BOTTOM = MISSIONS_CARD_HEIGHT - 32;

export default function QuickMissionsModal({
    visible,
    onClose,
    onSelectMission,
    isUnlocked = false,
    dailyCompletedCount = 0,
    dailyTotalCount = 3,
    quests = [],
    completedQuests = [],
    onGoToHome,
    userLocation = null,
    allBuildings = [],
}) {
    // viewState: "intro" (big 2D character + explanation first) -> "missions" (locked or unlocked list)
    const [viewState, setViewState] = useState("intro");
    const [missionsTab, setMissionsTab] = useState("available"); // "available" or "completed"

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const charSlideY = useRef(new Animated.Value(80)).current;
    const barSlideY = useRef(new Animated.Value(60)).current;
    const charBreath = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            setViewState("intro");
            setMissionsTab("available");
            fadeAnim.setValue(0);
            charSlideY.setValue(80);
            barSlideY.setValue(60);

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(charSlideY, {
                    toValue: 0,
                    friction: 7,
                    tension: 38,
                    useNativeDriver: true,
                }),
                Animated.spring(barSlideY, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(charBreath, {
                    toValue: 1.018,
                    duration: 1400,
                    useNativeDriver: true,
                }),
                Animated.timing(charBreath, {
                    toValue: 1.0,
                    duration: 1400,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.timing(charSlideY, {
                toValue: 80,
                duration: 160,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose && onClose();
        });
    };

    // Calculate distance from user's current GPS to a mission's target building
    const getMissionDistance = (mission) => {
        if (!userLocation || !allBuildings || allBuildings.length === 0 || !mission.target_building) {
            return null;
        }
        const b = allBuildings.find(
            (item) => item.id.toString() === mission.target_building.toString()
        );
        if (!b || !b.latitude || !b.longitude) return null;
        const lat1 = userLocation.latitude;
        const lon1 = userLocation.longitude;
        const lat2 = parseFloat(b.latitude);
        const lon2 = parseFloat(b.longitude);
        if (isNaN(lat2) || isNaN(lon2)) return null;

        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(6371000 * c); // distance in meters
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleDismiss}
        >
            <Animated.View style={[S.overlay, { opacity: fadeAnim }]}>
                {/* Backdrop dismiss */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={handleDismiss}
                />

                {/* ============================================================== */}
                {/* SCREEN 1: INTRO EXPLANATION (FIRST THING USER SEES)            */}
                {/* Big 2D Justine + Visual Novel Dialog explaining Quick Missions */}
                {/* ============================================================== */}
                {viewState === "intro" && (
                    <>
                        {/* Big Standing 2D Character Sprite on Left */}
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                S.vnCharWrap,
                                {
                                    transform: [
                                        { translateY: charSlideY },
                                        { scale: charBreath },
                                    ],
                                },
                            ]}
                        >
                            <Image
                                source={require("../../../assets/images/characters/justine_guide.png")}
                                style={S.vnCharImage}
                                resizeMode="contain"
                            />
                        </Animated.View>

                        {/* Visual Novel Story Dialog Bar */}
                        <Animated.View
                            style={[
                                S.vnBar,
                                { transform: [{ translateY: barSlideY }] },
                            ]}
                        >
                            {/* Close Button */}
                            <TouchableOpacity
                                onPress={handleDismiss}
                                style={S.closeBtn}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <X size={15} color="#B21830" />
                            </TouchableOpacity>

                            {/* Justine Name Tag */}
                            <View style={S.vnNameTag}>
                                <Text style={S.vnNameText}>JUSTINE</Text>
                                <View style={S.vnDivider} />
                                <Text style={S.vnRoleText}>Campus Guide</Text>
                            </View>

                            {/* Dialogue Text */}
                            <Text style={S.vnSpeech}>
                                Hey Explorer! 👋 Welcome to <Text style={S.boldText}>Quick Missions</Text>! These are fast-paced campus exploration tasks across university buildings that earn you bonus EXP.
                            </Text>

                            {/* Guideline Callout Box (When it is available) */}
                            <View style={S.guidelineCallout}>
                                <View style={S.guidelineCalloutHeader}>
                                    <Text style={S.guidelineCalloutTitle}>
                                        WHEN ARE QUICK MISSIONS AVAILABLE?
                                    </Text>
                                </View>
                                <Text style={S.guidelineCalloutText}>
                                    Quick Missions are unlocked <Text style={S.boldHighlight}>ONLY AFTER</Text> you have completed all <Text style={S.boldHighlight}>3 Daily Missions</Text> on the Home Dashboard for the day!
                                </Text>
                            </View>

                            {/* Bottom Status & Proceed Row */}
                            <View style={S.vnBottomRow}>
                                <View style={S.statusPill}>
                                    {isUnlocked ? (
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                            <CheckCircle2 size={13} color="#16A34A" />
                                            <Text style={S.statusPillTextSuccess}>
                                                Daily Missions Cleared
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                            <Lock size={12} color="#DC2626" />
                                            <Text style={S.statusPillTextLocked}>
                                                {dailyCompletedCount}/{dailyTotalCount} Daily Tasks Done
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={S.proceedBtn}
                                    onPress={() => setViewState("missions")}
                                    activeOpacity={0.85}
                                >
                                    <Text style={S.proceedBtnText}>PROCEED</Text>
                                    <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </>
                )}

                {/* ============================================================== */}
                {/* SCREEN 2: MISSIONS VIEW (AFTER CLICKING PROCEED)               */}
                {/* Justine stands tall and fully visible above the missions card  */}
                {/* ============================================================== */}
                {viewState === "missions" && (
                    <>
                        {/* Character standing proudly above the missions card */}
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                S.missionsCharWrap,
                                {
                                    transform: [{ scale: charBreath }],
                                },
                            ]}
                        >
                            <Image
                                source={require("../../../assets/images/characters/justine_guide.png")}
                                style={S.missionsCharImage}
                                resizeMode="contain"
                            />
                        </Animated.View>

                        <View style={S.missionsCard}>
                            {/* Card Header Row */}
                            <View style={S.cardHeaderRow}>
                                <TouchableOpacity
                                    style={S.backToGuideBtn}
                                    onPress={() => setViewState("intro")}
                                    activeOpacity={0.75}
                                >
                                    <ArrowLeft size={14} color="#B21830" />
                                    <Text style={S.backToGuideText}>GUIDE</Text>
                                </TouchableOpacity>

                                <View style={S.badge}>
                                    <Crosshair size={12} color="#FFFFFF" />
                                    <Text style={S.badgeText}>QUICK MISSIONS</Text>
                                </View>

                                <TouchableOpacity
                                    onPress={handleDismiss}
                                    style={S.closeBtnInline}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <X size={15} color="#B21830" />
                                </TouchableOpacity>
                            </View>

                            {/* Segmented Tabs: Available vs Completed */}
                            <View style={S.segmentedTabsRow}>
                                <TouchableOpacity
                                    style={[
                                        S.segmentedTabBtn,
                                        missionsTab === "available" && S.segmentedTabBtnActive,
                                    ]}
                                    onPress={() => setMissionsTab("available")}
                                    activeOpacity={0.8}
                                >
                                    <Crosshair
                                        size={12}
                                        color={missionsTab === "available" ? "#FFFFFF" : "#6B7280"}
                                    />
                                    <Text
                                        style={[
                                            S.segmentedTabText,
                                            missionsTab === "available" && S.segmentedTabTextActive,
                                        ]}
                                    >
                                        AVAILABLE ({quests.length})
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        S.segmentedTabBtn,
                                        missionsTab === "completed" && S.segmentedTabBtnActiveCompleted,
                                    ]}
                                    onPress={() => setMissionsTab("completed")}
                                    activeOpacity={0.8}
                                >
                                    <CheckCircle2
                                        size={12}
                                        color={missionsTab === "completed" ? "#FFFFFF" : "#6B7280"}
                                    />
                                    <Text
                                        style={[
                                            S.segmentedTabText,
                                            missionsTab === "completed" && S.segmentedTabTextActive,
                                        ]}
                                    >
                                        COMPLETED ({completedQuests.length})
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* TAB 1: AVAILABLE QUICK MISSIONS */}
                            {missionsTab === "available" && (
                                <>
                                    {/* Case A: LOCKED STATE */}
                                    {!isUnlocked ? (
                                        <View style={S.lockedContainer}>
                                            <View style={S.lockedIconCircle}>
                                                <Lock size={24} color="#B21830" />
                                            </View>

                                            <Text style={S.lockedTitle}>Missions Locked! 🛑</Text>

                                            <Text style={S.speechText}>
                                                Hold up, Adventurer! You still have daily missions to clear first! Finish today's 3 tasks on the Home Dashboard and come back to unlock all quick missions.
                                            </Text>

                                            {/* Progress box */}
                                            <View style={S.progressBox}>
                                                <View style={S.progressHeader}>
                                                    <Text style={S.progressLabel}>TODAY'S DAILY MISSIONS</Text>
                                                    <Text style={S.progressValue}>
                                                        {dailyCompletedCount} / {dailyTotalCount} Done
                                                    </Text>
                                                </View>
                                                <View style={S.progressTrack}>
                                                    <View
                                                        style={[
                                                            S.progressFill,
                                                            {
                                                                width: `${Math.min(
                                                                    100,
                                                                    Math.round(
                                                                        (dailyCompletedCount /
                                                                            Math.max(1, dailyTotalCount)) *
                                                                            100
                                                                    )
                                                                )}%`,
                                                            },
                                                        ]}
                                                    />
                                                </View>
                                            </View>

                                            {/* Action Button */}
                                            <TouchableOpacity
                                                style={S.primaryBtn}
                                                onPress={() => {
                                                    handleDismiss();
                                                    onGoToHome && onGoToHome();
                                                }}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={S.primaryBtnText}>GO TO DAILY MISSIONS</Text>
                                                <ChevronRight size={16} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        /* Case B: UNLOCKED STATE */
                                        <View style={S.unlockedContainer}>
                                            <View style={S.unlockedBanner}>
                                                <Trophy size={15} color="#EBBC26" />
                                                <Text style={S.unlockedBannerText} numberOfLines={1}>
                                                    All Daily Missions cleared! Pick a quick mission:
                                                </Text>
                                            </View>

                                            {quests.length === 0 ? (
                                                <View style={S.emptyState}>
                                                    <CheckCircle2 size={30} color="#16A34A" style={{ marginBottom: 6 }} />
                                                    <Text style={S.emptyStateTitle}>All Quick Missions Cleared! 🎉</Text>
                                                    <Text style={S.emptyStateText}>
                                                        You've completed all available quick missions. Check the Completed tab to review your mission log!
                                                    </Text>
                                                </View>
                                            ) : (
                                                <FlatList
                                                    data={quests}
                                                    keyExtractor={(item) => (item.id || item.quest_id || Math.random()).toString()}
                                                    style={S.questList}
                                                    showsVerticalScrollIndicator={false}
                                                    renderItem={({ item }) => {
                                                        const dist = getMissionDistance(item);
                                                        const isAlreadyHere = dist !== null && dist < 35;

                                                        return (
                                                            <TouchableOpacity
                                                                style={[
                                                                    S.questItem,
                                                                    isAlreadyHere && S.questItemDisabled,
                                                                ]}
                                                                activeOpacity={isAlreadyHere ? 1 : 0.8}
                                                                onPress={() => {
                                                                    if (isAlreadyHere) return;
                                                                    handleDismiss();
                                                                    onSelectMission && onSelectMission(item);
                                                                }}
                                                            >
                                                                <View style={S.questItemHeader}>
                                                                    <View style={S.difficultyPill}>
                                                                        <Text style={S.difficultyText}>
                                                                            {item.difficulty || "EASY"}
                                                                        </Text>
                                                                    </View>
                                                                    {isAlreadyHere ? (
                                                                        <View style={S.alreadyHerePill}>
                                                                            <MapPin size={10} color="#D97706" />
                                                                            <Text style={S.alreadyHereText}>
                                                                                ALREADY HERE ({dist}m)
                                                                            </Text>
                                                                        </View>
                                                                    ) : (
                                                                        <View style={S.rewardPill}>
                                                                            <Text style={S.rewardText}>
                                                                                +{item.reward_points} EXP
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                </View>

                                                                <Text style={S.questTitle} numberOfLines={2}>
                                                                    {item.title}
                                                                </Text>

                                                                <View style={S.targetRow}>
                                                                    <Building2 size={13} color="#B21830" />
                                                                    <Text
                                                                        style={S.targetBuildingText}
                                                                        numberOfLines={1}
                                                                    >
                                                                        {item.target_building_name || "Campus Building"}
                                                                    </Text>
                                                                </View>

                                                                <View style={S.navigateActionRow}>
                                                                    {isAlreadyHere ? (
                                                                        <Text style={S.navigateActionTextDisabled}>
                                                                            📍 You are inside this building • Pick another destination
                                                                        </Text>
                                                                    ) : (
                                                                        <>
                                                                            <Text style={S.navigateActionText}>
                                                                                {dist !== null ? `${dist}m away • ` : ""}Set Destination & Plot Route
                                                                            </Text>
                                                                            <ChevronRight size={14} color="#B21830" />
                                                                        </>
                                                                    )}
                                                                </View>
                                                            </TouchableOpacity>
                                                        );
                                                    }}
                                                />
                                            )}
                                        </View>
                                    )}
                                </>
                            )}

                            {/* TAB 2: COMPLETED QUICK MISSIONS */}
                            {missionsTab === "completed" && (
                                <View style={S.unlockedContainer}>
                                    <View style={[S.unlockedBanner, S.completedBanner]}>
                                        <CheckCircle2 size={15} color="#16A34A" />
                                        <Text style={S.completedBannerText} numberOfLines={1}>
                                            Completed Quick Missions ({completedQuests.length})
                                        </Text>
                                    </View>

                                    {completedQuests.length === 0 ? (
                                        <View style={S.emptyState}>
                                            <CheckCircle2 size={30} color="#D1D5DB" style={{ marginBottom: 6 }} />
                                            <Text style={S.emptyStateTitle}>No Completed Missions Yet</Text>
                                            <Text style={S.emptyStateText}>
                                                Clear today's 3 daily missions to unlock and finish quick missions across campus buildings!
                                            </Text>
                                        </View>
                                    ) : (
                                        <FlatList
                                            data={completedQuests}
                                            keyExtractor={(item) => (item.id || item.quest_id || Math.random()).toString()}
                                            style={S.questList}
                                            showsVerticalScrollIndicator={false}
                                            renderItem={({ item }) => {
                                                const dist = getMissionDistance(item);

                                                return (
                                                    <TouchableOpacity
                                                        style={[S.questItem, S.questItemCompleted]}
                                                        activeOpacity={0.8}
                                                        onPress={() => {
                                                            handleDismiss();
                                                            onSelectMission && onSelectMission(item);
                                                        }}
                                                    >
                                                        <View style={S.questItemHeader}>
                                                            <View style={S.completedStatusPill}>
                                                                <CheckCircle2 size={10} color="#16A34A" />
                                                                <Text style={S.completedStatusText}>
                                                                    COMPLETED
                                                                </Text>
                                                            </View>
                                                            <View style={S.rewardPillCompleted}>
                                                                <Text style={S.rewardTextCompleted}>
                                                                    +{item.reward_points} EXP EARNED
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        <Text style={S.questTitle} numberOfLines={2}>
                                                            {item.title}
                                                        </Text>

                                                        <View style={S.targetRow}>
                                                            <Building2 size={13} color="#16A34A" />
                                                            <Text
                                                                style={S.targetBuildingText}
                                                                numberOfLines={1}
                                                            >
                                                                {item.target_building_name || "Campus Building"}
                                                            </Text>
                                                        </View>

                                                        <View style={S.navigateActionRow}>
                                                            <Text style={S.completedActionHint}>
                                                                ✓ Mission Accomplished
                                                            </Text>
                                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                                                                <Text style={S.completedNavigateText}>
                                                                    {dist !== null ? `${dist}m • ` : ""}Revisit Building
                                                                </Text>
                                                                <ChevronRight size={13} color="#16A34A" />
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            }}
                                        />
                                    )}
                                </View>
                            )}
                        </View>
                    </>
                )}
            </Animated.View>
        </Modal>
    );
}

const S = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.60)",
        justifyContent: "flex-end",
    },

    // ── Big 2D Character (Intro Screen) ───────────────────────────────────────
    vnCharWrap: {
        position: "absolute",
        bottom: 240,
        left: 4,
        width: SCREEN_WIDTH * 0.55,
        height: SCREEN_HEIGHT * 0.46,
        alignItems: "center",
        justifyContent: "flex-end",
        zIndex: 10,
    },
    vnCharImage: {
        width: "100%",
        height: "100%",
    },

    // ── VN Dialog Bar (Intro Screen) ──────────────────────────────────────────
    vnBar: {
        backgroundColor: "#FFFFFF",
        borderTopWidth: 3,
        borderTopColor: "#B21830",
        minHeight: 285,
        paddingTop: 22,
        paddingBottom: 36,
        paddingHorizontal: 18,
        gap: 12,
        zIndex: 15,
        shadowColor: "#B21830",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
        elevation: 16,
    },
    vnNameTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#B21830",
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 6,
    },
    vnNameText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontFamily: fonts.heading.bold,
        letterSpacing: 1.2,
    },
    vnDivider: {
        width: 1,
        height: 12,
        backgroundColor: "rgba(255,255,255,0.45)",
    },
    vnRoleText: {
        color: "rgba(255,255,255,0.88)",
        fontSize: 11,
        fontFamily: fonts.body.regular,
    },
    vnSpeech: {
        color: "#1F2937",
        fontSize: 13.5,
        lineHeight: 20,
        fontFamily: fonts.body.regular,
        paddingRight: 30,
    },
    boldText: {
        fontFamily: fonts.body.bold,
        color: "#B21830",
    },

    // ── Guideline Callout Box ─────────────────────────────────────────────────
    guidelineCallout: {
        backgroundColor: "#FFF5F5",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FCA5A5",
        borderLeftWidth: 4,
        borderLeftColor: "#B21830",
        paddingVertical: 8,
        paddingHorizontal: 10,
        gap: 4,
    },
    guidelineCalloutHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    guidelineCalloutTitle: {
        fontSize: 10.5,
        fontFamily: fonts.heading.bold,
        color: "#B21830",
        letterSpacing: 0.5,
    },
    guidelineCalloutText: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: fonts.body.regular,
        color: "#374151",
    },
    boldHighlight: {
        fontFamily: fonts.body.bold,
        color: "#B21830",
    },

    // ── VN Bottom Row (Intro Screen) ──────────────────────────────────────────
    vnBottomRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 6,
    },
    statusPill: {
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    statusPillTextSuccess: {
        fontSize: 11,
        fontFamily: fonts.body.bold,
        color: "#16A34A",
    },
    statusPillTextLocked: {
        fontSize: 11,
        fontFamily: fonts.body.bold,
        color: "#DC2626",
    },
    proceedBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#B21830",
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 8,
        shadowColor: "#B21830",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    proceedBtnText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontFamily: fonts.body.bold,
        letterSpacing: 0.5,
    },

    // ── Close Button ─────────────────────────────────────────────────────────
    closeBtn: {
        position: "absolute",
        top: 12,
        right: 14,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        borderWidth: 1.5,
        borderColor: "#B21830",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
    },
    closeBtnInline: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        borderWidth: 1.5,
        borderColor: "#B21830",
        alignItems: "center",
        justifyContent: "center",
    },

    // ── Missions Screen (Screen 2) ────────────────────────────────────────────
    // Justine standing tall and clearly visible above the missions card
    missionsCharWrap: {
        position: "absolute",
        bottom: MISSIONS_CHAR_BOTTOM,
        right: 14,
        width: 160,
        height: 220,
        zIndex: 10,
        alignItems: "flex-end",
        justifyContent: "flex-end",
    },
    missionsCharImage: {
        width: 160,
        height: 220,
    },
    missionsCard: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderTopWidth: 3,
        borderTopColor: "#B21830",
        paddingTop: 16,
        paddingBottom: 24,
        paddingHorizontal: 16,
        height: MISSIONS_CARD_HEIGHT,
        zIndex: 15,
        shadowColor: "#B21830",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 16,
    },
    cardHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    backToGuideBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: "#FFF0F0",
        borderWidth: 1,
        borderColor: "#B21830",
    },
    backToGuideText: {
        fontSize: 11,
        fontFamily: fonts.body.bold,
        color: "#B21830",
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#B21830",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    badgeText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontFamily: fonts.heading.bold,
        letterSpacing: 0.8,
    },

    // ── Segmented Tabs Row (Available vs Completed) ─────────────────────────
    segmentedTabsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
        backgroundColor: "#F3F4F6",
        padding: 3,
        borderRadius: 6,
    },
    segmentedTabBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        paddingVertical: 7,
        borderRadius: 6,
    },
    segmentedTabBtnActive: {
        backgroundColor: "#B21830",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentedTabBtnActiveCompleted: {
        backgroundColor: "#16A34A",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentedTabText: {
        fontSize: 11,
        fontFamily: fonts.body.bold,
        color: "#6B7280",
        letterSpacing: 0.3,
    },
    segmentedTabTextActive: {
        color: "#FFFFFF",
    },

    // ── Locked State ─────────────────────────────────────────────────────────
    lockedContainer: {
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    lockedIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#FFF0F0",
        borderWidth: 2,
        borderColor: "#B21830",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    lockedTitle: {
        fontSize: 15,
        fontFamily: fonts.heading.bold,
        color: "#B21830",
        marginBottom: 4,
    },
    speechText: {
        fontSize: 12.5,
        lineHeight: 17,
        fontFamily: fonts.body.regular,
        color: "#374151",
        textAlign: "center",
        marginBottom: 12,
        paddingHorizontal: 10,
    },
    speechTextUnlocked: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: fonts.body.regular,
        color: "#4B5563",
        marginBottom: 8,
    },
    progressBox: {
        width: "100%",
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 14,
    },
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 10,
        fontFamily: fonts.heading.bold,
        color: "#6B7280",
        letterSpacing: 0.5,
    },
    progressValue: {
        fontSize: 11,
        fontFamily: fonts.body.bold,
        color: "#B21830",
    },
    progressTrack: {
        height: 7,
        backgroundColor: "#E5E7EB",
        borderRadius: 4,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#B21830",
        borderRadius: 4,
    },
    primaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#B21830",
        width: "100%",
        paddingVertical: 11,
        borderRadius: 8,
        shadowColor: "#B21830",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    primaryBtnText: {
        color: "#FFFFFF",
        fontSize: 12.5,
        fontFamily: fonts.body.bold,
        letterSpacing: 0.5,
    },

    // ── Unlocked State ───────────────────────────────────────────────────────
    unlockedContainer: {
        flex: 1,
    },
    unlockedBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#FFFBEB",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FDE68A",
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginBottom: 6,
    },
    unlockedBannerText: {
        flex: 1,
        fontSize: 11.5,
        fontFamily: fonts.body.bold,
        color: "#92400E",
    },
    completedBanner: {
        backgroundColor: "#F0FDF4",
        borderColor: "#BBF7D0",
    },
    completedBannerText: {
        flex: 1,
        fontSize: 11.5,
        fontFamily: fonts.body.bold,
        color: "#166534",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 24,
    },
    emptyStateTitle: {
        fontSize: 13.5,
        fontFamily: fonts.heading.bold,
        color: "#111827",
        marginBottom: 4,
    },
    emptyStateText: {
        fontSize: 13,
        fontFamily: fonts.body.regular,
        color: "#6B7280",
        textAlign: "center",
    },
    questList: {
        flex: 1,
    },
    questItem: {
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: "#F3F4F6",
        padding: 10,
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    questItemDisabled: {
        backgroundColor: "#F9FAFB",
        borderColor: "#E5E7EB",
        opacity: 0.72,
    },
    questItemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    difficultyPill: {
        backgroundColor: "#ECFDF5",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#A7F3D0",
    },
    difficultyText: {
        fontSize: 9.5,
        fontFamily: fonts.body.bold,
        color: "#059669",
    },
    rewardPill: {
        backgroundColor: "#FEF2F2",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    rewardText: {
        fontSize: 9.5,
        fontFamily: fonts.body.bold,
        color: "#B21830",
    },
    alreadyHerePill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#FDE68A",
    },
    alreadyHereText: {
        fontSize: 9.5,
        fontFamily: fonts.body.bold,
        color: "#B45309",
    },
    questTitle: {
        fontSize: 13.5,
        fontFamily: fonts.heading.bold,
        color: "#111827",
        marginBottom: 4,
    },
    targetRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginBottom: 6,
    },
    targetBuildingText: {
        fontSize: 11.5,
        fontFamily: fonts.body.regular,
        color: "#4B5563",
    },
    navigateActionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        paddingTop: 6,
        marginTop: 2,
    },
    navigateActionText: {
        fontSize: 11,
        fontFamily: fonts.body.bold,
        color: "#B21830",
    },
    navigateActionTextDisabled: {
        fontSize: 10.5,
        fontFamily: fonts.body.bold,
        color: "#D97706",
    },

    // ── Completed Quest Styles ──────────────────────────────────────────────
    questItemCompleted: {
        borderColor: "#DCFCE7",
        backgroundColor: "#FAFCF9",
    },
    completedStatusPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#ECFDF5",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#A7F3D0",
    },
    completedStatusText: {
        fontSize: 9.5,
        fontFamily: fonts.body.bold,
        color: "#16A34A",
    },
    rewardPillCompleted: {
        backgroundColor: "#F0FDF4",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#BBF7D0",
    },
    rewardTextCompleted: {
        fontSize: 9.5,
        fontFamily: fonts.body.bold,
        color: "#16A34A",
    },
    completedActionHint: {
        fontSize: 10.5,
        fontFamily: fonts.body.bold,
        color: "#16A34A",
    },
    completedNavigateText: {
        fontSize: 10.5,
        fontFamily: fonts.body.bold,
        color: "#16A34A",
    },
});
