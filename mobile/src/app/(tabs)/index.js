import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import theme from "../../theme/tokens";
import ARGlassCard from "../../components/ARGlassCard";
import ARButton from "../../components/ARButton";
import { Trophy, Compass, Crosshair } from "lucide-react-native";
import { router } from "expo-router";

export default function HomeScreen() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (user?.role !== 'student') {
                setLoading(false);
                return;
            }
            try {
                const res = await api.get('/api/gamification/leaderboard/');
                if (res.data.success) {
                    const myStats = res.data.data.find(r => r.username === user.username);
                    setStats(myStats);
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
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
                
                <View style={styles.header}>
                    <Text style={styles.greeting}>SYSTEM ONLINE</Text>
                    <Text style={styles.title}>Welcome, Player {user?.username || "Guest"}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{user?.role?.toUpperCase() || "UNKNOWN"}</Text>
                    </View>
                </View>

                {user?.role === 'student' && (
                    <ARGlassCard style={styles.hudCard}>
                        {loading ? (
                            <ActivityIndicator color={theme.colors.arHighlight} />
                        ) : (
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Trophy color={theme.colors.accent} size={28} />
                                    <Text style={styles.statValue}>{stats?.points || 0}</Text>
                                    <Text style={styles.statLabel}>EXP POINTS</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Crosshair color={theme.colors.arHighlight} size={28} />
                                    <Text style={styles.statValue}>#{stats?.rank || "--"}</Text>
                                    <Text style={styles.statLabel}>GLOBAL RANK</Text>
                                </View>
                            </View>
                        )}
                    </ARGlassCard>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACTIVE MISSIONS</Text>
                    <ARGlassCard style={styles.missionCard}>
                        <Compass color={theme.colors.arHighlight} size={32} />
                        <View style={styles.missionInfo}>
                            <Text style={styles.missionTitle}>Explore the Campus</Text>
                            <Text style={styles.missionDesc}>Navigate to building geofences to unlock AR models and claim points.</Text>
                        </View>
                    </ARGlassCard>
                </View>

                <ARButton 
                    title="Open Map Scanner" 
                    onPress={() => router.push('/(tabs)/explore')}
                    variant="primary"
                    style={{ marginTop: 20 }}
                />

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
    header: {
        marginBottom: theme.spacing.xl,
        marginTop: theme.spacing.md,
    },
    greeting: {
        color: theme.colors.arHighlight,
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 2,
        marginBottom: 4,
    },
    title: {
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
        color: theme.colors.accent,
        fontSize: 10,
        fontWeight: "bold",
        letterSpacing: 1,
    },
    hudCard: {
        marginBottom: theme.spacing.xl,
        backgroundColor: "rgba(0, 229, 255, 0.05)",
        borderColor: "rgba(0, 229, 255, 0.2)",
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statDivider: {
        width: 1,
        height: 50,
        backgroundColor: theme.colors.border,
    },
    statValue: {
        color: theme.colors.textPrimary,
        fontSize: 28,
        fontWeight: "900",
        marginTop: 8,
    },
    statLabel: {
        color: theme.colors.textMuted,
        fontSize: 10,
        fontWeight: "bold",
        letterSpacing: 1,
        marginTop: 4,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 2,
        marginBottom: theme.spacing.sm,
    },
    missionCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: theme.spacing.md,
    },
    missionInfo: {
        marginLeft: theme.spacing.md,
        flex: 1,
    },
    missionTitle: {
        color: theme.colors.textPrimary,
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 4,
    },
    missionDesc: {
        color: theme.colors.textMuted,
        fontSize: 12,
        lineHeight: 18,
    },
});
