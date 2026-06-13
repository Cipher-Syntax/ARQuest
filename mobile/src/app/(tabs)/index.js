import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "../../hooks/useAuth";
import theme from "../../theme/tokens";

export default function HomeScreen() {
    const { user } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome back,</Text>
            <Text style={styles.subtitle}>{user?.username || "Guest"}</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Session Info</Text>
                <Text style={styles.cardText}>
                    Role: {user?.role || "Unknown"}
                </Text>
                <Text style={styles.cardText}>
                    Email: {user?.email || "N/A"}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
        padding: theme.spacing.md,
    },
    title: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.lg,
    },
    subtitle: {
        color: theme.colors.textPrimary,
        fontSize: theme.typography.xxl,
        fontWeight: "bold",
        marginBottom: theme.spacing.lg,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardTitle: {
        color: theme.colors.textPrimary,
        fontSize: theme.typography.md,
        fontWeight: "bold",
        marginBottom: theme.spacing.sm,
    },
    cardText: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.sm,
        marginBottom: theme.spacing.xs,
    },
});
