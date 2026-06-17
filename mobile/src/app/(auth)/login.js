import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import theme from "../../theme/tokens";
import { Link, useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";

export default function LoginScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoading } = useAuth();
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async () => {
        if (!username || !password) {
            setError("Please enter username and password");
            return;
        }
        setError("");
        try {
            await login(username, password);
            router.replace("/(tabs)");
        } catch (err) {
            setError("Login failed. Please check your credentials.");
            console.log("Login error:", err);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>ARQuest</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={theme.colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />

            <View style={styles.passwordContainer}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    placeholderTextColor={theme.colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                >
                    {showPassword ? (
                        <EyeOff color={theme.colors.textMuted} size={20} />
                    ) : (
                        <Eye color={theme.colors.textMuted} size={20} />
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.buttonText}>Login</Text>
                )}
            </TouchableOpacity>

            <Link href="/(auth)/register" asChild>
                <TouchableOpacity style={styles.registerLink}>
                    <Text style={styles.registerText}>
                        Don't have an account? Register
                    </Text>
                </TouchableOpacity>
            </Link>

            <TouchableOpacity 
                style={styles.visitorButton}
                onPress={async () => {
                    try {
                        setError("");
                        await login("visitor", "WMSU-Visitor2026!");
                        router.replace("/(tabs)");
                    } catch (err) {
                        setError("Visitor login temporarily unavailable.");
                    }
                }}
                disabled={isLoading}
            >
                <Text style={styles.visitorText}>Continue as Visitor</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
        justifyContent: "center",
        padding: theme.spacing.lg,
    },
    title: {
        color: theme.colors.primary,
        fontSize: theme.typography.xxl,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.md,
        textAlign: "center",
        marginBottom: theme.spacing.xl,
    },
    input: {
        backgroundColor: theme.colors.surface,
        color: theme.colors.textPrimary,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    passwordInput: {
        flex: 1,
        color: theme.colors.textPrimary,
        padding: theme.spacing.md,
    },
    eyeIcon: {
        padding: theme.spacing.md,
    },
    button: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: "center",
        marginTop: theme.spacing.md,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: theme.typography.md,
        fontWeight: "bold",
    },
    error: {
        color: theme.colors.error,
        marginBottom: theme.spacing.md,
        textAlign: "center",
    },
    registerLink: {
        marginTop: theme.spacing.xl,
        alignItems: "center",
    },
    registerText: {
        color: theme.colors.primary,
        fontSize: theme.typography.md,
        fontWeight: "600",
    },
    visitorButton: {
        marginTop: theme.spacing.xl,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: "center",
        backgroundColor: "transparent",
    },
    visitorText: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.md,
        fontWeight: "500",
    },
});
