import React from "react";
import { Text, View } from "react-native";
import { Building, MapPin, Trophy } from "lucide-react-native";

import { useThemeColors } from "../../context/ThemeContext";
import { useHomeStyles } from "./homeStyles";

/**
 * Two-up stat row. Students see their global rank and how far the nearest hub
 * is; every other role sees the campus facility count instead of a rank.
 */
export default function QuickStatsRow({ isStudent, stats, buildingsCount, distanceToNearest }) {
    const colors = useThemeColors();
    const styles = useHomeStyles();

    const nearestDistance =
        distanceToNearest !== null
            ? `${(distanceToNearest / 1000).toFixed(2)}km`
            : "--";

    return isStudent ? (
        <View style={styles.splitRow}>
            <View style={styles.splitCard}>
                <View style={styles.splitIconWrap}>
                    <Trophy
                        color={colors.primary}
                        size={24}
                    />
                </View>
                <Text style={styles.splitValue}>
                    #{stats?.rank || "--"}
                </Text>
                <Text style={styles.splitLabel}>
                    Global Rank
                </Text>
            </View>

            <View style={styles.splitCard}>
                <View style={styles.splitIconWrap}>
                    <MapPin
                        color={colors.primary}
                        size={24}
                    />
                </View>
                <Text style={styles.splitValue}>
                    {nearestDistance}
                </Text>
                <Text style={styles.splitLabel}>
                    NEAREST HUB
                </Text>
            </View>
        </View>
    ) : (
        <View style={styles.splitRow}>
            <View style={styles.splitCard}>
                <View style={styles.splitIconWrap}>
                    <Building
                        color={colors.primary}
                        size={24}
                    />
                </View>
                <Text style={styles.splitValue}>
                    {buildingsCount > 0
                        ? `${buildingsCount}`
                        : "--"}
                </Text>
                <Text style={styles.splitLabel}>
                    CAMPUS FACILITIES
                </Text>
            </View>

            <View style={styles.splitCard}>
                <View style={styles.splitIconWrap}>
                    <MapPin
                        color={colors.primary}
                        size={24}
                    />
                </View>
                <Text style={styles.splitValue}>
                    {nearestDistance}
                </Text>
                <Text style={styles.splitLabel}>
                    NEAREST FACILITY
                </Text>
            </View>
        </View>
    );
}
