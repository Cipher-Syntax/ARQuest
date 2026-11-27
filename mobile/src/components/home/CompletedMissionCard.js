import React from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import { CheckCircle2, ChevronRight } from "lucide-react-native";
import { router } from "expo-router";

import { useHomeStyles } from "./homeStyles";

/** A daily objective the student already cleared today. */
export default function CompletedMissionCard({ quest }) {
    const styles = useHomeStyles();
    const cardWidth = Dimensions.get("window").width - 40;

    return (
        <View style={[styles.heroCard, { width: cardWidth, marginBottom: 0, borderColor: "#86EFAC" }]}>
            <View style={styles.heroTopRow}>
                <View style={[styles.heroLabelChip, { backgroundColor: "rgba(22, 163, 74, 0.12)" }]}>
                    <CheckCircle2
                        color="#16a34a"
                        size={14}
                    />
                    <Text style={[styles.heroChipText, { color: "#16a34a" }]}>
                        COMPLETED TODAY
                    </Text>
                </View>
                <View style={[styles.heroExpBadge, { backgroundColor: "rgba(22, 163, 74, 0.12)" }]}>
                    <Text style={[styles.heroExpText, { color: "#16a34a" }]}>
                        +{quest.reward_points} EXP Earned
                    </Text>
                </View>
            </View>

            <Text
                style={styles.heroQuestTitle}
                numberOfLines={2}
            >
                {quest.title}
            </Text>

            <View style={styles.heroBottomRow}>
                <View style={styles.heroTargetInfo}>
                    <Text style={styles.heroTargetLabel}>
                        TARGET LOCATION
                    </Text>
                    <Text
                        style={styles.heroTargetValue}
                        numberOfLines={1}
                    >
                        {quest.target_building_name || "Campus Building"}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.heroDeployBtn, { backgroundColor: "#16a34a" }]}
                    onPress={() => router.push("/(tabs)/buildings")}
                >
                    <Text style={styles.heroDeployText}>
                        View Map
                    </Text>
                    <ChevronRight
                        color="#FFFFFF"
                        size={18}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}
