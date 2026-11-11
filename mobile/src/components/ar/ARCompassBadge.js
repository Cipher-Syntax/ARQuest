import React, { useEffect, useState } from "react";
import { Animated } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { theme } from "../../theme/tokens";

/**
 * The reference compass mark as a small HUD badge: crimson ring with a white
 * rim and a solid crimson navigation arrow inside.
 *
 * The arrow settles into its new direction with a short overshoot, like a
 * needle coming to rest, whenever `rotation` changes.
 */

const ARROW_PATH = "M50 13 L72 76 L50 66 L28 76 Z";
const OVERSHOOT_DEG = 14;

export default function ARCompassBadge({ rotation = 0, size = 62 }) {
    // Animated values are not React refs, so they can be read during render.
    const [spin] = useState(() => new Animated.Value(rotation));

    useEffect(() => {
        spin.setValue(rotation - OVERSHOOT_DEG);
        const settle = Animated.spring(spin, {
            toValue: rotation,
            friction: 6,
            tension: 90,
            useNativeDriver: true,
        });
        settle.start();
        return () => settle.stop();
    }, [rotation, spin]);

    const rotate = spin.interpolate({
        inputRange: [-360, 360],
        outputRange: ["-360deg", "360deg"],
    });

    return (
        <Animated.View
            style={{
                width: size,
                height: size,
                transform: [{ rotate }],
            }}
        >
            <Svg width={size} height={size} viewBox="0 0 100 100">
                {/* White underlay keeps the ring readable over the camera feed. */}
                <Circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.92)"
                    strokeWidth="13"
                />
                <Circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke={theme.colors.primary}
                    strokeWidth="8"
                />

                <Path
                    d={ARROW_PATH}
                    fill="rgba(255, 255, 255, 0.92)"
                    stroke="rgba(255, 255, 255, 0.92)"
                    strokeWidth="7"
                    strokeLinejoin="round"
                />
                <Path
                    d={ARROW_PATH}
                    fill={theme.colors.primary}
                    stroke={theme.colors.primary}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
            </Svg>
        </Animated.View>
    );
}
