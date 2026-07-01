import React, { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, Animated, Image, RefreshControl } from "react-native";
import { StatusBar } from "expo-status-bar";

import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import theme from "../../theme/tokens";
import { fonts } from "../../constants/typography";
import ARGlassCard from "../../components/ARGlassCard";
import ARButton from "../../components/ARButton";
import { Trophy, Compass, Crosshair, MapPin, Map as MapIcon, ScanLine, BarChart2, ChevronRight, Box, Activity, Timer } from "lucide-react-native";
import { router } from "expo-router";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { geofencingService } from "../../services/geofencingService";

export default function HomeScreen() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Carousel
    const scrollX = React.useRef(new Animated.Value(0)).current;
    const SCREEN_WIDTH = Dimensions.get('window').width;
    const CAROUSEL_WIDTH = SCREEN_WIDTH; // Bleed to edges
    const ITEM_WIDTH = SCREEN_WIDTH - 40; // Exact width of daily mission card
    const ITEM_SPACING = 12;
    const FULL_ITEM_WIDTH = ITEM_WIDTH + ITEM_SPACING;
    const INSET_HORIZONTAL = (CAROUSEL_WIDTH - ITEM_WIDTH) / 2;

    const { location, startTracking } = useLocationTracking();
    const [buildings, setBuildings] = useState([]);
    const [nearestBuilding, setNearestBuilding] = useState(null);
    const [distanceToNearest, setDistanceToNearest] = useState(null);
    
    useEffect(() => {
        startTracking();
    }, []);
    
    // Gamification Backend States
    const [activeQuest, setActiveQuest] = useState(null);

    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const resBuildings = await api.get('/api/buildings/');
            if (resBuildings.data.success) {
                setBuildings(resBuildings.data.data);
            }

            if (user?.role === 'student') {
                const resStats = await api.get('/api/gamification/leaderboard/');
                if (resStats.data.success) {
                    const myStats = resStats.data.data.find(r => r.username === user.username);
                    setStats(myStats);
                }
            }
            
            const resQuest = await api.get('/api/gamification/quests/active/');
            if (resQuest.data.success && resQuest.data.data.length > 0) {
                setActiveQuest(resQuest.data.data[0]);
            } else {
                setActiveQuest(null);
            }

            const resChallenges = await api.get('/api/gamification/challenges/');
            if (resChallenges.data.success) {
                setChallenges(resChallenges.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch gamification data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (location && buildings.length > 0) {
            let minDistance = Infinity;
            let nearest = null;
            
            buildings.forEach(b => {
                if (b.latitude && b.longitude) {
                    const dist = geofencingService.calculateDistance(
                        location.latitude, location.longitude, 
                        parseFloat(b.latitude), parseFloat(b.longitude)
                    );
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearest = b;
                    }
                }
            });
            
            if (nearest) {
                setNearestBuilding(nearest);
                setDistanceToNearest(Math.round(minDistance));
            }
        }
    }, [location, buildings]);

    const [challenges, setChallenges] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={"#FFFFFF"} />}
            >
                {/* Massive Crimson Header */}
                <LinearGradient colors={['#9b1b30', '#7a1525']} style={styles.crimsonHeader}>
                    <View style={styles.headerTopRow}>
                        <View style={styles.userInfo}>
                            <Text style={styles.greeting}>SYSTEM ONLINE</Text>
                            <Text style={styles.username}>{user?.username || "Guest"}</Text>
                            {user?.role === 'student' && user?.rank_info && (
                                <Text style={styles.userLevel}>Lv.{user.rank_info.level} Explorer</Text>
                            )}
                        </View>
                        <View style={styles.headerRight}>
                            {user?.role === 'student' && user?.streak_count > 0 && (
                                <View style={styles.streakBadge}>
                                    <Text style={styles.streakFlame}>🔥</Text>
                                    <Text style={styles.streakText}>{user.streak_count}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    
                    {user?.role === 'student' && (
                        <View style={styles.expContainer}>
                            <View style={styles.expTextRow}>
                                <Text style={styles.expLabel}>EXP PROGRESS</Text>
                                <Text style={styles.expValue}>{stats?.points || 0} PTS</Text>
                            </View>
                            <View style={styles.expBarTrack}>
                                <View style={[styles.expBarFill, { width: '65%' }]} /> 
                            </View>
                        </View>
                    )}
                </LinearGradient>

                <View style={styles.contentArea}>
                    {/* --- Daily Mission Hero Card --- */}
                    <View style={styles.heroCard}>
                        <View style={styles.heroTopRow}>
                            <View style={styles.heroLabelChip}>
                                <Crosshair color={theme.colors.primary} size={14} />
                                <Text style={styles.heroChipText}>DAILY MISSION</Text>
                            </View>
                            {activeQuest && (
                                <View style={styles.heroExpBadge}>
                                    <Text style={styles.heroExpText}>+{activeQuest.reward_points} EXP</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.heroQuestTitle} numberOfLines={2}>
                            {loading ? 'Loading...' : (activeQuest ? activeQuest.title : 'STANDBY FOR ORDERS')}
                        </Text>

                        <View style={styles.heroBottomRow}>
                            <View style={styles.heroTargetInfo}>
                                <Text style={styles.heroTargetLabel}>TARGET NODE</Text>
                                <Text style={styles.heroTargetValue} numberOfLines={1}>
                                    {activeQuest ? activeQuest.target_building_name : 'No active quests'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.heroDeployBtn, !activeQuest && styles.heroDeployBtnDisabled]}
                                onPress={() => router.push('/(tabs)/ar')}
                                disabled={!activeQuest}
                            >
                                <Text style={[styles.heroDeployText, !activeQuest && styles.heroDeployTextDisabled]}>
                                    {activeQuest ? 'DEPLOY' : 'STANDBY'}
                                </Text>
                                <ChevronRight
                                    color={activeQuest ? '#FFFFFF' : 'rgba(138,21,56,0.5)'}
                                    size={18}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Quick Stats Split Row */}
                    {user?.role === 'student' && (
                        <View style={styles.splitRow}>
                            <View style={styles.splitCard}>
                                <View style={styles.splitIconWrap}>
                                    <Trophy color={theme.colors.primary} size={24} />
                                </View>
                                <Text style={styles.splitValue}>#{stats?.rank || "--"}</Text>
                                <Text style={styles.splitLabel}>GLOBAL RANK</Text>
                            </View>

                            <View style={styles.splitCard}>
                                <View style={styles.splitIconWrap}>
                                    <MapPin color={theme.colors.primary} size={24} />
                                </View>
                                <Text style={styles.splitValue}>{distanceToNearest !== null ? `${(distanceToNearest / 1000).toFixed(2)}km` : "--"}</Text>
                                <Text style={styles.splitLabel}>NEAREST NODE</Text>
                            </View>
                        </View>
                    )}

                    {/* Quick Actions */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
                        <View style={styles.actionGrid}>
                            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/ar')}>
                                <View style={styles.actionIconWrap}>
                                    <ScanLine color={theme.colors.primary} size={24} />
                                </View>
                                <Text style={styles.actionText}>AR Scanner</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/leaderboard')}>
                                <View style={styles.actionIconWrap}>
                                    <BarChart2 color={theme.colors.primary} size={24} />
                                </View>
                                <Text style={styles.actionText}>Rankings</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/badges')}>
                                <View style={styles.actionIconWrap}>
                                    <Trophy color={theme.colors.primary} size={24} />
                                </View>
                                <Text style={styles.actionText}>Badges</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/buildings')}>
                                <View style={styles.actionIconWrap}>
                                    <MapIcon color={theme.colors.primary} size={24} />
                                </View>
                                <Text style={styles.actionText}>Locations</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB', // Crisp off-white background
    },
    scrollContent: {
        paddingBottom: 60,
    },
    crimsonHeader: {
        paddingTop: 80, // Safe area + padding
        paddingBottom: 50,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        shadowColor: '#9b1b30',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 15,
        zIndex: 10,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    userInfo: {
        flex: 1,
    },
    greeting: {
        fontFamily: fonts.heading.bold,
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        letterSpacing: 2,
        marginBottom: 4,
    },
    username: {
        fontFamily: fonts.heading.bold,
        color: '#FFFFFF',
        fontSize: 28,
        letterSpacing: 1,
    },
    userLevel: {
        fontFamily: fonts.body.bold,
        color: '#FFFFFF',
        fontSize: 13,
        marginTop: 4,
        opacity: 0.9,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    streakFlame: {
        fontSize: 16,
        marginRight: 4,
    },
    streakText: {
        fontFamily: fonts.heading.bold,
        color: '#FFFFFF',
        fontSize: 14,
    },
    expContainer: {
        marginTop: 10,
    },
    expTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    expLabel: {
        fontFamily: fonts.heading.bold,
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        letterSpacing: 1,
    },
    expValue: {
        fontFamily: fonts.hud.bold,
        color: '#FFFFFF',
        fontSize: 12,
    },
    expBarTrack: {
        height: 8,
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    expBarFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
    },
    contentArea: {
        paddingHorizontal: 20,
        marginTop: -30, // Pull up into the header slightly to overlap
        zIndex: 20,
    },
    heroCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        marginBottom: 24,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroLabelChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(155, 27, 48, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.radius.full,
    },
    heroChipText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: theme.colors.primary,
        letterSpacing: 1.5,
    },
    heroExpBadge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: theme.radius.full,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    heroExpText: {
        fontFamily: fonts.hud.bold,
        fontSize: 12,
        color: '#FFFFFF',
    },
    heroQuestTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 22,
        color: theme.colors.textPrimary,
        lineHeight: 28,
        marginBottom: 20,
    },
    heroBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroTargetInfo: {
        flex: 1,
        marginRight: theme.spacing.md,
    },
    heroTargetLabel: {
        fontFamily: fonts.body.regular,
        fontSize: 10,
        color: theme.colors.textMuted,
        letterSpacing: 1,
        marginBottom: 4,
    },
    heroTargetValue: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: theme.colors.textPrimary,
    },
    heroDeployBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: theme.radius.sm,
        gap: 6,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },
    heroDeployBtnDisabled: {
        backgroundColor: theme.colors.surfaceSoft,
        shadowOpacity: 0,
        elevation: 0,
    },
    heroDeployText: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    heroDeployTextDisabled: {
        color: theme.colors.textMuted,
    },
    splitRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 30,
    },
    splitCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: theme.radius.lg,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
    },
    splitIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(155, 27, 48, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    splitValue: {
        fontFamily: fonts.heading.bold,
        fontSize: 24,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    splitLabel: {
        fontFamily: fonts.body.bold,
        fontSize: 10,
        color: theme.colors.textMuted,
        letterSpacing: 1,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: theme.colors.textSecondary,
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    actionCard: {
        flex: 1,
        minWidth: '28%',
        backgroundColor: '#FFFFFF',
        borderRadius: theme.radius.lg,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
    },
    actionIconWrap: {
        marginBottom: 12,
    },
    actionText: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: theme.colors.textPrimary,
    },
});
