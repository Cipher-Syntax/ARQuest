import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Medal, LogOut, ChevronRight, User as UserIcon, ShieldAlert, Settings, HelpCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { api } from '../../services/api';
import theme from '../../theme/tokens';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const [myStats, setMyStats] = useState(null);
    const [loading, setLoading] = useState(true);

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
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.username?.charAt(0).toUpperCase() || "?"}
                        </Text>
                    </View>
                    <Text style={styles.username}>@{user?.username}</Text>
                    <Text style={styles.roleLabel}>{user?.role?.toUpperCase() || 'STUDENT'}</Text>
                </View>

                {/* Stats Dashboard (Only for Students) */}
                {user?.role === 'student' && (
                    <View style={styles.statsContainer}>
                        {loading ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <>
                                <View style={styles.statBox}>
                                    <Trophy color={theme.colors.primary} size={24} />
                                    <Text style={styles.statValue}>{myStats ? myStats.points : 0}</Text>
                                    <Text style={styles.statLabel}>Total Points</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statBox}>
                                    <Medal color={theme.colors.primary} size={24} />
                                    <Text style={styles.statValue}>{myStats ? `#${myStats.rank}` : 'Unranked'}</Text>
                                    <Text style={styles.statLabel}>Global Rank</Text>
                                </View>
                            </>
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
    statsContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: theme.colors.border,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.colors.textPrimary,
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
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
