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
    const [recentActivity, setRecentActivity] = useState([]);

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
            if (user?.role !== 'student') {
                setLoading(false);
                return;
            }
            try {
                // Fetch stats
                const resStats = await api.get('/api/gamification/leaderboard/');
                if (resStats.data.success) {
                    const myStats = resStats.data.data.find(r => r.username === user.username);
                    setStats(myStats);
                }
                
                // Fetch active quest
                const resQuest = await api.get('/api/gamification/quests/active/');
                if (resQuest.data.success && resQuest.data.data.length > 0) {
                    setActiveQuest(resQuest.data.data[0]);
                }

                // Fetch recent activity
                const resActivity = await api.get('/api/gamification/recent-activity/');
                if (resActivity.data.success) {
                    setRecentActivity(resActivity.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch gamification data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Format date string for intel feed
    const timeSince = (dateString) => {
        const date = new Date(dateString);
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " yrs ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " mos ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hrs ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " mins ago";
        return Math.floor(seconds) + " secs ago";
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.glowOrbTop} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.headerCard}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.greeting}>SYSTEM ONLINE</Text>
                        <Text style={styles.title}>Welcome, {user?.username || "Guest"}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{user?.role?.toUpperCase() || "UNKNOWN"}</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={[styles.gpsIndicator, location ? styles.gpsActive : styles.gpsSearching]} />
                        <Text style={styles.gpsText}>{location ? "GPS LOCKED" : "SEARCHING..."}</Text>
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
                                <Text style={styles.splitValue}>{distanceToNearest !== null ? `${distanceToNearest}m` : "--"}</Text>
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
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>TARGET ACQUISITION</Text>
                        <TouchableOpacity style={styles.seeAll} onPress={() => router.push('/(tabs)/explore')}>
                            <Text style={styles.seeAllText}>VIEW MAP</Text>
                            <ChevronRight color={theme.colors.arHighlight} size={14} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.targetCard} onPress={() => router.push('/(tabs)/buildings')}>
                        <View style={styles.targetImagePlaceholder}>
                            <MapIcon color="rgba(255,255,255,0.2)" size={48} />
                        </View>
                        <View style={styles.targetInfo}>
                            <Text style={styles.targetCardTitle}>{activeQuest ? activeQuest.target_building_name : "NO ACTIVE QUESTS"}</Text>
                            <Text style={styles.targetCardSub}>{activeQuest ? activeQuest.title : "Check back later for new targets."}</Text>
                            {activeQuest && (
                                <View style={styles.expBadge}>
                                    <Text style={styles.expBadgeText}>+{activeQuest.reward_points} EXP</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
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

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>LIVE INTEL FEED</Text>
                        <Activity color={theme.colors.textSecondary} size={14} />
                    </View>
                    <ARGlassCard style={styles.intelCard}>
                        {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                            <React.Fragment key={index}>
                                <View style={styles.intelRow}>
                                    <View style={[styles.intelDot, index === 0 ? {} : { backgroundColor: theme.colors.accent }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.intelText} numberOfLines={1}>
                                            <Text style={{fontWeight: 'bold'}}>{activity.username}</Text> finished {activity.quest_title}
                                        </Text>
                                        <Text style={{fontSize: 10, color: theme.colors.accent, fontFamily: fonts.hud.medium}}>+{activity.points} EXP at {activity.building_name}</Text>
                                    </View>
                                    <Text style={styles.intelTime}>{timeSince(activity.time_ago)}</Text>
                                </View>
                                {index < recentActivity.length - 1 && <View style={styles.intelDivider} />}
                            </React.Fragment>
                        )) : (
                            <View style={[styles.intelRow, { paddingVertical: 12 }]}>
                                <Text style={[styles.intelText, { textAlign: 'center', color: theme.colors.textMuted }]}>
                                    No recent network activity detected.
                                </Text>
                            </View>
                        )}
                    </ARGlassCard>
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
    intelCard: {
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
    },
    intelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    intelDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.arHighlight,
        marginRight: 12,
    },
    intelText: {
        flex: 1,
        fontFamily: fonts.body.regular,
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    intelTime: {
        fontFamily: fonts.hud.medium,
        color: theme.colors.textMuted,
        fontSize: 10,
        marginLeft: 8,
    },
    intelDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginLeft: 20,
    },
});
