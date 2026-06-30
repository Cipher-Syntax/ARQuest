import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Map, MapPin, ScanLine, Trophy, Target } from 'lucide-react-native';
import theme from '../theme/tokens';
import fonts from '../theme/fonts';

const { width, height } = Dimensions.get('window');

const TUTORIAL_STEPS = [
    {
        title: "WELCOME TO ARQUEST",
        description: "Your campus is now a gamified battlefield. Complete quests, explore buildings, and rank up!",
        icon: Trophy,
        position: 'center'
    },
    {
        title: "DAILY MISSIONS",
        description: "Check here every day for your main objective and limited-time flash events.",
        icon: Target,
        position: 'bottom',
        pointerLeft: '10%'
    },
    {
        title: "EXPLORE RADAR",
        description: "See what buildings are nearby. Tap them to answer trivia and earn bonus EXP!",
        icon: MapPin,
        position: 'bottom',
        pointerLeft: '30%'
    },
    {
        title: "AR SCANNER",
        description: "Deploy your camera to physically scan and unlock buildings in the real world.",
        icon: ScanLine,
        position: 'bottom',
        pointerLeft: '50%'
    },
    {
        title: "BUILDINGS MAP",
        description: "View the full 2D campus map and see your live GPS location.",
        icon: Map,
        position: 'bottom',
        pointerLeft: '70%'
    },
    {
        title: "YOUR PROFILE",
        description: "Track your rank, view your earned badges, and check your stamp passport.",
        icon: Trophy,
        position: 'bottom',
        pointerLeft: '90%'
    }
];

export default function OnboardingTutorial() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        checkTutorialStatus();
    }, []);

    const checkTutorialStatus = async () => {
        try {
            const hasCompleted = await AsyncStorage.getItem('@tutorial_completed');
            if (hasCompleted !== 'true') {
                setIsVisible(true);
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            }
        } catch (e) {
            console.error('Failed to check tutorial status:', e);
        }
    };

    const handleNext = async () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true })
            ]).start();
            setTimeout(() => setCurrentStep(prev => prev + 1), 200);
        } else {
            // Finish tutorial
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(async () => {
                setIsVisible(false);
                await AsyncStorage.setItem('@tutorial_completed', 'true');
            });
        }
    };

    const handleSkip = async () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(async () => {
            setIsVisible(false);
            await AsyncStorage.setItem('@tutorial_completed', 'true');
        });
    };

    if (!isVisible) return null;

    const step = TUTORIAL_STEPS[currentStep];
    const Icon = step.icon;

    return (
        <Modal transparent visible={isVisible} animationType="none">
            <View style={styles.overlay}>
                <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                    
                    <View style={[
                        styles.tooltipBox,
                        step.position === 'bottom' ? styles.tooltipBottom : styles.tooltipCenter
                    ]}>
                        <View style={styles.iconContainer}>
                            <Icon color={theme.colors.primary} size={32} />
                        </View>
                        
                        <Text style={styles.title}>{step.title}</Text>
                        <Text style={styles.description}>{step.description}</Text>
                        
                        <View style={styles.buttonRow}>
                            {currentStep < TUTORIAL_STEPS.length - 1 && (
                                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                                    <Text style={styles.skipText}>SKIP</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
                                <Text style={styles.nextText}>
                                    {currentStep === TUTORIAL_STEPS.length - 1 ? 'START QUEST' : 'NEXT'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Pointer Triangle for bottom tooltips */}
                        {step.position === 'bottom' && (
                            <View style={[styles.pointer, { left: step.pointerLeft }]} />
                        )}
                    </View>

                    {/* Highlight Circle for tabs (approximate) */}
                    {step.position === 'bottom' && (
                        <View style={[styles.highlightCircle, { left: step.pointerLeft }]} />
                    )}

                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tooltipCenter: {
        alignSelf: 'center',
    },
    tooltipBottom: {
        position: 'absolute',
        bottom: 120, // Sit just above the tab bar
        alignSelf: 'center',
    },
    tooltipBox: {
        width: width * 0.85,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 64,
        height: 64,
        backgroundColor: 'rgba(178, 24, 48, 0.1)',
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontFamily: fonts.heading.bold,
        fontSize: 20,
        color: theme.colors.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 1,
    },
    description: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        gap: 16,
    },
    skipBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    skipText: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    nextBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
    },
    nextText: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: '#FFFFFF',
    },
    pointer: {
        position: 'absolute',
        bottom: -15,
        width: 0,
        height: 0,
        borderLeftWidth: 15,
        borderRightWidth: 15,
        borderTopWidth: 15,
        borderStyle: 'solid',
        backgroundColor: 'transparent',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: theme.colors.surface,
        marginLeft: -15, // center the pointer
    },
    highlightCircle: {
        position: 'absolute',
        bottom: 25, // roughly center of tab bar icons
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(178, 24, 48, 0.2)',
        marginLeft: -30, // center the circle
    }
});
