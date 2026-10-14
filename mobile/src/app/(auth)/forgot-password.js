import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ImageBackground,
    ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Mail, KeyRound } from "lucide-react-native";
import { useAuth } from "../../hooks/useAuth";
import theme from "../../theme/tokens";
import ARButton from "../../components/ar/ARButton";
import { fonts } from "../../constants/typography";

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { forgotPassword, isLoading } = useAuth();

    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const handleSendCode = async () => {
        const trimmed = email.trim();
        if (!trimmed) {
            setFieldErrors({ email: "Please enter your registered email or username." });
            return;
        }

        try {
            setError("");
            setFieldErrors({});

            const res = await forgotPassword(trimmed.toLowerCase());
            const targetEmail = res?.email || trimmed.toLowerCase();

            router.push({
                pathname: "/(auth)/reset-password",
                params: { email: targetEmail },
            });
        } catch (err) {
            console.log("Forgot password error:", err);

            if (err?.data && typeof err.data === "object") {
                if (err.data.email) {
                    setFieldErrors({
                        email: Array.isArray(err.data.email) ? err.data.email[0] : err.data.email,
                    });
                    return;
                }
            }

            let serverMessage =
                err?.data?.error?.message ||
                err?.data?.error ||
                err?.data?.message ||
                err?.data?.detail;

            if (typeof serverMessage === "object" && serverMessage !== null) {
                serverMessage =
                    serverMessage.message ||
                    serverMessage.detail ||
                    JSON.stringify(serverMessage);
            }

            setError(
                serverMessage ||
                "Unable to send recovery code. Please check your email and try again."
            );
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ImageBackground
                source={require("../../../assets/images/wmsu_landing_page_background.jpg")}
                style={styles.backgroundImage}
                imageStyle={{ opacity: 0.3 }}
                resizeMode="cover"
            >
                <View style={styles.overlay} />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.innerContentWrapper}>
                        {/* Top Back Navigation */}
                        <View style={styles.topBar}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => router.back()}
                                activeOpacity={0.7}
                            >
                                <ArrowLeft color="#FFFFFF" size={22} />
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.headerContainer}>
                            <View style={styles.iconCircle}>
                                <KeyRound color="#FFFFFF" size={28} />
                            </View>
                            <Text style={styles.welcomeText}>Forgot Password</Text>
                            <Text style={styles.subtitleText}>
                                Enter your registered email or username and we'll send you a 6-digit verification code to reset your password.
                            </Text>
                        </View>

                        <View style={styles.formCard}>
                            {error ? <Text style={styles.error}>{error}</Text> : null}

                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Registered Email or Username</Text>
                                <View
                                    style={[
                                        styles.inputContainer,
                                        fieldErrors.email && styles.inputError,
                                    ]}
                                >
                                    <Mail color="#94A3B8" size={20} style={styles.leadingIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. student@wmsu.edu.ph"
                                        placeholderTextColor="#94A3B8"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            if (fieldErrors.email) setFieldErrors({});
                                            if (error) setError("");
                                        }}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!isLoading}
                                    />
                                </View>
                                {fieldErrors.email && (
                                    <Text style={styles.errorText}>{fieldErrors.email}</Text>
                                )}
                            </View>

                            <ARButton
                                title="Send Recovery Code"
                                onPress={handleSendCode}
                                isLoading={isLoading}
                                variant="primary"
                                style={styles.mainButton}
                            />

                            <TouchableOpacity
                                style={styles.linkContainer}
                                onPress={() => router.replace("/(auth)/login")}
                                disabled={isLoading}
                            >
                                <Text style={styles.linkText}>
                                    Remember your password?{" "}
                                    <Text style={styles.linkTextBold}>Log In</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </ImageBackground>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
    },
    innerContentWrapper: {
        width: "100%",
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 40,
        alignItems: "center",
    },
    topBar: {
        width: "100%",
        marginBottom: 10,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    backButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "600",
        marginLeft: 6,
    },
    headerContainer: {
        width: "100%",
        marginBottom: 25,
        paddingHorizontal: 10,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(138, 21, 56, 0.8)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    welcomeText: {
        fontFamily: fonts.heading.bold,
        fontSize: 32,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: 0.5,
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitleText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: "#E2E8F0",
        marginTop: 8,
        lineHeight: 20,
        fontWeight: "400",
    },
    formCard: {
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        paddingVertical: 30,
        paddingHorizontal: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    inputWrapper: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F1F5F9",
        borderRadius: 6,
        height: 52,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: "transparent",
    },
    inputError: {
        borderColor: "#EF4444",
        backgroundColor: "#FEF2F2",
    },
    leadingIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: "#0F172A",
        height: "100%",
    },
    errorText: {
        color: "#EF4444",
        fontSize: 12,
        marginLeft: 5,
        marginTop: 4,
        fontWeight: "500",
    },
    error: {
        color: "#EF4444",
        marginBottom: 15,
        textAlign: "center",
        fontSize: 14,
        fontWeight: "600",
        backgroundColor: "#FEF2F2",
        padding: 12,
        borderRadius: 6,
        overflow: "hidden",
    },
    mainButton: {
        borderRadius: 6,
        height: 52,
        marginTop: 5,
        marginBottom: 16,
    },
    linkContainer: {
        alignItems: "center",
        paddingVertical: 10,
    },
    linkText: {
        fontSize: 14,
        color: "#64748B",
    },
    linkTextBold: {
        color: theme.colors.primary,
        fontWeight: "700",
    },
});
