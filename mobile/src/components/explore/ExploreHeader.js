import React from "react";
import { Text, View } from "react-native";

import { fonts } from "../../constants/typography";
import { useThemeColors } from "../../context/ThemeContext";
import { useExploreStyles } from "./exploreStyles";

/** Top header: "AR Explorer / Explore Campus" + tagline. */
export default function ExploreHeader() {
    const colors = useThemeColors();
    const styles = useExploreStyles();

    return (
        <View style={styles.header}>
            <Text style={styles.title}>AR Explorer</Text>
            <Text
                style={{
                    fontFamily: fonts.heading.bold,
                    color: colors.textPrimary,
                    fontSize: 16,
                    textAlign: "center",
                    marginTop: -2,
                }}
            >
                Explore Campus
            </Text>
            <Text
                style={{
                    fontFamily: fonts.body.regular,
                    color: colors.textSecondary,
                    fontSize: 14,
                    textAlign: "center",
                    marginTop: 8,
                    paddingHorizontal: 20,
                }}
            >
                Uncover hidden stories and unlock exclusive rewards as you wander.
            </Text>
        </View>
    );
}