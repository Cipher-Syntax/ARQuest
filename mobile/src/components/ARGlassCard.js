import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import theme from '../theme/tokens';

export default function ARGlassCard({ children, style }) {
    return (
        <BlurView intensity={20} style={[styles.card, style]} tint="dark">
            {children}
        </BlurView>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(20, 20, 20, 0.45)', // Semi-transparent gamified look
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderRadius: theme.radius.md,
        padding: theme.spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
        overflow: 'hidden', // Ensure blur doesn't bleed out of radius
    }
});
