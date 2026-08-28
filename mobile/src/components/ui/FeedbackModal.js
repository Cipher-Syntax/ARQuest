import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { customAlert as Alert } from "./CustomAlert";
import {
    X,
    MessageSquare,
    AlertCircle,
    Lightbulb,
    Send,
    HelpCircle,
} from "lucide-react-native";
import theme from "../../theme/tokens";
import { fonts } from "../../constants/typography";
import { api } from "../../services";
import { validateString } from "../../utils/validation";

export default function FeedbackModal({ visible, onClose }) {
    const [type, setType] = useState("bug");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        const messageError = validateString(message, 3);
        if (messageError) {
            setError("Please provide a brief description (at least 3 characters).");
            return;
        }
        setError("");

        setSubmitting(true);
        try {
            const res = await api.post("/api/feedback/", {
                type,
                message: message.trim(),
            });

            if (res.data) {
                Alert(
                    "Feedback Submitted",
                    "Thank you for your report! Your feedback helps us improve ARQuest for everyone.",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                setMessage("");
                                setType("bug");
                                setError("");
                                onClose();
                            },
                        },
                    ]
                );
            }
        } catch (err) {
            console.error("Failed to submit feedback", err);
            Alert(
                "Submission Failed",
                "There was an error sending your feedback. Please check your connection and try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const TypeOption = ({ value, label, icon: Icon, activeColor, activeBg }) => {
        const isSelected = type === value;
        return (
            <TouchableOpacity
                style={[
                    styles.typeOption,
                    isSelected && {
                        borderColor: activeColor,
                        backgroundColor: activeBg,
                    },
                ]}
                onPress={() => {
                    setType(value);
                    if (error) setError("");
                }}
                activeOpacity={0.8}
            >
                <Icon
                    size={16}
                    color={isSelected ? activeColor : theme.colors.textMuted}
                    style={{ marginRight: 6 }}
                />
                <Text
                    style={[
                        styles.typeOptionText,
                        isSelected && {
                            color: activeColor,
                            fontFamily: fonts.heading.bold,
                        },
                    ]}
                >
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Report Issue / Feedback</Text>
                            <Text style={styles.subtitle}>
                                Help our development team improve the app
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <X size={18} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Type Selection */}
                        <Text style={styles.inputLabel}>CATEGORY</Text>
                        <View style={styles.typeSelector}>
                            <TypeOption
                                value="bug"
                                label="Bug Report"
                                icon={AlertCircle}
                                activeColor={theme.colors.error}
                                activeBg="rgba(211, 47, 47, 0.08)"
                            />
                            <TypeOption
                                value="feature"
                                label="Feature Request"
                                icon={Lightbulb}
                                activeColor="#059669"
                                activeBg="rgba(16, 185, 129, 0.08)"
                            />
                            <TypeOption
                                value="other"
                                label="General Feedback"
                                icon={MessageSquare}
                                activeColor={theme.colors.primary}
                                activeBg="rgba(155, 27, 48, 0.08)"
                            />
                        </View>

                        {/* Description Input */}
                        <Text style={styles.inputLabel}>DESCRIPTION</Text>
                        <TextInput
                            style={[
                                styles.input,
                                error ? styles.inputError : null,
                            ]}
                            placeholder={
                                type === "bug"
                                    ? "Describe the issue or error you encountered (e.g. AR camera frozen, building not unlocking)..."
                                    : type === "feature"
                                      ? "What new feature or improvement would you like to see in ARQuest?..."
                                      : "Share your thoughts, suggestions, or general campus feedback..."
                            }
                            placeholderTextColor={theme.colors.textMuted}
                            multiline
                            numberOfLines={5}
                            value={message}
                            onChangeText={(text) => {
                                setMessage(text);
                                if (error) setError("");
                            }}
                            textAlignVertical="top"
                        />

                        {error ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Actions */}
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={onClose}
                                disabled={submitting}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    (!message.trim() || submitting) && styles.submitBtnDisabled,
                                ]}
                                onPress={handleSubmit}
                                disabled={!message.trim() || submitting}
                                activeOpacity={0.9}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <>
                                        <Send size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                                        <Text style={styles.submitBtnText}>Submit Feedback</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modalContent: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    title: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: theme.colors.textPrimary,
        letterSpacing: 0.2,
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    scrollContent: {
        paddingTop: 2,
    },
    inputLabel: {
        fontFamily: fonts.heading.bold,
        fontSize: 11,
        color: "#594040",
        letterSpacing: 0.6,
        marginBottom: 8,
    },
    typeSelector: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
    },
    typeOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#F9FAFB",
    },
    typeOptionText: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    input: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 6,
        padding: 12,
        minHeight: 120,
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: theme.colors.textPrimary,
        marginBottom: 16,
    },
    inputError: {
        borderColor: theme.colors.error,
        backgroundColor: "rgba(211, 47, 47, 0.02)",
    },
    errorBox: {
        backgroundColor: "rgba(211, 47, 47, 0.08)",
        borderRadius: 6,
        padding: 8,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "rgba(211, 47, 47, 0.2)",
    },
    errorText: {
        fontFamily: fonts.body.medium,
        fontSize: 11.5,
        color: theme.colors.error,
    },
    actionsRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    cancelBtnText: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 12.5,
        color: theme.colors.textSecondary,
    },
    submitBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 6,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    submitBtnDisabled: {
        backgroundColor: theme.colors.border,
        shadowOpacity: 0,
        elevation: 0,
    },
    submitBtnText: {
        fontFamily: fonts.heading.bold,
        fontSize: 12.5,
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
});
