import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "../../context/ThemeContext";
import { useExploreStyles } from "./exploreStyles";
import NearbyBuildingRow from "./NearbyBuildingRow";

/** Nearby Buildings list section. */
export default function NearbyBuildingsList({
    nearbyBuildings,
    unlockedBuildings,
    role,
    onNavigate,
    onMap,
}) {
    const colors = useThemeColors();
    const styles = useExploreStyles();

    if (!nearbyBuildings.length) return null;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
                <Ionicons name="map" size={22} color={colors.primary} />
                <Text style={styles.cardTitle}>NEARBY BUILDINGS</Text>
            </View>

            {nearbyBuildings.map((building, index) => {
                const isUnlocked =
                    role === "professional" ||
                    role === "admin" ||
                    unlockedBuildings.some((ub) => ub.id === building.id);

                return (
                    <NearbyBuildingRow
                        key={building.id}
                        building={building}
                        index={index}
                        total={nearbyBuildings.length}
                        isUnlocked={isUnlocked}
                        onNavigate={onNavigate}
                        onMap={onMap}
                    />
                );
            })}
        </View>
    );
}