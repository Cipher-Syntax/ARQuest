import { View, Text, Animated } from "react-native";

import { styles } from "../../app/(tabs)/arStyles";

/**
 * Slide-down reward toast for a newly earned badge or a level-up.
 * `variant` selects the matching style block.
 */
export default function ARRewardToast({ variant, anim, emoji, label, name }) {
    const isBadge = variant === "badge";

    return (
        <Animated.View
            style={[
                isBadge ? styles.badgeToast : styles.rankUpToast,
                {
                    opacity: anim,
                    transform: [
                        {
                            translateY: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-80, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <Text style={isBadge ? styles.badgeToastEmoji : styles.rankUpToastEmoji}>
                {emoji}
            </Text>
            <View style={{ flex: 1 }}>
                <Text style={isBadge ? styles.badgeToastLabel : styles.rankUpToastLabel}>
                    {label}
                </Text>
                <Text style={isBadge ? styles.badgeToastName : styles.rankUpToastName}>
                    {name}
                </Text>
            </View>
        </Animated.View>
    );
}
