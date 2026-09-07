import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
    Flame,
    Check,
    Lock,
    Star,
    Sparkles,
    Trophy,
    X,
    ChevronRight,
    Award,
} from "lucide-react-native";
import theme from "../../theme/tokens";
import { fonts } from "../../constants/typography";
import SoundManager from "../../utils/SoundManager";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function DailyStreakModal({
    visible,
    streakCount = 0,
    bonusExp = 0,
    isNewCheckin = false,
    onClose,
}) {
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            if (isNewCheckin) {
                try {
                    SoundManager.play("badge_earned");
                } catch (e) {
                    // Audio playback non-fatal
                }
            }

            scaleAnim.setValue(0.85);
            opacityAnim.setValue(0);

            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Continuous subtle pulse for the active flame
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [visible, isNewCheckin]);

    if (!visible) return null;

    // Cycle day between 1 and 7
    const cycleDay = streakCount > 0 ? ((streakCount - 1) % 7) + 1 : 0;
    const completedCycles = streakCount > 0 ? Math.floor((streakCount - 1) / 7) : 0;

    // 7 days definition
    const days = [
        { dayNum: 1, exp: 5, isMilestone: false },
        { dayNum: 2, exp: 5, isMilestone: false },
        { dayNum: 3, exp: 10, isMilestone: true, label: "BONUS" },
        { dayNum: 4, exp: 5, isMilestone: false },
        { dayNum: 5, exp: 5, isMilestone: false },
        { dayNum: 6, exp: 10, isMilestone: true, label: "BONUS" },
        { dayNum: 7, exp: 10, isMilestone: true, label: "CROWN", isCrown: true },
    ];

    // Milestone motivational subtext
    let milestoneSubtext = "Check in every day to keep your streak alive!";
    if (cycleDay === 3 || cycleDay === 6) {
        milestoneSubtext = "⭐ Milestone Reached! You unlocked a +10 EXP streak bonus today!";
    } else if (cycleDay === 7) {
        milestoneSubtext = "👑 7-Day Cycle Complete! Outstanding campus dedication!";
    } else if (cycleDay < 3) {
        const daysLeft = 3 - cycleDay;
        milestoneSubtext = `${daysLeft} day${daysLeft === 1 ? "" : "s"} until your next +10 EXP milestone bonus!`;
    } else if (cycleDay > 3 && cycleDay < 6) {
        const daysLeft = 6 - cycleDay;
        milestoneSubtext = `${daysLeft} day${daysLeft === 1 ? "" : "s"} until your next +10 EXP milestone bonus!`;
    }

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* Top Decorative Ribbon Background */}
                    <LinearGradient
                        colors={["#7F0303", "#B21830"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerGradient}
                    >
                        {/* Close button in top-right */}
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                            activeOpacity={0.7}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <X size={18} color="#FFFFFF" />
                        </TouchableOpacity>

                        {/* Animated Flame Icon Disc */}
                        <Animated.View
                            style={[
                                styles.flameContainer,
                                { transform: [{ scale: pulseAnim }] },
                            ]}
                        >
                            <LinearGradient
                                colors={["#FFA500", "#FF4500", "#B21830"]}
                                style={styles.flameCircle}
                            >
                                <Flame size={36} color="#FFFFFF" />
                            </LinearGradient>
                        </Animated.View>

                        <Text style={styles.headerSubtitle}>
                            {isNewCheckin ? "DAILY CHECK-IN CLAIMED" : "STREAK TRACKER"}
                        </Text>
                        <Text style={styles.streakCountNumber}>
                            {streakCount}
                        </Text>
                        <Text style={styles.streakCountLabel}>
                            {streakCount === 1 ? "DAY STREAK" : "DAYS STREAK"}
                        </Text>
                    </LinearGradient>

                    {/* Modal Body */}
                    <View style={styles.bodyContent}>
                        {/* 7-Day Rolling Ribbon */}
                        <View style={styles.ribbonSection}>
                            <View style={styles.ribbonHeaderRow}>
                                <Text style={styles.ribbonTitle}>7-DAY STREAK REWARDS</Text>
                                {completedCycles > 0 && (
                                    <View style={styles.cycleBadge}>
                                        <Award size={12} color="#F59E0B" />
                                        <Text style={styles.cycleBadgeText}>
                                            Cycle {completedCycles + 1}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.daysRow}>
                                {days.map((item) => {
                                    const isCompleted = item.dayNum < cycleDay;
                                    const isToday = item.dayNum === cycleDay;
                                    const isUpcoming = item.dayNum > cycleDay;

                                    return (
                                        <View
                                            key={item.dayNum}
                                            style={[
                                                styles.dayCard,
                                                isCompleted && styles.dayCardCompleted,
                                                isToday && styles.dayCardToday,
                                                isUpcoming && styles.dayCardUpcoming,
                                            ]}
                                        >
                                            {/* Top Day Label or Milestone Tag */}
                                            <Text
                                                style={[
                                                    styles.dayNumberText,
                                                    isToday && styles.dayNumberToday,
                                                    isCompleted && styles.dayNumberCompleted,
                                                ]}
                                            >
                                                D{item.dayNum}
                                            </Text>

                                            {/* Status Icon */}
                                            <View style={styles.dayIconSlot}>
                                                {isCompleted ? (
                                                    <View style={styles.completedBadgeCircle}>
                                                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                                                    </View>
                                                ) : isToday ? (
                                                    <Flame size={20} color="#B21830" />
                                                ) : item.isCrown ? (
                                                    <Trophy size={16} color="#F59E0B" />
                                                ) : item.isMilestone ? (
                                                    <Star size={16} color="#F59E0B" />
                                                ) : (
                                                    <Lock size={14} color="#9CA3AF" />
                                                )}
                                            </View>

                                            {/* Reward Amount */}
                                            <Text
                                                style={[
                                                    styles.dayExpText,
                                                    isToday && styles.dayExpToday,
                                                    isCompleted && styles.dayExpCompleted,
                                                ]}
                                            >
                                                +{item.exp}
                                            </Text>

                                            {/* Bottom indicator badge */}
                                            {isToday ? (
                                                <View style={styles.todayPill}>
                                                    <Text style={styles.todayPillText}>TODAY</Text>
                                                </View>
                                            ) : isCompleted ? (
                                                <Text style={styles.doneText}>DONE</Text>
                                            ) : item.label ? (
                                                <Text style={styles.milestoneMiniTag}>{item.label}</Text>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Motivational Milestone Callout */}
                        <View style={styles.calloutCard}>
                            <View style={styles.calloutIconContainer}>
                                {cycleDay === 3 || cycleDay === 6 || cycleDay === 7 ? (
                                    <Sparkles size={20} color="#F59E0B" />
                                ) : (
                                    <Trophy size={20} color="#B21830" />
                                )}
                            </View>
                            <View style={styles.calloutTextContainer}>
                                <Text style={styles.calloutTitle}>
                                    {isNewCheckin && bonusExp > 0
                                        ? `+${bonusExp} EXP Added Today!`
                                        : `Keep Your Momentum Going`}
                                </Text>
                                <Text style={styles.calloutDescription}>
                                    {milestoneSubtext}
                                </Text>
                            </View>
                        </View>

                        {/* Action CTA Button */}
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={onClose}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.actionButtonText}>
                                {isNewCheckin ? "CONTINUE EXPLORING" : "AWESOME"}
                            </Text>
                            <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    modalContainer: {
        width: "100%",
        maxWidth: 380,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
    },
    headerGradient: {
        alignItems: "center",
        paddingTop: 24,
        paddingBottom: 22,
        paddingHorizontal: 20,
        position: "relative",
    },
    closeBtn: {
        position: "absolute",
        top: 14,
        right: 14,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    flameContainer: {
        marginBottom: 10,
    },
    flameCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#FF4500",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    headerSubtitle: {
        fontFamily: fonts.hud.bold,
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.85)",
        letterSpacing: 2,
        marginBottom: 2,
    },
    streakCountNumber: {
        fontFamily: fonts.heading.bold,
        fontSize: 48,
        color: "#FFFFFF",
        lineHeight: 52,
        fontWeight: "900",
    },
    streakCountLabel: {
        fontFamily: fonts.hud.bold,
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.9)",
        letterSpacing: 3,
    },
    bodyContent: {
        padding: 20,
    },
    ribbonSection: {
        marginBottom: 16,
    },
    ribbonHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    ribbonTitle: {
        fontFamily: fonts.hud.bold,
        fontSize: 12,
        color: theme.colors.textSecondary,
        letterSpacing: 1.2,
    },
    cycleBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    cycleBadgeText: {
        fontFamily: fonts.heading.bold,
        fontSize: 11,
        color: "#B45309",
    },
    daysRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 4,
    },
    dayCard: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 2,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        backgroundColor: "#F9FAFB",
    },
    dayCardCompleted: {
        backgroundColor: "#F0FDF4",
        borderColor: "#86EFAC",
    },
    dayCardToday: {
        backgroundColor: "#FFF7ED",
        borderColor: "#F59E0B",
        transform: [{ scale: 1.05 }],
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    dayCardUpcoming: {
        backgroundColor: "#FAFAFA",
        borderColor: "#E5E7EB",
        opacity: 0.85,
    },
    dayNumberText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: "#6B7280",
        marginBottom: 4,
    },
    dayNumberCompleted: {
        color: "#16A34A",
    },
    dayNumberToday: {
        color: "#B21830",
        fontWeight: "bold",
    },
    dayIconSlot: {
        height: 24,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 4,
    },
    completedBadgeCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#16A34A",
        justifyContent: "center",
        alignItems: "center",
    },
    dayExpText: {
        fontFamily: fonts.body.medium,
        fontSize: 10,
        color: "#6B7280",
        fontWeight: "600",
    },
    dayExpCompleted: {
        color: "#16A34A",
    },
    dayExpToday: {
        color: "#B21830",
        fontWeight: "bold",
        fontSize: 11,
    },
    todayPill: {
        marginTop: 4,
        backgroundColor: "#B21830",
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    todayPillText: {
        color: "#FFFFFF",
        fontSize: 7,
        fontFamily: fonts.hud.bold,
        letterSpacing: 0.5,
    },
    doneText: {
        marginTop: 4,
        color: "#16A34A",
        fontSize: 8,
        fontFamily: fonts.heading.bold,
    },
    milestoneMiniTag: {
        marginTop: 4,
        color: "#D97706",
        fontSize: 7,
        fontFamily: fonts.heading.bold,
    },
    calloutCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 14,
        padding: 12,
        marginBottom: 18,
        gap: 12,
    },
    calloutIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#FFF5F5",
        justifyContent: "center",
        alignItems: "center",
    },
    calloutTextContainer: {
        flex: 1,
    },
    calloutTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 13,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    calloutDescription: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: theme.colors.textSecondary,
        lineHeight: 15,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#B21830",
        paddingVertical: 14,
        borderRadius: 12,
        gap: 6,
        shadowColor: "#B21830",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    actionButtonText: {
        fontFamily: fonts.hud.bold,
        fontSize: 14,
        color: "#FFFFFF",
        letterSpacing: 1.5,
    },
});
