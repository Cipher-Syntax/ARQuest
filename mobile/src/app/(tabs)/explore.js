import React, { useEffect, useState, useRef, useMemo } from "react";
import { router } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from "../../theme/tokens";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { geofencingService } from "../../services/geofencingService";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import api from "../../services/api";
import { fonts } from "../../constants/typography";
import SoundManager from "../../utils/SoundManager";

export default function ExploreScreen() {
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

    const { unlockedBuildings, attemptUnlock } = useUnlockedBuildings();
    const [validationResult, setValidationResult] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [lastUnlockAttempt, setLastUnlockAttempt] = useState(null);
    const [buildingsList, setBuildingsList] = useState([]);
    const [totalBuildings, setTotalBuildings] = useState(0);
    const [activeQuests, setActiveQuests] = useState([]);
    const [earnedBadges, setEarnedBadges] = useState([]);
    const badgeAnim = useRef(new Animated.Value(0)).current;

    // Fetch total buildings for progress bar and active quests
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/api/buildings/');
                if (res.data.success) {
                    setBuildingsList(res.data.data);
                    setTotalBuildings(res.data.data.length);
                }
                const questRes = await api.get('/api/gamification/quests/active/');
                if (questRes.data.success) {
                    setActiveQuests(questRes.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch gamification data", err);
            }
        };
        fetchData();
    }, []);

    const progressPercentage = totalBuildings > 0 ? (unlockedBuildings.length / totalBuildings) * 100 : 0;

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return Math.floor(R * c);
    };

    const nearbyBuildings = useMemo(() => {
        if (!location || buildingsList.length === 0) return [];
        
        return buildingsList
            .map(b => ({
                ...b,
                distance: getDistance(location.latitude, location.longitude, b.latitude, b.longitude)
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5); // top 5 closest
    }, [location, buildingsList]);

    // Radar Pulse Animation
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isTracking) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 1200, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
            Animated.timing(pulseAnim).stop();
        }
    }, [isTracking]);

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
                location.accuracy || 10
            );
            setValidationResult(result);

            if (result.status === 'inside' && result.building) {
                const buildingId = result.building.id;
                if (result.building.is_active === false) {
                    // Building is closed, do not attempt to unlock
                } else if (lastUnlockAttempt !== buildingId) {
                    try {
                        const unlockResult = await attemptUnlock(location.latitude, location.longitude, location.accuracy || 10);
                        setLastUnlockAttempt(buildingId);
                        
                        SoundManager.play('building_unlock');

                        // Show badge toast if any newly earned
                        const badges = unlockResult?.newly_earned_badges || [];
                        if (badges.length > 0) {
                            setTimeout(() => {
                                SoundManager.play('badge_earned');
                            }, 1500); // slight delay so it doesn't clash with building unlock

                            setEarnedBadges(badges);
                            badgeAnim.setValue(0);
                            Animated.sequence([
                                Animated.spring(badgeAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
                            ]).start(() => {
                                setTimeout(() => {
                                    Animated.timing(badgeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setEarnedBadges([]));
                                }, 3500);
                            });
                        }
                    } catch (err) {
                        console.log('Unlock attempt:', err);
                    }
                }
            }
        } catch (err) {
            console.error('Validation error:', err);
        } finally {
            setIsValidating(false);
        }
    };

    const handleStartTracking = async () => {
        if (permissionStatus !== 'granted') {
            await requestPermission();
        }
        startTracking();
    };

    return (
        <View style={{ flex: 1 }}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>AR Explorer</Text>
                <Text style={styles.subtitle}>Scan campus to unlock AR content</Text>
            </View>

            {/* Radar Section */}
            <View style={styles.radarContainer}>
                <Animated.View style={[
                    styles.radarRing, 
                    isTracking && styles.radarRingActive,
                    { transform: [{ scale: pulseAnim }] }
                ]} />
                
                <TouchableOpacity 
                    style={[styles.radarButton, isTracking && styles.radarButtonActive]} 
                    onPress={isTracking ? stopTracking : handleStartTracking}
                    activeOpacity={0.8}
                >
                    <Ionicons name={isTracking ? "power" : "scan-circle"} size={50} color={theme.colors.white} />
                    <Text style={styles.radarButtonText}>
                        {isTracking ? "STOP SCAN" : "START SCAN"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Error States */}
            {permissionStatus === 'denied' && (
                <View style={styles.alertBox}>
                    <Ionicons name="warning" size={24} color={theme.colors.error} />
                    <Text style={styles.alertText}>Location permission denied. Please enable it in settings.</Text>
                </View>
            )}
            {error && (
                <View style={styles.alertBox}>
                    <Ionicons name="alert-circle" size={24} color={theme.colors.error} />
                    <Text style={styles.alertText}>{error}</Text>
                </View>
            )}

            {/* Active Scanning Status HUD */}
            {isTracking && (
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Ionicons name="hardware-chip-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.cardTitle}>TELEMETRY DATA</Text>
                    </View>
                    
                    {location ? (
                        <View style={styles.telemetryGrid}>
                            <View style={styles.telemetryItem}>
                                <Text style={styles.telemetryLabel}>LATITUDE</Text>
                                <Text style={styles.telemetryValue}>{location.latitude.toFixed(5)}°</Text>
                            </View>
                            <View style={styles.telemetryItem}>
                                <Text style={styles.telemetryLabel}>LONGITUDE</Text>
                                <Text style={styles.telemetryValue}>{location.longitude.toFixed(5)}°</Text>
                            </View>
                            <View style={styles.telemetryItem}>
                                <Text style={styles.telemetryLabel}>ACCURACY</Text>
                                <Text style={styles.telemetryValue}>±{location.accuracy?.toFixed(1)}m</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                            <Text style={styles.loadingText}>Acquiring GPS Signal...</Text>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.cardHeaderRow}>
                        <Ionicons name="radar-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.cardTitle}>TARGET SCAN</Text>
                    </View>

                    {isValidating ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                            <Text style={styles.loadingText}>Analyzing surroundings...</Text>
                        </View>
                    ) : validationResult?.building ? (
                        <View style={[styles.targetBox, validationResult.status === 'inside' ? (validationResult.building.is_active === false ? styles.targetLocked : styles.targetUnlocked) : styles.targetLocked]}>
                            <View style={styles.targetIcon}>
                                <Ionicons 
                                    name={validationResult.status === 'inside' ? (validationResult.building.is_active === false ? "warning" : "unlock") : "lock-closed"} 
                                    size={30} 
                                    color={validationResult.status === 'inside' && validationResult.building.is_active !== false ? theme.colors.white : theme.colors.primary} 
                                />
                            </View>
                            <View style={styles.targetInfo}>
                                <Text style={[styles.targetName, validationResult.status === 'inside' && validationResult.building.is_active !== false && styles.textWhite]}>
                                    {validationResult.building.name}
                                </Text>
                                <Text style={[styles.targetDistance, validationResult.status === 'inside' && validationResult.building.is_active !== false && styles.textWhite, validationResult.building.is_active === false && {color: theme.colors.error}]}>
                                    {validationResult.status === 'inside' 
                                        ? (validationResult.building.is_active === false ? 'Building Closed / Under Renovation' : 'AR Content Unlocked!') 
                                        : `Distance: ${validationResult.distance_meters}m away`}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.noTargetBox}>
                            <Text style={styles.noTargetText}>No buildings detected in immediate vicinity.</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Nearby Buildings List */}
            {nearbyBuildings.length > 0 && (
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.cardTitle}>NEARBY LOCATIONS</Text>
                    </View>
                    
                    {nearbyBuildings.map((building, index) => {
                        const unlockedRecord = unlockedBuildings.find(ub => ub.id === building.id);
                        const hasVisited = unlockedRecord ? (role === 'professional' ? unlockedRecord.visited : true) : false;
                        return (
                            <View key={building.id} style={[styles.nearbyRow, index < nearbyBuildings.length - 1 && styles.nearbyDivider]}>
                                <View style={styles.nearbyIconWrapper}>
                                    <Ionicons 
                                        name={hasVisited ? "checkmark-circle" : "lock-closed"} 
                                        size={20} 
                                        color={hasVisited ? theme.colors.arHighlight : theme.colors.textMuted} 
                                    />
                                </View>
                                <View style={styles.nearbyInfo}>
                                    <Text style={styles.nearbyName} numberOfLines={1}>{building.name}</Text>
                                    <Text style={styles.nearbyDistance}>{building.distance}m away</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.navigateBtn}
                                    onPress={() => {
                                        router.push('/buildings');
                                    }}
                                >
                                    <Ionicons name="navigate" size={16} color={theme.colors.white} />
                                    <Text style={styles.navigateText}>NAV</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Gamified Widgets (Visible regardless of tracking, but hidden for visitors) */}
            
            {role !== 'visitor' && (
                <>
                    {/* 1. Progress Tracker */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>EXPLORATION PROGRESS</Text>
                        <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                        </View>
                        <Text style={styles.progressText}>
                            {unlockedBuildings.length} / {totalBuildings || 15} Buildings Unlocked
                        </Text>
                    </View>

                    {/* 2. Daily Quest */}
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Ionicons name="map-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.cardTitle}>YOUR DAILY QUEST</Text>
                        </View>
                        
                        {activeQuests.length > 0 ? (
                            activeQuests.map((quest) => {
                                if (quest.is_completed) return null; // Skip completed quests here
                                return (
                                    <View key={quest.id} style={{ marginBottom: theme.spacing.md }}>
                                        <Text style={styles.questHint}>
                                            "{quest.hint}"
                                        </Text>
                                        <View style={styles.compassContainer}>
                                            <Ionicons name="star" size={20} color={theme.colors.primary} />
                                            <Text style={styles.compassText}>Reward: {quest.reward_points} Points</Text>
                                        </View>
                                    </View>
                                );
                            })
                        ) : (
                            <Text style={styles.emptyLogText}>No active quests at the moment. Keep exploring!</Text>
                        )}
                    </View>

                    {/* 4. Discovery Log */}
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.cardTitle}>RECENT DISCOVERIES</Text>
                        </View>
                        
                        {unlockedBuildings.length > 0 ? (
                            unlockedBuildings.slice(0, 3).map((b, idx) => (
                                <View key={b.id} style={styles.logItem}>
                                    <View style={styles.logDot} />
                                    <View style={styles.logContent}>
                                        <Text style={styles.logTime}>{idx === 0 ? 'Just Now' : 'Earlier'}</Text>
                                        <Text style={styles.logText}>Unlocked {b.name} AR capabilities</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyLogText}>No discoveries yet. Start scanning!</Text>
                        )}
                    </View>
                </>
            )}

        </ScrollView>

            {/* Badge Earned Toast */}
            {earnedBadges.length > 0 && (
                <Animated.View style={[styles.badgeToast, {
                    opacity: badgeAnim,
                    transform: [{ translateY: badgeAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }]
                }]}>
                    <Text style={styles.badgeToastEmoji}>{earnedBadges[0].icon}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.badgeToastLabel}>BADGE UNLOCKED</Text>
                        <Text style={styles.badgeToastName}>{earnedBadges[0].name}</Text>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
    },
    contentContainer: {
        padding: theme.spacing.lg,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    title: {
        fontFamily: fonts.heading.bold,
        fontSize: 28,
        fontWeight: '900',
        color: theme.colors.primary,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: theme.typography.md,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    radarContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 220,
        marginBottom: theme.spacing.md,
    },
    radarRing: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    radarRingActive: {
        borderColor: 'rgba(178, 24, 48, 0.4)', // Web Red
        backgroundColor: 'rgba(178, 24, 48, 0.05)',
    },
    radarButton: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    radarButtonActive: {
        backgroundColor: '#610F27',
        shadowOpacity: 0.5,
    },
    radarButtonText: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.white,
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 8,
        letterSpacing: 1,
    },
    alertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff0f0',
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: '#ffcaca',
        marginBottom: theme.spacing.md,
    },
    alertText: {
        flex: 1,
        color: theme.colors.error,
        marginLeft: theme.spacing.sm,
        fontSize: theme.typography.sm,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        marginBottom: theme.spacing.md,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    cardTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        fontWeight: '900',
        color: theme.colors.textSecondary,
        letterSpacing: 1.5,
        marginLeft: 6,
    },
    telemetryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.bgSecondary,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
    },
    telemetryItem: {
        alignItems: 'center',
    },
    telemetryLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    telemetryValue: {
        fontFamily: fonts.hud.bold,
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    loadingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
    },
    loadingText: {
        color: theme.colors.textSecondary,
        marginLeft: theme.spacing.sm,
        fontSize: theme.typography.sm,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.lg,
    },
    targetBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 2,
    },
    targetLocked: {
        backgroundColor: theme.colors.bgSecondary,
        borderColor: theme.colors.border,
    },
    targetUnlocked: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    },
    targetIcon: {
        marginRight: theme.spacing.md,
    },
    targetInfo: {
        flex: 1,
    },
    targetName: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    targetDistance: {
        fontFamily: fonts.hud.bold,
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    textWhite: {
        color: theme.colors.white,
    },
    noTargetBox: {
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.bgSecondary,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
    },
    noTargetText: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.sm,
        fontStyle: 'italic',
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: theme.colors.bgSecondary,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: theme.spacing.sm,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    progressText: {
        fontSize: theme.typography.sm,
        color: theme.colors.textSecondary,
        textAlign: 'right',
        fontWeight: '600',
    },
    questHint: {
        fontSize: 15,
        color: theme.colors.textPrimary,
        fontStyle: 'italic',
        lineHeight: 22,
        marginBottom: theme.spacing.md,
    },
    compassContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.bgSecondary,
        padding: theme.spacing.sm,
        borderRadius: theme.radius.sm,
    },
    compassText: {
        fontSize: theme.typography.sm,
        color: theme.colors.textSecondary,
        marginLeft: theme.spacing.sm,
        fontWeight: '600',
    },
    challengeText: {
        fontSize: theme.typography.md,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    challengeProgress: {
        fontSize: theme.typography.sm,
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    logItem: {
        flexDirection: 'row',
        marginBottom: theme.spacing.md,
    },
    logDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.primary,
        marginTop: 4,
        marginRight: theme.spacing.sm,
    },
    logDotGray: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.border,
        marginTop: 4,
        marginRight: theme.spacing.sm,
    },
    logContent: {
        flex: 1,
    },
    logTime: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    logText: {
        fontSize: theme.typography.sm,
        color: theme.colors.textPrimary,
    },
    emptyLogText: {
        fontSize: theme.typography.sm,
        color: theme.colors.textMuted,
        fontStyle: 'italic',
        marginBottom: theme.spacing.md,
    },
    badgeToast: {
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(20, 20, 20, 0.96)',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#FFD700',
        gap: 12,
        zIndex: 999,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 20,
    },
    badgeToastEmoji: {
        fontSize: 32,
    },
    badgeToastLabel: {
        color: '#FFD700',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 2,
    },
    badgeToastName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    nearbyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    nearbyDivider: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    nearbyIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.surfaceSoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    nearbyInfo: {
        flex: 1,
    },
    nearbyName: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.textPrimary,
        fontSize: 13,
        marginBottom: 2,
    },
    nearbyDistance: {
        fontFamily: fonts.hud.medium,
        color: theme.colors.primary,
        fontSize: 11,
        letterSpacing: 1,
    },
    navigateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginLeft: 10,
    },
    navigateText: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.white,
        fontSize: 11,
        marginLeft: 4,
    },
});

