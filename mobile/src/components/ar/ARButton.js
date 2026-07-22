import React from "react";
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import theme from "../theme/tokens";
import { fonts } from "../constants/typography";

export default function ARButton({
    title,
    onPress,
    disabled,
    isLoading,
    variant = "primary",
    style,
}) {
    const isAccent = variant === "accent";
    const isOutline = variant === "outline";

    return (
        <TouchableOpacity
            style={[
                styles.button,
                isAccent && styles.buttonAccent,
                isOutline && styles.buttonOutline,
                disabled && styles.buttonDisabled,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || isLoading}
        >
            {isLoading ? (
                <ActivityIndicator
                    color={isOutline ? theme.colors.primary : "#451A03"}
                />
            ) : (
                <Text
                    style={[
                        styles.text,
                        isAccent && styles.textAccent,
                        isOutline && styles.textOutline,
                    ]}
                >
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    buttonAccent: {
        backgroundColor: theme.colors.accent,
        borderColor: "#D97706",
    },
    buttonOutline: {
        backgroundColor: "transparent",
        borderColor: theme.colors.border,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    text: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: theme.typography.md,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    textAccent: {
        color: "#451A03", // Dark brown/black for contrast on gold
    },
    textOutline: {
        color: theme.colors.textSecondary,
        textTransform: "none",
    },
});
