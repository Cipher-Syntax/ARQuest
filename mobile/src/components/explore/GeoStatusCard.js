import React from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "../../context/ThemeContext";
import { useExploreStyles } from "./exploreStyles";

/**
 * Location & Target Building card shown while radar is tracking.
 * Wraps the telemetry grid + target building box.
 */
export default function GeoStatusCard({
    isTracking,
    isValidating,
    location,
    validationResult,
    insideLockedForStudent,
    insideOwned,
    targetBuildingImageUrl,
    onOpenScanner,
}) {
    const colors = useThemeColors();
    const styles = useExploreStyles();

    if (!isTracking) return null;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
                <Ionicons name="location" size={22} color={colors.primary} />
                <Text style={styles.cardTitle}>YOUR LOCATION</Text>
                {isValidating && (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: "auto" }} />
                )}
            </View>

            {location ? (
                <View style={styles.telemetryGrid}>
                    <View style={styles.telemetryPill}>
                        <Text style={styles.telemetryLabel}>Latitude</Text>
                        <Text style={styles.telemetryValue}>
                            {location.latitude.toFixed(5)}
                        </Text>
                    </View>
                    <View style={styles.telemetryPill}>
                        <Text style={styles.telemetryLabel}>Longitude</Text>
                        <Text style={styles.telemetryValue}>
                            {location.longitude.toFixed(5)}
                        </Text>
                    </View>
                    <View style={styles.telemetryPill}>
                        <Text style={styles.telemetryLabel}>Accuracy</Text>
                        <Text style={styles.telemetryValue}>
                            ± {location.accuracy?.toFixed(0)}m
                        </Text>
                    </View>
                </View>
            ) : (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Finding your location...</Text>
                </View>
            )}

            <View style={styles.divider} />

            <View style={styles.cardHeaderRow}>
                <Ionicons name="business" size={22} color={colors.primary} />
                <Text style={styles.cardTitle}>TARGET BUILDING</Text>
            </View>

            {validationResult?.building ? (
                <View
                    style={[
                        styles.targetBox,
                        validationResult.status === "inside"
                            ? validationResult.building.is_active === false
                                ? styles.targetLocked
                                : insideLockedForStudent
                                ? styles.targetSearching
                                : styles.targetUnlocked
                            : styles.targetSearching,
                    ]}
                >
                    {validationResult.status === "inside" && insideOwned && (
                        <View style={styles.targetBuildingImageWrap}>
                            {targetBuildingImageUrl ? (
                                <Image
                                    source={{ uri: targetBuildingImageUrl }}
                                    style={styles.targetBuildingImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Ionicons name="business" size={52} color={colors.primary} />
                            )}
                        </View>
                    )}
                    <View style={styles.targetInfo}>
                        <Text
                            style={[
                                styles.targetName,
                                insideOwned && styles.textWhite,
                            ]}
                        >
                            {validationResult.building.name}
                        </Text>
                        <Text
                            style={[
                                styles.targetDistance,
                                insideOwned && styles.textWhite,
                                validationResult.building.is_active === false && {
                                    color: colors.error,
                                },
                            ]}
                        >
                            {validationResult.status === "inside"
                                ? validationResult.building.is_active === false
                                    ? "Building is Closed"
                                    : validationResult.building.status === "MAINTENANCE"
                                    ? "Under Maintenance"
                                    : insideLockedForStudent
                                    ? "Open the AR Scanner to unlock the AR content"
                                    : "AR content unlocked"
                                : `Distance: ${validationResult.distance_meters} meters away`}
                        </Text>
                        {validationResult.status === "inside" && insideLockedForStudent && (
                            <View style={styles.targetUnlockGuide}>
                                <Text style={styles.targetUnlockGuideTitle}>
                                    HOW TO UNLOCK THIS BUILDING
                                </Text>
                                <Text style={styles.targetUnlockGuideText}>
                                    1. Open the AR tab and launch the AR Scanner. GPS will unlock the building when your location is confirmed.
                                </Text>
                                <Text style={styles.targetUnlockGuideText}>
                                    2. If Spatial AR is not supported on your device, choose &quot;Use QR Scanner Instead&quot; and scan the building QR code.
                                </Text>
                                <TouchableOpacity
                                    style={styles.targetOpenScannerButton}
                                    activeOpacity={0.85}
                                    onPress={onOpenScanner}
                                >
                                    <Ionicons
                                        name="scan-outline"
                                        size={18}
                                        color="#FFFFFF"
                                    />
                                    <Text style={styles.targetOpenScannerButtonText}>
                                        OPEN AR SCANNER
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {validationResult.status === "inside" && insideOwned && (
                            <View style={styles.targetContentGuide}>
                                <Text style={styles.targetContentGuideTitle}>
                                    WHERE TO FIND THIS CONTENT
                                </Text>
                                <Text style={styles.targetContentGuideText}>
                                    1. Open the Maps tab.
                                </Text>
                                <Text style={styles.targetContentGuideText}>
                                    2. Tap {validationResult.building.name} on the map.
                                </Text>
                                <Text style={styles.targetContentGuideText}>
                                    3. Choose its 3D Model, Virtual Tour, or Quiz.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                <View style={styles.noTargetBox}>
                    <Ionicons
                        name="search"
                        size={24}
                        color={colors.textMuted}
                        style={{ marginRight: 10 }}
                    />
                    <Text style={styles.noTargetText}>
                        Searching for nearby buildings...
                    </Text>
                </View>
            )}
        </View>
    );
}