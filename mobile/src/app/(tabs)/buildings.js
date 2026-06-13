import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import theme from "../../theme/tokens";

export default function BuildingsScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.listPlaceholder}>
                <Text style={styles.text}>
                    Building List Container Placeholder
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
        padding: theme.spacing.md,
    },
    listPlaceholder: {
        flex: 1,
        backgroundColor: theme.colors.surfaceSoft,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: "dashed",
    },
    text: {
        color: theme.colors.textMuted,
        fontSize: theme.typography.md,
    },
});
