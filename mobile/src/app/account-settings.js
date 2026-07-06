import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Modal,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    ArrowLeft,
    User as UserIcon,
    Mail,
    Shield,
    Camera,
    Key,
    Trash2,
} from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import theme from "../theme/tokens";
import { fonts } from "../constants/typography";
import { AVATARS } from "../constants/Avatars";
import { customAlert as Alert } from "../components/CustomAlert";

export default function AccountSettingsScreen() {
    const { user, checkToken } = useAuth();
    const [avatarModalVisible, setAvatarModalVisible] = useState(false);
    const [selectedAvatarId, setSelectedAvatarId] = useState(user?.avatar_id);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveAvatar = async () => {
        if (!selectedAvatarId) {
            setAvatarModalVisible(false);
            return;
        }

        setIsSaving(true);
        try {
            const res = await api.patch("/api/auth/me/", {
                avatar_id: selectedAvatarId,
            });
            if (res.data.success) {
                await checkToken(); // Refresh user state globally
                Alert("Success", "Your avatar has been updated successfully.");
                setAvatarModalVisible(false);
            }
        } catch (error) {
            console.error("Failed to update avatar:", error);
            Alert(
                "Error",
                "Could not update your avatar. Please try again later.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    const InfoRow = ({ icon: Icon, label, value }) => (
        <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
                <Icon size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );

    const ActionRow = ({ icon: Icon, title, destructive, onPress }) => (
        <TouchableOpacity style={styles.actionRow} onPress={onPress}>
            <View
                style={[
                    styles.infoIconWrapper,
                    destructive && {
                        backgroundColor: "rgba(211, 47, 47, 0.1)",
                    },
                ]}
            >
                <Icon
                    size={20}
                    color={
                        destructive ? theme.colors.error : theme.colors.primary
                    }
                />
            </View>
            <Text
                style={[
                    styles.actionTitle,
                    destructive && { color: theme.colors.error },
                ]}
            >
                {title}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <ArrowLeft color={theme.colors.textPrimary} size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>ACCOUNT SETTINGS</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        {user?.avatar_id &&
                        AVATARS.find((a) => a.id === user?.avatar_id)
                            ?.source ? (
                            <Image
                                source={
                                    AVATARS.find((a) => a.id === user.avatar_id)
                                        .source
                                }
                                style={styles.avatarImage}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarPlaceholderText}>
                                    {user?.username?.charAt(0).toUpperCase() ||
                                        "?"}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.editAvatarBadge}
                            onPress={() => setAvatarModalVisible(true)}
                        >
                            <Camera size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.usernameText}>@{user?.username}</Text>
                    <Text style={styles.roleText}>
                        {user?.role?.toUpperCase()}
                    </Text>
                </View>

                {/* Profile Information */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>PROFILE INFORMATION</Text>
                    <InfoRow
                        icon={UserIcon}
                        label="Username"
                        value={user?.username || "N/A"}
                    />
                    <InfoRow
                        icon={Mail}
                        label="Email Address"
                        value={user?.email || "No email provided"}
                    />
                    <InfoRow
                        icon={Shield}
                        label="Account Role"
                        value={user?.role?.toUpperCase() || "STUDENT"}
                    />
                </View>

                {/* Security & Danger Zone */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>SECURITY</Text>
                    <ActionRow
                        icon={Key}
                        title="Change Password"
                        onPress={() =>
                            Alert(
                                "Coming Soon",
                                "Password reset will be available in a future update.",
                            )
                        }
                    />
                    <ActionRow
                        icon={Trash2}
                        title="Delete Account"
                        destructive
                        onPress={() =>
                            Alert(
                                "Warning",
                                "Account deletion is permanent. Please contact the administrator to delete your account.",
                            )
                        }
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>ARQuest for WMSU v1.0</Text>
                </View>
            </ScrollView>

            {/* Avatar Selection Modal */}
            <Modal
                visible={avatarModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAvatarModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Choose Avatar</Text>

                        <FlatList
                            data={AVATARS}
                            numColumns={3}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.avatarGrid}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.avatarOption,
                                        selectedAvatarId === item.id &&
                                            styles.avatarOptionSelected,
                                    ]}
                                    onPress={() => setSelectedAvatarId(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <Image
                                        source={item.source}
                                        style={styles.avatarOptionImage}
                                    />
                                    {selectedAvatarId === item.id && (
                                        <View
                                            style={styles.avatarOptionOverlay}
                                        >
                                            <Text style={styles.avatarCheck}>
                                                ✓
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setAvatarModalVisible(false)}
                                disabled={isSaving}
                            >
                                <Text style={styles.modalCancelText}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={handleSaveAvatar}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#FFF"
                                    />
                                ) : (
                                    <Text style={styles.modalSaveText}>
                                        Save Avatar
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgSecondary,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: 5,
    },
    title: {
        fontFamily: fonts.heading.bold,
        flex: 1,
        fontSize: 16,
        color: theme.colors.primary,
        marginLeft: 10,
        letterSpacing: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    avatarSection: {
        alignItems: "center",
        marginVertical: 24,
    },
    avatarContainer: {
        position: "relative",
        marginBottom: 12,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: theme.colors.primary,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarPlaceholderText: {
        fontSize: 40,
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
    },
    editAvatarBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: theme.colors.surface,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    usernameText: {
        fontFamily: fonts.heading.bold,
        fontSize: 20,
        color: theme.colors.textPrimary,
    },
    roleText: {
        fontFamily: fonts.body.bold,
        fontSize: 12,
        color: theme.colors.textMuted,
        letterSpacing: 2,
        marginTop: 4,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: theme.colors.textMuted,
        letterSpacing: 1,
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceSoft,
    },
    infoIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(178, 24, 48, 0.05)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    infoTextWrapper: {
        flex: 1,
    },
    infoLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 12,
        color: theme.colors.textMuted,
        marginBottom: 2,
    },
    infoValue: {
        fontFamily: fonts.body.bold,
        fontSize: 14,
        color: theme.colors.textPrimary,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceSoft,
    },
    actionTitle: {
        fontFamily: fonts.body.bold,
        fontSize: 14,
        color: theme.colors.textPrimary,
    },
    footer: {
        alignItems: "center",
        marginTop: 20,
    },
    footerText: {
        fontFamily: fonts.body.medium,
        fontSize: 12,
        color: theme.colors.textMuted,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 18,
        color: theme.colors.textPrimary,
        textAlign: "center",
        marginBottom: 20,
    },
    avatarGrid: {
        alignItems: "center",
        paddingBottom: 20,
    },
    avatarOption: {
        margin: 10,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: "transparent",
        position: "relative",
    },
    avatarOptionSelected: {
        borderColor: theme.colors.primary,
    },
    avatarOptionImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarOptionOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(178, 24, 48, 0.4)",
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarCheck: {
        color: "#FFF",
        fontSize: 32,
        fontWeight: "bold",
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 10,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceSoft,
        alignItems: "center",
    },
    modalCancelText: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.textPrimary,
        fontSize: 14,
    },
    modalSaveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.primary,
        alignItems: "center",
    },
    modalSaveText: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 14,
    },
});
