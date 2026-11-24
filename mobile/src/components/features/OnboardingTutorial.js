import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    BackHandler,
    Dimensions,
    Animated,
    DeviceEventEmitter,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    Map,
    MapPin,
    ScanLine,
    Trophy,
    Target,
    Compass,
    Building,
    Activity,
    CheckCircle2,
    Eye,
    ChevronLeft,
    ChevronRight,
    ShieldAlert,
    Square,
    CheckSquare,
} from "lucide-react-native";
import { router } from "expo-router";
import { useThemeColors } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { fonts } from "../../constants/typography";
import { useAuth } from "../../hooks/useAuth";
import { toRgba } from "../../utils/color";
import { setTourHighlight, clearTourHighlight, useTourHighlight, tabCenterX } from "../../utils/tourHighlight";

const { width } = Dimensions.get("window");

const getTutorialSteps = (role, includeLegal = true) => {
    let steps = [];

    if (role === "professional" || role === "admin") {
        steps = [
            {
                badge: "WELCOME",
                title: "Accreditor Portal",
                description:
                    "You have full access to all campus buildings, 3D models, and 360° virtual tours for facility evaluation without any lock restrictions.",
                icon: Building,
                position: "center",
            },
            {
                badge: "HOME",
                title: "Home Screen",
                description:
                    "See total campus buildings, check how close you are to the nearest building, and quickly open your evaluation tools.",
                icon: Activity,
                position: "bottom",
                target: "index",
            },
            {
                badge: "MAP",
                title: "Campus Map & 3D Views",
                description:
                    "View the campus map with your live GPS location. Tap any building pin to view its 3D model, or switch to List View.",
                icon: Map,
                position: "bottom",
                target: "buildings",
            },
            {
                badge: "AR CAMERA",
                title: "AR Camera View",
                description:
                    "Point your phone camera to see building names and directions floating right in front of you while walking on campus.",
                icon: ScanLine,
                position: "bottom",
                target: "ar",
            },
            {
                badge: "EXPLORE",
                title: "Nearby Buildings",
                description:
                    "Browse the full list of campus buildings, view department offices, and see exact walking distances from where you are standing.",
                icon: MapPin,
                position: "bottom",
                target: "explore",
            },
            {
                badge: "CHECKLIST",
                title: "Visited Buildings",
                description:
                    "Keep track of the buildings you have visited and evaluated. Checked buildings automatically appear at the top of your list.",
                icon: CheckCircle2,
                position: "bottom",
                target: "profile",
            },
        ];
    } else if (role === "visitor") {
        steps = [
            {
                badge: "WELCOME",
                title: "Campus Guest Guide",
                description:
                    "Welcome to our university! Use this app to find campus buildings and explore 360° virtual panoramas. Full turn-by-turn navigation, 3D models, and quests are available when signed in as a student.",
                icon: Compass,
                position: "center",
            },
            {
                badge: "HOME",
                title: "Home Screen",
                description:
                    "Quickly see the nearest campus building and access the map and camera navigation shortcuts.",
                icon: Building,
                position: "bottom",
                target: "index",
            },
            {
                badge: "MAP",
                title: "Campus Map",
                description:
                    "View the full 2D map with your live GPS location to find departments, rooms, and facilities.",
                icon: Map,
                position: "bottom",
                target: "buildings",
            },
            {
                badge: "AR CAMERA",
                title: "AR Camera View",
                description:
                    "Look through your camera to see building names and directions floating in real-time as you walk.",
                icon: ScanLine,
                position: "bottom",
                target: "ar",
            },
            {
                badge: "EXPLORE",
                title: "Building Directory",
                description:
                    "Browse photos, department information, and operating hours for all buildings across campus.",
                icon: MapPin,
                position: "bottom",
                target: "explore",
            },
        ];
    } else {
        // Default: Student Role
        steps = [
            {
                badge: "WELCOME",
                title: "Welcome to ARQuest",
                description:
                    "Explore your campus, unlock buildings as you walk, complete daily quests, answer quizzes, and level up your rank!",
                icon: Compass,
                position: "center",
            },
            {
                badge: "MISSIONS",
                title: "Daily Missions",
                description:
                    "Check here every day for 3 daily missions and limited-time quests to earn EXP and increase your player level.",
                icon: Target,
                position: "bottom",
                target: "index",
            },
            {
                badge: "MAP",
                title: "Campus Map & 3D Models",
                description:
                    "See where you are on campus. Tap any building pin to inspect its 3D model or switch to List View for quick searching.",
                icon: Map,
                position: "bottom",
                target: "buildings",
            },
            {
                badge: "AR CAMERA",
                title: "AR Scanner & QR Codes",
                description:
                    "Use your camera to find buildings around you. Scan building QR codes at the entrance to unlock them and take campus selfies!",
                icon: ScanLine,
                position: "bottom",
                target: "ar",
            },
            {
                badge: "EXPLORE",
                title: "Nearby Radar & Quizzes",
                description:
                    "Walk close to a building to automatically unlock it. Take quick building quizzes to earn bonus EXP points.",
                icon: MapPin,
                position: "bottom",
                target: "explore",
            },
            {
                badge: "PROFILE",
                title: "Rank, Streaks & Badges",
                description:
                    "Track your rank from Freshman to Campus Legend, maintain daily check-in streaks, and collect achievement badges.",
                icon: Trophy,
                position: "bottom",
                target: "profile",
            },
        ];
    }

    // Add actionLabel 'NEXT' to all steps
    steps = steps.map(s => ({ ...s, actionLabel: "NEXT" }));

    if (!includeLegal) {
        // Replay of the manual: the user already accepted the terms, so the
        // last content step simply closes the tutorial.
        const last = steps.length - 1;
        steps[last] = { ...steps[last], actionLabel: "FINISH" };
        return steps;
    }

    // Append the mandatory Legal step at the very end
    steps.push({
        badge: "AGREEMENT",
        title: "Terms & Privacy",
        description:
            "Please review the app's Terms and Conditions and Privacy Policy before continuing.",
        icon: ShieldAlert,
        position: "center",
        actionLabel: "I ACCEPT",
        isLegalStep: true,
    });

    return steps;
};

export default function OnboardingTutorial() {
    const colors = useThemeColors();
    const styles = useThemedStyles(createStyles);
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isAgreed, setIsAgreed] = useState(false);
    // Replays (Profile → User Manual) skip the legal step: terms were already accepted.
    const [isReplay, setIsReplay] = useState(false);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    const steps = getTutorialSteps(user?.role, !isReplay);

    // The ring is drawn by the tab bar itself, around the real icon (centered by
    // layout, nothing measured). This overlay only says which tab to highlight and
    // ends above the tab bar so the ring stays visible.
    const tour = useTourHighlight();
    const [overlayW, setOverlayW] = useState(Dimensions.get("window").width);
    const currentTarget = steps[currentStep] || steps[0];
    const highlightedTab =
        isVisible && currentTarget?.position === "bottom" ? currentTarget.target : null;

    useEffect(() => {
        if (highlightedTab) {
            setTourHighlight({ tab: highlightedTab, tone: "primary", pulse: false });
        } else {
            clearTourHighlight();
        }
        return () => clearTourHighlight();
    }, [highlightedTab]);

    // Swallow the Android back button while the tutorial is up (the old Modal did).
    useEffect(() => {
        if (!isVisible) return undefined;
        const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
        return () => sub.remove();
    }, [isVisible]);

    const getStorageKey = () => {
        return user?.id ? `@tutorial_completed_${user.id}` : "@tutorial_completed";
    };

    useEffect(() => {
        checkTutorialStatus();

        const sub = DeviceEventEmitter.addListener("show_tutorial", async () => {
            let alreadyAccepted = false;
            try {
                alreadyAccepted =
                    (await AsyncStorage.getItem(getStorageKey())) === "true";
            } catch {}
            setIsReplay(alreadyAccepted);
            setCurrentStep(0);
            setIsVisible(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        });

        return () => sub.remove();
    }, [user?.id, user?.role]);

    const checkTutorialStatus = async () => {
        try {
            const key = getStorageKey();
            const hasCompleted = await AsyncStorage.getItem(key);
            if (hasCompleted !== "true") {
                setIsReplay(false);
                setCurrentStep(0);
                setIsVisible(true);
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }).start();
            }
        } catch (e) {
            console.error("Failed to check tutorial status:", e);
        }
    };

    const handleNext = async () => {
        if (currentStep < steps.length - 1) {
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
            setTimeout(() => setCurrentStep((prev) => prev + 1), 150);
        } else {
            finishTutorial();
        }
    };

    const finishTutorial = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
        }).start(async () => {
            setIsVisible(false);
            if (isReplay) return; // nothing new to record or chain into
            const key = getStorageKey();
            await AsyncStorage.setItem(key, "true");
            await AsyncStorage.setItem("@tutorial_completed", "true");
            DeviceEventEmitter.emit("tutorial_finished");
        });
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
            setTimeout(() => setCurrentStep((prev) => prev - 1), 150);
        }
    };

    const handleSkip = async () => {
        if (isReplay) {
            // Terms already accepted — skipping a replay just closes it.
            finishTutorial();
            return;
        }
        if (currentStep < steps.length - 1) {
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
            setTimeout(() => setCurrentStep(steps.length - 1), 150);
        }
    };

    if (!isVisible) return null;

    const step = steps[currentStep] || steps[0];
    const Icon = step.icon;

    // Tab-step geometry: the overlay stops at the tab bar's top edge; the tooltip rests
    // on a pointer whose tip touches that edge above the highlighted tab.
    const showTarget = step.position === "bottom";
    const cx = showTarget ? tabCenterX(step.target, overlayW) : null;

    return (
        <View
            style={[
                styles.overlay,
                showTarget && { bottom: tour.tabBarHeight || 78 },
            ]}
            onLayout={(e) => setOverlayW(e.nativeEvent.layout.width)}
        >
                <Animated.View
                    style={[styles.container, { opacity: fadeAnim }]}
                >
                    <View
                        style={[
                            styles.tooltipBox,
                            showTarget ? styles.tooltipBottom : styles.tooltipCenter,
                        ]}
                    >
                        {/* Header Step Counter & Category Badge */}
                        <View style={styles.topRow}>
                            <View style={styles.badgeWrap}>
                                <Text style={styles.badgeText}>
                                    {step.badge}
                                </Text>
                            </View>
                            <Text style={styles.stepCounter}>
                                {currentStep + 1} / {steps.length}
                            </Text>
                        </View>

                        {/* Icon Container */}
                        <View style={styles.iconContainer}>
                            <Icon color={colors.primary} size={32} />
                        </View>

                        {/* Title & Description */}
                        <Text style={styles.title}>{step.title}</Text>
                        <Text style={styles.description}>
                            {step.description}
                        </Text>

                        {/* Step Pagination Dots */}
                        <View style={styles.dotsContainer}>
                            {steps.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.dot,
                                        i === currentStep && styles.activeDot,
                                    ]}
                                />
                            ))}
                        </View>

                        {/* Legal Checkbox */}
                        {step.isLegalStep && (
                            <TouchableOpacity
                                style={styles.legalCheckRow}
                                activeOpacity={0.8}
                                onPress={() => setIsAgreed(!isAgreed)}
                            >
                                <View style={[styles.checkbox, isAgreed && styles.checkboxActive]}>
                                    {isAgreed ? (
                                        <CheckSquare size={20} color={colors.primary} />
                                    ) : (
                                        <Square size={20} color={colors.textMuted} />
                                    )}
                                </View>
                                <Text style={styles.legalCheckText}>
                                    I agree to the{" "}
                                    <Text style={styles.legalLink} onPress={() => router.push("/terms")}>Terms and Conditions</Text>
                                    {" "}and acknowledge that I have read the{" "}
                                    <Text style={styles.legalLink} onPress={() => router.push("/privacy")}>Privacy Policy</Text>.
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Actions Row */}
                        <View style={styles.buttonRow}>
                            {currentStep > 0 ? (
                                <TouchableOpacity
                                    onPress={handlePrev}
                                    style={styles.prevBtn}
                                    activeOpacity={0.8}
                                >
                                    <ChevronLeft
                                        color={colors.textSecondary}
                                        size={18}
                                    />
                                    <Text style={styles.prevText}>BACK</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={handleSkip}
                                    style={styles.skipBtn}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.skipText}>SKIP</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                onPress={handleNext}
                                style={[
                                    styles.nextBtn,
                                    (step.isLegalStep && !isAgreed) && styles.nextBtnDisabled
                                ]}
                                activeOpacity={0.9}
                                disabled={step.isLegalStep && !isAgreed}
                            >
                                <Text style={styles.nextText}>
                                    {step.actionLabel || (currentStep === steps.length - 1 ? "FINISH" : "NEXT")}
                                </Text>
                                {currentStep < steps.length - 1 && (
                                    <ChevronRight
                                        color="#FFFFFF"
                                        size={18}
                                        style={{ marginLeft: 4 }}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Pointer Triangle for bottom tooltips */}
                    {showTarget && cx != null && (
                        <View
                            pointerEvents="none"
                            style={[styles.pointer, { left: cx - 14 }]}
                        />
                    )}
                </Animated.View>
        </View>
    );
}

const createStyles = (colors, spacing, radius, typography) => StyleSheet.create({
    // Rendered inline inside the tab layout root (no Modal): fills it and sits above
    // the tabs, so tour targets measured relative to that root line up exactly.
    overlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        zIndex: 9999,
        elevation: 9999,
    },
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    tooltipCenter: {
        alignSelf: "center",
    },
    tooltipBottom: {
        position: "absolute",
        bottom: 21, // rests on the 15px pointer, which sits 6px above the tab bar
        alignSelf: "center",
    },
    tooltipBox: {
        width: width * 0.88,
        backgroundColor: colors.surface,
        borderRadius: 24,
        paddingVertical: 24,
        paddingHorizontal: 20,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 12,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginBottom: 16,
    },
    badgeWrap: {
        backgroundColor: toRgba(colors.primary, 0.15),
        borderWidth: 1,
        borderColor: toRgba(colors.primary, 0.3),
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: colors.primary,
        letterSpacing: 0.8,
    },
    stepCounter: {
        fontFamily: fonts.body.medium,
        fontSize: 12,
        color: colors.textMuted,
    },
    iconContainer: {
        width: 68,
        height: 68,
        backgroundColor: toRgba(colors.primary, 0.12),
        borderRadius: 34,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 14,
        borderWidth: 1,
        borderColor: toRgba(colors.primary, 0.25),
    },
    title: {
        fontFamily: fonts.heading.bold,
        fontWeight: "bold",
        fontSize: 18,
        color: colors.textPrimary,
        marginBottom: 8,
        textAlign: "center",
        letterSpacing: 0.5,
    },
    description: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: 18,
        lineHeight: 19,
        paddingHorizontal: 6,
    },
    dotsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginBottom: 20,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    activeDot: {
        width: 18,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },
    buttonRow: {
        flexDirection: "row",
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    prevBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 11,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    prevText: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 12,
        color: colors.textSecondary,
        letterSpacing: 0.5,
        marginLeft: 2,
    },
    skipBtn: {
        paddingVertical: 11,
        paddingHorizontal: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    skipText: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 12,
        color: colors.textMuted,
        letterSpacing: 0.5,
    },
    nextBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 22,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },
    nextText: {
        fontFamily: fonts.heading.bold,
        fontSize: 13,
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
    pointer: {
        position: "absolute",
        bottom: 6, // left is set from the highlighted tab's slot
        width: 0,
        height: 0,
        borderLeftWidth: 14,
        borderRightWidth: 14,
        borderTopWidth: 15,
        borderStyle: "solid",
        backgroundColor: "transparent",
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: colors.surface,
    },
    legalCheckRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "rgba(0,0,0,0.02)",
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: 6,
        marginBottom: 16,
    },
    checkbox: {
        marginRight: 12,
        marginTop: 2,
    },
    checkboxActive: {
        opacity: 1,
    },
    legalCheckText: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    legalLink: {
        fontFamily: fonts.heading.semiBold,
        color: colors.primary,
        textDecorationLine: "underline",
    },
    nextBtnDisabled: {
        backgroundColor: colors.border,
        shadowOpacity: 0,
        elevation: 0,
    },
});
