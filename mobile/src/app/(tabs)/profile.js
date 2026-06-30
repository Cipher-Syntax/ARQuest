import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Medal, LogOut, ChevronRight, User as UserIcon, ShieldAlert, Settings, HelpCircle, Award, Crosshair, Map, MessageSquare } from 'lucide-react-native';
import { router } from 'expo-router';
import { api } from '../../services/api';
import theme from '../../theme/tokens';
import { useAuth } from '../../hooks/useAuth';
import { AVATARS } from '../../constants/Avatars';
import { fonts } from '../../constants/typography';
import FeedbackModal from '../../components/FeedbackModal';

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const [myStats, setMyStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [badgeCount, setBadgeCount] = useState(null);
    const [questHistory, setQuestHistory] = useState([]);
    const [myBadges, setMyBadges] = useState([]);
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);

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

        // Fetch badge count and top 6 badges
        const fetchBadges = async () => {
            try {
                const res = await api.get('/api/gamification/badges/');
                if (res.data.success) {
                    const earnedBadges = res.data.data.filter(b => b.earned);
                    setBadgeCount(`${earnedBadges.length}/${res.data.data.length}`);
                    setMyBadges(earnedBadges.slice(0, 6)); // Top 6 for showcase
                }
            } catch (e) {
                console.error('Failed to fetch badge count:', e);
            }
        };
        
        // Fetch quest history
        const fetchQuestHistory = async () => {
            try {
                const res = await api.get('/api/gamification/quests/history/');
                if (res.data.success) {
                    setQuestHistory(res.data.data);
                }
            } catch (e) {
                console.error('Failed to fetch quest history:', e);
            }
        };
        
        fetchBadges();
        fetchQuestHistory();
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
                
                {/* --- Player ID Card (#6) --- */}
                <View style={styles.playerCard}>
                    <View style={styles.playerCardTop}>
                        {user?.avatar_id && AVATARS.find(a => a.id === user.avatar_id)?.uri ? (
                            <Image 
                                source={{ uri: AVATARS.find(a => a.id === user.avatar_id).uri }} 
                                style={styles.playerAvatar} 
                            />
                        ) : (
                            <View style={styles.playerAvatar}>
                                <Text style={styles.avatarText}>
                                    {user?.username?.charAt(0).toUpperCase() || "?"}
                                </Text>
                            </View>
                        )}
                        <View style={styles.playerInfo}>
                            <Text style={styles.playerUsername}>@{user?.username}</Text>
                            {user?.role === 'student' ? (
                                <View style={styles.playerRankBadge}>
                                    <Text style={styles.playerRankIcon}>{user?.rank_info?.icon || '🎒'}</Text>
                                    <Text style={styles.playerRoleLabel}>Lv.{user?.rank_info?.level || 1} {user?.rank_info?.title?.toUpperCase() || 'FRESHMAN'}</Text>
                                </View>
                            ) : (
                                <Text style={styles.playerRoleLabel}>{user?.role?.toUpperCase() || 'PROFESSIONAL'}</Text>
                            )}
                        </View>
                    </View>

                    {user?.role === 'student' && (
                        <View style={styles.playerCardBottom}>
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFF" style={{ padding: 10 }} />
                            ) : (
                                <>
                                    <View style={styles.progressHeader}>
                                        <Text style={styles.progressTitle}>RANK PROGRESS</Text>
                                        <Text style={styles.progressPoints}>{user.exploration_points} EXP</Text>
                                    </View>
                                    
                                    <View style={styles.progressBarContainer}>
                                        <View style={[styles.progressBarFill, { width: `${user?.rank_info?.progress_percentage || 0}%` }]} />
                                    </View>
                                    
                                    <View style={styles.progressFooter}>
                                        <Text style={styles.progressSubtext}>
                                            {user?.rank_info?.next_rank_exp ? `${user.rank_info.exp_to_next_rank} EXP to next rank` : 'Max Rank Achieved!'}
                                        </Text>
                                        <View style={styles.miniStreak}>
                                            <Text style={styles.miniStreakFlame}>🔥</Text>
                                            <Text style={styles.miniStreakText}>{user?.streak_count || 0}</Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    )}
                </View>

                {/* --- Badge Showcase --- */}
                {user?.role === 'student' && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>TOP ACHIEVEMENTS</Text>
                            <TouchableOpacity onPress={() => router.push('/badges')} style={styles.seeAllBtn}>
                                <Text style={styles.seeAllText}>VIEW ALL</Text>
                                <ChevronRight size={14} color={theme.colors.arHighlight} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.badgeGrid}>
                            {myBadges.length > 0 ? myBadges.map((badge, idx) => (
                                <View key={badge.id || idx} style={styles.badgeCard}>
                                    <View style={[styles.badgeIconWrapper, { backgroundColor: badge.color_hex + '20' }]}>
                                        <Text style={styles.badgeIcon}>{badge.icon}</Text>
                                    </View>
                                    <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                                </View>
                            )) : (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No badges earned yet.</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* --- Quest History --- */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>RECENT QUESTS</Text>
                    <View style={styles.settingsCard}>
                        {questHistory.length > 0 ? questHistory.slice(0, 5).map((quest, idx) => (
                            <View key={idx} style={[styles.historyRow, idx < Math.min(questHistory.length, 5) - 1 && styles.historyDivider]}>
                                <View style={styles.historyIconWrapper}>
                                    <Crosshair size={16} color={theme.colors.primary} />
                                </View>
                                <View style={styles.historyTextContainer}>
                                    <Text style={styles.historyTitle} numberOfLines={1}>{quest.quest_title}</Text>
                                    <Text style={styles.historySubtitle}>{quest.building_name}</Text>
                                </View>
                                <View style={styles.historyRight}>
                                    <Text style={styles.historyPoints}>+{quest.points} EXP</Text>
                                    <Text style={styles.historyTime}>
                                        {new Date(quest.time_ago).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                    </Text>
                                </View>
                            </View>
                        )) : (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No quests completed recently.</Text>
                            </View>
                        )}
                    </View>
                </View>

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

                        {(user?.role === 'student' || user?.role === 'professional') && (
                            <SettingsRow 
                                icon={Map} 
                                title={user?.role === 'professional' ? "Visited Buildings" : "Building Discoveries"} 
                                subtitle={user?.role === 'professional' ? "View your building visit history" : "Check your visited and unvisited campus areas"}
                                onPress={() => router.push('/passport')} 
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
                            icon={MessageSquare} 
                            title="Report an Issue / Feedback" 
                            subtitle="Help us improve ARQuest"
                            onPress={() => setFeedbackModalVisible(true)} 
                        />
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

            <FeedbackModal 
                visible={feedbackModalVisible} 
                onClose={() => setFeedbackModalVisible(false)} 
            />
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
    playerCard: {
        backgroundColor: theme.colors.surfaceSoft,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        marginBottom: theme.spacing.xl,
    },
    playerCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    playerAvatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginRight: theme.spacing.md,
        borderWidth: 2,
        borderColor: theme.colors.primarySoft,
    },
    avatarText: {
        fontFamily: fonts.heading.bold,
        color: "#FFF",
        fontSize: 32,
    },
    playerInfo: {
        flex: 1,
    },
    playerUsername: {
        fontFamily: fonts.heading.bold,
        fontSize: 22,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    playerRankBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    playerRankIcon: {
        fontSize: 16,
    },
    playerRoleLabel: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.textSecondary,
        fontSize: 12,
        letterSpacing: 1,
    },
    playerCardBottom: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressTitle: {
        fontFamily: fonts.hud.bold,
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        letterSpacing: 1,
    },
    progressPoints: {
        fontFamily: fonts.hud.bold,
        color: '#FFF',
        fontSize: 12,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFF',
        borderRadius: 4,
    },
    progressFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressSubtext: {
        fontFamily: fonts.body.regular,
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    miniStreak: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        gap: 4,
    },
    miniStreakFlame: {
        fontSize: 12,
    },
    miniStreakText: {
        fontFamily: fonts.hud.bold,
        color: '#FFF',
        fontSize: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    seeAllText: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.arHighlight,
        fontSize: 10,
        letterSpacing: 1,
        marginRight: 2,
    },
    badgeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
    },
    badgeCard: {
        width: '31%',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        padding: theme.spacing.sm,
        alignItems: 'center',
    },
    badgeIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    badgeIcon: {
        fontSize: 20,
    },
    badgeName: {
        fontFamily: fonts.heading.medium,
        color: theme.colors.textPrimary,
        fontSize: 9,
        textAlign: 'center',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: '100%',
    },
    emptyText: {
        fontFamily: fonts.body.regular,
        color: theme.colors.textMuted,
        fontSize: 12,
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
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    historyDivider: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    historyIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyTextContainer: {
        flex: 1,
    },
    historyTitle: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.textPrimary,
        fontSize: 13,
        marginBottom: 2,
    },
    historySubtitle: {
        fontFamily: fonts.body.regular,
        color: theme.colors.textSecondary,
        fontSize: 11,
    },
    historyRight: {
        alignItems: 'flex-end',
    },
    historyPoints: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.accent,
        fontSize: 12,
        marginBottom: 2,
    },
    historyTime: {
        fontFamily: fonts.body.regular,
        color: theme.colors.textMuted,
        fontSize: 10,
    },
});
