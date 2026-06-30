import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { X, MessageSquare, AlertCircle, Lightbulb } from 'lucide-react-native';
import theme from '../theme/tokens';
import { fonts } from '../constants/typography';
import { api } from '../services/api';

export default function FeedbackModal({ visible, onClose }) {
    const [type, setType] = useState('bug');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim()) {
            Alert.alert("Error", "Please enter a message before submitting.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('/api/feedback/', {
                type,
                message: message.trim()
            });

            if (res.data) {
                Alert.alert(
                    "Thank You!", 
                    "Your feedback has been submitted successfully. We appreciate your help in making ARQuest better!",
                    [{ text: "OK", onPress: () => {
                        setMessage('');
                        setType('bug');
                        onClose();
                    }}]
                );
            }
        } catch (error) {
            console.error("Failed to submit feedback", error);
            Alert.alert("Submission Failed", "There was an error submitting your feedback. Please try again later.");
        } finally {
            setSubmitting(false);
        }
    };

    const TypeOption = ({ value, label, icon: Icon, color }) => {
        const isSelected = type === value;
        return (
            <TouchableOpacity 
                style={[
                    styles.typeOption, 
                    isSelected && [styles.typeOptionSelected, { borderColor: color, backgroundColor: `${color}15` }]
                ]}
                onPress={() => setType(value)}
            >
                <Icon size={20} color={isSelected ? color : theme.colors.textMuted} />
                <Text style={[
                    styles.typeOptionText,
                    isSelected && { color: color, fontFamily: fonts.body.bold }
                ]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView 
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Report an Issue / Feedback</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <X size={24} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <Text style={styles.label}>What kind of feedback do you have?</Text>
                        <View style={styles.typeSelector}>
                            <TypeOption value="bug" label="Bug Report" icon={AlertCircle} color={theme.colors.error} />
                            <TypeOption value="feature" label="Feature Request" icon={Lightbulb} color={theme.colors.success} />
                            <TypeOption value="other" label="Other Feedback" icon={MessageSquare} color={theme.colors.primary} />
                        </View>

                        <Text style={styles.label}>Please describe your feedback:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Tell us what happened or what you'd like to see..."
                            placeholderTextColor={theme.colors.textMuted}
                            multiline
                            numberOfLines={6}
                            value={message}
                            onChangeText={setMessage}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity 
                            style={[styles.submitButton, (!message.trim() || submitting) && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={!message.trim() || submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={styles.submitButtonText}>Submit Feedback</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
        maxHeight: '90%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontFamily: fonts.heading.bold,
        fontSize: 18,
        color: theme.colors.textPrimary,
    },
    closeButton: {
        padding: 5,
    },
    scrollContent: {
        padding: 20,
    },
    label: {
        fontFamily: fonts.body.bold,
        fontSize: 14,
        color: theme.colors.textPrimary,
        marginBottom: 10,
    },
    typeSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    typeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.bgPrimary,
        flexGrow: 1,
        justifyContent: 'center',
        gap: 8,
    },
    typeOptionSelected: {
        borderWidth: 2,
    },
    typeOptionText: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    input: {
        backgroundColor: theme.colors.bgPrimary,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        padding: 15,
        minHeight: 150,
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: theme.colors.textPrimary,
        marginBottom: 25,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.full,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontFamily: fonts.hud.bold,
        color: '#FFF',
        fontSize: 16,
        letterSpacing: 1,
    },
});
