import React from "react";
import { Animated, Text, View } from "react-native";

import ARCompassBadge from "./ARCompassBadge";
import { styles } from "./arStyles";

/**
 * Directional prompts shown at walking-turn moments, drawn as compass badges.
 *
 * Left and right sit against the screen edges and the around badge is centered,
 * all using the same ring + arrow mark as the ground compass, rotated to the
 * direction the user has to walk. Renders nothing when there is no active turn.
 */

const TURN_CONFIG = {
    left: {
        rotation: -90,
        label: "TURN LEFT",
        container: styles.turnArrowLeft,
    },
    right: {
        rotation: 90,
        label: "TURN RIGHT",
        container: styles.turnArrowRight,
    },
    around: {
        rotation: 180,
        label: "TURN AROUND",
        container: styles.turnArrowAround,
    },
};

export default function ARTurnIndicator({ turnDirection, pulseAnim }) {
    const config = TURN_CONFIG[turnDirection];

    if (!config) {
        return null;
    }

    // Badge gently swells with the same pulse the rest of the HUD uses, and a
    // thin halo breathes with it so the prompt still reads as alive.
    const scale = pulseAnim.interpolate({
        inputRange: [0.2, 1],
        outputRange: [0.94, 1.06],
    });
    const haloOpacity = pulseAnim.interpolate({
        inputRange: [0.2, 1],
        outputRange: [0.2, 0.8],
    });

    return (
        <View pointerEvents="none" style={config.container}>
            <Animated.View style={[styles.turnArrowDisc, { transform: [{ scale }] }]}>
                <Animated.View style={[styles.turnArrowHalo, { opacity: haloOpacity }]} />
                <ARCompassBadge rotation={config.rotation} size={62} />
            </Animated.View>

            <Text style={styles.turnArrowLabel}>{config.label}</Text>
        </View>
    );
}
