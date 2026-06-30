import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import { api } from '../services/api';
import theme from '../theme/tokens';
import { useAuth } from '../hooks/useAuth';
import { fonts } from '../constants/typography';

export default function PassportScreen() {
    const { user } = useAuth();
    const [buildings, setBuildings] = useState([]);
    const [unlockedIds, setUnlockedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const [buildingsRes, unlockedRes] = await Promise.all([
                api.get('/api/buildings/'),
                api.get('/api/buildings/unlocked/')
            ]);
            
            if (buildingsRes.data.success) {
                setBuildings(buildingsRes.data.data);
            }
            if (unlockedRes.data.success) {
                const unlocked = new Set(unlockedRes.data.data.map(b => b.id));
                setUnlockedIds(unlocked);
            }
        } catch (error) {
            console.error('Failed to fetch passport data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const unlockedCount = buildings.filter(b => unlockedIds.has(b.id)).length;
    const totalCount = buildings.length;
    const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Campus Passport</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                {/* Progress Card */}
                <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressTitle}>EXPLORATION PROGRESS</Text>
                        <Text style={styles.progressCount}>{unlockedCount} / {totalCount}</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressSubtext}>
                        {unlockedCount === totalCount && totalCount > 0 
                            ? "All campus locations discovered!" 
                            : "Explore the campus to collect more stamps."}
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {buildings.map((building) => {
                            const isUnlocked = unlockedIds.has(building.id);
                            return (
                                <View key={building.id} style={[styles.stampCard, isUnlocked ? styles.stampCardUnlocked : styles.stampCardLocked]}>
                                    <View style={styles.imageContainer}>
                                        {building.image_url ? (
                                            <Image 
                                                source={{ uri: building.image_url }} 
                                                style={[styles.buildingImage, !isUnlocked && styles.buildingImageLocked]} 
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={[styles.placeholderImage, !isUnlocked && { opacity: 0.5 }]}>
                                                <MapPin size={32} color={isUnlocked ? theme.colors.primary : theme.colors.textMuted} />
                                            </View>
                                        )}
                                        {/* Stamp Overlay */}
                                        {isUnlocked && (
                                            <View style={styles.stampOverlay}>
                                                <CheckCircle2 size={40} color={theme.colors.arHighlight} strokeWidth={3} style={styles.stampIcon} />
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.cardFooter}>
                                        <Text style={[styles.buildingName, !isUnlocked && { color: theme.colors.textMuted }]} numberOfLines={2}>
                                            {building.name}
                                        </Text>
                                        <Text style={[styles.buildingCode, !isUnlocked && { color: theme.colors.textMuted }]}>
                                            {building.code || 'BLDG'}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 20,
        color: theme.colors.textPrimary,
        letterSpacing: 0.5,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    progressCard: {
        backgroundColor: theme.colors.surfaceSoft,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 24,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    progressTitle: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.textSecondary,
        fontSize: 12,
        letterSpacing: 1,
    },
    progressCount: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.primary,
        fontSize: 16,
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 12,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    progressSubtext: {
        fontFamily: fonts.body.regular,
        color: theme.colors.textMuted,
        fontSize: 12,
        textAlign: 'center',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
    },
    stampCard: {
        width: '47%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 8,
    },
    stampCardUnlocked: {
        borderColor: theme.colors.primarySoft,
    },
    stampCardLocked: {
        borderColor: theme.colors.border,
        opacity: 0.7,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: theme.colors.surfaceSoft,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    buildingImage: {
        width: '100%',
        height: '100%',
    },
    buildingImageLocked: {
        tintColor: 'gray',
        opacity: 0.4,
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.bgSecondary,
    },
    stampOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    stampIcon: {
        transform: [{ rotate: '-15deg' }],
        shadowColor: theme.colors.arHighlight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 5,
    },
    cardFooter: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    buildingName: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    buildingCode: {
        fontFamily: fonts.hud.medium,
        fontSize: 10,
        color: theme.colors.primary,
        letterSpacing: 1,
    },
});
