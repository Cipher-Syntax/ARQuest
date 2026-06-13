import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../../hooks/useAuth";
import theme from "../../theme/tokens";

export default function ProfileScreen() {
    const { user, logout } = useAuth();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user?.username?.charAt(0).toUpperCase() || "U"}
                    </Text>
                </View>
                <Text style={styles.username}>{user?.username || "Guest"}</Text>
                <Text style={styles.role}>{user?.role || "Unknown Role"}</Text>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
        padding: theme.spacing.md,
    },
    header: {
        alignItems: "center",
        marginBottom: theme.spacing.xl,
        marginTop: theme.spacing.lg,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: theme.spacing.md,
    },
    avatarText: {
        color: theme.colors.textPrimary,
        fontSize: theme.typography.xxl,
        fontWeight: "bold",
    },
    username: {
        color: theme.colors.textPrimary,
        fontSize: theme.typography.xl,
        fontWeight: "bold",
    },
    role: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.md,
    },
    logoutButton: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.error,
    },
    logoutText: {
        color: theme.colors.error,
        fontSize: theme.typography.md,
        fontWeight: "bold",
    },
});
