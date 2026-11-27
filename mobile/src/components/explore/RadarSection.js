import React from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useThemeColors } from "../../context/ThemeContext";
import { useExploreStyles } from "./exploreStyles";

/**
 * Premium Radar Section with animated rings, spinning dashed ring,
 * and the central DISCOVER/STOP button.
 */
export default function RadarSection({
    isTracking,
    pulseAnim1,
    pulseAnim2,
    spinInterpolate,
    onPress,
}) {
    const colors = useThemeColors();
    const styles = useExploreStyles();

    return (
        <View style={styles.radarContainer}>
            {/* Sonar Rings */}
            <Animated.View
                style={[
                    styles.radarRing,
                    isTracking && styles.radarRingActive,
                    {
                        transform: [{ scale: pulseAnim1 }],
                        opacity: pulseAnim1.interpolate({
                            inputRange: [1, 1.5],
                            outputRange: [isTracking ? 0.8 : 0, 0],
                        }),
                    },
                ]}
            />
            <Animated.View
                style={[
                    styles.radarRing,
                    isTracking && styles.radarRingActive,
                    {
                        transform: [{ scale: pulseAnim2 }],
                        opacity: pulseAnim2.interpolate({
                            inputRange: [1, 1.5],
                            outputRange: [isTracking ? 0.6 : 0, 0],
                        }),
                    },
                ]}
            />

            {/* Rotating Dashed Ring */}
            {isTracking && (
                <Animated.View
                    style={[
                        styles.radarDashedRing,
                        { transform: [{ rotate: spinInterpolate }] },
                    ]}
                />
            )}

            <TouchableOpacity
                style={styles.radarButtonWrapper}
                onPress={onPress}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={
                        isTracking
                            ? [colors.primaryDark, colors.primary]
                            : [colors.primary, colors.primaryDark]
                    }
                    style={styles.radarButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons
                        name={isTracking ? "stop" : "business"}
                        size={48}
                        color={"white"}
                    />
                    <Text style={styles.radarButtonText}>
                        {isTracking ? "STOP" : "DISCOVER NOW"}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}