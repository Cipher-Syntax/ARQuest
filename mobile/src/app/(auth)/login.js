import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Image
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import theme from "../../theme/tokens";
import { Link, useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import ARGlassCard from "../../components/ARGlassCard";
import ARButton from "../../components/ARButton";
import { fonts } from "../../constants/typography";

export default function LoginScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoading } = useAuth();
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async () => {
        if (!username || !password) {
            setError("Identity credentials required.");
            return;
        }
        setError("");
        try {
            const loggedInUser = await login(username, password);
            if (loggedInUser && !loggedInUser.avatar_id && username !== "visitor") {
                router.replace("/(auth)/avatar-selection");
            } else {
                router.replace("/(tabs)");
            }
        } catch (err) {
            console.log("Login error:", err);
            let serverMessage = err?.data?.error || err?.data?.message || err?.data?.detail;
            
            // If the server error is an object (e.g., {"code": "...", "message": "..."}), extract the message
            if (typeof serverMessage === 'object' && serverMessage !== null) {
                serverMessage = serverMessage.message || serverMessage.detail || JSON.stringify(serverMessage);
            }
            
            setError(serverMessage || "Access denied. Invalid credentials.");
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            {/* Background decorative elements */}
            <View style={styles.glowOrbTop} />
            <View style={styles.glowOrbBottom} />

            <View style={styles.content}>
                {/* Logo Placeholder */}
                <View style={styles.logoBox}>
                    <Text style={styles.logoText}>Logo Here</Text>
                </View>

                <View style={styles.header}>
                    <Text style={styles.title}>ARQuest</Text>
                    <Text style={styles.subtitle}>Campus Exploration System</Text>
                </View>

                <ARGlassCard style={styles.card}>
                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor={theme.colors.textMuted}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="••••••••"
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
                                    <EyeOff color={theme.colors.primary} size={20} />
                                ) : (
                                    <Eye color={theme.colors.textMuted} size={20} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ARButton
                        title="Game Start"
                        onPress={handleLogin}
                        isLoading={isLoading}
                        variant="primary"
                        style={styles.loginButton}
                    />

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
                                setError("Visitor channel offline.");
                            }
                        }}
                        disabled={isLoading}
                    >
                        <Text style={styles.visitorText}>Continue as Visitor (Guest Access)</Text>
                    </TouchableOpacity>
                </ARGlassCard>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
    },
    glowOrbTop: {
        position: 'absolute',
        top: -100,
        left: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: theme.colors.primary, // Red glow
        opacity: 0.3, // Make more vibrant
    },
    glowOrbBottom: {
        position: 'absolute',
        bottom: -150,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: theme.colors.primary, // Also Red
        opacity: 0.3,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        padding: theme.spacing.lg,
        zIndex: 1,
    },
    logoBox: {
        width: 100,
        height: 100,
        alignSelf: "center",
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: "dashed",
        borderRadius: theme.radius.md,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: theme.spacing.lg,
    },
    logoText: {
        color: theme.colors.textMuted,
        fontSize: theme.typography.sm,
        fontWeight: "bold",
        textTransform: "uppercase",
        textAlign: "center",
    },
    header: {
        alignItems: "center",
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.primary,
        fontSize: 32,
        fontWeight: "900",
        letterSpacing: 2,
        textTransform: "uppercase",
        marginBottom: 4,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.sm,
        fontWeight: "600",
        letterSpacing: 3,
        textTransform: "uppercase",
    },
    card: {
        paddingTop: theme.spacing.xl,
    },
    inputGroup: {
        marginBottom: theme.spacing.lg,
    },
    inputLabel: {
        color: theme.colors.textMuted,
        fontSize: 10,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 8,
    },
    input: {
        fontFamily: fonts.body.regular,
        backgroundColor: theme.colors.surfaceSoft,
        color: theme.colors.textPrimary,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        fontSize: theme.typography.md,
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.surfaceSoft,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    passwordInput: {
        fontFamily: fonts.body.regular,
        flex: 1,
        color: theme.colors.textPrimary,
        padding: theme.spacing.md,
        fontSize: theme.typography.md,
    },
    eyeIcon: {
        padding: theme.spacing.md,
    },
    loginButton: {
        marginTop: theme.spacing.sm,
    },
    error: {
        color: theme.colors.error,
        marginBottom: theme.spacing.md,
        textAlign: "center",
        fontSize: theme.typography.sm,
        fontWeight: "600",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        padding: 10,
        borderRadius: theme.radius.sm,
    },
    registerLink: {
        marginTop: theme.spacing.lg,
        alignItems: "center",
    },
    registerText: {
        color: theme.colors.textPrimary,
        fontSize: theme.typography.sm,
        fontWeight: "600",
        opacity: 0.8,
    },
    visitorButton: {
        marginTop: theme.spacing.md,
        alignItems: "center",
    },
    visitorText: {
        color: theme.colors.textMuted,
        fontSize: theme.typography.sm,
        fontWeight: "500",
        textDecorationLine: "underline",
    },
});
