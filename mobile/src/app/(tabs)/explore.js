import React, { useEffect, useState, useRef, useMemo } from "react";
import { router, useFocusEffect } from "expo-router";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Animated,
    RefreshControl,
    Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors, useThemeValue } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { geofencingService, assetService } from "../../services";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import { api } from "../../services";
import { fonts } from "../../constants/typography";
import { useIsFocused } from "../../hooks/useIsFocused";
import { StatusBar } from "expo-status-bar";
import { GeoStatusIndicator } from "../../components/ui/GeoStatusIndicator";
import { toRgba } from "../../utils/color";

export default function ExploreScreen() {
    const isFocused = useIsFocused();
    const colors = useThemeColors();
    const spacing = useThemeValue("spacing");
    const styles = useThemedStyles(createStyles);
    const { role } = useRoleAccess();
    const {
        location,
        error,
        permissionStatus,
        isTracking,
        startTracking,
        stopTracking,
        requestPermission,
    } = useLocationTracking();

    const { unlockedBuildings } = useUnlockedBuildings();
    const hasInitialValidationRef = useRef(false);
    const lastValidatedStatusRef = useRef(null);
    const prefetchedBuildingsRef = useRef(new Set());
    const [validationResult, setValidationResult] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [buildingsList, setBuildingsList] = useState([]);
    const [totalBuildings, setTotalBuildings] = useState(0);
    const [activeQuests, setActiveQuests] = useState([]);
    const [weeklyProgress, setWeeklyProgress] = useState({ completed: 0, target: 10 });
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            return () => {
                stopTracking();
            };
        }, [stopTracking])
    );

    const loadData = async () => {
        try {
            const res = await api.get("/api/buildings/");
            if (res.data.success) {
                setBuildingsList(res.data.data);
                setTotalBuildings(res.data.data.length);
            }
            if (role === "student") {
                const questRes = await api.get("/api/gamification/quests/active/");
                if (questRes.data.success) {
                    const quests = questRes.data.data.quests || questRes.data.data;
                    setActiveQuests(quests);
                    if (questRes.data.data.weekly_progress) {
                        setWeeklyProgress(questRes.data.data.weekly_progress);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch explore data", err);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        hasInitialValidationRef.current = false;
        loadData();
    }, []);

    const progressPercentage =
        totalBuildings > 0
            ? (unlockedBuildings.length / totalBuildings) * 100
            : 0;

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const lat1Radians = (lat1 * Math.PI) / 180;
        const lat2Radians = (lat2 * Math.PI) / 180;
        const deltaLatRadians = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLonRadians = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(deltaLatRadians / 2) * Math.sin(deltaLatRadians / 2) +
            Math.cos(lat1Radians) *
                Math.cos(lat2Radians) *
                Math.sin(deltaLonRadians / 2) *
                Math.sin(deltaLonRadians / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.floor(R * c);
    };

    const nearbyBuildings = useMemo(() => {
        if (!location || buildingsList.length === 0) return [];

        return buildingsList
            .map((b) => ({
                ...b,
                distance: getDistance(
                    location.latitude,
                    location.longitude,
                    b.latitude,
                    b.longitude,
                ),
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);
    }, [location, buildingsList]);

    // Radar Pulse & Spin Animations (Paused when not tracking or screen unfocused)
    const pulseAnim1 = useRef(new Animated.Value(1)).current;
    const pulseAnim2 = useRef(new Animated.Value(1)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!isTracking || !isFocused) {
            pulseAnim1.setValue(1);
            pulseAnim2.setValue(1);
            spinAnim.setValue(0);
            return;
        }

        const pulseLoop = Animated.loop(
            Animated.stagger(600, [
                Animated.sequence([
                    Animated.timing(pulseAnim1, {
                        toValue: 1.5,
                        duration: 1800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim1, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(pulseAnim2, {
                        toValue: 1.5,
                        duration: 1800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim2, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );

        const spinLoop = Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        pulseLoop.start();
        spinLoop.start();

        return () => {
            pulseLoop.stop();
            spinLoop.stop();
            pulseAnim1.setValue(1);
            pulseAnim2.setValue(1);
            spinAnim.setValue(0);
        };
    }, [isTracking, isFocused]);

    const spinInterpolate = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    useEffect(() => {
        if (location) {
            validateLocation();
        }
    }, [location]);

    const validateLocation = async () => {
        if (!location) return;

        // Stage 1: Client-Side Haversine Pre-Filtering
        // Only dispatch the HTTP POST to /api/geofencing/validate/ when within (radius + 20m)
        // or on initial acquisition, or when transitioning away from a building.
        if (buildingsList.length > 0 && hasInitialValidationRef.current) {
            let closestBuilding = null;
            let minDistance = Infinity;

            for (const b of buildingsList) {
                if (b.latitude && b.longitude) {
                    const d = getDistance(
                        location.latitude,
                        location.longitude,
                        b.latitude,
                        b.longitude
                    );
                    if (d < minDistance) {
                        minDistance = d;
                        closestBuilding = b;
                    }
                }
            }

            const radius = closestBuilding?.geofence?.radius_meters || closestBuilding?.geofence?.radius || 30;
            const threshold = radius + 20;

            // If user is safely outside (>75m and > threshold) and was already confirmed outside,
            // update telemetry locally and skip the HTTP network round-trip.
            if (minDistance > 75 && minDistance > threshold && lastValidatedStatusRef.current === "outside") {
                setValidationResult({
                    status: "outside",
                    distance_meters: Math.round(minDistance),
                    building: null,
                });
                return;
            }
        }

        setIsValidating(true);
        try {
            const result = await geofencingService.validateLocation(
                location.latitude,
                location.longitude,
                location.accuracy || 10,
            );
            hasInitialValidationRef.current = true;
            lastValidatedStatusRef.current = result?.status || "outside";
            setValidationResult(result);

            // --- ASSET PREFETCHING MITIGATION ---
            if ((result.status === "nearby" || result.status === "inside") && result.building) {
                const buildingId = result.building.id;
                if (!prefetchedBuildingsRef.current.has(buildingId)) {
                    prefetchedBuildingsRef.current.add(buildingId);
                    
                    // Fetch building details to get model URL in background
                    api.get(`/api/buildings/${buildingId}/`).then(async (bldgRes) => {
                        if (bldgRes.data?.success && bldgRes.data.data?.model_url) {
                            // Same key as AR / 3D viewer / virtual tour, so the
                            // prefetch warms the exact file they will open.
                            const key = assetService.getModelKey(bldgRes.data.data);
                            if (!key) return;
                            const cached = await assetService.isCached(key.assetId, key.version, key.url);
                            if (!cached) {
                                await assetService.downloadAsset(key.url, key.assetId, key.version);
                            }
                        }
                    }).catch(err => console.warn("Failed to pre-fetch building assets", err));
                }
            }
            // ------------------------------------

            // Explore is read-only: it reports geofence state but never writes
            // a BuildingUnlock. The AR Scanner owns unlocking (automatic on
            // entry, with QR as the fallback), so the map marker stays gray and
            // no EXP/badges are awarded just for walking past this screen.
        } catch (err) {
            if (err?.response?.data?.error?.code === "SPOOFING_DETECTED") {
                console.warn("Location validation notice: Spoofing/velocity alert from backend.");
            } else {
                console.warn("Validation error:", err?.message || err);
            }
        } finally {
            setIsValidating(false);
        }
    };

    const handleStartTracking = async () => {
        if (permissionStatus !== "granted") {
            await requestPermission();
        }
        startTracking();
    };

    // A badge toast takes priority over an EXP-only toast; when both are live
    // the badge animation drives the same card and the EXP shows as a chip.
    const insideBuilding =
        validationResult?.status === "inside" ? validationResult.building : null;

    // Explore never unlocks. Students standing inside a locked building get a
    // handoff to the AR Scanner, which owns the unlock and its +25 EXP.
    const insideLockedForStudent =
        role === "student" &&
        Boolean(insideBuilding) &&
        insideBuilding.is_active !== false &&
        insideBuilding.status !== "MAINTENANCE" &&
        !unlockedBuildings.some(
            (ub) => String(ub.id) === String(insideBuilding.id),
        );

    // The green "inside" treatment only applies when the student already owns
    // the building (or has role access); locked rows stay neutral.
    const insideOwned =
        Boolean(insideBuilding) &&
        insideBuilding.is_active !== false &&
        insideBuilding.status !== "MAINTENANCE" &&
        !insideLockedForStudent;

    return (
        <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
            {isFocused && <StatusBar style="dark" />}
            {/* Subtle Background Gradient */}
            <LinearGradient
                colors={["#FFFFFF", "#F2F4F7"]}
                style={StyleSheet.absoluteFillObject}
            />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>AR Explorer</Text>
                    <Text style={{ fontFamily: fonts.heading.bold, color: colors.textPrimary, fontSize: 16, textAlign: 'center', marginTop: -2 }}>
                        Explore Campus
                    </Text>
                    <Text style={{ fontFamily: fonts.body.regular, color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>
                        Uncover hidden stories and unlock exclusive rewards as you wander.
                    </Text>
                </View>

                {/* Premium Radar Section */}
                <View style={styles.radarContainer}>
                    {/* Sonar Rings */}
                    <Animated.View
                        style={[
                            styles.radarRing,
                            isTracking && styles.radarRingActive,
                            {
                                transform: [{ scale: pulseAnim1 }],
                                opacity: pulseAnim1.interpolate({
                                    inputRange: [1, 1.5],
                                    outputRange: [isTracking ? 0.8 : 0, 0],
                                }),
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.radarRing,
                            isTracking && styles.radarRingActive,
                            {
                                transform: [{ scale: pulseAnim2 }],
                                opacity: pulseAnim2.interpolate({
                                    inputRange: [1, 1.5],
                                    outputRange: [isTracking ? 0.6 : 0, 0],
                                }),
                            },
                        ]}
                    />

                    {/* Rotating Dashed Ring */}
                    {isTracking && (
                        <Animated.View
                            style={[
                                styles.radarDashedRing,
                                { transform: [{ rotate: spinInterpolate }] },
                            ]}
                        />
                    )}

                    <TouchableOpacity
                        style={styles.radarButtonWrapper}
                        onPress={
                            isTracking ? stopTracking : handleStartTracking
                        }
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={
                                isTracking
                                    ? [colors.primaryDark, colors.primary]
                                    : [colors.primary, colors.primaryDark]
                            }
                            style={styles.radarButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons
                                name={isTracking ? "stop" : "business"}
                                size={48}
                                color={"white"}
                            />
                            <Text style={styles.radarButtonText}>
                                {isTracking ? "STOP" : "DISCOVER NOW"}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* GPS Status — permission denied, fake GPS, weak signal, inside, nearby */}
                <GeoStatusIndicator
                    status={validationResult?.status}
                    buildingName={validationResult?.building?.name}
                    permissionDenied={permissionStatus === "denied"}
                    mockedGPS={!!error && error.includes("Fake GPS")}
                    onRetry={() => {
                        stopTracking();
                        setTimeout(() => startTracking(), 300);
                    }}
                    insideSubText={
                        insideLockedForStudent
                            ? "Open the AR Scanner to unlock the AR content."
                            : null
                    }
                />

                {/* Active Scanning Status HUD */}
                {isTracking && (
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Ionicons
                                name="location"
                                size={22}
                                color={colors.primary}
                            />
                            <Text style={styles.cardTitle}>YOUR LOCATION</Text>
                            {isValidating && (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.primary}
                                    style={{ marginLeft: "auto" }}
                                />
                            )}
                        </View>

                        {location ? (
                            <View style={styles.telemetryGrid}>
                                <View style={styles.telemetryPill}>
                                    <Text style={styles.telemetryLabel}>
                                        Latitude
                                    </Text>
                                    <Text style={styles.telemetryValue}>
                                        {location.latitude.toFixed(5)}
                                    </Text>
                                </View>
                                <View style={styles.telemetryPill}>
                                    <Text style={styles.telemetryLabel}>
                                        Longitude
                                    </Text>
                                    <Text style={styles.telemetryValue}>
                                        {location.longitude.toFixed(5)}
                                    </Text>
                                </View>
                                <View style={styles.telemetryPill}>
                                    <Text style={styles.telemetryLabel}>
                                        Accuracy
                                    </Text>
                                    <Text style={styles.telemetryValue}>
                                        ± {location.accuracy?.toFixed(0)}m
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator
                                    size="small"
                                    color={colors.primary}
                                />
                                <Text style={styles.loadingText}>
                                    Finding your location...
                                </Text>
                            </View>
                        )}

                        <View style={styles.divider} />

                        <View style={styles.cardHeaderRow}>
                            <Ionicons
                                name="business"
                                size={22}
                                color={colors.primary}
                            />
                            <Text style={styles.cardTitle}>
                                TARGET BUILDING
                            </Text>
                        </View>

                        {validationResult?.building ? (
                            <View
                                style={[
                                    styles.targetBox,
                                    validationResult.status === "inside"
                                        ? validationResult.building
                                              .is_active === false
                                            ? styles.targetLocked
                                            : insideLockedForStudent
                                              ? styles.targetSearching
                                              : styles.targetUnlocked
                                        : styles.targetSearching,
                                ]}
                            >
                                <View style={styles.targetIcon}>
                                    <Ionicons
                                        name={
                                            validationResult.status === "inside"
                                                ? validationResult.building
                                                      .is_active === false
                                                    ? "warning"
                                                    : insideLockedForStudent
                                                      ? "lock-closed"
                                                      : "star"
                                                : "walk"
                                        }
                                        size={32}
                                        color={
                                            insideOwned
                                                ? colors.white
                                                : colors.primary
                                        }
                                    />
                                </View>
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
                                            validationResult.building
                                                .is_active === false && {
                                                color: colors.error,
                                            },
                                        ]}
                                    >
                                        {validationResult.status === "inside"
                                            ? validationResult.building
                                                  .is_active === false
                                                ? "Building is Closed"
                                                : validationResult.building
                                                        .status ===
                                                      "MAINTENANCE"
                                                  ? "Under Maintenance"
                                                  : insideLockedForStudent
                                                    ? "Open the AR Scanner to unlock the AR content"
                                                    : "AR content unlocked"
                                            : `Distance: ${validationResult.distance_meters} meters away`}
                                    </Text>
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
                )}

                {/* Nearby Buildings List */}
                {nearbyBuildings.length > 0 && (
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Ionicons
                                name="map"
                                size={22}
                                color={colors.primary}
                            />
                            <Text style={styles.cardTitle}>
                                NEARBY BUILDINGS
                            </Text>
                        </View>

                        {nearbyBuildings.map((building, index) => {
                            const isUnlocked =
                                role === "professional" ||
                                role === "admin" ||
                                unlockedBuildings.some(
                                    (ub) => ub.id === building.id,
                                );
                            return (
                                <View
                                    key={building.id}
                                    style={[
                                        styles.nearbyRow,
                                        index < nearbyBuildings.length - 1 &&
                                            styles.nearbyDivider,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.nearbyIconWrapper,
                                            isUnlocked &&
                                                styles.nearbyIconWrapperActive,
                                        ]}
                                    >
                                        <Ionicons
                                            name={
                                                isUnlocked
                                                    ? "checkmark"
                                                    : "lock-closed"
                                            }
                                            size={18}
                                            color={
                                                isUnlocked
                                                    ? colors.white
                                                    : colors.primary
                                            }
                                        />
                                    </View>
                                    <View style={styles.nearbyInfo}>
                                        <Text
                                            style={styles.nearbyName}
                                            numberOfLines={1}
                                        >
                                            {building.name}
                                        </Text>
                                        <View style={styles.nearbyDistBadge}>
                                            <Text style={styles.nearbyDistance}>
                                                {building.distance} meters
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'column', gap: 6 }}>
                                        {/* Explore never unlocks; AR Nav just
                                            hands off to the AR Scanner, which
                                            performs the unlock on entry. */}
                                        <TouchableOpacity
                                            style={styles.navigateBtn}
                                            onPress={() =>
                                                router.push({
                                                    pathname: "/(tabs)/ar",
                                                    params: { targetBuildingId: building.id }
                                                })
                                            }
                                        >
                                            <Ionicons
                                                name="compass"
                                                size={16}
                                                color="#FFFFFF"
                                            />
                                            <Text style={styles.navigateText}>
                                                AR Nav
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.navigateBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary }]}
                                            onPress={() =>
                                                router.push({
                                                    pathname: "/(tabs)/buildings",
                                                    params: { targetBuildingId: building.id }
                                                })
                                            }
                                        >
                                            <Ionicons
                                                name="map-outline"
                                                size={16}
                                                color={colors.primary}
                                            />
                                            <Text style={[styles.navigateText, { color: colors.primary }]}>
                                                Map
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Gamified Widgets */}
                {role === "student" && (
                    <>
                        {/* Progress Tracker */}
                        <View style={styles.card}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: 20, fontFamily: fonts.heading.bold }]}>
                                    Campus Explorer
                                </Text>
                            </View>
                            <Text style={{ fontFamily: fonts.body.regular, color: colors.textSecondary, fontSize: 14, marginBottom: 16 }}>
                                Collect stamps from every landmark
                            </Text>
                            <Text style={{ fontFamily: fonts.heading.bold, color: colors.textPrimary, fontSize: 24, marginBottom: 12 }}>
                                {unlockedBuildings.length} <Text style={{ fontFamily: fonts.body.regular, fontSize: 14, color: colors.textSecondary }}>/ {totalBuildings || 15}</Text>
                            </Text>
                            <View style={styles.progressBarContainer}>
                                <LinearGradient
                                    colors={[colors.primary, colors.primaryDark]}
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${progressPercentage}%` },
                                    ]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                            </View>
                        </View>

                        {/* Daily Quest */}
                        <View style={styles.card}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: 20, fontFamily: fonts.heading.bold }]}>
                                    Daily Missions
                                </Text>
                                <View style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                                    <Text style={{ color: '#FFF', fontFamily: fonts.heading.bold, fontSize: 10, letterSpacing: 1 }}>{activeQuests.length} TASKS</Text>
                                </View>
                            </View>

                            {/* Weekly Progress Bar */}
                            <View style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <Text style={{ fontFamily: fonts.heading.bold, color: colors.textSecondary, fontSize: 12 }}>WEEKLY CHALLENGE</Text>
                                    <Text style={{ fontFamily: fonts.heading.bold, color: colors.primary, fontSize: 12 }}>{weeklyProgress.completed} / {weeklyProgress.target}</Text>
                                </View>
                                <View style={styles.progressBarContainer}>
                                    <LinearGradient
                                        colors={["#FFD700", "#FFA500"]}
                                        style={[
                                            styles.progressBarFill,
                                            { width: `${Math.min((weeklyProgress.completed / weeklyProgress.target) * 100, 100)}%` },
                                        ]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    />
                                </View>
                            </View>

                            {activeQuests.length > 0 ? (
                                activeQuests.map((quest) => {
                                    // Map difficulty to color/icon
                                    let badgeColor = "#CD7F32"; // Bronze for Easy
                                    let difficultyLabel = "EASY";
                                    if (quest.difficulty === 'MEDIUM') { badgeColor = "#C0C0C0"; difficultyLabel = "MEDIUM"; }
                                    if (quest.difficulty === 'HARD') { badgeColor = "#FFD700"; difficultyLabel = "HARD"; }

                                    return (
                                        <View
                                            key={quest.id}
                                            style={{
                                                marginBottom: spacing.md,
                                                opacity: quest.is_completed ? 0.5 : 1
                                            }}
                                        >
                                            <View style={[styles.questBriefBox, { borderColor: badgeColor, borderWidth: 1 }]}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                    <Text
                                                        style={{
                                                            fontFamily: fonts.heading.bold,
                                                            color: colors.textPrimary,
                                                            fontSize: 16,
                                                            flex: 1
                                                        }}
                                                    >
                                                        {quest.title}
                                                    </Text>
                                                    <View style={{ backgroundColor: badgeColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                                        <Text style={{ color: '#FFF', fontFamily: fonts.heading.bold, fontSize: 10 }}>{difficultyLabel}</Text>
                                                    </View>
                                                </View>
                                                <Text
                                                    style={{
                                                        fontFamily: fonts.body.regular,
                                                        color: colors.textSecondary,
                                                        fontSize: 13,
                                                        marginBottom: 8,
                                                    }}
                                                >
                                                    Target: {quest.target_building_name}
                                                </Text>
                                                {quest.hint && (
                                                    <Text style={styles.questHint}>
                                                        Hint: "{quest.hint}"
                                                    </Text>
                                                )}
                                                {quest.is_completed && (
                                                    <Text style={{ fontFamily: fonts.heading.bold, color: colors.success, fontSize: 12, marginTop: 4 }}>
                                                        ✓ COMPLETED
                                                    </Text>
                                                )}
                                            </View>
                                            {!quest.is_completed && (
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                    <View style={[styles.compassContainer, { marginTop: 0 }]}>
                                                        <Ionicons
                                                            name="gift"
                                                            size={18}
                                                            color={colors.primary}
                                                        />
                                                        <Text style={styles.compassText}>
                                                            Reward: {quest.reward_points} EXP
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={{
                                                            backgroundColor: colors.primary,
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 6,
                                                            borderRadius: 6,
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                        }}
                                                        onPress={() =>
                                                            router.push({
                                                                pathname: "/(tabs)/ar",
                                                                params: {
                                                                    targetBuildingId: quest.target_building,
                                                                    questId: quest.id,
                                                                }
                                                            })
                                                        }
                                                        activeOpacity={0.8}
                                                    >
                                                        <Ionicons name="compass" size={14} color="#FFF" />
                                                        <Text style={{ fontFamily: fonts.heading.bold, color: '#FFF', fontSize: 11, letterSpacing: 0.5 }}>
                                                            START MISSION
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            ) : (
                                <Text style={styles.emptyLogText}>
                                    No active missions. Check back later!
                                </Text>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const createStyles = (colors, spacing, radius) => StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: spacing.lg,
        paddingBottom: 40,
    },
    header: {
        alignItems: "center",
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
    },
    title: {
        fontFamily: fonts.heading.bold,
        fontSize: 34,
        fontWeight: "900",
        color: colors.primary,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 6,
    },
    radarContainer: {
        alignItems: "center",
        justifyContent: "center",
        height: 250,
        marginBottom: spacing.xl,
    },
    radarRing: {
        position: "absolute",
        width: 170,
        height: 170,
        borderRadius: 85,
        borderWidth: 1,
        borderColor: toRgba(colors.primary, 0.2),
        backgroundColor: toRgba(colors.primary, 0.02),
    },
    radarRingActive: {
        borderColor: toRgba(colors.primary, 0.6),
        backgroundColor: toRgba(colors.primary, 0.08),
    },
    radarDashedRing: {
        position: "absolute",
        width: 210,
        height: 210,
        borderRadius: 105,
        borderWidth: 2,
        borderColor: toRgba(colors.primary, 0.4),
        borderStyle: "dashed",
    },
    radarButtonWrapper: {
        width: 140,
        height: 140,
        borderRadius: 70,
    },
    radarButton: {
        flex: 1,
        borderRadius: 70,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "rgba(255,255,255,0.4)",
    },
    radarButtonText: {
        fontFamily: fonts.heading.bold,
        color: "white",
        fontSize: 15,
        marginTop: 8,
        letterSpacing: 1,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.06)",
        overflow: "hidden",
    },
    cardHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.lg,
    },
    cardTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: colors.textPrimary,
        letterSpacing: 1,
        marginLeft: 10,
    },
    telemetryGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    telemetryPill: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: radius.lg,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    telemetryLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    telemetryValue: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: colors.primary,
    },
    loadingBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg,
    },
    loadingText: {
        fontFamily: fonts.body.medium,
        color: colors.textSecondary,
        marginLeft: spacing.md,
        fontSize: 15,
    },
    divider: {
        height: 1,
        backgroundColor: "#F3F4F6",
        marginVertical: spacing.xl,
    },
    targetBox: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: radius.lg,
        borderWidth: 1.5,
    },
    targetSearching: {
        backgroundColor: "#F9FAFB",
        borderColor: "#E5E7EB",
    },
    targetLocked: {
        backgroundColor: "#FFF0F0",
        borderColor: "#FECACA",
    },
    targetUnlocked: {
        backgroundColor: "#10B981", // Clean success green
        borderColor: "#059669",
    },
    targetIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.9)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    targetInfo: {
        flex: 1,
    },
    targetName: {
        fontFamily: fonts.heading.bold,
        fontSize: 18,
        color: colors.textPrimary,
        marginBottom: 6,
    },
    targetDistance: {
        fontFamily: fonts.body.medium,
        fontSize: 14,
        color: colors.textSecondary,
    },
    textWhite: {
        color: colors.white,
    },
    noTargetBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backgroundColor: "#F9FAFB",
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderStyle: "dashed",
    },
    noTargetText: {
        fontFamily: fonts.body.medium,
        color: colors.textSecondary,
        fontSize: 15,
    },
    nearbyRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
    },
    nearbyDivider: {
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    nearbyIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    nearbyIconWrapperActive: {
        backgroundColor: colors.primary,
    },
    nearbyInfo: {
        flex: 1,
    },
    nearbyName: {
        fontFamily: fonts.heading.bold,
        color: colors.textPrimary,
        fontSize: 17,
        marginBottom: 6,
    },
    nearbyDistBadge: {
        alignSelf: "flex-start",
        backgroundColor: toRgba(colors.primary, 0.08),
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    nearbyDistance: {
        fontFamily: fonts.body.bold,
        color: colors.primary,
        fontSize: 13,
    },
    navigateBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginLeft: 12,
    },
    navigateText: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 12,
        marginLeft: 6,
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: "#F3F4F6",
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 12,
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 6,
    },
    progressText: {
        fontFamily: fonts.body.medium,
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "right",
    },
    questBriefBox: {
        backgroundColor: colors.white,
        padding: 16,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        marginBottom: 12,
    },
    questHint: {
        fontFamily: fonts.body.regular,
        fontSize: 16,
        color: colors.textPrimary,
        fontStyle: "italic",
        lineHeight: 24,
    },
    compassContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    compassText: {
        fontFamily: fonts.heading.bold,
        fontSize: 15,
        color: colors.primary,
        marginLeft: 8,
    },
    emptyLogText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.textSecondary,
    },
});
