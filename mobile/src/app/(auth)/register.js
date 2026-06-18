import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from "react-native";
import { useRouter, Link } from "expo-router";
import theme from "../../theme/tokens";
import { api } from "../../services/api";
import { Eye, EyeOff } from "lucide-react-native";
import ARGlassCard from "../../components/ARGlassCard";
import ARButton from "../../components/ARButton";

export default function RegisterScreen() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        password_confirm: "",
        first_name: "",
        last_name: "",
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleRegister = async () => {
        if (
            !formData.username ||
            !formData.email ||
            !formData.password ||
            !formData.password_confirm
        ) {
            setError(
                "Username, email, password, and password confirmation are required.",
            );
            return;
        }

        if (formData.password !== formData.password_confirm) {
            setError("Passwords do not match.");
            return;
        }

        setError("");
        setIsLoading(true);

        try {
            await api.post("/api/auth/register/", formData);
            router.push({
                pathname: "/(auth)/verify-otp",
                params: { email: formData.email },
            });
        } catch (err) {
            console.log("Registration error:", err);
            let errorMessage = "Registration failed. Please try again.";
            if (err.data && typeof err.data === "object") {
                const firstErrorKey = Object.keys(err.data)[0];
                if (firstErrorKey) {
                    const firstErrorValue = err.data[firstErrorKey];
                    errorMessage = Array.isArray(firstErrorValue)
                        ? firstErrorValue[0]
                        : firstErrorValue;
                }
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.glowOrbTop} />
            <View style={styles.glowOrbBottom} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>New Player</Text>
                    <Text style={styles.subtitle}>Identity Registration</Text>
                </View>

                <ARGlassCard style={styles.card}>
                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Player Handle"
                            placeholderTextColor={theme.colors.textMuted}
                            value={formData.username}
                            onChangeText={(text) => handleChange("username", text)}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Comm Channel (Email)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            placeholderTextColor={theme.colors.textMuted}
                            value={formData.email}
                            onChangeText={(text) => handleChange("email", text)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.inputLabel}>First Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Optional"
                                placeholderTextColor={theme.colors.textMuted}
                                value={formData.first_name}
                                onChangeText={(text) => handleChange("first_name", text)}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.inputLabel}>Last Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Optional"
                                placeholderTextColor={theme.colors.textMuted}
                                value={formData.last_name}
                                onChangeText={(text) => handleChange("last_name", text)}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Access Code</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Password"
                                placeholderTextColor={theme.colors.textMuted}
                                value={formData.password}
                                onChangeText={(text) => handleChange("password", text)}
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

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Confirm Access Code</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Confirm Password"
                                placeholderTextColor={theme.colors.textMuted}
                                value={formData.password_confirm}
                                onChangeText={(text) => handleChange("password_confirm", text)}
                                secureTextEntry={!showConfirmPassword}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff color={theme.colors.primary} size={20} />
                                ) : (
                                    <Eye color={theme.colors.textMuted} size={20} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ARButton
                        title="Create Identity"
                        onPress={handleRegister}
                        isLoading={isLoading}
                        variant="accent"
                        style={styles.registerButton}
                    />

                    <Link href="/(auth)/login" asChild>
                        <TouchableOpacity style={styles.link}>
                            <Text style={styles.linkText}>
                                Return to Login
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </ARGlassCard>
            </ScrollView>
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
        backgroundColor: theme.colors.primary,
        opacity: 0.3,
    },
    glowOrbBottom: {
        position: 'absolute',
        bottom: -150,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: theme.colors.primary,
        opacity: 0.3,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: theme.spacing.lg,
        paddingTop: 80,
        paddingBottom: 40,
    },
    header: {
        alignItems: "center",
        marginBottom: theme.spacing.xl,
    },
    title: {
        color: theme.colors.primary,
        fontSize: 28,
        fontWeight: "900",
        letterSpacing: 2,
        textTransform: "uppercase",
        marginBottom: 4,
    },
    subtitle: {
        color: theme.colors.accent,
        fontSize: theme.typography.sm,
        fontWeight: "600",
        letterSpacing: 3,
        textTransform: "uppercase",
    },
    card: {
        paddingTop: theme.spacing.xl,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    inputGroup: {
        marginBottom: theme.spacing.md,
    },
    logoText: {
        color: theme.colors.textMuted,
        fontSize: theme.typography.xs,
        fontWeight: "bold",
        textTransform: "uppercase",
        textAlign: "center",
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
        flex: 1,
        color: theme.colors.textPrimary,
        padding: theme.spacing.md,
        fontSize: theme.typography.md,
    },
    eyeIcon: {
        padding: theme.spacing.md,
    },
    registerButton: {
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
    logoBox: {
        width: 80,
        height: 80,
        alignSelf: "center",
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: "dashed",
        borderRadius: theme.radius.md,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: theme.spacing.md,
    },
    link: {
        marginTop: theme.spacing.lg,
        alignItems: "center",
    },
    linkText: {
        color: theme.colors.textPrimary,
        fontSize: theme.typography.sm,
        fontWeight: "600",
        opacity: 0.8,
    },
});
