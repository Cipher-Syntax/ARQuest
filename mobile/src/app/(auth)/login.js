import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Image,
} from "react-native";
import { customAlert as Alert } from "../../components/CustomAlert";
import { useAuth } from "../../hooks/useAuth";
import theme from "../../theme/tokens";
import { Link, useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import ARGlassCard from "../../components/ARGlassCard";
import ARButton from "../../components/ARButton";
import { fonts } from "../../constants/typography";
import { validateString } from "../../utils/validation";

export default function LoginScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoading } = useAuth();
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const router = useRouter();

    const handleLogin = async () => {
        const usernameError = validateString(username, 1);
        const passwordError = validateString(password, 1);

        if (usernameError || passwordError) {
            setFieldErrors({
                username: usernameError,
                password: passwordError,
            });
            return;
        }
        setFieldErrors({});
        setError("");
        try {
            const result = await login(username, password);
            const loggedInUser = result?.user || result;
            const streakBonus = result?.streakBonusExp || 0;
            const streakCount = loggedInUser?.streak_count || 0;

            // Streak notification is now handled globally in AuthContext

            if (
                loggedInUser &&
                !loggedInUser.avatar_id &&
                username !== "visitor"
            ) {
                router.replace("/(auth)/avatar-selection");
            } else {
                router.replace("/(tabs)");
            }
        } catch (err) {
            console.log("Login error:", err);
            let serverMessage =
                err?.data?.error || err?.data?.message || err?.data?.detail;

            // If the server error is an object (e.g., {"code": "...", "message": "..."}), extract the message
            if (typeof serverMessage === "object" && serverMessage !== null) {
                serverMessage =
                    serverMessage.message ||
                    serverMessage.detail ||
                    JSON.stringify(serverMessage);
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
                {/* App Logo */}
                <View style={styles.logoBox}>
                    <Image 
                        source={require('../../../../assets/images/logo.png')} 
                        style={{ width: 120, height: 120, resizeMode: 'contain' }} 
                    />
                </View>

                <View style={styles.header}>
                    <Text style={styles.title}>ARQuest</Text>
                    <Text style={styles.subtitle}>
                        Campus Exploration System
                    </Text>
                </View>

                <ARGlassCard style={styles.card}>
                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Username</Text>
                        <TextInput
                            style={[
                                styles.input,
                                fieldErrors.username && { borderColor: "red" },
                            ]}
                            placeholder="Username"
                            placeholderTextColor={theme.colors.textMuted}
                            value={username}
                            onChangeText={(text) => {
                                setUsername(text);
                                if (fieldErrors.username)
                                    setFieldErrors((prev) => ({
                                        ...prev,
                                        username: null,
                                    }));
                            }}
                            autoCapitalize="none"
                        />
                        {fieldErrors.username && (
                            <Text
                                style={{
                                    color: "red",
                                    fontSize: 12,
                                    marginTop: 4,
                                }}
                            >
                                {fieldErrors.username}
                            </Text>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Password</Text>
                        <View
                            style={[
                                styles.passwordContainer,
                                fieldErrors.password && { borderColor: "red" },
                            ]}
                        >
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="••••••••"
                                placeholderTextColor={theme.colors.textMuted}
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    if (fieldErrors.password)
                                        setFieldErrors((prev) => ({
                                            ...prev,
                                            password: null,
                                        }));
                                }}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff
                                        color={theme.colors.primary}
                                        size={20}
                                    />
                                ) : (
                                    <Eye
                                        color={theme.colors.textMuted}
                                        size={20}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                        {fieldErrors.password && (
                            <Text
                                style={{
                                    color: "red",
                                    fontSize: 12,
                                    marginTop: 4,
                                }}
                            >
                                {fieldErrors.password}
                            </Text>
                        )}
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
                        <Text style={styles.visitorText}>
                            Continue as Visitor (Guest Access)
                        </Text>
                    </TouchableOpacity>
                </ARGlassCard>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    glowOrbTop: {
        position: "absolute",
        top: -100,
        left: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundcolor: "#FFFFFF", // Red glow
        opacity: 0.3, // Make more vibrant
    },
    glowOrbBottom: {
        position: "absolute",
        bottom: -150,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundcolor: "#FFFFFF", // Also Red
        opacity: 0.3,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        padding: theme.spacing.lg,
        zIndex: 1,
    },
    logoBox: {
        width: 140,
        height: 140,
        borderRadius: 30,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        marginBottom: 24,
    },
    header: {
        alignItems: "center",
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 32,
        fontWeight: "900",
        letterSpacing: 2,
        textTransform: "uppercase",
        marginBottom: 4,
    },
    subtitle: {
        color: "#DDDDDD",
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
        color: "rgba(255,255,255,0.6)",
        fontSize: 10,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 8,
    },
    input: {
        fontFamily: fonts.body.regular,
        backgroundColor: "rgba(255,255,255,0.05)",
        color: "#FFFFFF",
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        fontSize: theme.typography.md,
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    passwordInput: {
        fontFamily: fonts.body.regular,
        flex: 1,
        color: "#FFFFFF",
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
        color: "#FFFFFF",
        fontSize: theme.typography.sm,
        fontWeight: "600",
        opacity: 0.8,
    },
    visitorButton: {
        marginTop: theme.spacing.md,
        alignItems: "center",
    },
    visitorText: {
        color: "rgba(255,255,255,0.6)",
        fontSize: theme.typography.sm,
        fontWeight: "500",
        textDecorationLine: "underline",
    },
});
