import React from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import theme from "../../theme/tokens";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";

export default function BuildingsScreen() {
    const { unlockedBuildings, isLoading, error } = useUnlockedBuildings();

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
                    renderItem={({ item }) => (
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
                        </View>
                    )}
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
});
