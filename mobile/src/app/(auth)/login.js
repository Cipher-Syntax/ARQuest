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
    ImageBackground,
    ScrollView
} from "react-native";
import { customAlert as Alert } from "../../components/ui/CustomAlert";
import { useAuth } from "../../hooks/useAuth";
import theme from "../../theme/tokens";
import { Link, useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import ARButton from "../../components/ar/ARButton";
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
                            <View style={styles.logoBox}>
                                <Image 
                                    source={require('../../../assets/images/logo.png')} 
                                    style={{ width: 80, height: 80, resizeMode: 'contain' }} 
                                />
                            </View>
                            <Text style={styles.welcomeText}>ARQuest</Text>
                            <Text style={styles.subtitleText}>
                                Campus Exploration System
                            </Text>
                        </View>

                        <View style={styles.formCard}>
                            {error ? <Text style={styles.error}>{error}</Text> : null}

                            <View style={styles.inputWrapper}>
                                <View style={[styles.inputContainer, fieldErrors.username && styles.inputError]}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Username"
                                        placeholderTextColor="#94A3B8"
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
                                </View>
                                {fieldErrors.username && (
                                    <Text style={styles.errorText}>
                                        {fieldErrors.username}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.inputWrapper}>
                                <View style={[styles.inputContainer, fieldErrors.password && styles.inputError]}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Password"
                                        placeholderTextColor="#94A3B8"
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
                                            <EyeOff color="#94A3B8" size={20} />
                                        ) : (
                                            <Eye color="#94A3B8" size={20} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                                {fieldErrors.password && (
                                    <Text style={styles.errorText}>
                                        {fieldErrors.password}
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity style={styles.forgotPassword}>
                                <Text style={styles.forgotText}>Forgot Password?</Text>
                            </TouchableOpacity>

                            <ARButton
                                title="Login"
                                onPress={handleLogin}
                                isLoading={isLoading}
                                variant="primary"
                                style={styles.mainButton}
                            />

                            <View style={styles.switchContainer}>
                                <Text style={styles.switchText}>Don't have an account? </Text>
                                <Link href="/(auth)/register" asChild>
                                    <TouchableOpacity>
                                        <Text style={styles.switchLink}>Sign Up</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>

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
    },
    logoBox: {
        marginBottom: 10,
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
        marginBottom: 15,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 6,
        height: 56,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    input: {
        fontFamily: fonts.body.regular,
        flex: 1,
        fontSize: 16,
        color: '#0F172A',
        height: '100%',
    },
    passwordInput: {
        fontFamily: fonts.body.regular,
        flex: 1,
        fontSize: 16,
        color: '#0F172A',
        height: '100%',
    },
    eyeIcon: {
        padding: 10,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginLeft: 5,
        marginTop: 4,
        fontWeight: '500'
    },
    error: {
        color: '#EF4444',
        marginBottom: 15,
        textAlign: "center",
        fontSize: 14,
        fontWeight: "600",
        backgroundColor: "#FEF2F2",
        padding: 12,
        borderRadius: 6,
        overflow: 'hidden',
    },
    forgotPassword: {
        alignItems: 'flex-end',
        marginBottom: 25,
        marginTop: 5,
    },
    forgotText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '600'
    },
    mainButton: {
        borderRadius: 6,
        height: 56,
        marginBottom: 20,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
    },
    switchText: {
        color: '#64748B',
        fontSize: 14,
        fontWeight: '500',
    },
    switchLink: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    visitorButton: {
        marginTop: 20,
        alignItems: "center",
    },
    visitorText: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: "500",
        textDecorationLine: "underline",
    },
});
