import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { fonts } from "../../constants/typography";
import { useThemeColors } from "../../context/ThemeContext";
import { useHomeStyles } from "./homeStyles";

/** Crimson identity banner: role, name, rank pill, streak badge, EXP bar. */
export default function HomeHeader({ user, stats, showStreakModal }) {
    const colors = useThemeColors();
    const styles = useHomeStyles();

    return (
        <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.crimsonHeader}
        >
            <View style={styles.headerTopRow}>
                <View style={styles.userInfo}>
                    <Text style={styles.greeting}>
                        {user?.role === "student"
                            ? "CAMPUS EXPLORER"
                            : "ACCREDITATION PORTAL"}
                    </Text>
                    <Text style={styles.username}>
                        {user?.username || "Guest"}
                    </Text>
                    {user?.role === "student" && user?.rank_info ? (
                        <Text style={styles.userLevel}>
                            {user.rank_info.icon || "🎒"} Lv.
                            {user.rank_info.level}{" "}
                            {user.rank_info.title}
                        </Text>
                    ) : (
                        <View
                            style={{
                                backgroundColor:
                                    "rgba(255, 255, 255, 0.2)",
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 10,
                                alignSelf: "flex-start",
                                marginTop: 4,
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily:
                                        fonts.heading.semiBold,
                                    fontSize: 10,
                                    color: "#FFFFFF",
                                    letterSpacing: 0.5,
                                }}
                            >
                                {user?.role?.toUpperCase() ||
                                    "PROFESSIONAL"}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.headerRight}>
                    {user?.role === "student" &&
                        user?.streak_count > 0 && (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() =>
                                    showStreakModal?.({
                                        streakCount: user.streak_count,
                                        isNewCheckin: false,
                                    })
                                }
                                style={styles.streakBadge}
                            >
                                <Text style={styles.streakFlame}>
                                    🔥
                                </Text>
                                <Text style={styles.streakText}>
                                    {user.streak_count}
                                </Text>
                            </TouchableOpacity>
                        )}
                </View>
            </View>

            {user?.role === "student" && (
                <View style={styles.expContainer}>
                    <View style={styles.expTextRow}>
                        <Text style={styles.expLabel}>EXPERIENCE POINTS</Text>
                        <Text style={styles.expValue}>
                            {stats?.points || 0} PTS
                        </Text>
                    </View>
                    <View style={styles.expBarTrack}>
                        <View
                            style={[
                                styles.expBarFill,
                                { width: "65%" },
                            ]}
                        />
                    </View>
                </View>
            )}
        </LinearGradient>
    );
}
