import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Image,
    Dimensions,
} from "react-native";
import { ArrowLeft, ArrowRight, ArrowUp, CheckCircle } from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function NavigationTurnHUD({
    visible = false,
    turnType = "STRAIGHT", // "LEFT" | "RIGHT" | "STRAIGHT" | "ARRIVED"
    distance = 10,
    instruction = "Turn left ahead",
}) {
    const slideAnim = useRef(new Animated.Value(-80)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 7,
                tension: 40,
                useNativeDriver: true,
            }).start();

            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.08,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1.0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            );
            loop.start();
            return () => loop.stop();
        } else {
            Animated.timing(slideAnim, {
                toValue: -80,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, turnType]);

    if (!visible) return null;

    const renderTurnIcon = () => {
        if (turnType === "LEFT") {
            return <ArrowLeft size={22} color="#FFFFFF" strokeWidth={3} />;
        }
        if (turnType === "RIGHT") {
            return <ArrowRight size={22} color="#FFFFFF" strokeWidth={3} />;
        }
        if (turnType === "ARRIVED") {
            return <CheckCircle size={22} color="#FFFFFF" strokeWidth={3} />;
        }
        return <ArrowUp size={22} color="#FFFFFF" strokeWidth={3} />;
    };

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] },
            ]}
            pointerEvents="none"
        >
            <View style={styles.hudCard}>
                {/* Justine avatar */}
                <Image
                    source={require("../../../assets/images/characters/justine_avatar.png")}
                    style={styles.avatar}
                />

                {/* Turn Icon Pill with pulse */}
                <Animated.View
                    style={[
                        styles.iconPill,
                        turnType === "ARRIVED" && styles.iconPillSuccess,
                        { transform: [{ scale: pulseAnim }] },
                    ]}
                >
                    {renderTurnIcon()}
                </Animated.View>

                {/* Instruction text */}
                <View style={styles.textWrap}>
                    <Text style={styles.distanceLabel}>
                        {turnType === "ARRIVED" ? "DESTINATION REACHED" : `IN ${distance}M`}
                    </Text>
                    <Text style={styles.instructionText} numberOfLines={1}>
                        {instruction}
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 130, // Directly below the FROM/TO terminal
        left: 16,
        right: 16,
        alignItems: "center",
        zIndex: 50,
    },
    hudCard: {
        width: "100%",
        maxWidth: 380,
        backgroundColor: "#FFFFFF",
        borderRadius: 6, // Strict 6px standard
        borderWidth: 2,
        borderColor: "#B21830", // WMSU Crimson
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
        elevation: 8,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: "#EBBC26",
    },
    iconPill: {
        width: 38,
        height: 38,
        borderRadius: 6,
        backgroundColor: "#B21830",
        alignItems: "center",
        justifyContent: "center",
    },
    iconPillSuccess: {
        backgroundColor: "#16A34A",
    },
    textWrap: {
        flex: 1,
    },
    distanceLabel: {
        color: "#B21830",
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 0.8,
    },
    instructionText: {
        color: "#111827",
        fontSize: 13,
        fontWeight: "700",
    },
});
