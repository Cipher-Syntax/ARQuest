import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Medal, LogOut, ChevronRight, User as UserIcon, ShieldAlert, Settings, HelpCircle, Award } from 'lucide-react-native';
import { router } from 'expo-router';
import { api } from '../../services/api';
import theme from '../../theme/tokens';
import { useAuth } from '../../hooks/useAuth';
import { AVATARS } from '../../constants/Avatars';
import { fonts } from '../../constants/typography';

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const [myStats, setMyStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [badgeCount, setBadgeCount] = useState(null);

    useEffect(() => {
        const fetchMyRank = async () => {
            if (user?.role !== 'student') {
                setLoading(false);
                return;
            }
            try {
                // Fetch leaderboard to find my rank
                const res = await api.get('/api/gamification/leaderboard/');
                if (res.data.success) {
                    const stats = res.data.data.find(r => r.username === user.username);
                    setMyStats(stats);
                }
            } catch (error) {
                console.error('Failed to fetch rank:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMyRank();

        // Fetch badge count
        const fetchBadges = async () => {
            try {
                const res = await api.get('/api/gamification/badges/');
                if (res.data.success) {
                    const earned = res.data.data.filter(b => b.earned).length;
                    const total = res.data.data.length;
                    setBadgeCount(`${earned}/${total}`);
                }
            } catch (e) {
                console.error('Failed to fetch badge count:', e);
            }
        };
        if (user?.role === 'student') fetchBadges();
    }, []);

    const SettingsRow = ({ icon: Icon, title, subtitle, onPress, destructive }) => (
        <TouchableOpacity style={styles.settingsRow} onPress={onPress}>
            <View style={[styles.settingsIconWrapper, destructive && { backgroundColor: 'rgba(255, 0, 0, 0.1)' }]}>
                <Icon size={22} color={destructive ? theme.colors.error : theme.colors.primary} />
            </View>
            <View style={styles.settingsTextWrapper}>
                <Text style={[styles.settingsTitle, destructive && { color: theme.colors.error }]}>{title}</Text>
                {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
            </View>
            <ChevronRight size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.appBar}>
                <Text style={styles.appBarTitle}>Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    {user?.avatar_id && AVATARS.find(a => a.id === user.avatar_id)?.uri ? (
                        <Image 
                            source={{ uri: AVATARS.find(a => a.id === user.avatar_id).uri }} 
                            style={styles.avatar} 
                        />
                    ) : (
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.username?.charAt(0).toUpperCase() || "?"}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.username}>@{user?.username}</Text>
                    {user?.role === 'student' ? (
                        <View style={styles.rankBadge}>
                            <Text style={styles.rankIcon}>{user?.rank_info?.icon || '🎒'}</Text>
                            <Text style={styles.roleLabel}>Lv.{user?.rank_info?.level || 1} {user?.rank_info?.title?.toUpperCase() || 'FRESHMAN'}</Text>
                        </View>
                    ) : (
                        <Text style={styles.roleLabel}>{user?.role?.toUpperCase() || 'PROFESSIONAL'}</Text>
                    )}
                </View>

                {/* Rank Progress Dashboard (Only for Students) */}
                {user?.role === 'student' && (
                    <View style={styles.statsContainer}>
                        {loading ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <View style={styles.progressSection}>
                                <View style={styles.progressHeader}>
                                    <Text style={styles.progressTitle}>RANK PROGRESS</Text>
                                    <Text style={styles.progressPoints}>{user.exploration_points} EXP</Text>
                                </View>
                                
                                <View style={styles.progressBarContainer}>
                                    <View style={[styles.progressBarFill, { width: `${user?.rank_info?.progress_percentage || 0}%` }]} />
                                </View>
                                
                                {user?.rank_info?.next_rank_exp ? (
                                    <Text style={styles.progressSubtext}>
                                        {user.rank_info.exp_to_next_rank} EXP to next rank
                                    </Text>
                                ) : (
                                    <Text style={styles.progressSubtext}>Max Rank Achieved!</Text>
                                )}

                                {/* Streak Stat */}
                                <View style={styles.streakRow}>
                                    <View style={styles.streakStat}>
                                        <Text style={styles.streakStatFlame}>🔥</Text>
                                        <View>
                                            <Text style={styles.streakStatValue}>{user?.streak_count || 0} day{user?.streak_count !== 1 ? 's' : ''}</Text>
                                            <Text style={styles.streakStatLabel}>CURRENT STREAK</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.streakStreakHint}>
                                        {user?.streak_count > 0 ? '+5 EXP/day (+10 on 3-day milestones)' : 'Log in daily for bonus EXP!'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* General Settings */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>GENERAL SETTINGS</Text>
                    <View style={styles.settingsCard}>
                        
                        {user?.role === 'student' && (
                            <SettingsRow 
                                icon={Trophy} 
                                title="View Rankings" 
                                subtitle="See where you stand globally"
                                onPress={() => router.push('/leaderboard')} 
                            />
                        )}

                        {user?.role === 'student' && (
                            <SettingsRow 
                                icon={Award} 
                                title="My Achievements" 
                                subtitle={badgeCount ? `${badgeCount} badges earned` : 'View your badges'}
                                onPress={() => router.push('/badges')} 
                            />
                        )}

                        <SettingsRow 
                            icon={UserIcon} 
                            title="Account Settings" 
                            subtitle="Update your password"
                            onPress={() => {}} 
                        />
                        
                        <SettingsRow 
                            icon={Settings} 
                            title="App Preferences" 
                            subtitle="Permissions and notifications"
                            onPress={() => {}} 
                        />
                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>SUPPORT</Text>
                    <View style={styles.settingsCard}>
                        <SettingsRow 
                            icon={HelpCircle} 
                            title="About ARQuest" 
                            subtitle="Version 1.0.0"
                            onPress={() => {}} 
                        />
                        <SettingsRow 
                            icon={ShieldAlert} 
                            title="Privacy Policy" 
                            onPress={() => {}} 
                        />
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <LogOut size={20} color={theme.colors.error} style={{ marginRight: 8 }} />
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
    },
    appBar: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    appBarTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        letterSpacing: 0.5,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
        borderWidth: 4,
        borderColor: theme.colors.surface,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    avatarText: {
        color: "#FFFFFF",
        fontSize: 40,
        fontWeight: "900",
    },
    username: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.textPrimary,
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 4,
    },
    roleLabel: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 1.5,
        backgroundColor: 'rgba(178, 24, 48, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    rankBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(178, 24, 48, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 4,
    },
    rankIcon: {
        fontSize: 16,
        marginRight: 6,
    },
    statsContainer: {
        width: '100%',
        marginTop: 10,
        marginBottom: 30,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    progressSection: {
        width: '100%',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    progressTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        fontWeight: '900',
        color: theme.colors.textSecondary,
        letterSpacing: 1,
    },
    progressPoints: {
        fontFamily: fonts.hud.bold,
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: theme.colors.bgSecondary,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 6,
    },
    progressSubtext: {
        fontSize: 12,
        color: theme.colors.textMuted,
        textAlign: 'right',
        fontStyle: 'italic',
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    streakStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    streakStatFlame: {
        fontSize: 28,
    },
    streakStatValue: {
        fontFamily: fonts.hud.bold,
        fontSize: 18,
        fontWeight: '900',
        color: '#F1641E',
    },
    streakStatLabel: {
        fontFamily: fonts.heading.bold,
        fontSize: 9,
        fontWeight: 'bold',
        color: theme.colors.textMuted,
        letterSpacing: 1,
        marginTop: 1,
    },
    streakStreakHint: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: theme.colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'right',
        maxWidth: 120,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginBottom: 10,
        marginLeft: 4,
        letterSpacing: 1,
    },
    settingsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    settingsIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(178, 24, 48, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingsTextWrapper: {
        flex: 1,
    },
    settingsTitle: {
        fontFamily: fonts.body.bold || fonts.body.medium,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    settingsSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: theme.colors.error,
        marginTop: 10,
    },
    logoutButtonText: {
        color: theme.colors.error,
        fontSize: 16,
        fontWeight: "bold",
    },
});
