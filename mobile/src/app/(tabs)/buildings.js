import React from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import theme from "../../theme/tokens";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";

export default function BuildingsScreen() {
    const { unlockedBuildings, isLoading, error } = useUnlockedBuildings();
    const router = useRouter();

    const handleView3D = (building) => {
        if (building.model_active && building.model_url) {
            router.push({
                pathname: '/building-3d-viewer',
                params: {
                    buildingId: building.id,
                    buildingName: building.name,
                    modelUrl: building.model_url,
                },
            });
        }
    };

    const handleViewPanorama = (building) => {
        router.push({
            pathname: '/panorama-viewer',
            params: {
                buildingId: building.id,
                buildingName: building.name,
            },
        });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading buildings...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Unlocked Buildings</Text>
            {unlockedBuildings.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                        No buildings unlocked yet.{'\n'}
                        Visit campus to unlock buildings!
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={unlockedBuildings}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => {
                        // Debug: log the item to see model fields
                        console.log('Building item:', JSON.stringify(item, null, 2));
                        return (
                        <View style={styles.buildingCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.buildingName}>{item.name}</Text>
                                <View style={[styles.badge, item.unlock_source === 'role_access' && styles.badgeRole]}>
                                    <Text style={styles.badgeText}>
                                        {item.unlock_source === 'geofence' ? '✓ Unlocked' : '★ Role Access'}
                                    </Text>
                                </View>
                            </View>
                            {item.description && (
                                <Text style={styles.description}>{item.description}</Text>
                            )}
                            {item.model_active && item.model_url ? (
                                <TouchableOpacity 
                                    style={styles.view3dButton}
                                    onPress={() => handleView3D(item)}
                                >
                                    <Ionicons name="cube-outline" size={20} color={theme.colors.white} />
                                    <Text style={styles.view3dText}>View 3D Model</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.no3dContainer}>
                                    <Text style={styles.no3dText}>3D model not available</Text>
                                </View>
                            )}
                            <TouchableOpacity 
                                style={styles.viewPanoramaButton}
                                onPress={() => handleViewPanorama(item)}
                            >
                                <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
                                <Text style={styles.viewPanoramaText}>360° Walkthrough</Text>
                            </TouchableOpacity>
                        </View>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
        padding: theme.spacing.md,
    },
    centerContent: {
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: theme.typography.xl,
        fontWeight: "bold",
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    loadingText: {
        marginTop: theme.spacing.sm,
        color: theme.colors.textSecondary,
        fontSize: theme.typography.md,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.typography.md,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.xl,
    },
    emptyText: {
        color: theme.colors.textMuted,
        fontSize: theme.typography.md,
        textAlign: "center",
        lineHeight: 24,
    },
    buildingCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.xs,
    },
    buildingName: {
        fontSize: theme.typography.lg,
        fontWeight: "bold",
        color: theme.colors.textPrimary,
        flex: 1,
    },
    badge: {
        backgroundColor: theme.colors.success,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.radius.sm,
    },
    badgeRole: {
        backgroundColor: theme.colors.accent,
    },
    badgeText: {
        color: theme.colors.white,
        fontSize: theme.typography.xs,
        fontWeight: "600",
    },
    description: {
        fontSize: theme.typography.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    view3dButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.sm,
        marginTop: theme.spacing.sm,
    },
    view3dText: {
        color: theme.colors.white,
        fontSize: theme.typography.md,
        fontWeight: "600",
        marginLeft: theme.spacing.xs,
    },
    no3dContainer: {
        paddingVertical: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    no3dText: {
        fontSize: theme.typography.sm,
        color: theme.colors.textMuted,
        fontStyle: "italic",
    },
    viewPanoramaButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.bgPrimary,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.sm,
        marginTop: theme.spacing.xs,
    },
    viewPanoramaText: {
        color: theme.colors.primary,
        fontSize: theme.typography.md,
        fontWeight: "600",
        marginLeft: theme.spacing.xs,
    },
});
