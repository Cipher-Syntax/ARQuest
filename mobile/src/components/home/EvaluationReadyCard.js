import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Activity, ChevronRight } from "lucide-react-native";
import { router } from "expo-router";

import { useThemeColors } from "../../context/ThemeContext";
import { useHomeStyles } from "./homeStyles";

/** Hero card shown to professionals, admins, and visitors instead of missions. */
export default function EvaluationReadyCard() {
    const colors = useThemeColors();
    const styles = useHomeStyles();

    return (
        <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
                <View style={styles.heroLabelChip}>
                    <Activity
                        color={colors.primary}
                        size={14}
                    />
                    <Text style={styles.heroChipText}>
                        EVALUATION READY
                    </Text>
                </View>
                <View
                    style={[
                        styles.heroExpBadge,
                        {
                            backgroundColor:
                                "rgba(34, 197, 94, 0.12)",
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.heroExpText,
                            { color: "#16a34a" },
                        ]}
                    >
                        Full Access
                    </Text>
                </View>
            </View>

            <Text
                style={styles.heroQuestTitle}
                numberOfLines={2}
            >
                Campus Facility Evaluation & 360° Tours
            </Text>

            <View style={styles.heroBottomRow}>
                <View style={styles.heroTargetInfo}>
                    <Text style={styles.heroTargetLabel}>
                        ACCESS LEVEL
                    </Text>
                    <Text
                        style={styles.heroTargetValue}
                        numberOfLines={1}
                    >
                        All Facilities Unlocked
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.heroDeployBtn}
                    onPress={() =>
                        router.push("/(tabs)/buildings")
                    }
                >
                    <Text style={styles.heroDeployText}>
                        Start Tour
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
