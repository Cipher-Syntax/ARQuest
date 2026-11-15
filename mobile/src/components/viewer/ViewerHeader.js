import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemedStyles } from "../../hooks/useThemedStyles";

export default function ViewerHeader({ title }) {
    const styles = useThemedStyles(createStyles);
    const router = useRouter();

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)/buildings");
        }
    };

    return (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
                {title}
            </Text>
        </View>
    );
}

const createStyles = (colors, spacing, radius, typography) => StyleSheet.create({
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 10,
    },
    backButton: {
        padding: spacing.sm,
    },
    title: {
        flex: 1,
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
        marginLeft: spacing.sm,
    },
});
