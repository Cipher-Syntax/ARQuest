import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ImageBackground,
    Image,
} from "react-native";
import { useRouter, Link } from "expo-router";
import theme from "../../theme/tokens";
import { Eye, EyeOff, Check, X } from "lucide-react-native";
import { useAuth } from "../../hooks/useAuth";
import ARButton from "../../components/ar/ARButton";
import { fonts } from "../../constants/typography";

export default function RegisterScreen() {
    const router = useRouter();
    const { register, isLoading } = useAuth();

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        password_confirm: "",
        first_name: "",
        last_name: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const isLengthValid = formData.password.length >= 8;
    const isUpperValid = /[A-Z]/.test(formData.password);
    const isLowerValid = /[a-z]/.test(formData.password);
    const isNumberValid = /\d/.test(formData.password);
    const isSpecialValid = /[\W_]/.test(formData.password);

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleRegister = async () => {
        try {
            setError("");
            setFieldErrors({});

            await register(formData);
            
            router.replace({
                pathname: "/(auth)/verify-otp",
                params: { 
                    username: formData.username,
                    email: formData.email,
                }
            });
        } catch (err) {
            console.log("Registration error:", err);
            
            if (err?.data && typeof err.data === 'object') {
                const errors = err.data;
                const newFieldErrors = {};
                let hasSpecificErrors = false;
                
                Object.keys(errors).forEach(key => {
                    if (Array.isArray(errors[key])) {
                        newFieldErrors[key] = errors[key][0];
                        hasSpecificErrors = true;
                    } else if (typeof errors[key] === 'string') {
                        newFieldErrors[key] = errors[key];
                        hasSpecificErrors = true;
                    }
                });

                if (hasSpecificErrors) {
                    setFieldErrors(newFieldErrors);
                    return;
                }
            }

            let serverMessage = err?.data?.error || err?.data?.message || err?.data?.detail;
            if (typeof serverMessage === "object" && serverMessage !== null) {
                serverMessage = serverMessage.message || serverMessage.detail || JSON.stringify(serverMessage);
            }
            setError(serverMessage || "Registration failed. Please check your details.");
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
                source={require('../../../assets/images/wmsu_landing_page_background.jpg')}
                style={styles.backgroundImage}
                imageStyle={{ opacity: 0.3 }}
                resizeMode="cover"
            >
                <View style={styles.overlay} />

                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    
                    <View style={styles.innerContentWrapper}>
                        <View style={styles.headerContainer}>
                            <Text style={styles.welcomeText}>Create Account</Text>
                            <Text style={styles.subtitleText}>
                                Register a new account
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
                                        value={formData.username}
                                        onChangeText={(text) =>
                                            handleChange("username", text)
                                        }
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
                                <View style={[styles.inputContainer, fieldErrors.email && styles.inputError]}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Email Address"
                                        placeholderTextColor="#94A3B8"
                                        value={formData.email}
                                        onChangeText={(text) => handleChange("email", text)}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                                {fieldErrors.email && (
                                    <Text style={styles.errorText}>
                                        {fieldErrors.email}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                                    <View style={styles.inputContainer}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="First Name (Optional)"
                                            placeholderTextColor="#94A3B8"
                                            value={formData.first_name}
                                            onChangeText={(text) =>
                                                handleChange("first_name", text)
                                            }
                                        />
                                    </View>
                                </View>
                                <View style={[styles.inputWrapper, { flex: 1, marginLeft: 8 }]}>
                                    <View style={styles.inputContainer}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Last Name (Optional)"
                                            placeholderTextColor="#94A3B8"
                                            value={formData.last_name}
                                            onChangeText={(text) =>
                                                handleChange("last_name", text)
                                            }
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.inputWrapper}>
                                <View style={[styles.inputContainer, fieldErrors.password && styles.inputError]}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Password"
                                        placeholderTextColor="#94A3B8"
                                        value={formData.password}
                                        onChangeText={(text) =>
                                            handleChange("password", text)
                                        }
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
                                
                                {/* Password validation rules in rows */}
                                <View style={styles.passwordRulesContainer}>
                                    <PasswordRule isValid={isLengthValid} text="8+ characters" />
                                    <PasswordRule isValid={isUpperValid} text="1 uppercase letter" />
                                    <PasswordRule isValid={isLowerValid} text="1 lowercase letter" />
                                    <PasswordRule isValid={isNumberValid} text="1 number" />
                                    <PasswordRule isValid={isSpecialValid} text="1 special character" />
                                </View>

                                {fieldErrors.password && (
                                    <Text style={styles.errorText}>
                                        {fieldErrors.password}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.inputWrapper}>
                                <View style={[styles.inputContainer, fieldErrors.password_confirm && styles.inputError]}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Confirm Password"
                                        placeholderTextColor="#94A3B8"
                                        value={formData.password_confirm}
                                        onChangeText={(text) =>
                                            handleChange("password_confirm", text)
                                        }
                                        secureTextEntry={!showConfirmPassword}
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
                                {fieldErrors.password_confirm && (
                                    <Text style={styles.errorText}>
                                        {fieldErrors.password_confirm}
                                    </Text>
                                )}
                            </View>

                            <ARButton
                                title="Register"
                                onPress={handleRegister}
                                isLoading={isLoading}
                                variant="primary"
                                style={styles.mainButton}
                            />

                            <View style={styles.switchContainer}>
                                <Text style={styles.switchText}>Already have an account? </Text>
                                <Link href="/(auth)/login" asChild>
                                    <TouchableOpacity>
                                        <Text style={styles.switchLink}>Log In</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
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
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
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
    passwordRulesContainer: {
        marginTop: 8,
        flexDirection: "column",
        gap: 4,
        paddingHorizontal: 4,
    },
    ruleContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 2,
    },
    ruleText: {
        fontSize: 11,
        marginLeft: 6,
        fontWeight: '500',
    },
    ruleValid: {
        color: theme.colors.success,
    },
    ruleInvalid: {
        color: '#64748B',
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
    mainButton: {
        borderRadius: 6,
        height: 56,
        marginTop: 5,
        marginBottom: 20,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
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
});
