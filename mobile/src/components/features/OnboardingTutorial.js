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
                badge: "PORTAL OVERVIEW",
                title: "ACCREDITATION PORTAL",
                description:
                    "Welcome to ARQuest for Accreditors. You have unrestricted, bypass access to all campus facilities, 3D architectural models, and 360° virtual walkthroughs without geofence locks.",
                icon: Building,
                position: "center",
                actionLabel: "START EVALUATION",
            },
            {
                badge: "EVALUATION SUMMARY",
                title: "HOME DASHBOARD",
                description:
                    "Monitor total active campus facilities and view real-time GPS proximity to the nearest building. Access quick shortcuts to deploy into campus tools.",
                icon: Activity,
                position: "bottom",
                pointerLeft: "10%",
                actionLabel: "NEXT",
            },
            {
                badge: "CAMPUS DIRECTORY",
                title: "CAMPUS 2D/3D MAP",
                description:
                    "Inspect campus buildings with live GPS tracking. Tap any building marker to examine interactive 3D GLTF structural models, or toggle to the high-performance 2D List View.",
                icon: Map,
                position: "bottom",
                pointerLeft: "30%",
                actionLabel: "NEXT",
            },
            {
                badge: "SPATIAL AR LENS",
                title: "CAMERA AR INSPECTION",
                description:
                    "Deploy the AR Lens on-site to visually locate facilities in your live camera feed, check directional bearings, and inspect spatial waypoints.",
                icon: ScanLine,
                position: "bottom",
                pointerLeft: "50%",
                actionLabel: "NEXT",
            },
            {
                badge: "FACILITY RADAR",
                title: "EXPLORE DIRECTORY",
                description:
                    "View all campus facilities with their operational hours, department directories, and real-time distance calculations from your current location.",
                icon: MapPin,
                position: "bottom",
                pointerLeft: "70%",
                actionLabel: "NEXT",
            },
            {
                badge: "EVALUATION LOG",
                title: "VISITED BUILDINGS",
                description:
                    "Track your campus inspection coverage. Visited buildings are automatically stamped and sorted to the top of your evaluation checklist.",
                icon: CheckCircle2,
                position: "bottom",
                pointerLeft: "90%",
                actionLabel: "START EVALUATION",
            },
        ];
    }

    if (role === "visitor") {
        return [
            {
                badge: "CAMPUS GUIDE",
                title: "WELCOME TO CAMPUS",
                description:
                    "Welcome to our university campus! ARQuest helps you navigate campus facilities, find department offices, and learn about our university history.",
                icon: Compass,
                position: "center",
                actionLabel: "GET STARTED",
            },
            {
                badge: "CAMPUS OVERVIEW",
                title: "HOME OVERVIEW",
                description:
                    "Get quick campus stats, see your closest campus landmark, and access essential navigation tools from the Home screen.",
                icon: Building,
                position: "bottom",
                pointerLeft: "10%",
                actionLabel: "NEXT",
            },
            {
                badge: "INTERACTIVE MAP",
                title: "MAP & BUILDINGS",
                description:
                    "Explore the 2D campus map with real-time GPS positioning. Tap building markers or switch to the List View to locate offices and amenities.",
                icon: Map,
                position: "bottom",
                pointerLeft: "30%",
                actionLabel: "NEXT",
            },
            {
                badge: "CAMERA VIEW",
                title: "AR SPATIAL LENS",
                description:
                    "Point your camera across campus to view directional waypoints and discover building locations directly in your field of view.",
                icon: ScanLine,
                position: "bottom",
                pointerLeft: "50%",
                actionLabel: "NEXT",
            },
            {
                badge: "FACILITY DIRECTORY",
                title: "EXPLORE NEARBY",
                description:
                    "Find what buildings are closest to you, view facility photos, department rosters, and campus operational schedules.",
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
            badge: "EXPLORATION ARENA",
            title: "WELCOME TO ARQUEST",
            description:
                "Your campus is transformed into an interactive exploration arena! Discover buildings, solve daily objectives, inspect 3D models, and climb the player leaderboard.",
            icon: Compass,
            position: "center",
            actionLabel: "BEGIN TOUR",
        },
        {
            badge: "DAILY OBJECTIVES",
            title: "HOME & MISSIONS",
            description:
                "Check here every day for your 3 tailored objectives (Easy, Medium, Hard) and time-limited flash challenges to earn bonus EXP and level up.",
            icon: Target,
            position: "bottom",
            pointerLeft: "10%",
            actionLabel: "NEXT",
        },
        {
            badge: "CAMPUS MAP",
            title: "MAP & 3D MODELS",
            description:
                "Navigate the 2D campus map with real-time GPS. Tap building pins to inspect interactive 3D structural models or switch to List View for quick searching.",
            icon: Map,
            position: "bottom",
            pointerLeft: "30%",
            actionLabel: "NEXT",
        },
        {
            badge: "AUGMENTED REALITY",
            title: "AR LENS & QR SCANNER",
            description:
                "Deploy your camera to track spatial waypoints. Scan entrance QR codes to instantly unlock buildings, answer trivia, and take branded campus selfies.",
            icon: ScanLine,
            position: "bottom",
            pointerLeft: "50%",
            actionLabel: "NEXT",
        },
        {
            badge: "GEOFENCE RADAR",
            title: "EXPLORE & UNLOCK",
            description:
                "Walk inside building geofences to automatically unlock them on your radar. Test your knowledge with building quizzes to earn EXP rewards.",
            icon: MapPin,
            position: "bottom",
            pointerLeft: "70%",
            actionLabel: "NEXT",
        },
        {
            badge: "RANKS & BADGES",
            title: "PROFILE & PASSPORT",
            description:
                "Track your rank progression from Freshman to Campus Legend, maintain daily check-in streaks, collect milestone badges, and view your stamp passport.",
            icon: Trophy,
            position: "bottom",
            pointerLeft: "90%",
            actionLabel: "START QUEST",
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
