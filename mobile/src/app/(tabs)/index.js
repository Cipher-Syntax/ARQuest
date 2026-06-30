import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import theme from "../../theme/tokens";
import { fonts } from "../../constants/typography";
import ARGlassCard from "../../components/ARGlassCard";
import ARButton from "../../components/ARButton";
import { Trophy, Compass, Crosshair, MapPin, Map as MapIcon, ScanLine, BarChart2, ChevronRight, Box, Activity } from "lucide-react-native";
import { router } from "expo-router";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { geofencingService } from "../../services/geofencingService";

export default function HomeScreen() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const { location, startTracking } = useLocationTracking();
    const [buildings, setBuildings] = useState([]);
    const [nearestBuilding, setNearestBuilding] = useState(null);
    const [distanceToNearest, setDistanceToNearest] = useState(null);
    
    useEffect(() => {
        startTracking();
    }, []);
    
    // Gamification Backend States
    const [activeQuest, setActiveQuest] = useState(null);

    useEffect(() => {
        const fetchBuildings = async () => {
            try {
                const res = await api.get('/api/buildings/');
                if (res.data.success) {
                    setBuildings(res.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch buildings", error);
            }
        };
        fetchBuildings();
    }, []);

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

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch stats (only for students)
                if (user?.role === 'student') {
                    const resStats = await api.get('/api/gamification/leaderboard/');
                    if (resStats.data.success) {
                        const myStats = resStats.data.data.find(r => r.username === user.username);
                        setStats(myStats);
                    }
                }
                
                // Fetch active quest
                const resQuest = await api.get('/api/gamification/quests/active/');
                if (resQuest.data.success && resQuest.data.data.length > 0) {
                    setActiveQuest(resQuest.data.data[0]);
                }
            } catch (error) {
                console.error('Failed to fetch gamification data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.glowOrbTop} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.headerCard}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.greeting}>SYSTEM ONLINE</Text>
                        <Text style={styles.title}>Welcome, {user?.username || "Guest"}</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleText}>{user?.role?.toUpperCase() || "UNKNOWN"}</Text>
                            </View>
                            {user?.role === 'student' && user?.rank_info && (
                                <View style={styles.rankBadgeHome}>
                                    <Text style={styles.rankIconHome}>{user.rank_info.icon}</Text>
                                    <Text style={styles.rankTextHome}>Lv.{user.rank_info.level}</Text>
                                </View>
                            )}
                            {user?.role === 'student' && user?.streak_count > 0 && (
                                <View style={styles.streakChipHome}>
                                    <Text style={styles.streakFlame}>🔥</Text>
                                    <Text style={styles.streakTextHome}>{user.streak_count}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={[styles.gpsIndicator, location ? styles.gpsActive : styles.gpsSearching]} />
                        <Text style={styles.gpsText}>{location ? "GPS LOCKED" : "SEARCHING..."}</Text>
                    </View>
                </View>

                {/* --- Daily Mission Hero Card (#5) --- */}
                <View style={styles.heroCard}>
                    <View style={styles.heroTopRow}>
                        <View style={styles.heroLabelChip}>
                            <Crosshair color="rgba(255,255,255,0.9)" size={12} />
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
                                color={activeQuest ? theme.colors.primary : 'rgba(255,255,255,0.4)'}
                                size={16}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {user?.role === 'student' && (
                    <View style={styles.splitRow}>
                        <ARGlassCard style={styles.splitCard}>
                            {loading ? (
                                <ActivityIndicator color={theme.colors.arHighlight} />
                            ) : (
                                <View style={styles.splitCardInner}>
                                    <Trophy color={theme.colors.accent} size={24} />
                                    <Text style={styles.splitValue}>{stats?.points || 0}</Text>
                                    <Text style={styles.splitLabel}>EXP POINTS</Text>
                                    
                                    <View style={styles.miniDivider} />
                                    
                                    <Text style={styles.splitSubValue}>#{stats?.rank || "--"}</Text>
                                    <Text style={styles.splitSubLabel}>GLOBAL RANK</Text>
                                </View>
                            )}
                        </ARGlassCard>

                        <ARGlassCard style={styles.splitCard}>
                            <View style={styles.splitCardInner}>
                                <MapPin color={theme.colors.arHighlight} size={24} />
                                <Text style={styles.splitValue}>{distanceToNearest !== null ? `${(distanceToNearest / 1000).toFixed(2)} km` : "--"}</Text>
                                <Text style={styles.splitLabel}>DISTANCE</Text>
                                
                                <View style={styles.miniDivider} />
                                
                                <Text style={styles.targetName} numberOfLines={2}>
                                    {nearestBuilding ? nearestBuilding.name : "ACQUIRING TARGET"}
                                </Text>
                                <Text style={styles.splitSubLabel}>NEAREST NODE</Text>
                            </View>
                        </ARGlassCard>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
                    <View style={styles.actionGrid}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/ar')}>
                            <View style={styles.actionIconWrap}>
                                <ScanLine color={theme.colors.primary} size={24} />
                            </View>
                            <Text style={styles.actionText}>Deploy AR</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/buildings')}>
                            <View style={styles.actionIconWrap}>
                                <MapIcon color={theme.colors.primary} size={24} />
                            </View>
                            <Text style={styles.actionText}>Radar Map</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/leaderboard')}>
                            <View style={styles.actionIconWrap}>
                                <BarChart2 color={theme.colors.primary} size={24} />
                            </View>
                            <Text style={styles.actionText}>Rankings</Text>
                        </TouchableOpacity>
                    </View>
                </View>



                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ASSET LIBRARY</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assetScroll}>
                        {buildings.length > 0 ? buildings.slice(0, 5).map((b, idx) => (
                            <TouchableOpacity key={b.id || idx} style={styles.assetCard} onPress={() => router.push('/(tabs)/buildings')}>
                                <Box color={theme.colors.accent} size={32} style={{ marginBottom: 10 }} />
                                <Text style={styles.assetName} numberOfLines={2}>{b.name}</Text>
                            </TouchableOpacity>
                        )) : (
                            <View style={[styles.assetCard, { opacity: 0.5 }]}>
                                <ActivityIndicator color={theme.colors.arHighlight} />
                            </View>
                        )}
                    </ScrollView>
                </View>


            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
    },
    glowOrbTop: {
        position: 'absolute',
        top: -50,
        right: -100,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: theme.colors.primaryDark,
        opacity: 0.6,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: 40,
    },
    headerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        marginTop: theme.spacing.md,
        backgroundColor: theme.colors.surfaceSoft,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 10,
    },
    gpsIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginBottom: 4,
    },
    gpsActive: {
        backgroundColor: theme.colors.success,
        shadowColor: theme.colors.success,
        shadowOpacity: 0.8,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 0 },
    },
    gpsSearching: {
        backgroundColor: theme.colors.accent,
    },
    gpsText: {
        fontFamily: fonts.body.bold,
        fontSize: 8,
        color: theme.colors.textMuted,
        letterSpacing: 1,
    },
    greeting: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.arHighlight,
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 2,
        marginBottom: 4,
    },
    title: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.textPrimary,
        fontSize: 28,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 10,
    },
    roleBadge: {
        backgroundColor: "rgba(234, 179, 8, 0.15)",
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: theme.radius.sm,
        borderWidth: 1,
        borderColor: theme.colors.accent,
    },
    roleText: {
        fontFamily: fonts.body.medium,
        color: theme.colors.accent,
        fontSize: 10,
        fontWeight: "bold",
        letterSpacing: 1,
    },
    rankBadgeHome: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: theme.radius.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    rankIconHome: {
        fontSize: 12,
        marginRight: 4,
    },
    rankTextHome: {
        fontFamily: fonts.body.bold,
        color: theme.colors.white,
        fontSize: 10,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },
    streakChipHome: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(241, 100, 30, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: theme.radius.sm,
        borderWidth: 1,
        borderColor: 'rgba(241, 100, 30, 0.5)',
    },
    streakFlame: {
        fontSize: 12,
        marginRight: 3,
    },
    streakTextHome: {
        fontFamily: fonts.body.bold,
        color: '#F1641E',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    splitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
        gap: 12,
    },
    splitCard: {
        flex: 1,
        padding: theme.spacing.md,
    },
    splitCardInner: {
        alignItems: 'center',
    },
    splitValue: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.textPrimary,
        fontSize: 32,
        fontWeight: "900",
        marginTop: 8,
    },
    splitLabel: {
        fontFamily: fonts.hud.medium,
        color: theme.colors.textMuted,
        fontSize: 10,
        fontWeight: "bold",
        letterSpacing: 1,
        marginTop: 4,
    },
    miniDivider: {
        width: '50%',
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 12,
    },
    splitSubValue: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.arHighlight,
        fontSize: 18,
        fontWeight: "900",
    },
    targetName: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.arHighlight,
        fontSize: 14,
        fontWeight: "bold",
        textAlign: 'center',
    },
    splitSubLabel: {
        fontFamily: fonts.hud.medium,
        color: theme.colors.textSecondary,
        fontSize: 8,
        fontWeight: "bold",
        letterSpacing: 1,
        marginTop: 2,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontFamily: fonts.heading.medium,
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 2,
        marginBottom: theme.spacing.sm,
    },
    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    actionIconWrap: {
        backgroundColor: 'rgba(178, 24, 48, 0.1)',
        padding: 12,
        borderRadius: 24,
        marginBottom: 8,
    },
    actionText: {
        fontFamily: fonts.heading.medium,
        color: theme.colors.textPrimary,
        fontSize: 11,
        fontWeight: 'bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    seeAll: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    seeAllText: {
        fontFamily: fonts.body.bold,
        color: theme.colors.arHighlight,
        fontSize: 10,
        marginRight: 2,
    },
    targetCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    targetImagePlaceholder: {
        height: 120,
        backgroundColor: theme.colors.surfaceSoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    targetInfo: {
        padding: theme.spacing.md,
    },
    targetCardTitle: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.textPrimary,
        fontSize: 18,
        marginBottom: 2,
    },
    targetCardSub: {
        fontFamily: fonts.body.regular,
        color: theme.colors.textMuted,
        fontSize: 12,
        marginBottom: 10,
    },
    expBadge: {
        backgroundColor: 'rgba(234, 179, 8, 0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.colors.accent,
    },
    expBadgeText: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.accent,
        fontSize: 12,
    },
    assetScroll: {
        gap: 12,
        paddingRight: 20,
    },
    assetCard: {
        backgroundColor: theme.colors.surfaceSoft,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.sm,
    },
    assetName: {
        fontFamily: fonts.heading.medium,
        color: theme.colors.textPrimary,
        fontSize: 12,
        textAlign: 'center',
    },
    // ── Daily Mission Hero Card ──
    heroCard: {
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.xl,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        padding: theme.spacing.lg,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    heroLabelChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: theme.radius.full,
    },
    heroChipText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: 'rgba(255,255,255,0.9)',
        letterSpacing: 1.5,
    },
    heroExpBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
    },
    heroExpText: {
        fontFamily: fonts.hud.bold,
        fontSize: 12,
        color: '#FFFFFF',
    },
    heroQuestTitle: {
        fontFamily: fonts.hud.bold,
        fontSize: 20,
        color: '#FFFFFF',
        textTransform: 'uppercase',
        marginBottom: theme.spacing.md,
        lineHeight: 26,
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
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1,
        marginBottom: 2,
    },
    heroTargetValue: {
        fontFamily: fonts.body.bold,
        fontSize: 14,
        color: '#FFFFFF',
    },
    heroDeployBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: theme.radius.md,
        gap: 4,
    },
    heroDeployBtnDisabled: {
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    heroDeployText: {
        fontFamily: fonts.heading.bold,
        fontSize: 13,
        color: theme.colors.primary,
        letterSpacing: 1,
    },
    heroDeployTextDisabled: {
        color: 'rgba(255,255,255,0.4)',
    },
});
