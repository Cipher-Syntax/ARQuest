import React, { useState } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    FlatList,
} from "react-native";
import { customAlert as Alert } from "../../components/ui/CustomAlert";
import { useRouter } from "expo-router";
import { AVATARS } from "../../constants/Avatars";
import { api } from "../../services";

export default function AvatarSelectionScreen() {
    const [selectedId, setSelectedId] = useState(null);
    const router = useRouter();

    const handleContinue = async () => {
        if (!selectedId) {
            Alert("Error", "Please select an avatar to continue.");
            return;
        }

        try {
            await api.patch("/api/auth/me/", { avatar_id: selectedId });

            // Successfully updated, go to dashboard
            router.replace("/(tabs)");
        } catch (error) {
            console.log("Avatar save error:", error);
            Alert("Error", "Failed to save avatar. Please try again.");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Choose Your Avatar</Text>
            <Text style={styles.subtitle}>
                Pick a look that matches your vibe for the{"\n"}semester ahead.
            </Text>
            <FlatList
                data={AVATARS}
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
                        <Image source={item.source} style={styles.avatar} />
                    </TouchableOpacity>
                )}
            />
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
                <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "flex-start",
    },
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
    selected: { borderColor: "#85001E" },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
    },
    button: {
        marginTop: 20,
        backgroundColor: "#85001E",
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
