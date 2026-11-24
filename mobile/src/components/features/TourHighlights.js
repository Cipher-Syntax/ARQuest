import React, { useEffect, useState } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { useThemeColors } from "../../context/ThemeContext";
import { toRgba } from "../../utils/color";

/**
 * In-place highlights for the onboarding tours. They are rendered *inside* the
 * element they highlight (tab icon / Home mission card), so they are centered
 * and sized by layout — no screen coordinates are measured or guessed.
 */

export const GOLD = "#EBBC26";

/**
 * Circular ring centered on its parent. Render it as a child of a View whose
 * size is `parentW` x `parentH` (the parent must not clip overflow).
 */
export function TourRing({ size, parentW, parentH, color, pulse }) {
    const [scale] = useState(() => new Animated.Value(1));
    const [opacity] = useState(() => new Animated.Value(1));

    useEffect(() => {
        if (!pulse) {
            scale.setValue(1);
            opacity.setValue(1);
            return undefined;
        }
        const loop = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scale, { toValue: 1.3, duration: 750, useNativeDriver: true }),
                    Animated.timing(scale, { toValue: 1, duration: 750, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(opacity, { toValue: 0.25, duration: 750, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
                ]),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [pulse, scale, opacity]);

    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: "absolute",
                top: (parentH - size) / 2,
                left: (parentW - size) / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 3,
                borderColor: color,
                backgroundColor: toRgba(color, 0.22),
                transform: [{ scale }],
                opacity,
            }}
        />
    );
}

/**
 * Dashed frame + left-pointing arrow + speech bubble drawn over the Home
 * Daily Objective card. Render as a child of the card's wrapper View.
 */
export function TourSpotlight({ text }) {
    const colors = useThemeColors();
    const [bounce] = useState(() => new Animated.Value(0));

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(bounce, { toValue: -10, duration: 440, useNativeDriver: true }),
                Animated.timing(bounce, { toValue: 0, duration: 440, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [bounce]);

    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 30, elevation: 30 }]}>
            <View
                style={{
                    ...StyleSheet.absoluteFill,
                    borderRadius: 8,
                    borderWidth: 2.5,
                    borderStyle: "dashed",
                    borderColor: colors.primary,
                    backgroundColor: toRgba(colors.primary, 0.06),
                }}
            />

            <Animated.View
                style={{
                    position: "absolute",
                    left: -14,
                    top: "50%",
                    marginTop: -14,
                    transform: [{ translateX: bounce }],
                }}
            >
                <View
                    style={{
                        width: 0,
                        height: 0,
                        borderTopWidth: 14,
                        borderBottomWidth: 14,
                        borderRightWidth: 22,
                        borderTopColor: "transparent",
                        borderBottomColor: "transparent",
                        borderRightColor: colors.primary,
                    }}
                />
            </Animated.View>

            {!!text && (
                <View
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 100,
                        bottom: "100%",
                        marginBottom: 14,
                        backgroundColor: "#FFFFFF",
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: colors.primary,
                        padding: 12,
                        elevation: 30,
                    }}
                >
                    <Text style={{ color: "#222222", fontSize: 13, lineHeight: 20 }}>{text}</Text>
                    <View
                        style={{
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
                        }}
                    />
                </View>
            )}
        </View>
    );
}
