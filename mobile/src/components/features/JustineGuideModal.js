import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    Animated,
    Image,
    DeviceEventEmitter,
    Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    ChevronRight,
    X,
    RotateCcw,
} from "lucide-react-native";
import { useAuth } from "../../hooks/useAuth";
import { useThemeColors } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { toRgba } from "../../utils/color";
import { router } from "expo-router";
import { useTourTarget, tabTargetId, HOME_MISSION_TARGET } from "../../utils/tourTargets";
import { AnimatedBottomBar, ModalSafeArea, useBottomInset } from "../ui/SafeAreaSheet";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Highlight positions are NOT hard-coded: the tab icons and the Home mission card
// register themselves in utils/tourTargets and are measured live, so the rings
// stay centered across devices, safe-area insets, font scales and layouts.

// ── Character Sprites ────────────────────────────────────────────────────────
const CHAR_IMAGES = {
    guide: require("../../../assets/images/characters/justine_guide.png"),
    pointing: require("../../../assets/images/characters/justine_pointing.png"),
    explorer: require("../../../assets/images/characters/justine_explorer.png"),
    celebrating: require("../../../assets/images/characters/justine_celebrating.png"),
    thinking: require("../../../assets/images/characters/justine_thinking.png"),
};

// ─────────────────────────────────────────────────────────────────────────────
const TOUR_STEPS = [
    {
        id: "welcome",
        speech: "Yo, Adventurer! 🎉 Welcome to WMSU! I'm Justine — your campus guide! You're holding ARQuest, our high-tech campus radar. Ready to turn this campus into your playground? Let me show you around real quick!",
        button: "LET'S GO! ⚡",
        layout: "vn_bar",
        image: CHAR_IMAGES.guide,
    },
    {
        id: "missions",
        speech: "Right here 👉 — every day you get 3 Daily Missions! Visit buildings, rack up EXP, and rise from Freshman to Campus Legend!",
        button: "NICE, WHAT ELSE? 📍",
        layout: "spotlight",
        target: HOME_MISSION_TARGET,
        image: CHAR_IMAGES.pointing,
    },
    {
        id: "maps",
        speech: "Tap Maps to pull up campus walking paths and get routed straight to any building's entrance.",
        button: "GOT IT! →",
        layout: "tab_pointer",
        target: tabTargetId("buildings"),
        label: "MAPS",
        isAR: false,
        image: CHAR_IMAGES.explorer,
    },
    {
        id: "ar",
        speech: "Step inside a building's zone then hit the center AR button! Scan, claim quest rewards, answer trivia, and inspect 3D models!",
        button: "START EXPLORING! 🏆",
        layout: "tab_pointer",
        target: tabTargetId("ar"),
        label: "AR SCAN",
        isAR: true,
        image: CHAR_IMAGES.celebrating,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function JustineGuideModal() {
    const colors = useThemeColors();
    const S = useThemedStyles(createStyles);
    const { user } = useAuth();
    // The tour overlay is rooted at the tab layout, so it must account for
    // the system nav bar when positioning pointers above the tab bar.
    const bottomInset = useBottomInset(0);
    const [isVisible, setIsVisible] = useState(false);
    const [mode, setMode] = useState("tour");
    const [currentStep, setCurrentStep] = useState(0);
    const [hintData, setHintData] = useState(null);
    const overlayRef = useRef(null);

    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const charSlideY     = useRef(new Animated.Value(80)).current;
    const barSlideY      = useRef(new Animated.Value(60)).current;
    const bubbleOpacity  = useRef(new Animated.Value(0)).current;
    const bubbleSlideX   = useRef(new Animated.Value(24)).current;
    const arrowBounceY   = useRef(new Animated.Value(0)).current;
    const ringScale      = useRef(new Animated.Value(1)).current;
    const ringOpacity    = useRef(new Animated.Value(0.85)).current;
    const charBreath     = useRef(new Animated.Value(1)).current;

    // ── Loop animations ──────────────────────────────────────────────────────
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(arrowBounceY, { toValue: -10, duration: 440, useNativeDriver: true }),
                Animated.timing(arrowBounceY, { toValue: 0,   duration: 440, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(ringScale,   { toValue: 1.5, duration: 750, useNativeDriver: true }),
                    Animated.timing(ringScale,   { toValue: 1.0, duration: 750, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(ringOpacity, { toValue: 0.15, duration: 750, useNativeDriver: true }),
                    Animated.timing(ringOpacity, { toValue: 0.9,  duration: 750, useNativeDriver: true }),
                ]),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(charBreath, { toValue: 1.016, duration: 1500, useNativeDriver: true }),
                Animated.timing(charBreath, { toValue: 1.0,   duration: 1500, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // ── Event listeners ──────────────────────────────────────────────────────
    useEffect(() => {
        checkAutoTrigger();
        const a = DeviceEventEmitter.addListener("tutorial_finished", () => startAfterTutorial());
        const b = DeviceEventEmitter.addListener("show_justine_guide", () => startTour());
        const c = DeviceEventEmitter.addListener("show_justine_hint",  (d) => showHint(d));
        return () => { a.remove(); b.remove(); c.remove(); };
    }, [user?.id, user?.role]);

    const getStorageKey  = () => user?.id ? `@justine_guide_completed_${user.id}` : "@justine_guide_completed";
    const getTutorialKey = () => user?.id ? `@tutorial_completed_${user.id}` : "@tutorial_completed";

    // After the initial tutorial: only students who haven't done the guide yet.
    // (Professionals/admins/visitors have no Daily Missions to be shown, and a
    // replayed manual must not restart a guide that was already completed.)
    const startAfterTutorial = async () => {
        if (!user || user.role !== "student") return;
        try {
            const done = await AsyncStorage.getItem(getStorageKey());
            if (done !== "true") setTimeout(() => startTour(), 350);
        } catch {}
    };

    const checkAutoTrigger = async () => {
        if (!user || user.role !== "student") return;
        try {
            const [td, gd] = await Promise.all([AsyncStorage.getItem(getTutorialKey()), AsyncStorage.getItem(getStorageKey())]);
            if (td === "true" && gd !== "true") setTimeout(() => startTour(), 400);
        } catch {}
    };

    const animateIn = () => {
        overlayOpacity.setValue(0); charSlideY.setValue(80); barSlideY.setValue(60);
        bubbleOpacity.setValue(0);  bubbleSlideX.setValue(24);
        Animated.parallel([
            Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.spring(charSlideY,  { toValue: 0, friction: 7, tension: 38, useNativeDriver: true }),
            Animated.spring(barSlideY,   { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
        ]).start();
    };

    const animateBubbleIn = () => {
        bubbleOpacity.setValue(0); bubbleSlideX.setValue(24);
        Animated.parallel([
            Animated.timing(bubbleOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.spring(bubbleSlideX,  { toValue: 0, friction: 8, useNativeDriver: true }),
        ]).start();
    };

    const startTour = () => {
        // The tour spotlights Home content (Daily Missions), so always begin
        // from Home — wherever the guide was launched (e.g. Profile → Meet Justine).
        try { router.navigate("/(tabs)"); } catch {}
        DeviceEventEmitter.emit("tour_scroll_home_top");
        setMode("tour"); setCurrentStep(0); setIsVisible(true); animateIn();
    };
    const showHint  = (d) => { setMode("hint"); setHintData(d || {}); setIsVisible(true); animateIn(); };

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            Animated.parallel([
                Animated.timing(barSlideY,    { toValue: 40, duration: 110, useNativeDriver: true }),
                Animated.timing(bubbleOpacity, { toValue: 0,  duration: 90, useNativeDriver: true }),
            ]).start(() => {
                setCurrentStep((p) => p + 1);
                barSlideY.setValue(40);
                Animated.spring(barSlideY, { toValue: 0, friction: 8, useNativeDriver: true }).start();
                animateBubbleIn();
            });
        } else {
            finishTour();
        }
    };

    const finishTour = async () => {
        Animated.parallel([
            Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
            Animated.timing(charSlideY,     { toValue: 80, duration: 200, useNativeDriver: true }),
        ]).start(async () => {
            setIsVisible(false);
            try { await AsyncStorage.setItem(getStorageKey(), "true"); } catch {}
        });
    };

    const handleDismiss = () => {
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
            .start(() => setIsVisible(false));
    };

    useEffect(() => {
        if (isVisible && mode === "tour") {
            const s = TOUR_STEPS[currentStep];
            if (s?.layout === "spotlight" || s?.layout === "tab_pointer") animateBubbleIn();
        }
    }, [currentStep, isVisible]);

    const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];

    // Live position of this step's highlight target, in the overlay's own
    // coordinate space (so rings are centered on the real element).
    const targetRect = useTourTarget(
        mode === "tour" ? step.target : null,
        overlayRef,
        isVisible && mode === "tour",
    );

    if (!isVisible) return null;

    // ── Shared: progress dots ─────────────────────────────────────────────────
    const Dots = () => (
        <View style={S.dotsRow}>
            {TOUR_STEPS.map((_, i) => (
                <View key={i} style={[S.dot, i === currentStep && S.dotActive, i < currentStep && S.dotDone]} />
            ))}
        </View>
    );

    // ── Shared: X close button ────────────────────────────────────────────────
    const CloseBtn = () => (
        <TouchableOpacity onPress={handleDismiss} style={S.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <X size={15} color={colors.primary} />
        </TouchableOpacity>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT 1 — VN Dialog Bar  (Step 1 + Hint)
    // ─────────────────────────────────────────────────────────────────────────
    const renderVNBar = () => {
        const charImage = mode === "hint" ? CHAR_IMAGES.thinking : (step?.image || CHAR_IMAGES.guide);
        return (
        <>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleDismiss} />

            {/* Justine — large, standing left of the dialog bar */}
            <Animated.View
                pointerEvents="none"
                style={[S.vnCharWrap, { transform: [{ translateY: charSlideY }, { scale: charBreath }] }]}
            >
                <Image
                    source={charImage}
                    style={S.vnCharImage}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* Classic RPG dialog bar — Crimson & White */}
            <AnimatedBottomBar base={30} style={[S.vnBar, { transform: [{ translateY: barSlideY }] }]}>
                <CloseBtn />

                {/* Name tag */}
                <View style={S.vnNameTag}>
                    <Text style={S.vnNameText}>JUSTINE</Text>
                    <View style={S.vnDivider} />
                    <Text style={S.vnRoleText}>Campus Guide</Text>
                </View>

                {/* Speech */}
                <Text style={S.vnSpeech}>
                    {mode === "hint" ? (hintData?.message || "") : step.speech}
                </Text>

                {/* Bottom row */}
                <View style={S.vnBottomRow}>
                    {mode === "tour" ? <Dots /> : <View />}
                    {mode === "tour" ? (
                        <TouchableOpacity style={S.crimsonBtn} onPress={handleNext} activeOpacity={0.85}>
                            <Text style={S.crimsonBtnText}>{step.button}</Text>
                            <ChevronRight size={15} color="#FFFFFF" />
                        </TouchableOpacity>
                    ) : (
                        <View style={S.hintBtnRow}>
                            <TouchableOpacity style={S.outlineBtn} onPress={startTour} activeOpacity={0.8}>
                                <RotateCcw size={13} color={colors.primary} />
                                <Text style={S.outlineBtnText}>Replay Tour</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={S.crimsonBtn} onPress={handleDismiss} activeOpacity={0.85}>
                                <Text style={S.crimsonBtnText}>GOT IT! 👍</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </AnimatedBottomBar>
        </>
    );
};

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT 2 — Spotlight on mission card  (Step 2)
    // ─────────────────────────────────────────────────────────────────────────
    const renderSpotlight = () => {
        // Frame/arrow/bubble all derive from the measured Daily Missions card.
        const rect = targetRect;
        const containerH = rect?.containerHeight || SCREEN_HEIGHT;
        return (
        <>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleDismiss} />

            {/* Dashed crimson frame exactly over the card */}
            {rect && (
                <View
                    pointerEvents="none"
                    style={[
                        S.spotlightFrame,
                        { top: rect.y, left: rect.x, width: rect.width, height: rect.height },
                    ]}
                />
            )}

            {/* Left-pointing arrow at mid-height of card */}
            {rect && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        S.spotlightArrowWrap,
                        {
                            top: rect.cy - 14,
                            transform: [{ translateY: arrowBounceY }],
                        },
                    ]}
                >
                    <View style={S.arrowLeft} />
                </Animated.View>
            )}

            {/* Speech bubble — floats above the card (white + crimson border) */}
            <Animated.View
                pointerEvents="none"
                style={[
                    S.spotlightBubble,
                    // Bottom-anchored just above the card so it grows upward with its text.
                    rect
                        ? { bottom: containerH - rect.y + 14 }
                        : { top: SCREEN_HEIGHT * 0.2 },
                    {
                        opacity: bubbleOpacity,
                        transform: [{ translateX: bubbleSlideX }],
                    },
                ]}
            >
                <Text style={S.spotlightBubbleText}>{step.speech}</Text>
                {/* Tail pointing down-left toward the card */}
                <View style={S.bubbleTailDown} />
            </Animated.View>

            {/* Justine — right side */}
            <Animated.View
                pointerEvents="none"
                style={[S.spotlightCharWrap, { transform: [{ translateY: charSlideY }, { scale: charBreath }] }]}
            >
                <Image
                    source={step?.image || CHAR_IMAGES.pointing}
                    style={S.spotlightCharImage}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* Bottom bar — white & crimson */}
            <AnimatedBottomBar base={28} style={[S.floatingBar, { transform: [{ translateY: barSlideY }] }]}>
                <CloseBtn />
                <Dots />
                <TouchableOpacity style={S.crimsonBtn} onPress={handleNext} activeOpacity={0.85}>
                    <Text style={S.crimsonBtnText}>{step.button}</Text>
                    <ChevronRight size={15} color="#FFFFFF" />
                </TouchableOpacity>
            </AnimatedBottomBar>
        </>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT 3 — Tab pointer  (Steps 3 & 4: Maps & AR Scanner)
    // ─────────────────────────────────────────────────────────────────────────
    const renderTabPointer = () => {
        const isAR = step.isAR;
        const rect = targetRect;

        // Ring: centred on the measured tab icon (AR button is larger than a plain icon)
        const ringW = isAR ? 74 : 52;
        const ringR = ringW / 2;
        const ringTop  = rect ? rect.cy - ringR : 0;
        const ringLeft = rect ? rect.cx - ringR : 0;

        // Arrow tip lands just above the top of the ring (arrow is 16px tall)
        const arrowTop = ringTop - 4 - 16;

        return (
            <>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleDismiss} />

                {/* ── Pulsing ring centred directly on tab icon ── */}
                {rect && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        S.tabRing,
                        {
                            left: ringLeft,
                            top: ringTop,
                            width: ringW,
                            height: ringW,
                            borderRadius: ringR,
                            borderColor: isAR ? "#EBBC26" : colors.primary,
                            backgroundColor: isAR ? "rgba(235,188,38,0.22)" : toRgba(colors.primary, 0.22),
                            transform: [{ scale: ringScale }],
                            opacity: ringOpacity,
                        },
                    ]}
                />
                )}

                {/* ── Bouncing down-arrow pointing directly into the tab ── */}
                {rect && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        S.tabArrowWrap,
                        {
                            left: rect.cx - 12,
                            top: arrowTop,
                            transform: [{ translateY: arrowBounceY }],
                        },
                    ]}
                >
                    <View style={[S.arrowDown, isAR && S.arrowDownAR]} />
                </Animated.View>
                )}

                {/* ── Justine character standing on the right, directly above the card ── */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        S.tabCharWrap,
                        { bottom: 228 + bottomInset },
                        {
                            transform: [
                                { translateY: charSlideY },
                                { scale: charBreath },
                            ],
                        },
                    ]}
                >
                    <Image
                        source={step?.image || CHAR_IMAGES.explorer}
                        style={S.tabCharImage}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* ── Unified Guideline Card DIRECTLY ABOVE THE TABS ── */}
                <Animated.View
                    style={[
                        S.tabGuidelineCard,
                        { bottom: 110 + bottomInset },
                        { transform: [{ translateY: barSlideY }] },
                    ]}
                >
                    {/* Header Row: Badge + Step Indicator + Close Button */}
                    <View style={S.cardHeaderRow}>
                        <View style={[S.tabBadge, isAR && S.tabBadgeAR]}>
                            <Text style={S.tabBadgeText}>{step.label}</Text>
                        </View>
                        <Text style={S.stepCounterText}>
                            STEP {currentStep + 1} OF {TOUR_STEPS.length}
                        </Text>
                        <TouchableOpacity
                            onPress={handleDismiss}
                            style={S.cardCloseBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={14} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Speech Text */}
                    <Text style={S.guidelineSpeech}>{step.speech}</Text>

                    {/* Footer Row: Progress Dots on left, Next Button on right */}
                    <View style={S.cardFooterRow}>
                        <Dots />
                        <TouchableOpacity
                            style={S.crimsonBtn}
                            onPress={handleNext}
                            activeOpacity={0.85}
                        >
                            <Text style={S.crimsonBtnText}>{step.button}</Text>
                            <ChevronRight size={15} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </>
        );
    };


    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Modal transparent visible={isVisible} animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={handleDismiss}>
            <ModalSafeArea>
                <Animated.View ref={overlayRef} collapsable={false} style={[S.overlay, { opacity: overlayOpacity }]}>
                    {mode === "hint"  && renderVNBar()}
                    {mode === "tour"  && step.layout === "vn_bar"     && renderVNBar()}
                    {mode === "tour"  && step.layout === "spotlight"   && renderSpotlight()}
                    {mode === "tour"  && step.layout === "tab_pointer" && renderTabPointer()}
                </Animated.View>
            </ModalSafeArea>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES  — Brand primary + White theme
// ─────────────────────────────────────────────────────────────────────────────
const createStyles = (colors, spacing, radius, typography) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
    },

    // ── Close button ─────────────────────────────────────────────────────────
    closeBtn: {
        position: "absolute",
        top: 10,
        right: 12,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        borderWidth: 1.5,
        borderColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
    },

    // ── Progress dots ─────────────────────────────────────────────────────────
    dotsRow: { flexDirection: "row", gap: 5, alignItems: "center" },
    dot:     { width: 26, height: 4, borderRadius: 4, backgroundColor: "#E5E5E5" },
    dotActive: { backgroundColor: colors.primary },
    dotDone:   { backgroundColor: toRgba(colors.primary, 0.35) },

    // ── Shared buttons ────────────────────────────────────────────────────────
    crimsonBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
    },
    crimsonBtnText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.3,
    },
    outlineBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: colors.primary,
        backgroundColor: "#FFFFFF",
    },
    outlineBtnText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: "700",
    },
    hintBtnRow: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT 1 — VN Bar  (Crimson & White)
    // ─────────────────────────────────────────────────────────────────────────
    vnCharWrap: {
        position: "absolute",
        bottom: 148,
        left: 0,
        width: SCREEN_WIDTH * 0.52,
        height: SCREEN_HEIGHT * 0.46,
        alignItems: "center",
        justifyContent: "flex-end",
        zIndex: 10,
    },
    vnCharImage: { width: "100%", height: "100%" },

    vnBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 3,
        borderTopColor: colors.primary,
        paddingTop: 18,
        paddingBottom: 30,
        paddingHorizontal: 18,
        gap: 10,
        zIndex: 15,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 16,
    },
    vnNameTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: colors.primary,
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 6,
    },
    vnNameText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", letterSpacing: 1.2 },
    vnDivider:  { width: 1, height: 12, backgroundColor: "rgba(255,255,255,0.45)" },
    vnRoleText: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "500" },

    vnSpeech: {
        color: "#222222",
        fontSize: 14,
        lineHeight: 22,
        fontWeight: "400",
        paddingRight: 34,
    },
    vnBottomRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 4,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT 2 — Spotlight
    // ─────────────────────────────────────────────────────────────────────────
    spotlightFrame: {
        position: "absolute", // top/left/size come from the measured card
        borderRadius: 6,
        borderWidth: 2.5,
        borderColor: colors.primary,
        borderStyle: "dashed",
        backgroundColor: toRgba(colors.primary, 0.06),
        zIndex: 5,
    },

    spotlightArrowWrap: {
        position: "absolute",
        left: 6,
        zIndex: 10,
    },
    arrowLeft: {
        width: 0,
        height: 0,
        borderTopWidth: 14,
        borderBottomWidth: 14,
        borderRightWidth: 22,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderRightColor: colors.primary,
    },

    spotlightBubble: {
        position: "absolute",
        left: 20,
        right: 120,
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.primary,
        padding: 12,
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 8,
    },
    spotlightBubbleText: {
        color: "#222222",
        fontSize: 13,
        lineHeight: 20,
        fontWeight: "400",
    },
    bubbleTailDown: {
        position: "absolute",
        bottom: -11,
        left: 22,
        width: 0,
        height: 0,
        borderLeftWidth: 9,
        borderRightWidth: 9,
        borderTopWidth: 11,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: colors.primary,
    },

    spotlightCharWrap: {
        position: "absolute",
        bottom: 90,
        right: -8,
        width: SCREEN_WIDTH * 0.42,
        height: SCREEN_HEIGHT * 0.40,
        zIndex: 8,
    },
    spotlightCharImage: { width: "100%", height: "100%" },

    // ── Shared bottom bar ─────────────────────────────────────────────────────
    floatingBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        borderTopWidth: 3,
        borderTopColor: colors.primary,
        paddingTop: 14,
        paddingBottom: 28,
        paddingHorizontal: 18,
        zIndex: 15,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 14,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT 3 — Tab pointer (Steps 3 & 4: Maps & AR Scanner)
    // ─────────────────────────────────────────────────────────────────────────
    tabGuidelineCard: {
        position: "absolute",
        bottom: 110,
        left: 16,
        right: 16,
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.primary,
        padding: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 12,
        zIndex: 15,
    },
    cardHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    tabBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tabBadgeAR: {
        backgroundColor: "#EBBC26",
    },
    tabBadgeText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "900",
        letterSpacing: 0.8,
    },
    stepCounterText: {
        color: "#777777",
        fontSize: 11,
        fontWeight: "700",
    },
    cardCloseBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    guidelineSpeech: {
        color: "#222222",
        fontSize: 13.5,
        lineHeight: 20,
        fontWeight: "400",
        marginBottom: 12,
    },
    cardFooterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    tabArrowWrap: {
        position: "absolute",
        zIndex: 14,
        alignItems: "center",
    },
    arrowDown: {
        width: 0,
        height: 0,
        borderLeftWidth: 12,
        borderRightWidth: 12,
        borderTopWidth: 16,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: colors.primary,
    },
    arrowDownAR: {
        borderTopColor: "#EBBC26",
    },

    tabRing: {
        position: "absolute",
        borderWidth: 3,
        zIndex: 8,
    },

    tabCharWrap: {
        position: "absolute",
        bottom: 228,
        right: 14,
        width: 130,
        height: 150,
        zIndex: 10,
        alignItems: "flex-end",
        justifyContent: "flex-end",
    },
    tabCharImage: {
        width: 130,
        height: 150,
    },
});
