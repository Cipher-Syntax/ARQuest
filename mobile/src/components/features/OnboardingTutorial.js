import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
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
} from "lucide-react-native";
import theme from "../../theme/tokens";
import { fonts } from "../../constants/typography";
import { useAuth } from "../../hooks/useAuth";

const { width } = Dimensions.get("window");

const getTutorialSteps = (role) => {
    if (role === "professional" || role === "admin") {
        return [
            {
                badge: "WELCOME",
                title: "Accreditor Portal",
                description:
                    "You have full access to all campus buildings, 3D models, and 360° virtual tours for facility evaluation without any lock restrictions.",
                icon: Building,
                position: "center",
                actionLabel: "START TOUR",
            },
            {
                badge: "HOME",
                title: "Home Screen",
                description:
                    "See total campus buildings, check how close you are to the nearest building, and quickly open your evaluation tools.",
                icon: Activity,
                position: "bottom",
                pointerLeft: "10%",
                actionLabel: "NEXT",
            },
            {
                badge: "MAP",
                title: "Campus Map & 3D Views",
                description:
                    "View the campus map with your live GPS location. Tap any building pin to view its 3D model, or switch to List View.",
                icon: Map,
                position: "bottom",
                pointerLeft: "30%",
                actionLabel: "NEXT",
            },
            {
                badge: "AR CAMERA",
                title: "AR Camera View",
                description:
                    "Point your phone camera to see building names and directions floating right in front of you while walking on campus.",
                icon: ScanLine,
                position: "bottom",
                pointerLeft: "50%",
                actionLabel: "NEXT",
            },
            {
                badge: "EXPLORE",
                title: "Nearby Buildings",
                description:
                    "Browse the full list of campus buildings, view department offices, and see exact walking distances from where you are standing.",
                icon: MapPin,
                position: "bottom",
                pointerLeft: "70%",
                actionLabel: "NEXT",
            },
            {
                badge: "CHECKLIST",
                title: "Visited Buildings",
                description:
                    "Keep track of the buildings you have visited and evaluated. Checked buildings automatically appear at the top of your list.",
                icon: CheckCircle2,
                position: "bottom",
                pointerLeft: "90%",
                actionLabel: "FINISH TUTORIAL",
            },
        ];
    }

    if (role === "visitor") {
        return [
            {
                badge: "WELCOME",
                title: "Campus Visitor Guide",
                description:
                    "Welcome to our university! Use this app to find buildings, locate department offices, and easily navigate campus grounds.",
                icon: Compass,
                position: "center",
                actionLabel: "GET STARTED",
            },
            {
                badge: "HOME",
                title: "Home Screen",
                description:
                    "Quickly see the nearest campus building and access the map and camera navigation shortcuts.",
                icon: Building,
                position: "bottom",
                pointerLeft: "10%",
                actionLabel: "NEXT",
            },
            {
                badge: "MAP",
                title: "Campus Map",
                description:
                    "View the full 2D map with your live GPS location to find departments, rooms, and facilities.",
                icon: Map,
                position: "bottom",
                pointerLeft: "30%",
                actionLabel: "NEXT",
            },
            {
                badge: "AR CAMERA",
                title: "AR Camera View",
                description:
                    "Look through your camera to see building names and directions floating in real-time as you walk.",
                icon: ScanLine,
                position: "bottom",
                pointerLeft: "50%",
                actionLabel: "NEXT",
            },
            {
                badge: "EXPLORE",
                title: "Building Directory",
                description:
                    "Browse photos, department information, and operating hours for all buildings across campus.",
                icon: MapPin,
                position: "bottom",
                pointerLeft: "70%",
                actionLabel: "EXPLORE CAMPUS",
            },
        ];
    }

    // Default: Student Role
    return [
        {
            badge: "WELCOME",
            title: "Welcome to ARQuest",
            description:
                "Explore your campus, unlock buildings as you walk, complete daily quests, answer quizzes, and level up your rank!",
            icon: Compass,
            position: "center",
            actionLabel: "GET STARTED",
        },
        {
            badge: "MISSIONS",
            title: "Daily Missions",
            description:
                "Check here every day for 3 daily missions and limited-time quests to earn EXP and increase your player level.",
            icon: Target,
            position: "bottom",
            pointerLeft: "10%",
            actionLabel: "NEXT",
        },
        {
            badge: "MAP",
            title: "Campus Map & 3D Models",
            description:
                "See where you are on campus. Tap any building pin to inspect its 3D model or switch to List View for quick searching.",
            icon: Map,
            position: "bottom",
            pointerLeft: "30%",
            actionLabel: "NEXT",
        },
        {
            badge: "AR CAMERA",
            title: "AR Scanner & QR Codes",
            description:
                "Use your camera to find buildings around you. Scan building QR codes at the entrance to unlock them and take campus selfies!",
            icon: ScanLine,
            position: "bottom",
            pointerLeft: "50%",
            actionLabel: "NEXT",
        },
        {
            badge: "EXPLORE",
            title: "Nearby Radar & Quizzes",
            description:
                "Walk close to a building to automatically unlock it. Take quick building quizzes to earn bonus EXP points.",
            icon: MapPin,
            position: "bottom",
            pointerLeft: "70%",
            actionLabel: "NEXT",
        },
        {
            badge: "PROFILE",
            title: "Rank, Streaks & Badges",
            description:
                "Track your rank from Freshman to Campus Legend, maintain daily check-in streaks, and collect achievement badges.",
            icon: Trophy,
            position: "bottom",
            pointerLeft: "90%",
            actionLabel: "START PLAYING",
        },
    ];
};

export default function OnboardingTutorial() {
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    const steps = getTutorialSteps(user?.role);

    useEffect(() => {
        checkTutorialStatus();

        const sub = DeviceEventEmitter.addListener("show_tutorial", () => {
            setCurrentStep(0);
            setIsVisible(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        });

        return () => sub.remove();
    }, [user?.role]);

    const checkTutorialStatus = async () => {
        try {
            const hasCompleted = await AsyncStorage.getItem(
                "@tutorial_completed",
            );
            if (hasCompleted !== "true") {
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
            // Finish tutorial
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start(async () => {
                setIsVisible(false);
                await AsyncStorage.setItem("@tutorial_completed", "true");
            });
        }
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
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
        }).start(async () => {
            setIsVisible(false);
            await AsyncStorage.setItem("@tutorial_completed", "true");
        });
    };

    if (!isVisible) return null;

    const step = steps[currentStep] || steps[0];
    const Icon = step.icon;

    return (
        <Modal transparent visible={isVisible} animationType="none">
            <View style={styles.overlay}>
                <Animated.View
                    style={[styles.container, { opacity: fadeAnim }]}
                >
                    <View
                        style={[
                            styles.tooltipBox,
                            step.position === "bottom"
                                ? styles.tooltipBottom
                                : styles.tooltipCenter,
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
                            <Icon color={theme.colors.primary} size={32} />
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

                        {/* Actions Row */}
                        <View style={styles.buttonRow}>
                            {currentStep > 0 ? (
                                <TouchableOpacity
                                    onPress={handlePrev}
                                    style={styles.prevBtn}
                                    activeOpacity={0.8}
                                >
                                    <ChevronLeft
                                        color={theme.colors.textSecondary}
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
                                style={styles.nextBtn}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.nextText}>
                                    {currentStep === steps.length - 1
                                        ? step.actionLabel || "FINISH"
                                        : "NEXT"}
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
                    {step.position === "bottom" && (
                        <View
                            style={[
                                styles.pointer,
                                { left: step.pointerLeft },
                            ]}
                        />
                    )}

                    {/* Highlight Indicator on Tab Bar */}
                    {step.position === "bottom" && (
                        <View
                            style={[
                                styles.highlightCircle,
                                { left: step.pointerLeft },
                            ]}
                        />
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
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
        bottom: 125, // Sits above tab bar
        alignSelf: "center",
    },
    tooltipBox: {
        width: width * 0.88,
        backgroundColor: theme.colors.surface,
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
        backgroundColor: "rgba(178, 24, 48, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(178, 24, 48, 0.3)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: theme.colors.primary,
        letterSpacing: 0.8,
    },
    stepCounter: {
        fontFamily: fonts.body.medium,
        fontSize: 12,
        color: theme.colors.textMuted,
    },
    iconContainer: {
        width: 68,
        height: 68,
        backgroundColor: "rgba(178, 24, 48, 0.12)",
        borderRadius: 34,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "rgba(178, 24, 48, 0.25)",
    },
    title: {
        fontFamily: fonts.heading.bold,
        fontWeight: "bold",
        fontSize: 18,
        color: theme.colors.textPrimary,
        marginBottom: 8,
        textAlign: "center",
        letterSpacing: 0.5,
    },
    description: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: theme.colors.textSecondary,
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
        backgroundColor: theme.colors.primary,
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
        borderColor: theme.colors.border,
    },
    prevText: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 12,
        color: theme.colors.textSecondary,
        letterSpacing: 0.5,
        marginLeft: 2,
    },
    skipBtn: {
        paddingVertical: 11,
        paddingHorizontal: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    skipText: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 12,
        color: theme.colors.textMuted,
        letterSpacing: 0.5,
    },
    nextBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 22,
        shadowColor: theme.colors.primary,
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
        bottom: 110,
        width: 0,
        height: 0,
        borderLeftWidth: 14,
        borderRightWidth: 14,
        borderTopWidth: 15,
        borderStyle: "solid",
        backgroundColor: "transparent",
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: theme.colors.surface,
        marginLeft: -14,
    },
    highlightCircle: {
        position: "absolute",
        bottom: 25,
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        backgroundColor: "rgba(178, 24, 48, 0.25)",
        marginLeft: -28,
    },
});
