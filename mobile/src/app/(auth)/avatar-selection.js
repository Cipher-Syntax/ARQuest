import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { customAlert as Alert } from "../../components/ui/CustomAlert";
import { useRouter } from "expo-router";
import { getFallbackAvatars, getFallbackAvatarSource } from "../../constants/Avatars";
import { avatarService } from "../../services/avatar/avatarService";
import { api } from "../../services";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../hooks/useAuth";
import { useThemedStyles } from "../../hooks/useThemedStyles";

export default function AvatarSelectionScreen() {
    const styles = useThemedStyles(createStyles);
    const [selectedId, setSelectedId] = useState(null);
    const [avatars, setAvatars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { checkToken } = useAuth();
    const router = useRouter();

    const loadAvatars = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { avatars: loadedAvatars } = await avatarService.getCatalog();
            setAvatars(loadedAvatars);
        } catch (err) {
            console.error("Failed to load avatars:", err);
            // Use fallback avatars
            setAvatars(getFallbackAvatars());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAvatars();
    }, [loadAvatars]);

    const getAvatarSource = (avatar) => {
        if (avatar.image_url) {
            return { uri: avatar.image_url };
        }
        if (avatar.source) {
            return avatar.source;
        }
        return getFallbackAvatarSource(avatar.id);
    };

    const handleContinue = async () => {
        if (!selectedId) {
            Alert("Error", "Please select an avatar to continue.");
            return;
        }

        try {
            const res = await api.patch("/api/auth/me/", { avatar_id: selectedId });
            const savedUser = res?.data?.data?.user;

            // Reset tutorial flag so the new user receives the onboarding guide upon entering tabs
            if (savedUser?.id) {
                await AsyncStorage.removeItem(`@tutorial_completed_${savedUser.id}`);
                await AsyncStorage.removeItem(`@justine_guide_completed_${savedUser.id}`);
            }
            await AsyncStorage.removeItem("@tutorial_completed");
            await AsyncStorage.removeItem("@justine_guide_completed");

            // Successfully updated, go to dashboard
            if (checkToken) {
                await checkToken();
            }
            router.replace("/(tabs)");
        } catch (error) {
            console.log("Avatar save error:", error);
            Alert("Error", "Failed to save avatar. Please try again.");
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={styles.loadingColor} />
                <Text style={styles.loadingText}>Loading avatars...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Choose Your Avatar</Text>
            <Text style={styles.subtitle}>
                Pick a look that matches your vibe for the{"\n"}semester ahead.
            </Text>
            {error && (
                <Text style={styles.errorText}>
                    Using default avatars (offline mode)
                </Text>
            )}
            <FlatList
                data={avatars}
                numColumns={2}
                keyExtractor={(item) => item.id}
                columnWrapperStyle={styles.row}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.avatarContainer,
                            selectedId === item.id && styles.selected,
                        ]}
                        onPress={() => setSelectedId(item.id)}
                    >
                        <Image source={getAvatarSource(item)} style={styles.avatar} />
                    </TouchableOpacity>
                )}
            />
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
                <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "flex-start",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#666",
    },
    loadingColor: colors.primary,
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#1C1B1B",
        marginTop: 60,
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: "#594040",
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 20,
    },
    errorText: {
        fontSize: 12,
        color: "#F57C00",
        marginBottom: 16,
        textAlign: "center",
    },
    row: {
        justifyContent: "space-between",
    },
    avatarContainer: {
        margin: 8,
        width: 156,
        height: 152,
        backgroundColor: "#F0EDED",
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
    },
    selected: { borderColor: colors.primary },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
    },
    button: {
        marginTop: 20,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 9999,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        height: 56,
        marginBottom: 20,
    },
    buttonText: { color: "white", fontWeight: "600", fontSize: 20 },
});
