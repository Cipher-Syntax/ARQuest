import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { customAlert as Alert } from '../../components/CustomAlert';
import { useRouter, useLocalSearchParams } from "expo-router";
import theme from "../../theme/tokens";
import { api } from "../../services/api";
import ARGlassCard from "../../components/ARGlassCard";
import ARButton from "../../components/ARButton";

export default function VerifyOtpScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email;

    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const handleVerify = async () => {
        if (!otp || otp.length !== 6) {
            setError("Access code must be 6 digits.");
            return;
        }

        setError("");
        setIsLoading(true);

        try {
            await api.post("/api/auth/verify-otp/", { email, otp });
            Alert(
                "Identity Verified",
                "Your comm channel is confirmed. You may now initialize your quest.",
                [
                    {
                        text: "Proceed",
                        onPress: () => router.replace("/(auth)/login") },
                ],
            );
        } catch (err) {
            console.log("OTP verification error:", err);
            setError(
                err.data?.detail ||
                    err.data?.non_field_errors?.[0] ||
                    "Invalid or expired code.",
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        setError("");
        setMessage("");

        try {
            await api.post("/api/auth/resend-otp/", { email });
            setMessage("A new transmission has been sent to your channel.");
        } catch (err) {
            setError(err.data?.detail || "Failed to resend transmission.");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.glowOrbTop} />
            <View style={styles.glowOrbBottom} />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Verify Comm Link</Text>
                    <Text style={styles.subtitle}>
                        Enter the 6-digit code sent to {email}
                    </Text>
                </View>

                <ARGlassCard style={styles.card}>
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    {message ? <Text style={styles.message}>{message}</Text> : null}

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Transmission Code</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="000000"
                            placeholderTextColor={theme.colors.textMuted}
                            value={otp}
                            onChangeText={setOtp}
                            keyboardType="numeric"
                            maxLength={6}
                            textAlign="center"
                        />
                    </View>

                    <ARButton
                        title="Verify Identity"
                        onPress={handleVerify}
                        isLoading={isLoading}
                        disabled={isResending}
                        variant="primary"
                        style={styles.verifyButton}
                    />

                    <ARButton
                        title="Resend Code"
                        onPress={handleResend}
                        isLoading={isResending}
                        disabled={isLoading}
                        variant="outline"
                        style={styles.resendButton}
                    />

                    <TouchableOpacity
                        style={styles.link}
                        onPress={() => router.replace("/(auth)/login")}
                    >
                        <Text style={styles.linkText}>Abort & Return to Login</Text>
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
        position: 'absolute',
        top: -100,
        left: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: theme.colors.primaryDark,
        opacity: 0.5 },
    glowOrbBottom: {
        position: 'absolute',
        bottom: -150,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: "#EAB30810" },
    content: {
        flex: 1,
        justifyContent: "center",
        padding: theme.spacing.lg,
        zIndex: 1 },
    header: {
        alignItems: "center",
        marginBottom: theme.spacing.xl },
    title: {
        color: "#FFFFFF",
        fontSize: 32,
        fontWeight: "900",
        letterSpacing: 2,
        textTransform: "uppercase",
        textShadowColor: "rgba(234, 179, 8, 0.4)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
        marginBottom: 4,
        textAlign: 'center' },
    subtitle: {
        color: theme.colors.accent,
        fontSize: theme.typography.sm,
        fontWeight: "600",
        textAlign: "center" },
    card: {
        paddingTop: theme.spacing.xl },
    inputGroup: {
        marginBottom: theme.spacing.lg },
    inputLabel: {
        color: "rgba(255,255,255,0.6)",
        fontSize: 10,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 8,
        textAlign: 'center' },
    input: {
        backgroundColor: "rgba(255,255,255,0.05)",
        color: "#FFFFFF",
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        fontSize: theme.typography.xl,
        textAlign: "center",
        letterSpacing: 10 },
    verifyButton: {
        marginTop: theme.spacing.sm },
    resendButton: {
        marginTop: theme.spacing.md },
    error: {
        color: theme.colors.error,
        marginBottom: theme.spacing.md,
        textAlign: "center",
        fontSize: theme.typography.sm,
        fontWeight: "600",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        padding: 10,
        borderRadius: theme.radius.sm },
    message: {
        color: theme.colors.success,
        marginBottom: theme.spacing.md,
        textAlign: "center",
        fontSize: theme.typography.sm,
        fontWeight: "600",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        padding: 10,
        borderRadius: theme.radius.sm },
    link: {
        marginTop: theme.spacing.xl,
        alignItems: "center" },
    linkText: {
        color: "rgba(255,255,255,0.6)",
        fontSize: theme.typography.sm,
        fontWeight: "500" } });




