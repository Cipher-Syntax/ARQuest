import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from "../../theme/tokens";
import { fonts } from "../../constants/typography";
import { api } from "../../services";
import SoundManager from "../../utils/SoundManager";

export default function QuizModal({ visible, building, onClose }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isCorrect, setIsCorrect] = useState(null);
    const [correctOption, setCorrectOption] = useState(null);
    const [expEarned, setExpEarned] = useState(0);

    // 3 Questions Per Building Per Day State
    const [dailyInfo, setDailyInfo] = useState({
        dailyCompleted: 0,
        dailyLimit: 3,
        isLocked: false,
        allCompleted: false,
    });
    const [sessionStats, setSessionStats] = useState({
        correctCount: 0,
        totalExp: 0,
    });
    const [isRoundFinished, setIsRoundFinished] = useState(false);

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
        setSessionStats({ correctCount: 0, totalExp: 0 });
        setIsRoundFinished(false);
        setDailyInfo({ dailyCompleted: 0, dailyLimit: 3, isLocked: false, allCompleted: false });
        fadeAnim.setValue(0);
        setLoading(true);
    };

    const loadQuiz = async () => {
        try {
            const res = await api.get(`/api/buildings/${building.id}/quiz/`);
            if (res.data.success) {
                const data = res.data.data;
                const qList = Array.isArray(data) ? data : (data?.questions || []);
                setQuestions(qList);
                if (!Array.isArray(data) && data) {
                    setDailyInfo({
                        dailyCompleted: data.daily_completed ?? 0,
                        dailyLimit: data.daily_limit ?? 3,
                        isLocked: data.is_locked ?? false,
                        allCompleted: data.all_completed ?? false,
                    });
                }
            }
        } catch (error) {
            console.error("Failed to load quiz:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = async (option) => {
        if (selectedAnswer !== null) return; // Prevent double taps

        setSelectedAnswer(option);
        const question = questions[currentQuestionIndex];

        try {
            const res = await api.post("/api/buildings/quiz/answer/", {
                question_id: question.id,
                selected_option: option,
            });

            if (res.data.success) {
                const correct = res.data.data.is_correct;
                const awarded = res.data.data.exp_awarded || 0;
                setIsCorrect(correct);
                setCorrectOption(res.data.data.correct_option);
                setExpEarned(awarded);
                setSessionStats((prev) => ({
                    correctCount: prev.correctCount + (correct ? 1 : 0),
                    totalExp: prev.totalExp + awarded,
                }));

                if (correct) {
                    SoundManager.play("trivia_correct");
                    // Show EXP animation
                    Animated.sequence([
                        Animated.timing(fadeAnim, {
                            toValue: 1,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.delay(1000),
                        Animated.timing(fadeAnim, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                    ]).start();
                } else {
                    SoundManager.play("trivia_wrong");
                }
            }
        } catch (error) {
            console.error("Answer submission failed", error);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
            setSelectedAnswer(null);
            setIsCorrect(null);
            setCorrectOption(null);
        } else {
            // Concluded the 3-question micro-round: reveal round summary
            setIsRoundFinished(true);
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
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
                    <View style={styles.sheetHandle} />

                    <View style={styles.header}>
                        <Ionicons
                            name="school"
                            size={24}
                            color={theme.colors.arHighlight}
                        />
                        <Text style={styles.title}>TRIVIA QUIZ</Text>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator
                                size="large"
                                color={theme.colors.arHighlight}
                            />
                            <Text style={styles.loadingText}>
                                Fetching Daily Questions...
                            </Text>
                        </View>
                    ) : isRoundFinished ? (
                        /* ── Round Summary Screen (After 3 Questions) ── */
                        <View style={styles.summaryContainer}>
                            <View style={styles.summaryIconCircle}>
                                <Ionicons name="trophy" size={38} color="#FFD700" />
                            </View>
                            <Text style={styles.summaryTitle}>SESSION COMPLETED!</Text>
                            <Text style={styles.summarySubtitle} numberOfLines={1}>
                                {building?.name || "Campus Facility"}
                            </Text>

                            <View style={styles.summaryStatsRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>
                                        {sessionStats.correctCount} / {questions.length}
                                    </Text>
                                    <Text style={styles.statLabel}>CORRECT</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, { color: "#FFD700" }]}>
                                        +{sessionStats.totalExp}
                                    </Text>
                                    <Text style={styles.statLabel}>EXP EARNED</Text>
                                </View>
                            </View>

                            <Text style={styles.summaryEncouragement}>
                                You've completed today's 3-question quiz for this building! Walk to another campus facility to unlock their quiz, or return tomorrow at midnight (00:00).
                            </Text>

                            <TouchableOpacity style={styles.summaryDoneBtn} onPress={onClose}>
                                <Text style={styles.summaryDoneBtnText}>EXPLORE CAMPUS</Text>
                                <Ionicons name="compass" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    ) : dailyInfo.isLocked && questions.length === 0 ? (
                        /* ── Daily Lock Screen (Already completed 3 questions today) ── */
                        <View style={styles.summaryContainer}>
                            <View style={[styles.summaryIconCircle, { backgroundColor: "rgba(0, 229, 255, 0.12)", borderColor: "rgba(0, 229, 255, 0.4)" }]}>
                                <Ionicons name="time" size={36} color="#00E5FF" />
                            </View>
                            <Text style={styles.summaryTitle}>DAILY QUIZ COMPLETED</Text>
                            <Text style={styles.summarySubtitle}>
                                {building?.name || "Campus Facility"} • 3/3 Done Today
                            </Text>
                            <Text style={styles.summaryEncouragement}>
                                You have already answered today's 3-question quiz for this building! Daily quiz resets at midnight (00:00). Walk to another campus building to earn more quiz EXP!
                            </Text>
                            <TouchableOpacity style={styles.summaryDoneBtn} onPress={onClose}>
                                <Text style={styles.summaryDoneBtnText}>EXPLORE OTHER BUILDINGS</Text>
                                <Ionicons name="walk" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    ) : dailyInfo.allCompleted && questions.length === 0 ? (
                        /* ── All Questions Mastered Screen ── */
                        <View style={styles.summaryContainer}>
                            <View style={[styles.summaryIconCircle, { backgroundColor: "rgba(178, 24, 48, 0.12)", borderColor: "rgba(178, 24, 48, 0.4)" }]}>
                                <Ionicons name="school" size={36} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.summaryTitle}>BUILDING MASTERED! 🎓</Text>
                            <Text style={styles.summarySubtitle}>
                                {building?.name || "Campus Facility"}
                            </Text>
                            <Text style={styles.summaryEncouragement}>
                                Congratulations! You have correctly answered all available quiz questions for this facility!
                            </Text>
                            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                <Text style={styles.closeBtnText}>CLOSE</Text>
                            </TouchableOpacity>
                        </View>
                    ) : questions.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                No quiz questions are available for {building?.name} yet!
                            </Text>
                            <TouchableOpacity
                                style={styles.closeBtn}
                                onPress={onClose}
                            >
                                <Text style={styles.closeBtnText}>CLOSE</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* ── Active Quiz Question View ── */
                        <View style={styles.quizContent}>
                            <View style={styles.progressRow}>
                                <View style={styles.progressLeft}>
                                    <Text style={styles.progressBadge}>
                                        QUESTION {currentQuestionIndex + 1} OF {questions.length}
                                    </Text>
                                    <Text style={styles.dailySubBadge}>
                                        DAILY SESSION (MAX 3)
                                    </Text>
                                </View>
                                {/* 3 Progress Step Indicator Dots */}
                                <View style={styles.stepDotsRow}>
                                    {questions.map((_, i) => (
                                        <View
                                            key={`dot-${i}`}
                                            style={[
                                                styles.stepDot,
                                                i === currentQuestionIndex && styles.stepDotActive,
                                                i < currentQuestionIndex && styles.stepDotDone,
                                            ]}
                                        />
                                    ))}
                                </View>
                            </View>

                            <Text style={styles.questionText}>
                                {questions[currentQuestionIndex].question}
                            </Text>

                            <View style={styles.optionsContainer}>
                                {["A", "B", "C", "D"].map((opt) => {
                                    const optionText =
                                        questions[currentQuestionIndex][
                                            `option_${opt.toLowerCase()}`
                                        ];

                                    let optionStyle = styles.optionBtn;
                                    let optionTextStyle = styles.optionText;
                                    let iconName = "ellipse-outline";
                                    let iconColor = theme.colors.textMuted;

                                    if (selectedAnswer !== null) {
                                        if (opt === correctOption) {
                                            optionStyle = [
                                                styles.optionBtn,
                                                styles.optionCorrect,
                                            ];
                                            optionTextStyle = [
                                                styles.optionText,
                                                styles.textWhite,
                                            ];
                                            iconName = "checkmark-circle";
                                            iconColor = theme.colors.white;
                                        } else if (
                                            opt === selectedAnswer &&
                                            !isCorrect
                                        ) {
                                            optionStyle = [
                                                styles.optionBtn,
                                                styles.optionWrong,
                                            ];
                                            optionTextStyle = [
                                                styles.optionText,
                                                styles.textWhite,
                                            ];
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
                                            <Ionicons
                                                name={iconName}
                                                size={20}
                                                color={iconColor}
                                            />
                                            <Text style={optionTextStyle}>
                                                {optionText}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Animated.View
                                style={[
                                    styles.rewardPopup,
                                    { opacity: fadeAnim },
                                ]}
                            >
                                <Text style={styles.rewardText}>
                                    +{expEarned} EXP!
                                </Text>
                            </Animated.View>

                            {selectedAnswer !== null && (
                                <TouchableOpacity
                                    style={styles.nextBtn}
                                    onPress={handleNext}
                                >
                                    <Text style={styles.nextBtnText}>
                                        {currentQuestionIndex <
                                        questions.length - 1
                                            ? "NEXT QUESTION"
                                            : "VIEW ROUND RESULTS"}
                                    </Text>
                                    <Ionicons
                                        name="arrow-forward"
                                        size={18}
                                        color={theme.colors.surface}
                                    />
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
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "flex-end",
    },
    bottomSheet: {
        backgroundColor: theme.colors.surfaceSoft,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xl * 2,
        maxHeight: "80%",
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: theme.spacing.lg,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
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
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        color: theme.colors.textMuted,
        fontFamily: fonts.heading.regular,
    },
    emptyContainer: {
        padding: 20,
        alignItems: "center",
    },
    emptyText: {
        color: theme.colors.textMuted,
        textAlign: "center",
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: theme.spacing.md,
    },
    progressLeft: {
        flexDirection: "column",
        gap: 2,
    },
    progressBadge: {
        color: theme.colors.arHighlight,
        fontSize: 13,
        fontFamily: fonts.heading.bold,
        letterSpacing: 1.5,
    },
    dailySubBadge: {
        color: theme.colors.textMuted,
        fontSize: 10,
        fontFamily: fonts.heading.regular,
        letterSpacing: 0.8,
    },
    stepDotsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    stepDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.25)",
    },
    stepDotActive: {
        backgroundColor: theme.colors.arHighlight,
        borderColor: theme.colors.arHighlight,
        width: 22,
        borderRadius: 5,
    },
    stepDotDone: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    },
    progressText: {
        color: theme.colors.textMuted,
        fontSize: 12,
        fontFamily: fonts.heading.bold,
        letterSpacing: 1,
    },
    summaryContainer: {
        paddingVertical: 20,
        paddingHorizontal: 8,
        alignItems: "center",
    },
    summaryIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(232, 185, 35, 0.15)",
        borderWidth: 2,
        borderColor: "#E8B923",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    summaryTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 20,
        color: theme.colors.textPrimary,
        letterSpacing: 2,
        textAlign: "center",
    },
    summarySubtitle: {
        fontFamily: fonts.heading.regular,
        fontSize: 14,
        color: theme.colors.textMuted,
        marginTop: 4,
        marginBottom: 20,
        textAlign: "center",
    },
    summaryStatsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 18,
        width: "100%",
    },
    statBox: {
        alignItems: "center",
        flex: 1,
    },
    statValue: {
        fontFamily: fonts.heading.bold,
        fontSize: 22,
        color: theme.colors.textPrimary,
    },
    statLabel: {
        fontFamily: fonts.heading.regular,
        fontSize: 10,
        color: theme.colors.textMuted,
        letterSpacing: 1,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: theme.colors.border,
    },
    summaryEncouragement: {
        fontFamily: fonts.heading.regular,
        fontSize: 13,
        color: theme.colors.textMuted,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    summaryDoneBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 12,
        gap: 8,
        width: "100%",
    },
    summaryDoneBtnText: {
        color: "#FFFFFF",
        fontFamily: fonts.heading.bold,
        fontSize: 14,
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
        flexDirection: "row",
        alignItems: "center",
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
        position: "absolute",
        top: "40%",
        alignSelf: "center",
        backgroundColor: "rgba(16, 185, 129, 0.95)",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        elevation: 10,
        shadowColor: "#10b981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 100,
    },
    rewardText: {
        color: "#fff",
        fontSize: 20,
        fontFamily: fonts.heading.bold,
    },
    nextBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
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
