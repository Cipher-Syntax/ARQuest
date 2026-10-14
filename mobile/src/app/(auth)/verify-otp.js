import React, { useState, useEffect } from "react";
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
    Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import theme from "../../theme/tokens";
import { CheckCircle, AlertCircle } from "lucide-react-native";
import ARButton from "../../components/ar/ARButton";
import { fonts } from "../../constants/typography";

export default function VerifyOTP() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { verifyOTP, resendOTP, isLoading } = useAuth();

    const email = params?.email || "";
    const username = params?.username;
    const isFromLogin = params?.from === "login" || (!params?.email && !params?.from);

    const getInitialMessage = () => {
        if (isFromLogin) {
            return "Your email isn't verified yet. A new verification code has been sent to your registered email.";
        }
        if (email) {
            return `A 6-digit verification code has been sent to ${email}. Please check your inbox or spam folder.`;
        }
        return "A 6-digit verification code has been sent to your registered email.";
    };

    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState(getInitialMessage);
    const [isResending, setIsResending] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    // Auto-resend code when arriving from login redirect (email is present but user has no fresh OTP)
    useEffect(() => {
        if (!username) {
            router.replace("/(auth)/login");
            return;
        }
        if (isFromLogin && email) {
            resendOTP(email).catch(() => {
                // Non-fatal — user can still tap "Resend Code" manually
            });
        }
    }, []);

    const handleVerify = async () => {
        if (!otp || otp.length !== 6) {
            setFieldErrors({ otp: "Please enter a valid 6-digit code." });
            return;
        }

        try {
            setError("");
            setMessage("");
            setFieldErrors({});

            await verifyOTP(email, otp);
            router.replace("/(tabs)");
        } catch (err) {
            console.log("OTP verification error:", err);
            
            if (err?.data && typeof err.data === 'object') {
                 if (err.data.otp) {
                      setFieldErrors({ otp: Array.isArray(err.data.otp) ? err.data.otp[0] : err.data.otp });
                      return;
                 }
            }

            let serverMessage = err?.data?.error || err?.data?.message || err?.data?.detail;
            
            if (typeof serverMessage === "object" && serverMessage !== null) {
                serverMessage = serverMessage.message || serverMessage.detail || JSON.stringify(serverMessage);
            }
            
            setError(serverMessage || "Verification failed. Invalid or expired code.");
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        setError("");
        setMessage("");
        
        try {
            await resendOTP(email);
            setMessage(
                email
                    ? `A new 6-digit code has been sent to ${email}. Please check your inbox or spam folder.`
                    : "A new 6-digit code has been sent to your email."
            );
            setOtp("");
        } catch (err) {
            console.log("Resend OTP error:", err);
            let serverMessage = err?.data?.error || err?.data?.message || err?.data?.detail;
            
            if (typeof serverMessage === "object" && serverMessage !== null) {
                serverMessage = serverMessage.message || serverMessage.detail || JSON.stringify(serverMessage);
            }
            
            setError(serverMessage || "Failed to resend code.");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ImageBackground
                source={require('../../../assets/images/wmsu_landing_page_background.jpg')}
                style={styles.backgroundImage}
                imageStyle={{ opacity: 0.3 }}
                resizeMode="cover"
            >
                <View style={styles.overlay} />

                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    
                    <View style={styles.innerContentWrapper}>
                        <View style={styles.headerContainer}>
                            <Text style={styles.welcomeText}>Verification</Text>
                            <Text style={styles.subtitleText}>
                                {email
                                    ? `Enter the 6-digit code sent to ${email}`
                                    : "Enter the 6-digit verification code sent to your email"}
                            </Text>
                        </View>

                        <View style={styles.formCard}>
                            {error ? (
                                <View style={styles.errorBox}>
                                    <AlertCircle color="#EF4444" size={18} style={styles.bannerIcon} />
                                    <Text style={styles.errorTextBanner}>{error}</Text>
                                </View>
                            ) : null}
                            {message ? (
                                <View style={styles.messageBox}>
                                    <CheckCircle color={theme.colors.success} size={18} style={styles.bannerIcon} />
                                    <Text style={styles.messageText}>{message}</Text>
                                </View>
                            ) : null}

                            <View style={styles.inputWrapper}>
                                <View style={[styles.inputContainer, fieldErrors.otp && styles.inputError]}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="000000"
                                        placeholderTextColor="#94A3B8"
                                        value={otp}
                                        onChangeText={(text) => {
                                            setOtp(text);
                                            if (fieldErrors.otp) setFieldErrors({});
                                        }}
                                        keyboardType="numeric"
                                        maxLength={6}
                                    />
                                </View>
                                {fieldErrors.otp && (
                                    <Text style={styles.errorText}>
                                        {fieldErrors.otp}
                                    </Text>
                                )}
                            </View>

                            <ARButton
                                title="Verify Identity"
                                onPress={handleVerify}
                                isLoading={isLoading}
                                disabled={isResending}
                                variant="primary"
                                style={styles.mainButton}
                            />

                            <TouchableOpacity
                                style={styles.secondaryActionButton}
                                onPress={handleResend}
                                disabled={isLoading || isResending}
                            >
                                <Text style={styles.secondaryActionText}>
                                    {isResending ? "Sending..." : "Resend Code"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.linkContainer}
                                onPress={() => router.replace("/(auth)/login")}
                            >
                                <Text style={styles.linkText}>
                                    Abort & Return to Login
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
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    innerContentWrapper: {
        width: '100%',
        paddingHorizontal: 20,
        paddingBottom: 40,
        alignItems: 'center',
    },
    headerContainer: {
        width: '100%',
        marginBottom: 25,
        paddingHorizontal: 10,
        marginTop: 40,
    },
    welcomeText: {
        fontFamily: fonts.heading.bold,
        fontSize: 36,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitleText: {
        fontFamily: fonts.body.regular,
        fontSize: 16,
        color: '#E2E8F0',
        marginTop: 5,
        fontWeight: '500',
    },
    formCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        paddingVertical: 30,
        paddingHorizontal: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    inputWrapper: {
        marginBottom: 25,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 6,
        height: 64,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    input: {
        fontFamily: fonts.heading.bold,
        width: '100%',
        fontSize: 28,
        color: '#0F172A',
        height: '100%',
        letterSpacing: 8,
        textAlign: 'center',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginLeft: 5,
        marginTop: 4,
        fontWeight: '500',
        textAlign: 'center',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 6,
        marginBottom: 16,
    },
    errorTextBanner: {
        flex: 1,
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    messageBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(56, 142, 60, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(56, 142, 60, 0.25)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 6,
        marginBottom: 16,
    },
    messageText: {
        flex: 1,
        color: '#15803D',
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    bannerIcon: {
        marginRight: 10,
        marginTop: 1,
    },
    mainButton: {
        borderRadius: 6,
        height: 56,
        marginBottom: 12,
    },
    secondaryActionButton: {
        height: 56,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    secondaryActionText: {
        color: '#334155',
        fontSize: 16,
        fontWeight: '700',
    },
    linkContainer: {
        alignItems: 'center',
    },
    linkText: {
        color: '#64748B',
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
