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
import theme from "../../theme/tokens";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useAssetCache } from "../../hooks/useAssetCache";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { geofencingService, assetService } from "../../services";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import { api } from "../../services";
import { fonts } from "../../constants/typography";
import SoundManager from "../../utils/SoundManager";
import { useAuth } from "../../context/AuthContext";
import { useIsFocused } from "../../hooks/useIsFocused";
import { StatusBar } from "expo-status-bar";

export default function ExploreScreen() {
    const isFocused = useIsFocused();
    const { role } = useRoleAccess();
    const { checkToken } = useAuth();
    const {
        location,
        error,
        permissionStatus,
        isTracking,
        startTracking,
        stopTracking,
        requestPermission,
    } = useLocationTracking();

    const { unlockedBuildings, attemptUnlock } = useUnlockedBuildings();
    const { loadAsset } = useAssetCache();
    const prefetchedBuildingsRef = useRef(new Set());
    const [validationResult, setValidationResult] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [lastUnlockAttempt, setLastUnlockAttempt] = useState(null);
    const [buildingsList, setBuildingsList] = useState([]);
    const [totalBuildings, setTotalBuildings] = useState(0);
    const [activeQuests, setActiveQuests] = useState([]);
    const [weeklyProgress, setWeeklyProgress] = useState({ completed: 0, target: 10 });
    const [earnedBadges, setEarnedBadges] = useState([]);
    const badgeAnim = useRef(new Animated.Value(0)).current;
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

    // Radar Pulse & Spin Animations
    const pulseAnim1 = useRef(new Animated.Value(1)).current;
    const pulseAnim2 = useRef(new Animated.Value(1)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isTracking) {
            Animated.loop(
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
                ]),
            ).start();

            Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: 4000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ).start();
        } else {
            pulseAnim1.setValue(1);
            pulseAnim2.setValue(1);
            spinAnim.setValue(0);
            Animated.timing(pulseAnim1).stop();
            Animated.timing(pulseAnim2).stop();
            Animated.timing(spinAnim).stop();
        }
    }, [isTracking]);

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

        setIsValidating(true);
        try {
            const result = await geofencingService.validateLocation(
                location.latitude,
                location.longitude,
                location.accuracy || 10,
            );
            setValidationResult(result);

            // --- ASSET PREFETCHING MITIGATION ---
            if ((result.status === "nearby" || result.status === "inside") && result.building) {
                const buildingId = result.building.id;
                if (!prefetchedBuildingsRef.current.has(buildingId)) {
                    prefetchedBuildingsRef.current.add(buildingId);
                    
                    // Fetch building details to get model URL in background
                    api.get(`/api/buildings/${buildingId}/`).then(bldgRes => {
                        if (bldgRes.data.success && bldgRes.data.data.model_url) {
                            const bldgData = bldgRes.data.data;
                            loadAsset({
                                id: `model_${bldgData.id}`,
                                version: bldgData.updated_at ? new Date(bldgData.updated_at).getTime() : "1",
                                file_url: bldgData.model_url
                            }).catch(e => console.warn('Pre-fetch failed', e));
                        }
                    }).catch(err => console.warn("Failed to pre-fetch building assets", err));
                }
            }
            // ------------------------------------

            if (result.status === "inside" && result.building) {
                const buildingId = result.building.id;
                if (result.building.is_active === false) {
                    // Building is closed
                } else if (result.building.status === "MAINTENANCE") {
                    // Building is under maintenance, do not unlock
                    if (lastUnlockAttempt !== buildingId) {
                        setLastUnlockAttempt(buildingId);
                        // Optionally play a failure sound or show a small alert
                    }
                } else if (lastUnlockAttempt !== buildingId) {
                    try {
                        const unlockResult = await attemptUnlock(
                            location.latitude,
                            location.longitude,
                            location.accuracy || 10,
                        );
                        setLastUnlockAttempt(buildingId);

                        if (role === "student") {
                            SoundManager.play("building_unlock");
                            if (checkToken) await checkToken(); // Refresh global EXP immediately!

                            const badges = unlockResult?.newly_earned_badges || [];
                            if (badges.length > 0) {
                                setTimeout(() => {
                                    SoundManager.play("badge_earned");
                                }, 1500);

                                setEarnedBadges(badges);
                                badgeAnim.setValue(0);
                                Animated.sequence([
                                    Animated.spring(badgeAnim, {
                                        toValue: 1,
                                        tension: 60,
                                        friction: 8,
                                        useNativeDriver: true,
                                    }),
                                ]).start(() => {
                                    setTimeout(() => {
                                        Animated.timing(badgeAnim, {
                                            toValue: 0,
                                            duration: 300,
                                            useNativeDriver: true,
                                        }).start(() => setEarnedBadges([]));
                                    }, 3500);
                                });
                            }
                        }
                    } catch (err) {
                        console.log("Unlock attempt:", err);
                    }
                }
            }
        } catch (err) {
            console.error("Validation error:", err);
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
                        colors={[theme.colors.primary]}
                        tintColor={theme.colors.primary}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>AR Explorer</Text>
                    <Text style={{ fontFamily: fonts.heading.bold, color: theme.colors.textPrimary, fontSize: 16, textAlign: 'center', marginTop: -2 }}>
                        Explore Campus
                    </Text>
                    <Text style={{ fontFamily: fonts.body.regular, color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>
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
                                    ? ["#850F22", "#B21830"]
                                    : ["#B21830", "#E53935"]
                            }
                            style={styles.radarButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons
                                name={isTracking ? "stop" : "business"}
                                size={48}
                                color={theme.colors.white}
                            />
                            <Text style={styles.radarButtonText}>
                                {isTracking ? "STOP" : "DISCOVER NOW"}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Error States */}
                {permissionStatus === "denied" && (
                    <View style={styles.alertBox}>
                        <Ionicons
                            name="warning"
                            size={28}
                            color={theme.colors.error}
                        />
                        <Text style={styles.alertText}>
                            Location access denied. Please enable in settings.
                        </Text>
                    </View>
                )}
                {error && (
                    <View style={styles.alertBox}>
                        <Ionicons
                            name="alert-circle"
                            size={28}
                            color={theme.colors.error}
                        />
                        <Text style={styles.alertText}>{error}</Text>
                    </View>
                )}

                {/* Active Scanning Status HUD */}
                {isTracking && (
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Ionicons
                                name="location"
                                size={22}
                                color={theme.colors.primary}
                            />
                            <Text style={styles.cardTitle}>YOUR LOCATION</Text>
                            {isValidating && (
                                <ActivityIndicator
                                    size="small"
                                    color={theme.colors.primary}
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
                                    color={theme.colors.primary}
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
                                color={theme.colors.primary}
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
                                                    : "star"
                                                : "walk"
                                        }
                                        size={32}
                                        color={
                                            validationResult.status ===
                                                "inside" &&
                                            validationResult.building
                                                .is_active !== false
                                                ? theme.colors.white
                                                : theme.colors.primary
                                        }
                                    />
                                </View>
                                <View style={styles.targetInfo}>
                                    <Text
                                        style={[
                                            styles.targetName,
                                            validationResult.status ===
                                                "inside" &&
                                                validationResult.building
                                                    .is_active !== false &&
                                                styles.textWhite,
                                        ]}
                                    >
                                        {validationResult.building.name}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.targetDistance,
                                            validationResult.status ===
                                                "inside" &&
                                                validationResult.building
                                                    .is_active !== false &&
                                                styles.textWhite,
                                            validationResult.building
                                                .is_active === false && {
                                                color: theme.colors.error,
                                            },
                                        ]}
                                    >
                                        {validationResult.status === "inside"
                                            ? validationResult.building
                                                  .is_active === false
                                                ? "Building is Closed"
                                                : "AR Content Unlocked!"
                                            : `Distance: ${validationResult.distance_meters} meters away`}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.noTargetBox}>
                                <Ionicons
                                    name="search"
                                    size={24}
                                    color={theme.colors.textMuted}
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
                                color={theme.colors.primary}
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
                                                    ? theme.colors.white
                                                    : theme.colors.primary
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
                                                color={theme.colors.white}
                                            />
                                            <Text style={styles.navigateText}>
                                                AR Nav
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.navigateBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.primary }]}
                                            onPress={() =>
                                                router.push("/buildings")
                                            }
                                        >
                                            <Text style={[styles.navigateText, { color: theme.colors.primary }]}>
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
                                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary, fontSize: 20, fontFamily: fonts.heading.bold }]}>
                                    Campus Explorer
                                </Text>
                            </View>
                            <Text style={{ fontFamily: fonts.body.regular, color: theme.colors.textSecondary, fontSize: 14, marginBottom: 16 }}>
                                Collect stamps from every landmark
                            </Text>
                            <Text style={{ fontFamily: fonts.heading.bold, color: theme.colors.textPrimary, fontSize: 24, marginBottom: 12 }}>
                                {unlockedBuildings.length} <Text style={{ fontFamily: fonts.body.regular, fontSize: 14, color: theme.colors.textSecondary }}>/ {totalBuildings || 15}</Text>
                            </Text>
                            <View style={styles.progressBarContainer}>
                                <LinearGradient
                                    colors={["#B21830", "#E53935"]}
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
                                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary, fontSize: 20, fontFamily: fonts.heading.bold }]}>
                                    Daily Missions
                                </Text>
                                <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                                    <Text style={{ color: '#FFF', fontFamily: fonts.heading.bold, fontSize: 10, letterSpacing: 1 }}>{activeQuests.length} TASKS</Text>
                                </View>
                            </View>

                            {/* Weekly Progress Bar */}
                            <View style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <Text style={{ fontFamily: fonts.heading.bold, color: theme.colors.textSecondary, fontSize: 12 }}>WEEKLY CHALLENGE</Text>
                                    <Text style={{ fontFamily: fonts.heading.bold, color: theme.colors.primary, fontSize: 12 }}>{weeklyProgress.completed} / {weeklyProgress.target}</Text>
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
                                                marginBottom: theme.spacing.md,
                                                opacity: quest.is_completed ? 0.5 : 1
                                            }}
                                        >
                                            <View style={[styles.questBriefBox, { borderColor: badgeColor, borderWidth: 1 }]}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                    <Text
                                                        style={{
                                                            fontFamily: fonts.heading.bold,
                                                            color: theme.colors.textPrimary,
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
                                                        color: theme.colors.textSecondary,
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
                                                    <Text style={{ fontFamily: fonts.heading.bold, color: theme.colors.success, fontSize: 12, marginTop: 4 }}>
                                                        ✓ COMPLETED
                                                    </Text>
                                                )}
                                            </View>
                                            {!quest.is_completed && (
                                                <View style={styles.compassContainer}>
                                                    <Ionicons
                                                        name="gift"
                                                        size={20}
                                                        color={theme.colors.primary}
                                                    />
                                                    <Text style={styles.compassText}>
                                                        Reward: {quest.reward_points} EXP
                                                    </Text>
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

            {/* Newly Earned Badges Toast */}
            {role === "student" && earnedBadges.length > 0 && (
                <Animated.View
                    style={[
                        styles.badgeToast,
                        {
                            opacity: badgeAnim,
                            transform: [
                                {
                                    translateY: badgeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-50, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={["rgba(30,30,30,0.98)", "rgba(15,15,15,0.98)"]}
                        style={StyleSheet.absoluteFillObject}
                        borderRadius={16}
                    />
                    <Text style={styles.badgeToastEmoji}>
                        {earnedBadges[0].icon}
                    </Text>
                    <View style={{ flex: 1, zIndex: 2 }}>
                        <Text style={styles.badgeToastLabel}>
                            ACHIEVEMENT UNLOCKED
                        </Text>
                        <Text style={styles.badgeToastName}>
                            {earnedBadges[0].name}
                        </Text>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: theme.spacing.lg,
        paddingBottom: 40,
    },
    header: {
        alignItems: "center",
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontFamily: fonts.heading.bold,
        fontSize: 34,
        fontWeight: "900",
        color: theme.colors.primary,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginTop: 6,
    },
    radarContainer: {
        alignItems: "center",
        justifyContent: "center",
        height: 250,
        marginBottom: theme.spacing.xl,
    },
    radarRing: {
        position: "absolute",
        width: 170,
        height: 170,
        borderRadius: 85,
        borderWidth: 1,
        borderColor: "rgba(178, 24, 48, 0.2)",
        backgroundColor: "rgba(178, 24, 48, 0.02)",
    },
    radarRingActive: {
        borderColor: "rgba(178, 24, 48, 0.6)",
        backgroundColor: "rgba(178, 24, 48, 0.08)",
    },
    radarDashedRing: {
        position: "absolute",
        width: 210,
        height: 210,
        borderRadius: 105,
        borderWidth: 2,
        borderColor: "rgba(178, 24, 48, 0.4)",
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
        color: theme.colors.white,
        fontSize: 15,
        marginTop: 8,
        letterSpacing: 1,
    },
    alertBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF0F0",
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: "#FFCACA",
        marginBottom: theme.spacing.lg,
    },
    alertText: {
        flex: 1,
        color: theme.colors.error,
        marginLeft: theme.spacing.md,
        fontSize: 16,
        fontFamily: fonts.body.medium,
        lineHeight: 22,
    },
    card: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.06)",
        overflow: "hidden",
    },
    cardHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: theme.spacing.lg,
    },
    cardTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: theme.colors.textPrimary,
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
        borderRadius: theme.radius.lg,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    telemetryLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    telemetryValue: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: theme.colors.primary,
    },
    loadingBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing.lg,
    },
    loadingText: {
        fontFamily: fonts.body.medium,
        color: theme.colors.textSecondary,
        marginLeft: theme.spacing.md,
        fontSize: 15,
    },
    divider: {
        height: 1,
        backgroundColor: "#F3F4F6",
        marginVertical: theme.spacing.xl,
    },
    targetBox: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: theme.radius.lg,
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
        color: theme.colors.textPrimary,
        marginBottom: 6,
    },
    targetDistance: {
        fontFamily: fonts.body.medium,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    textWhite: {
        color: theme.colors.white,
    },
    noTargetBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backgroundColor: "#F9FAFB",
        borderRadius: theme.radius.lg,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderStyle: "dashed",
    },
    noTargetText: {
        fontFamily: fonts.body.medium,
        color: theme.colors.textSecondary,
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
        backgroundColor: theme.colors.primary,
    },
    nearbyInfo: {
        flex: 1,
    },
    nearbyName: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.textPrimary,
        fontSize: 17,
        marginBottom: 6,
    },
    nearbyDistBadge: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(178, 24, 48, 0.08)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    nearbyDistance: {
        fontFamily: fonts.body.bold,
        color: theme.colors.primary,
        fontSize: 13,
    },
    navigateBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginLeft: 12,
    },
    navigateText: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.white,
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
        color: theme.colors.textSecondary,
        textAlign: "right",
    },
    questBriefBox: {
        backgroundColor: theme.colors.white,
        padding: 16,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        marginBottom: 12,
    },
    questHint: {
        fontFamily: fonts.body.regular,
        fontSize: 16,
        color: theme.colors.textPrimary,
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
        color: theme.colors.primary,
        marginLeft: 8,
    },
    emptyLogText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: theme.colors.textSecondary,
    },
    badgeToast: {
        position: "absolute",
        top: 60,
        left: 16,
        right: 16,
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 215, 0, 0.5)",
        gap: 16,
        zIndex: 999,
    },
    badgeToastEmoji: {
        fontSize: 38,
        zIndex: 2,
    },
    badgeToastLabel: {
        fontFamily: fonts.heading.bold,
        color: "#FFD700",
        fontSize: 11,
        letterSpacing: 2,
        marginBottom: 6,
    },
    badgeToastName: {
        fontFamily: fonts.heading.bold,
        color: "#fff",
        fontSize: 18,
        letterSpacing: 0.5,
    },
});
