import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
    BarChart2,
    CheckCircle2,
    Crosshair,
    Map as MapIcon,
    ScanLine,
    Trophy,
} from "lucide-react-native";
import { router } from "expo-router";

import { useThemeColors } from "../../context/ThemeContext";
import { useHomeStyles } from "./homeStyles";

/**
 * Horizontal tools rail. Students also get Missions, Leaderboard (when the
 * admin enables it), and Badges; other roles get Visited Buildings instead.
 */
export default function QuickActions({ isStudent, enableLeaderboard }) {
    const colors = useThemeColors();
    const styles = useHomeStyles();

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>TOOLS & NAVIGATION</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.actionGrid}
            >
                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push("/(tabs)/ar")}
                >
                    <View style={styles.actionIconWrap}>
                        <ScanLine
                            color={colors.primary}
                            size={24}
                        />
                    </View>
                    <Text style={styles.actionText}>AR Lens</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push("/(tabs)/buildings")}
                >
                    <View style={styles.actionIconWrap}>
                        <MapIcon
                            color={colors.primary}
                            size={24}
                        />
                    </View>
                    <Text style={styles.actionText}>
                        Map
                    </Text>
                </TouchableOpacity>

                {isStudent ? (
                    <>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push("/missions")}
                        >
                            <View style={styles.actionIconWrap}>
                                <Crosshair
                                    color={colors.primary}
                                    size={24}
                                />
                            </View>
                            <Text style={styles.actionText}>
                                Missions
                            </Text>
                        </TouchableOpacity>

                        {enableLeaderboard && (
                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() =>
                                    router.push("/leaderboard")
                                }
                            >
                                <View style={styles.actionIconWrap}>
                                    <BarChart2
                                        color={colors.primary}
                                        size={24}
                                    />
                                </View>
                                <Text style={styles.actionText}>
                                    Leader
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push("/badges")}
                        >
                            <View style={styles.actionIconWrap}>
                                <Trophy
                                    color={colors.primary}
                                    size={24}
                                />
                            </View>
                            <Text style={styles.actionText}>
                                Badges
                            </Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push("/passport")}
                    >
                        <View style={styles.actionIconWrap}>
                            <CheckCircle2
                                color={colors.primary}
                                size={24}
                            />
                        </View>
                        <Text style={styles.actionText}>
                            Visited Buildings
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}
