import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

import { useHomeStyles } from "./homeStyles";

/** Floating 2D companion button; the badge counts pending daily missions. */
export default function AskJustineWidget({ questCount, onPress }) {
    const styles = useHomeStyles();

    return (
        <TouchableOpacity
            style={styles.floatingJustineCircleBtn}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <Image
                source={require("../../../assets/images/characters/justine_avatar.png")}
                style={styles.floatingJustineCircleAvatar}
            />
            <View style={styles.floatingAskBadge}>
                <Text style={styles.floatingAskText}>ASK</Text>
            </View>
            {questCount > 0 && (
                <View style={styles.floatingQuestBadge}>
                    <Text style={styles.floatingQuestBadgeText}>
                        {questCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}
