import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "../../theme/tokens";
import { styles } from "./arStyles";

/**
 * Big persistent navigation compass shown while routing to a target.
 *
 * The parent feeds a relative bearing, so the arrow points straight up when the
 * target is dead ahead and rotates with the user's heading. It is mounted for as
 * long as a target is active, which means GPS drift, a missing heading sample,
 * or the arrival latch can no longer make it blink off.
 *
 * Turn prompts (left / right / around) are a separate component.
 */
export default function ARCenterCompass({
    arrowAngle = null,
    distanceToTarget = null,
}) {
    const rotation = Number.isFinite(arrowAngle) ? Math.round(arrowAngle) : 0;

    return (
        <View pointerEvents="none" style={styles.centerCompassWrap}>
            <View style={styles.centerCompassHalo}>
                <View
                    style={[
                        styles.centerCompassRotator,
                        {
                            transform: [{ rotate: `${rotation}deg` }],
                        },
                    ]}
                >
                    {/* White outline behind the crimson chevron keeps the
                        arrow readable over bright pavement and sky. */}
                    <Ionicons
                        name="chevron-up"
                        size={74}
                        color="rgba(255, 255, 255, 0.92)"
                        style={styles.centerCompassArrowShadow}
                    />
                    <Ionicons
                        name="chevron-up"
                        size={62}
                        color={theme.colors.primary}
                        style={styles.centerCompassArrow}
                    />
                </View>
            </View>

            {Number.isFinite(distanceToTarget) && (
                <View style={styles.centerCompassDistance}>
                    <Text style={styles.centerCompassDistanceText}>
                        {`${Math.round(distanceToTarget)} m`}
                    </Text>
                </View>
            )}
        </View>
    );
}
