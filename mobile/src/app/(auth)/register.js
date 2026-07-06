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
import { fonts } from "../../constants/typography";
import { validateString, validateEmail } from "../../utils/validation";

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
    const [fieldErrors, setFieldErrors] = useState({});

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleRegister = async () => {
        const usernameError = validateString(formData.username, 3);
        const emailError = validateEmail(formData.email);
        const passwordError = validateString(formData.password, 6);
        const passwordConfirmError = validateString(formData.password_confirm, 6);
        let matchError = null;
        if (!passwordError && !passwordConfirmError && formData.password !== formData.password_confirm) {
            matchError = "Passwords do not match.";
        }

        if (usernameError || emailError || passwordError || passwordConfirmError || matchError) {
            setFieldErrors({
                username: usernameError,
                email: emailError,
                password: passwordError,
                password_confirm: passwordConfirmError || matchError,
            });
            return;
        }

        setFieldErrors({});
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
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Register a new account</Text>
                </View>

                <ARGlassCard style={styles.card}>
                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Username</Text>
                        <TextInput
                            style={[styles.input, fieldErrors.username && { borderColor: 'red' }]}
                            placeholder="Username"
                            placeholderTextColor={theme.colors.textMuted}
                            value={formData.username}
                            onChangeText={(text) => handleChange("username", text)}
                            autoCapitalize="none"
                        />
                        {fieldErrors.username && <Text style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{fieldErrors.username}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email</Text>
                        <TextInput
                            style={[styles.input, fieldErrors.email && { borderColor: 'red' }]}
                            placeholder="Email"
                            placeholderTextColor={theme.colors.textMuted}
                            value={formData.email}
                            onChangeText={(text) => handleChange("email", text)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {fieldErrors.email && <Text style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{fieldErrors.email}</Text>}
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
                        <Text style={styles.inputLabel}>Password</Text>
                        <View style={[styles.passwordContainer, fieldErrors.password && { borderColor: 'red' }]}>
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
                        {fieldErrors.password && <Text style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{fieldErrors.password}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Confirm Password</Text>
                        <View style={[styles.passwordContainer, fieldErrors.password_confirm && { borderColor: 'red' }]}>
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
                        {fieldErrors.password_confirm && <Text style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{fieldErrors.password_confirm}</Text>}
                    </View>

                    <ARButton
                        title="Create Account"
                        onPress={handleRegister}
                        isLoading={isLoading}
                        variant="primary"
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
        
    },
    glowOrbTop: {
        position: 'absolute',
        top: -100,
        left: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundcolor: "#FFFFFF",
        opacity: 0.3,
    },
    glowOrbBottom: {
        position: 'absolute',
        bottom: -150,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundcolor: "#FFFFFF",
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
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
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
        color: "rgba(255,255,255,0.6)",
        fontSize: theme.typography.xs,
        fontWeight: "bold",
        textTransform: "uppercase",
        textAlign: "center",
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
        color: "#FFFFFF",
        fontSize: theme.typography.sm,
        fontWeight: "600",
        opacity: 0.8,
    },
});

