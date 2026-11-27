import React from "react";
import { Dimensions, Text, View } from "react-native";

import { useHomeStyles } from "./homeStyles";

/**
 * Placeholder card shown when a mission tab has nothing to list —
 * "all cleared" and "no missions logged yet" share this shape.
 */
export default function MissionEmptyCard({ icon, chipStyle, label, labelStyle, title }) {
    const styles = useHomeStyles();
    const cardWidth = Dimensions.get("window").width - 40;

    return (
        <View style={[styles.heroCard, { width: cardWidth, marginBottom: 0 }]}>
            <View style={styles.heroTopRow}>
                <View style={[styles.heroLabelChip, chipStyle]}>
                    {icon}
                    <Text style={[styles.heroChipText, labelStyle]}>
                        {label}
                    </Text>
                </View>
            </View>
            <Text style={styles.heroQuestTitle}>
                {title}
            </Text>
        </View>
    );
}
