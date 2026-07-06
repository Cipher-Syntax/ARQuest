import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "../../theme/tokens";

export default function ViewerHeader({ title }) {
    const router = useRouter();

    return (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
                {title}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.sm,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 10,
    },
    backButton: {
        padding: theme.spacing.sm,
    },
    title: {
        flex: 1,
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
        marginLeft: theme.spacing.sm,
    },
});
