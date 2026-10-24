import React from "react";
import { Animated, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { styles } from "./arStyles";

/**
 * Pulsing directional prompts shown at walking-turn moments.
 * Renders nothing when there is no active turn.
 */
export default function ARTurnIndicator({ turnDirection, pulseAnim }) {
    if (
        turnDirection !== "around" &&
        turnDirection !== "left" &&
        turnDirection !== "right"
    ) {
        return null;
    }

    const pulseBorderColor = pulseAnim.interpolate({
        inputRange: [0.2, 1],
        outputRange: ["rgba(255,255,255,0.2)", "rgba(255,255,255,0.85)"],
    });

    if (turnDirection === "around") {
        return (
            <Animated.View
                style={[styles.turnIndicatorAround, { borderColor: pulseBorderColor }]}
                pointerEvents="none"
            >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.turnIndicatorText}>TURN AROUND</Text>
            </Animated.View>
        );
    }

    if (turnDirection === "left") {
        return (
            <Animated.View
                style={[styles.turnIndicatorLeft, { borderColor: pulseBorderColor }]}
                pointerEvents="none"
            >
                <Animated.View style={{ opacity: pulseAnim }}>
                    <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                </Animated.View>
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                <Text style={styles.turnIndicatorText}>TURN LEFT</Text>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            style={[styles.turnIndicatorRight, { borderColor: pulseBorderColor }]}
            pointerEvents="none"
        >
            <Text style={styles.turnIndicatorText}>TURN RIGHT</Text>
            <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
            <Animated.View style={{ opacity: pulseAnim }}>
                <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
            </Animated.View>
        </Animated.View>
    );
}
