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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ── Tab layout (5 equal slots: Home=0, Maps=1, AR=2, Explore=3, Profile=4) ──
const TAB_SLOT_W = SCREEN_WIDTH / 5;
const MAPS_TAB_CX  = TAB_SLOT_W * 1 + TAB_SLOT_W / 2;   // SCREEN_WIDTH * 0.3
const AR_TAB_CX    = TAB_SLOT_W * 2 + TAB_SLOT_W / 2;   // SCREEN_WIDTH * 0.5

// ── Tab bar geometry ─────────────────────────────────────────────────────────
// CustomTabBar: SafeAreaView(edges bottom) → inner row height 70px, padTop/Pad8
// Tab icon sits roughly at center of the 54px inner content (70-8-8)
const TAB_BAR_TOTAL_H  = 78;
const TAB_ICON_CENTER_FROM_BOTTOM = 58;   // aligned to center of tab icon across mobile viewports

// ── Home-screen mission card geometry ───────────────────────────────────────
// Header LinearGradient: paddingTop(80) + headerTopRow(~88) + expContainer(~40) + paddingBottom(50) ≈ 258px
// contentArea marginTop: -30 → card top ≈ 258 - 30 = 228px from screen top
const MISSION_CARD_TOP    = 228;
const MISSION_CARD_HEIGHT = 170;

// ─────────────────────────────────────────────────────────────────────────────
const TOUR_STEPS = [
    {
        id: "welcome",
        speech: "Yo, Adventurer! 🎉 Welcome to WMSU! I'm Justine — your campus guide! You're holding ARQuest, our high-tech campus radar. Ready to turn this campus into your playground? Let me show you around real quick!",
        button: "LET'S GO! ⚡",
        layout: "vn_bar",
    },
    {
        id: "missions",
        speech: "Right here 👉 — every day you get 3 Daily Missions! Visit buildings, rack up EXP, and rise from Freshman to Campus Legend!",
        button: "NICE, WHAT ELSE? 📍",
        layout: "spotlight",
    },
    {
        id: "maps",
        speech: "Tap Maps to pull up campus walking paths and get routed straight to any building's entrance.",
        button: "GOT IT! →",
        layout: "tab_pointer",
        tabCX: MAPS_TAB_CX,
        label: "MAPS",
        isAR: false,
    },
    {
        id: "ar",
        speech: "Step inside a building's zone then hit the center AR button! Scan, claim quest rewards, answer trivia, and inspect 3D models!",
        button: "START EXPLORING! 🏆",
        layout: "tab_pointer",
        tabCX: AR_TAB_CX,
        label: "AR SCAN",
        isAR: true,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function JustineGuideModal() {
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [mode, setMode] = useState("tour");
    const [currentStep, setCurrentStep] = useState(0);
    const [hintData, setHintData] = useState(null);

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
        const a = DeviceEventEmitter.addListener("tutorial_finished", () => setTimeout(() => startTour(), 350));
        const b = DeviceEventEmitter.addListener("show_justine_guide", () => startTour());
        const c = DeviceEventEmitter.addListener("show_justine_hint",  (d) => showHint(d));
        return () => { a.remove(); b.remove(); c.remove(); };
    }, [user?.id, user?.role]);

    const getStorageKey  = () => user?.id ? `@justine_guide_completed_${user.id}` : "@justine_guide_completed";
    const getTutorialKey = () => user?.id ? `@tutorial_completed_${user.id}` : "@tutorial_completed";

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

    const startTour = () => { setMode("tour"); setCurrentStep(0); setIsVisible(true); animateIn(); };
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

    if (!isVisible) return null;

    const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];

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
            <X size={15} color="#B21830" />
        </TouchableOpacity>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT 1 — VN Dialog Bar  (Step 1 + Hint)
    // ─────────────────────────────────────────────────────────────────────────
    const renderVNBar = () => (
        <>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleDismiss} />

            {/* Justine — large, standing left of the dialog bar */}
            <Animated.View
                pointerEvents="none"
                style={[S.vnCharWrap, { transform: [{ translateY: charSlideY }, { scale: charBreath }] }]}
            >
                <Image
                    source={require("../../../assets/images/characters/justine_guide.png")}
                    style={S.vnCharImage}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* Classic RPG dialog bar — Crimson & White */}
            <Animated.View style={[S.vnBar, { transform: [{ translateY: barSlideY }] }]}>
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
                                <RotateCcw size={13} color="#B21830" />
                                <Text style={S.outlineBtnText}>Replay Tour</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={S.crimsonBtn} onPress={handleDismiss} activeOpacity={0.85}>
                                <Text style={S.crimsonBtnText}>GOT IT! 👍</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Animated.View>
        </>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT 2 — Spotlight on mission card  (Step 2)
    // ─────────────────────────────────────────────────────────────────────────
    const renderSpotlight = () => (
        <>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleDismiss} />

            {/* Dashed crimson frame exactly over the card */}
            <View
                pointerEvents="none"
                style={[
                    S.spotlightFrame,
                    { top: MISSION_CARD_TOP, height: MISSION_CARD_HEIGHT },
                ]}
            />

            {/* Left-pointing arrow at mid-height of card */}
            <Animated.View
                pointerEvents="none"
                style={[
                    S.spotlightArrowWrap,
                    {
                        top: MISSION_CARD_TOP + MISSION_CARD_HEIGHT / 2 - 14,
                        transform: [{ translateY: arrowBounceY }],
                    },
                ]}
            >
                <View style={S.arrowLeft} />
            </Animated.View>

            {/* Speech bubble — floats above the card (white + crimson border) */}
            <Animated.View
                pointerEvents="none"
                style={[
                    S.spotlightBubble,
                    {
                        top: MISSION_CARD_TOP - 110,
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
                    source={require("../../../assets/images/characters/justine_guide.png")}
                    style={S.spotlightCharImage}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* Bottom bar — white & crimson */}
            <Animated.View style={[S.floatingBar, { transform: [{ translateY: barSlideY }] }]}>
                <CloseBtn />
                <Dots />
                <TouchableOpacity style={S.crimsonBtn} onPress={handleNext} activeOpacity={0.85}>
                    <Text style={S.crimsonBtnText}>{step.button}</Text>
                    <ChevronRight size={15} color="#FFFFFF" />
                </TouchableOpacity>
            </Animated.View>
        </>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // LAYOUT 3 — Tab pointer  (Steps 3 & 4: Maps & AR Scanner)
    // ─────────────────────────────────────────────────────────────────────────
    const renderTabPointer = () => {
        const cx = step.tabCX || MAPS_TAB_CX;
        const isAR = step.isAR;

        // Ring: precisely centred on the tab icon
        const ringW = isAR ? 66 : 52;
        const ringR = ringW / 2;
        const ringBottom = TAB_ICON_CENTER_FROM_BOTTOM - ringR; // bottom edge of ring
        const ringLeft   = cx - ringR;                          // left edge of ring

        // Arrow tip lands just above the top of the ring
        const arrowBottom = ringBottom + ringW + 4;

        return (
            <>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleDismiss} />

                {/* ── Pulsing ring centred directly on tab icon ── */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        S.tabRing,
                        {
                            left: ringLeft,
                            bottom: ringBottom,
                            width: ringW,
                            height: ringW,
                            borderRadius: ringR,
                            borderColor: isAR ? "#EBBC26" : "#B21830",
                            backgroundColor: isAR ? "rgba(235,188,38,0.22)" : "rgba(178,24,48,0.22)",
                            transform: [{ scale: ringScale }],
                            opacity: ringOpacity,
                        },
                    ]}
                />

                {/* ── Bouncing down-arrow pointing directly into the tab ── */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        S.tabArrowWrap,
                        {
                            left: cx - 12,
                            bottom: arrowBottom,
                            transform: [{ translateY: arrowBounceY }],
                        },
                    ]}
                >
                    <View style={[S.arrowDown, isAR && S.arrowDownAR]} />
                </Animated.View>

                {/* ── Justine character standing on the right, directly above the card ── */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        S.tabCharWrap,
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
                        style={S.tabCharImage}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* ── Unified Guideline Card DIRECTLY ABOVE THE TABS ── */}
                <Animated.View
                    style={[
                        S.tabGuidelineCard,
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
                            <X size={14} color="#B21830" />
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
        <Modal transparent visible={isVisible} animationType="none" statusBarTranslucent onRequestClose={handleDismiss}>
            <Animated.View style={[S.overlay, { opacity: overlayOpacity }]}>
                {mode === "hint"  && renderVNBar()}
                {mode === "tour"  && step.layout === "vn_bar"     && renderVNBar()}
                {mode === "tour"  && step.layout === "spotlight"   && renderSpotlight()}
                {mode === "tour"  && step.layout === "tab_pointer" && renderTabPointer()}
            </Animated.View>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES  — Crimson (#B21830) + White (#FFFFFF) theme
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
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
        borderColor: "#B21830",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
    },

    // ── Progress dots ─────────────────────────────────────────────────────────
    dotsRow: { flexDirection: "row", gap: 5, alignItems: "center" },
    dot:     { width: 26, height: 4, borderRadius: 4, backgroundColor: "#E5E5E5" },
    dotActive: { backgroundColor: "#B21830" },
    dotDone:   { backgroundColor: "rgba(178,24,48,0.35)" },

    // ── Shared buttons ────────────────────────────────────────────────────────
    crimsonBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#B21830",
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
        borderColor: "#B21830",
        backgroundColor: "#FFFFFF",
    },
    outlineBtnText: {
        color: "#B21830",
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
        borderTopColor: "#B21830",
        paddingTop: 18,
        paddingBottom: 30,
        paddingHorizontal: 18,
        gap: 10,
        zIndex: 15,
        shadowColor: "#B21830",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
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
        position: "absolute",
        left: 20,
        right: 20,
        borderRadius: 6,
        borderWidth: 2.5,
        borderColor: "#B21830",
        borderStyle: "dashed",
        backgroundColor: "rgba(178,24,48,0.06)",
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
        borderRightColor: "#B21830",
    },

    spotlightBubble: {
        position: "absolute",
        left: 20,
        right: 120,
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#B21830",
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
        borderTopColor: "#B21830",
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
        borderTopColor: "#B21830",
        paddingTop: 14,
        paddingBottom: 28,
        paddingHorizontal: 18,
        zIndex: 15,
        shadowColor: "#B21830",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 14,
    },
    floatingBarRaised: {
        bottom: TAB_BAR_TOTAL_H + 8,
        paddingBottom: 14,
        borderRadius: 6,
        left: 14,
        right: 14,
        borderWidth: 1.5,
        borderColor: "#B21830",
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
        borderColor: "#B21830",
        padding: 16,
        shadowColor: "#B21830",
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
        backgroundColor: "#B21830",
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
        borderTopColor: "#B21830",
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
