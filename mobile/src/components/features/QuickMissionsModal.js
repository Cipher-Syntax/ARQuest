import React, { useRef, useEffect } from "react";
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
    X,
    Lock,
    Trophy,
    Building2,
    Compass,
    CheckCircle2,
} from "lucide-react-native";
import theme from "../../theme/tokens";
import { fonts } from "../../constants/typography";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function QuickMissionsModal({
    visible,
    onClose,
    onSelectMission,
    isUnlocked = false,
    dailyCompletedCount = 0,
    dailyTotalCount = 3,
    quests = [],
    onGoToHome,
}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const charBreath = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            fadeAnim.setValue(0);
            slideAnim.setValue(40);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
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
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
        }).start(() => {
            onClose && onClose();
        });
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

                {/* Character standing behind/above the card */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        S.charWrap,
                        {
                            transform: [{ scale: charBreath }],
                        },
                    ]}
                >
                    <Image
                        source={require("../../../assets/images/characters/justine_guide.png")}
                        style={S.charImage}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* Main Dialog Card */}
                <Animated.View
                    style={[
                        S.card,
                        { transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    {/* Header Row */}
                    <View style={S.headerRow}>
                        <View style={S.badge}>
                            <Crosshair size={12} color="#FFFFFF" />
                            <Text style={S.badgeText}>QUICK MISSIONS</Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleDismiss}
                            style={S.closeBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={15} color="#B21830" />
                        </TouchableOpacity>
                    </View>

                    {/* Content: Locked vs Unlocked */}
                    {!isUnlocked ? (
                        /* ============================================================== */
                        /* LOCKED STATE: Daily Missions not yet completed                 */
                        /* ============================================================== */
                        <View style={S.lockedContainer}>
                            <View style={S.lockedIconCircle}>
                                <Lock size={28} color="#B21830" />
                            </View>

                            <Text style={S.lockedTitle}>Missions Locked! 🛑</Text>

                            <Text style={S.speechText}>
                                Hold up, Adventurer! Quick Missions are only available once you've completed all 3 of your Daily Missions on the Home dashboard!
                            </Text>

                            {/* Progress bar */}
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
                        /* ============================================================== */
                        /* UNLOCKED STATE: List of Easy Quick Missions                    */
                        /* ============================================================== */
                        <View style={S.unlockedContainer}>
                            <View style={S.unlockedBanner}>
                                <Trophy size={16} color="#EBBC26" />
                                <Text style={S.unlockedBannerText}>
                                    All Daily Missions cleared! Pick a quick mission to navigate!
                                </Text>
                            </View>

                            <Text style={S.speechText}>
                                Tap any mission below and I'll input the destination into your navigation radar!
                            </Text>

                            {quests.length === 0 ? (
                                <View style={S.emptyState}>
                                    <Text style={S.emptyStateText}>
                                        No easy quick missions available right now. Check back soon!
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={quests}
                                    keyExtractor={(item) => item.id.toString()}
                                    style={S.questList}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={S.questItem}
                                            activeOpacity={0.8}
                                            onPress={() => {
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
                                                <View style={S.rewardPill}>
                                                    <Text style={S.rewardText}>
                                                        +{item.reward_points} EXP
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text style={S.questTitle} numberOfLines={2}>
                                                {item.title}
                                            </Text>

                                            <View style={S.targetRow}>
                                                <Building2 size={13} color="#B21830" />
                                                <Text style={S.targetBuildingText} numberOfLines={1}>
                                                    {item.target_building_name || "Campus Building"}
                                                </Text>
                                            </View>

                                            <View style={S.navigateActionRow}>
                                                <Text style={S.navigateActionText}>
                                                    Set Destination & Plot Route
                                                </Text>
                                                <ChevronRight size={14} color="#B21830" />
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                            )}
                        </View>
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const S = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.60)",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 24,
    },
    charWrap: {
        position: "absolute",
        bottom: 380,
        right: 14,
        width: 140,
        height: 160,
        zIndex: 10,
        alignItems: "flex-end",
        justifyContent: "flex-end",
    },
    charImage: {
        width: 140,
        height: 160,
    },
    card: {
        width: SCREEN_WIDTH - 28,
        maxWidth: 420,
        backgroundColor: "#FFFFFF",
        borderRadius: 6, // Strict 6px standard
        borderWidth: 2,
        borderColor: "#B21830", // WMSU Crimson
        padding: 16,
        shadowColor: "#B21830",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 16,
        zIndex: 15,
        maxHeight: SCREEN_HEIGHT * 0.62,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#B21830",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "900",
        letterSpacing: 0.8,
    },
    closeBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    speechText: {
        color: "#222222",
        fontSize: 13.5,
        lineHeight: 20,
        fontWeight: "400",
        marginBottom: 14,
    },

    // ── Locked styles ────────────────────────────────────────────────────────
    lockedContainer: {
        alignItems: "center",
        paddingVertical: 6,
    },
    lockedIconCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: "rgba(178,24,48,0.08)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    lockedTitle: {
        color: "#1A1A1A",
        fontSize: 16,
        fontWeight: "800",
        marginBottom: 8,
    },
    progressBox: {
        width: "100%",
        backgroundColor: "#F9FAFB",
        borderRadius: 6,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    progressLabel: {
        color: "#6B7280",
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.6,
    },
    progressValue: {
        color: "#B21830",
        fontSize: 12,
        fontWeight: "900",
    },
    progressTrack: {
        height: 6,
        backgroundColor: "#E5E7EB",
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#B21830",
        borderRadius: 3,
    },

    // ── Unlocked styles ──────────────────────────────────────────────────────
    unlockedContainer: {
        maxHeight: SCREEN_HEIGHT * 0.48,
    },
    unlockedBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(178,24,48,0.06)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "rgba(178,24,48,0.18)",
        marginBottom: 10,
    },
    unlockedBannerText: {
        color: "#B21830",
        fontSize: 11.5,
        fontWeight: "700",
        flex: 1,
    },
    questList: {
        maxHeight: 220,
    },
    questItem: {
        backgroundColor: "#F9FAFB",
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        padding: 12,
        marginBottom: 10,
    },
    questItemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    difficultyPill: {
        backgroundColor: "rgba(34,197,94,0.12)",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    difficultyText: {
        color: "#16A34A",
        fontSize: 10,
        fontWeight: "800",
    },
    rewardPill: {
        backgroundColor: "#B21830",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    rewardText: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "800",
    },
    questTitle: {
        color: "#111827",
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 6,
    },
    targetRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    targetBuildingText: {
        color: "#4B5563",
        fontSize: 12,
        fontWeight: "500",
    },
    navigateActionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 6,
    },
    navigateActionText: {
        color: "#B21830",
        fontSize: 11,
        fontWeight: "800",
    },
    emptyState: {
        paddingVertical: 24,
        alignItems: "center",
    },
    emptyStateText: {
        color: "#6B7280",
        fontSize: 13,
        textAlign: "center",
    },

    // ── Primary button ───────────────────────────────────────────────────────
    primaryBtn: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#B21830",
        paddingVertical: 12,
        borderRadius: 6,
    },
    primaryBtnText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "800",
        letterSpacing: 0.4,
    },
});
