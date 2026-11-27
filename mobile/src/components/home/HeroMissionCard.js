import React from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import { ChevronRight, Crosshair } from "lucide-react-native";
import { router } from "expo-router";

import { useThemeColors } from "../../context/ThemeContext";
import { useHomeStyles } from "./homeStyles";

/** An available daily objective, with a chevron hinting at the next card. */
export default function HeroMissionCard({ quest, showNextArrow }) {
    const colors = useThemeColors();
    const styles = useHomeStyles();
    const cardWidth = Dimensions.get("window").width - 40;

    return (
        <View style={[styles.heroCard, { width: cardWidth, marginBottom: 0 }]}>
            <View style={styles.heroTopRow}>
                <View style={styles.heroLabelChip}>
                    <Crosshair
                        color={colors.primary}
                        size={14}
                    />
                    <Text style={styles.heroChipText}>
                        DAILY OBJECTIVE
                    </Text>
                </View>
                <View style={styles.heroExpBadge}>
                    <Text style={styles.heroExpText}>
                        Reward: {quest.reward_points} EXP
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
                        CURRENT TARGET
                    </Text>
                    <Text
                        style={styles.heroTargetValue}
                        numberOfLines={1}
                    >
                        {quest.target_building_name}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.heroDeployBtn}
                    onPress={() =>
                        router.push({
                            pathname: "/(tabs)/ar",
                            params: {
                                targetBuildingId: quest.target_building,
                                questId: quest.id,
                            }
                        })
                    }
                >
                    <Text style={styles.heroDeployText}>
                        Start Mission
                    </Text>
                    <ChevronRight
                        color="#FFFFFF"
                        size={18}
                    />
                </TouchableOpacity>
            </View>
            {showNextArrow && (
                <View style={{
                    position: "absolute",
                    right: -10,
                    top: "50%",
                    marginTop: -16,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    width: 32,
                    height: 32,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 4,
                    borderWidth: 1,
                    borderColor: colors.border
                }}>
                    <ChevronRight color={colors.primary} size={20} />
                </View>
            )}
        </View>
    );
}
