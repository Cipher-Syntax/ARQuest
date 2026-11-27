import React from "react";
import { Image, Text, View } from "react-native";

import { fonts } from "../../constants/typography";
import { useThemeColors } from "../../context/ThemeContext";

/**
 * Leaderboard avatar: network image when the account has one, otherwise a
 * crimson initial on a neutral disc.
 */
export default function StudentAvatar({ student, size = 48, borderColor = "#E5E7EB" }) {
    const colors = useThemeColors();

    if (!student) return null;

    const avatarUri = student.avatar_url || student.profile_image;
    if (avatarUri) {
        return (
            <Image
                source={{ uri: avatarUri }}
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: 2,
                    borderColor: borderColor,
                    backgroundColor: "#FFFFFF",
                }}
                resizeMode="cover"
            />
        );
    }

    const letter = (
        student.first_name?.[0] ||
        student.username?.[0] ||
        "?"
    ).toUpperCase();

    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: "#F1F5F9",
                borderWidth: 2,
                borderColor: borderColor,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Text
                style={{
                    fontFamily: fonts.heading.bold,
                    fontSize: size * 0.42,
                    color: colors.primary,
                }}
            >
                {letter}
            </Text>
        </View>
    );
}
