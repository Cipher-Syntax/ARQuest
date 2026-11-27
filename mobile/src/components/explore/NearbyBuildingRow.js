import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useThemeColors } from "../../context/ThemeContext";
import { useExploreStyles } from "./exploreStyles";

/** One row in the Nearby Buildings list. */
export default function NearbyBuildingRow({
    building,
    index,
    total,
    isUnlocked,
    onNavigate,
    onMap,
}) {
    const colors = useThemeColors();
    const styles = useExploreStyles();

    return (
        <View
            style={[
                styles.nearbyRow,
                index < total - 1 && styles.nearbyDivider,
            ]}
        >
            <View
                style={[
                    styles.nearbyIconWrapper,
                    isUnlocked && styles.nearbyIconWrapperActive,
                ]}
            >
                <Ionicons
                    name={isUnlocked ? "checkmark" : "lock-closed"}
                    size={18}
                    color={isUnlocked ? colors.white : colors.primary}
                />
            </View>
            <View style={styles.nearbyInfo}>
                <Text style={styles.nearbyName} numberOfLines={1}>
                    {building.name}
                </Text>
                <View style={styles.nearbyDistBadge}>
                    <Text style={styles.nearbyDistance}>
                        {building.distance} meters
                    </Text>
                </View>
            </View>
            <View style={{ flexDirection: "column", gap: 6 }}>
                <TouchableOpacity
                    style={styles.navigateBtn}
                    onPress={() => onNavigate(building)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="compass" size={16} color="#FFFFFF" />
                    <Text style={styles.navigateText}>AR Nav</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.navigateBtn,
                        { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.primary },
                    ]}
                    onPress={() => onMap(building)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="map-outline" size={16} color={colors.primary} />
                    <Text style={[styles.navigateText, { color: colors.primary }]}>Map</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}