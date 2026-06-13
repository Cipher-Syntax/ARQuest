import React from "react";
import { View, Text, StyleSheet } from "react-native";
import theme from "../../theme/tokens";

export default function ExploreScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.mapPlaceholder}>
                <Text style={styles.text}>Map Area Placeholder</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
    },
    mapPlaceholder: {
        flex: 1,
        backgroundColor: theme.colors.surfaceSoft,
        justifyContent: "center",
        alignItems: "center",
        margin: theme.spacing.md,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: "dashed",
    },
    text: {
        color: theme.colors.textMuted,
        fontSize: theme.typography.md,
    },
});
