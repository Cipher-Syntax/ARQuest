import React from "react";
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
} from "react-native";
import { useThemeColors, useThemeValue } from "../../context/ThemeContext";
import { fonts } from "../../constants/typography";

export default function ARButton({
    title,
    onPress,
    disabled,
    isLoading,
    variant = "primary",
    style,
}) {
    const colors = useThemeColors();
    const spacing = useThemeValue("spacing");
    const radius = useThemeValue("radius");
    const typography = useThemeValue("typography");

    const isAccent = variant === "accent";
    const isOutline = variant === "outline";

    const buttonStyle = [
        styles.button(colors, spacing, radius),
        isAccent && styles.buttonAccent(colors),
        isOutline && styles.buttonOutline(colors),
        disabled && styles.buttonDisabled,
        style,
    ];

    return (
        <TouchableOpacity
            style={buttonStyle}
            onPress={onPress}
            disabled={disabled || isLoading}
        >
            {isLoading ? (
                <ActivityIndicator
                    color={isOutline ? colors.primary : "#451A03"}
                />
            ) : (
                <Text style={styles.text(typography)}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = {
    button: (colors, spacing, radius) => ({
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    }),
    buttonAccent: (colors) => ({
        backgroundColor: colors.accent,
        borderColor: "#D97706",
    }),
    buttonOutline: (colors) => ({
        backgroundColor: "transparent",
        borderColor: colors.border,
    }),
    buttonDisabled: {
        opacity: 0.5,
    },
    text: (typography) => ({
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: typography.md,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 1,
    }),
};