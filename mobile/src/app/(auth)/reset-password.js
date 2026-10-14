import React, { useState, useEffect, useRef } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Eye, EyeOff, Check, X, ShieldCheck, RefreshCw } from "lucide-react-native";
import { customAlert as Alert } from "../../components/ui/CustomAlert";
import { useAuth } from "../../hooks/useAuth";
import theme from "../../theme/tokens";
import ARButton from "../../components/ar/ARButton";
import { fonts } from "../../constants/typography";

export default function ResetPasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { resetPassword, forgotPassword, isLoading } = useAuth();

    const [email, setEmail] = useState(params?.email || "");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    // Cooldown timer for Resend OTP (60s)
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (params?.email) {
            setEmail(params.email);
        }
    }, [params?.email]);

    useEffect(() => {
        if (resendCooldown > 0) {
            timerRef.current = setTimeout(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [resendCooldown]);

    // Live password complexity rules
    const isLengthValid = password.length >= 8;
    const isUpperValid = /[A-Z]/.test(password);
    const isLowerValid = /[a-z]/.test(password);
    const isNumberValid = /\d/.test(password);
    const isSpecialValid = /[\W_]/.test(password);
    const isPasswordStrong =
        isLengthValid && isUpperValid && isLowerValid && isNumberValid && isSpecialValid;
    const doPasswordsMatch =
        password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

    const handleResendCode = async () => {
        if (resendCooldown > 0 || isResending) return;
        if (!email.trim()) {
            setFieldErrors({ email: "Email is required to resend the verification code." });
            return;
        }

        try {
            setIsResending(true);
            setError("");
            setMessage("");

            await forgotPassword(email.trim().toLowerCase());
            setMessage("A new 6-digit code has been sent to your email.");
            setResendCooldown(60);
        } catch (err) {
            console.log("Resend code error:", err);
            let serverMsg =
                err?.data?.error?.message ||
                err?.data?.error ||
                err?.data?.message ||
                err?.data?.detail;
            if (typeof serverMsg === "object" && serverMsg !== null) {
                serverMsg = serverMsg.message || serverMsg.detail || JSON.stringify(serverMsg);
            }
            setError(serverMsg || "Failed to resend code. Please try again.");
        } finally {
            setIsResending(false);
        }
    };

    const handleResetPassword = async () => {
        setError("");
        setMessage("");
        const newFieldErrors = {};

        if (!email.trim()) {
            newFieldErrors.email = "Email address is required.";
        }

        const trimmedOtp = otp.trim();
        if (!trimmedOtp || trimmedOtp.length !== 6) {
            newFieldErrors.otp = "Please enter the 6-digit verification code.";
        }

        if (!password) {
            newFieldErrors.password = "New password is required.";
        } else if (!isPasswordStrong) {
            newFieldErrors.password = "Password does not meet all security requirements.";
        }

        if (!confirmPassword) {
            newFieldErrors.confirmPassword = "Please confirm your new password.";
        } else if (password !== confirmPassword) {
            newFieldErrors.confirmPassword = "Passwords do not match.";
        }

        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
            return;
        }

        setFieldErrors({});

        try {
            await resetPassword(email.trim().toLowerCase(), trimmedOtp, password, confirmPassword);

            Alert(
                "Password Reset Successful",
                "Your password has been reset successfully. You can now log in with your new password.",
                [
                    {
                        text: "Log In",
                        onPress: () => router.replace("/(auth)/login"),
                    },
                ]
            );
        } catch (err) {
            console.log("Reset password error:", err);

            if (err?.data && typeof err.data === "object") {
                const errors = err.data;
                const errMap = {};
                let hasSpecific = false;

                if (errors.otp) {
                    errMap.otp = Array.isArray(errors.otp) ? errors.otp[0] : errors.otp;
                    hasSpecific = true;
                }
                if (errors.new_password) {
                    errMap.password = Array.isArray(errors.new_password)
                        ? errors.new_password[0]
                        : errors.new_password;
                    hasSpecific = true;
                }
                if (errors.new_password_confirm) {
                    errMap.confirmPassword = Array.isArray(errors.new_password_confirm)
                        ? errors.new_password_confirm[0]
                        : errors.new_password_confirm;
                    hasSpecific = true;
                }
                if (errors.email) {
                    errMap.email = Array.isArray(errors.email) ? errors.email[0] : errors.email;
                    hasSpecific = true;
                }

                if (hasSpecific) {
                    setFieldErrors(errMap);
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
                "Failed to reset password. Please check your verification code and try again."
            );
        }
    };

    const PasswordRule = ({ isValid, text }) => (
        <View style={styles.ruleContainer}>
            {isValid ? (
                <Check color={theme.colors.success} size={14} />
            ) : (
                <X color="#EF4444" size={14} />
            )}
            <Text style={[styles.ruleText, isValid ? styles.ruleValid : styles.ruleInvalid]}>
                {text}
            </Text>
        </View>
    );

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
                                <ShieldCheck color="#FFFFFF" size={28} />
                            </View>
                            <Text style={styles.welcomeText}>Reset Password</Text>
                            <Text style={styles.subtitleText}>
                                {email
                                    ? `Enter the 6-digit code sent to ${email} and enter your new password.`
                                    : "Enter your 6-digit verification code and new password."}
                            </Text>
                        </View>

                        <View style={styles.formCard}>
                            {error ? <Text style={styles.error}>{error}</Text> : null}
                            {message ? <Text style={styles.message}>{message}</Text> : null}

                            {/* Verification Code */}
                            <View style={styles.inputWrapper}>
                                <View style={styles.otpHeaderRow}>
                                    <Text style={styles.inputLabel}>6-Digit Recovery Code</Text>
                                    <TouchableOpacity
                                        onPress={handleResendCode}
                                        disabled={resendCooldown > 0 || isResending || isLoading}
                                        style={styles.resendTouch}
                                    >
                                        <Text
                                            style={[
                                                styles.resendLinkText,
                                                (resendCooldown > 0 || isResending) &&
                                                    styles.resendDisabledText,
                                            ]}
                                        >
                                            {isResending
                                                ? "Sending..."
                                                : resendCooldown > 0
                                                ? `Resend in ${resendCooldown}s`
                                                : "Resend Code"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View
                                    style={[
                                        styles.otpInputContainer,
                                        fieldErrors.otp && styles.inputError,
                                    ]}
                                >
                                    <TextInput
                                        style={styles.otpInput}
                                        placeholder="000000"
                                        placeholderTextColor="#94A3B8"
                                        value={otp}
                                        onChangeText={(text) => {
                                            const cleaned = text.replace(/[^0-9]/g, "");
                                            setOtp(cleaned);
                                            if (fieldErrors.otp) setFieldErrors((p) => ({ ...p, otp: null }));
                                        }}
                                        keyboardType="numeric"
                                        maxLength={6}
                                        editable={!isLoading}
                                    />
                                </View>
                                {fieldErrors.otp && (
                                    <Text style={styles.errorText}>{fieldErrors.otp}</Text>
                                )}
                            </View>

                            {/* New Password */}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>New Password</Text>
                                <View
                                    style={[
                                        styles.inputContainer,
                                        fieldErrors.password && styles.inputError,
                                    ]}
                                >
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Enter new password"
                                        placeholderTextColor="#94A3B8"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            if (fieldErrors.password) {
                                                setFieldErrors((p) => ({ ...p, password: null }));
                                            }
                                        }}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        editable={!isLoading}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff color="#94A3B8" size={20} />
                                        ) : (
                                            <Eye color="#94A3B8" size={20} />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Password requirements */}
                                <View style={styles.passwordRulesContainer}>
                                    <PasswordRule isValid={isLengthValid} text="8+ characters" />
                                    <PasswordRule isValid={isUpperValid} text="1 uppercase letter" />
                                    <PasswordRule isValid={isLowerValid} text="1 lowercase letter" />
                                    <PasswordRule isValid={isNumberValid} text="1 number" />
                                    <PasswordRule isValid={isSpecialValid} text="1 special character" />
                                </View>

                                {fieldErrors.password && (
                                    <Text style={styles.errorText}>{fieldErrors.password}</Text>
                                )}
                            </View>

                            {/* Confirm Password */}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Confirm New Password</Text>
                                <View
                                    style={[
                                        styles.inputContainer,
                                        fieldErrors.confirmPassword && styles.inputError,
                                    ]}
                                >
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Confirm new password"
                                        placeholderTextColor="#94A3B8"
                                        value={confirmPassword}
                                        onChangeText={(text) => {
                                            setConfirmPassword(text);
                                            if (fieldErrors.confirmPassword) {
                                                setFieldErrors((p) => ({ ...p, confirmPassword: null }));
                                            }
                                        }}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                        editable={!isLoading}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff color="#94A3B8" size={20} />
                                        ) : (
                                            <Eye color="#94A3B8" size={20} />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {confirmPassword.length > 0 && (
                                    <View style={styles.matchRow}>
                                        {doPasswordsMatch ? (
                                            <>
                                                <Check color={theme.colors.success} size={14} />
                                                <Text style={styles.matchTextValid}>Passwords match</Text>
                                            </>
                                        ) : (
                                            <>
                                                <X color="#EF4444" size={14} />
                                                <Text style={styles.matchTextInvalid}>Passwords do not match</Text>
                                            </>
                                        )}
                                    </View>
                                )}

                                {fieldErrors.confirmPassword && (
                                    <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text>
                                )}
                            </View>

                            <ARButton
                                title="Reset Password"
                                onPress={handleResetPassword}
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
                                    Cancel & Return to{" "}
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
        marginBottom: 18,
    },
    otpHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 8,
    },
    resendTouch: {
        paddingVertical: 2,
        paddingHorizontal: 4,
    },
    resendLinkText: {
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.primary,
    },
    resendDisabledText: {
        color: "#94A3B8",
        fontWeight: "500",
    },
    otpInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F1F5F9",
        borderRadius: 6,
        height: 58,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: "transparent",
    },
    otpInput: {
        fontFamily: fonts.heading.bold,
        width: "100%",
        fontSize: 24,
        color: "#0F172A",
        height: "100%",
        letterSpacing: 8,
        textAlign: "center",
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
    passwordInput: {
        flex: 1,
        fontSize: 15,
        color: "#0F172A",
        height: "100%",
    },
    eyeIcon: {
        padding: 5,
    },
    inputError: {
        borderColor: "#EF4444",
        backgroundColor: "#FEF2F2",
    },
    passwordRulesContainer: {
        marginTop: 8,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 4,
        paddingHorizontal: 4,
    },
    ruleContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 2,
        marginRight: 8,
    },
    ruleText: {
        fontSize: 11,
        marginLeft: 6,
        fontWeight: "500",
    },
    ruleValid: {
        color: theme.colors.success,
    },
    ruleInvalid: {
        color: "#64748B",
    },
    matchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        marginLeft: 4,
    },
    matchTextValid: {
        fontSize: 11,
        fontWeight: "600",
        color: theme.colors.success,
        marginLeft: 4,
    },
    matchTextInvalid: {
        fontSize: 11,
        fontWeight: "600",
        color: "#EF4444",
        marginLeft: 4,
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
    message: {
        color: theme.colors.success,
        marginBottom: 15,
        textAlign: "center",
        fontSize: 14,
        fontWeight: "600",
        backgroundColor: "#F0FDF4",
        padding: 12,
        borderRadius: 6,
        overflow: "hidden",
    },
    mainButton: {
        borderRadius: 6,
        height: 52,
        marginTop: 8,
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
