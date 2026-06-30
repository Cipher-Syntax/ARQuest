import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/tokens';
import { fonts } from '../constants/typography';
import api from '../services/api';
import SoundManager from '../utils/SoundManager';

export default function QuizModal({ visible, building, onClose }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isCorrect, setIsCorrect] = useState(null);
    const [correctOption, setCorrectOption] = useState(null);
    const [expEarned, setExpEarned] = useState(0);
    
    // Animation for exp popup
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible && building) {
            loadQuiz();
        } else {
            resetQuiz();
        }
    }, [visible, building]);

    const resetQuiz = () => {
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCorrectOption(null);
        setExpEarned(0);
        fadeAnim.setValue(0);
        setLoading(true);
    };

    const loadQuiz = async () => {
        try {
            const res = await api.get(`/api/buildings/${building.id}/quiz/`);
            if (res.data.success && res.data.data.length > 0) {
                setQuestions(res.data.data);
            }
        } catch (error) {
            console.error('Failed to load quiz:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = async (option) => {
        if (selectedAnswer !== null) return; // Prevent double taps

        setSelectedAnswer(option);
        const question = questions[currentQuestionIndex];
        
        try {
            const res = await api.post('/api/buildings/quiz/answer/', {
                question_id: question.id,
                selected_option: option
            });
            
            if (res.data.success) {
                const correct = res.data.data.is_correct;
                setIsCorrect(correct);
                setCorrectOption(res.data.data.correct_option);
                setExpEarned(res.data.data.exp_awarded);
                
                if (correct) {
                    SoundManager.play('trivia_correct');
                    // Show EXP animation
                    Animated.sequence([
                        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                        Animated.delay(1000),
                        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true })
                    ]).start();
                } else {
                    SoundManager.play('trivia_wrong');
                }
            }
        } catch (error) {
            console.error('Answer submission failed', error);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsCorrect(null);
            setCorrectOption(null);
        } else {
            onClose();
        }
    };

    if (!visible) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
                    <View style={styles.sheetHandle} />
                    
                    <View style={styles.header}>
                        <Ionicons name="school" size={24} color={theme.colors.arHighlight} />
                        <Text style={styles.title}>TRIVIA QUIZ</Text>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.arHighlight} />
                            <Text style={styles.loadingText}>Fetching Questions...</Text>
                        </View>
                    ) : questions.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No trivia available for {building?.name} right now.</Text>
                            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                <Text style={styles.closeBtnText}>CLOSE</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.quizContent}>
                            <View style={styles.progressRow}>
                                <Text style={styles.progressText}>Question {currentQuestionIndex + 1} of {questions.length}</Text>
                            </View>
                            
                            <Text style={styles.questionText}>{questions[currentQuestionIndex].question}</Text>
                            
                            <View style={styles.optionsContainer}>
                                {['A', 'B', 'C', 'D'].map(opt => {
                                    const optionText = questions[currentQuestionIndex][`option_${opt.toLowerCase()}`];
                                    
                                    let optionStyle = styles.optionBtn;
                                    let optionTextStyle = styles.optionText;
                                    let iconName = "ellipse-outline";
                                    let iconColor = theme.colors.textMuted;
                                    
                                    if (selectedAnswer !== null) {
                                        if (opt === correctOption) {
                                            optionStyle = [styles.optionBtn, styles.optionCorrect];
                                            optionTextStyle = [styles.optionText, styles.textWhite];
                                            iconName = "checkmark-circle";
                                            iconColor = theme.colors.white;
                                        } else if (opt === selectedAnswer && !isCorrect) {
                                            optionStyle = [styles.optionBtn, styles.optionWrong];
                                            optionTextStyle = [styles.optionText, styles.textWhite];
                                            iconName = "close-circle";
                                            iconColor = theme.colors.white;
                                        }
                                    }
                                    
                                    return (
                                        <TouchableOpacity 
                                            key={opt} 
                                            style={optionStyle} 
                                            onPress={() => handleAnswer(opt)}
                                            disabled={selectedAnswer !== null}
                                        >
                                            <Ionicons name={iconName} size={20} color={iconColor} />
                                            <Text style={optionTextStyle}>{optionText}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            
                            <Animated.View style={[styles.rewardPopup, { opacity: fadeAnim }]}>
                                <Text style={styles.rewardText}>+{expEarned} EXP!</Text>
                            </Animated.View>

                            {selectedAnswer !== null && (
                                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                                    <Text style={styles.nextBtnText}>
                                        {currentQuestionIndex < questions.length - 1 ? 'NEXT QUESTION' : 'FINISH QUIZ'}
                                    </Text>
                                    <Ionicons name="arrow-forward" size={18} color={theme.colors.surface} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: theme.colors.surfaceSoft,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xl * 2,
        maxHeight: '80%',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: theme.spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    title: {
        fontFamily: fonts.heading.bold,
        fontSize: 18,
        color: theme.colors.textPrimary,
        letterSpacing: 2,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: theme.colors.textMuted,
        fontFamily: fonts.heading.regular,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: 20,
    },
    closeBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    closeBtnText: {
        color: theme.colors.textPrimary,
        fontFamily: fonts.heading.bold,
    },
    quizContent: {
        marginTop: theme.spacing.sm,
    },
    progressRow: {
        marginBottom: theme.spacing.md,
    },
    progressText: {
        color: theme.colors.textMuted,
        fontSize: 12,
        fontFamily: fonts.heading.bold,
        letterSpacing: 1,
    },
    questionText: {
        fontSize: 18,
        fontFamily: fonts.heading.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xl,
        lineHeight: 26,
    },
    optionsContainer: {
        gap: theme.spacing.md,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 12,
    },
    optionCorrect: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    },
    optionWrong: {
        backgroundColor: theme.colors.error,
        borderColor: theme.colors.error,
    },
    optionText: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.textPrimary,
        fontFamily: fonts.heading.medium,
    },
    textWhite: {
        color: theme.colors.white,
    },
    rewardPopup: {
        position: 'absolute',
        top: '40%',
        alignSelf: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.95)',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        elevation: 10,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 100,
    },
    rewardText: {
        color: '#fff',
        fontSize: 20,
        fontFamily: fonts.heading.bold,
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.textPrimary,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: theme.spacing.xl,
        gap: 8,
    },
    nextBtnText: {
        color: theme.colors.surface,
        fontFamily: fonts.heading.bold,
        letterSpacing: 1,
    },
});
