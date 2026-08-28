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
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    ArrowLeft,
    User as UserIcon,
    Mail,
    Shield,
    Camera,
    Key,
    Lock,
    Calendar,
    Edit3,
    AlertTriangle,
    Eye,
    EyeOff,
    Check,
    X,
    ChevronRight,
} from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useLocationTracking } from "../hooks/useLocationTracking";
import { api } from "../services";
import theme from "../theme/tokens";
import { fonts } from "../constants/typography";
import { AVATARS } from "../constants/Avatars";
import { customAlert as Alert } from "../components/ui/CustomAlert";

export default function AccountSettingsScreen() {
    const { user, checkToken, logout } = useAuth();
    const { stopTracking } = useLocationTracking();

    // Modals
    const [avatarModalVisible, setAvatarModalVisible] = useState(false);
    const [editProfileVisible, setEditProfileVisible] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);

    // Avatar state
    const [selectedAvatarId, setSelectedAvatarId] = useState(user?.avatar_id);
    const [isSavingAvatar, setIsSavingAvatar] = useState(false);

    // Edit Profile state
    const [firstName, setFirstName] = useState(user?.first_name || "");
    const [lastName, setLastName] = useState(user?.last_name || "");
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Change Password state
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // Deactivate state
    const [deactivatePassword, setDeactivatePassword] = useState("");
    const [showDeactivatePass, setShowDeactivatePass] = useState(false);
    const [deactivateError, setDeactivateError] = useState("");
    const [isDeactivating, setIsDeactivating] = useState(false);

    // 1. Save Avatar
    const handleSaveAvatar = async () => {
        if (!selectedAvatarId) {
            setAvatarModalVisible(false);
            return;
        }

        setIsSavingAvatar(true);
        try {
            const res = await api.patch("/api/auth/me/", {
                avatar_id: selectedAvatarId,
            });
            if (res.data.success) {
                await checkToken();
                Alert("Success", "Your avatar has been updated successfully.");
                setAvatarModalVisible(false);
            }
        } catch (error) {
            console.error("Failed to update avatar:", error);
            Alert("Error", "Could not update your avatar. Please try again later.");
        } finally {
            setIsSavingAvatar(false);
        }
    };

    // 2. Save Name / Profile
    const handleSaveProfile = async () => {
        setIsSavingProfile(true);
        try {
            const res = await api.patch("/api/auth/me/", {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
            });
            if (res.data.success) {
                await checkToken();
                Alert("Success", "Profile information updated successfully.");
                setEditProfileVisible(false);
            }
        } catch (error) {
            console.error("Failed to update profile:", error);
            Alert("Error", "Could not update profile information.");
        } finally {
            setIsSavingProfile(false);
        }
    };

    // 3. Change Password
    const handleChangePassword = async () => {
        setPasswordError("");
        if (!oldPassword) {
            setPasswordError("Current password is required.");
            return;
        }
        if (!newPassword || newPassword.length < 8) {
            setPasswordError("New password must be at least 8 characters long.");
            return;
        }
        if (newPassword !== newPasswordConfirm) {
            setPasswordError("New passwords do not match.");
            return;
        }
        if (oldPassword === newPassword) {
            setPasswordError("New password must be different from current password.");
            return;
        }

        setIsSavingPassword(true);
        try {
            const res = await api.post("/api/auth/change-password/", {
                old_password: oldPassword,
                new_password: newPassword,
                new_password_confirm: newPasswordConfirm,
            });
            if (res.data.success) {
                Alert("Password Changed", "Your password has been updated successfully.");
                setOldPassword("");
                setNewPassword("");
                setNewPasswordConfirm("");
                setPasswordModalVisible(false);
            }
        } catch (error) {
            const serverMsg =
                error?.data?.message ||
                error?.data?.details?.new_password?.[0] ||
                error?.data?.details?.new_password_confirm?.[0] ||
                "Failed to change password. Please verify current password.";
            setPasswordError(serverMsg);
        } finally {
            setIsSavingPassword(false);
        }
    };

    // 4. Deactivate Account
    const handleDeactivate = async () => {
        setDeactivateError("");
        if (!deactivatePassword) {
            setDeactivateError("Please enter your password to confirm deactivation.");
            return;
        }

        setIsDeactivating(true);
        try {
            const res = await api.post("/api/auth/deactivate/", {
                password: deactivatePassword,
            });
            if (res.data.success) {
                setDeactivateModalVisible(false);
                if (stopTracking) stopTracking();
                await logout();
                Alert(
                    "Account Deactivated",
                    "Your account has been deactivated. You can reactivate it at any time simply by logging in again.",
                    [
                        {
                            text: "OK",
                            onPress: () => router.replace("/(auth)/login"),
                        },
                    ]
                );
            }
        } catch (error) {
            const serverMsg =
                error?.data?.message || "Incorrect password. Failed to deactivate account.";
            setDeactivateError(serverMsg);
        } finally {
            setIsDeactivating(false);
        }
    };

    // Helpers
    const memberSinceDate = user?.date_joined
        ? new Date(user.date_joined).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "N/A";

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.8}
                >
                    <ArrowLeft color={theme.colors.textPrimary} size={22} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Account Settings</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar Hero */}
                <View style={styles.avatarHero}>
                    <View style={styles.avatarWrapper}>
                        {user?.avatar_id &&
                        AVATARS.find((a) => a.id === user?.avatar_id)?.source ? (
                            <Image
                                source={
                                    AVATARS.find((a) => a.id === user.avatar_id).source
                                }
                                style={styles.avatarImage}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarPlaceholderText}>
                                    {user?.username?.charAt(0).toUpperCase() || "?"}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.editAvatarBadge}
                            onPress={() => {
                                setSelectedAvatarId(user?.avatar_id);
                                setAvatarModalVisible(true);
                            }}
                            activeOpacity={0.85}
                        >
                            <Camera size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.usernameText}>@{user?.username}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>
                            {user?.role?.toUpperCase() || "STUDENT"}
                        </Text>
                    </View>
                </View>

                {/* Section 1: Profile Information */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardSectionTitle}>PROFILE INFORMATION</Text>
                        <TouchableOpacity
                            style={styles.editHeaderBtn}
                            onPress={() => {
                                setFirstName(user?.first_name || "");
                                setLastName(user?.last_name || "");
                                setEditProfileVisible(true);
                            }}
                            activeOpacity={0.8}
                        >
                            <Edit3 size={13} color={theme.colors.primary} style={{ marginRight: 4 }} />
                            <Text style={styles.editHeaderBtnText}>Edit Name</Text>
                        </TouchableOpacity>
                    </View>

                    {/* First Name */}
                    <View style={styles.fieldRow}>
                        <View style={styles.fieldIconWrap}>
                            <UserIcon size={16} color={theme.colors.primary} />
                        </View>
                        <View style={styles.fieldTextWrap}>
                            <Text style={styles.fieldLabel}>First Name</Text>
                            <Text style={styles.fieldValue}>
                                {user?.first_name || "Not set"}
                            </Text>
                        </View>
                    </View>

                    {/* Last Name */}
                    <View style={styles.fieldRow}>
                        <View style={styles.fieldIconWrap}>
                            <UserIcon size={16} color={theme.colors.primary} />
                        </View>
                        <View style={styles.fieldTextWrap}>
                            <Text style={styles.fieldLabel}>Last Name</Text>
                            <Text style={styles.fieldValue}>
                                {user?.last_name || "Not set"}
                            </Text>
                        </View>
                    </View>

                    {/* Username (Locked) */}
                    <View style={styles.fieldRow}>
                        <View style={styles.fieldIconWrap}>
                            <Lock size={16} color={theme.colors.textMuted} />
                        </View>
                        <View style={styles.fieldTextWrap}>
                            <Text style={styles.fieldLabel}>Username (Unique ID)</Text>
                            <Text style={styles.fieldValueMuted}>@{user?.username}</Text>
                        </View>
                        <View style={styles.lockedPill}>
                            <Text style={styles.lockedPillText}>LOCKED</Text>
                        </View>
                    </View>

                    {/* Email (Locked) */}
                    <View style={styles.fieldRow}>
                        <View style={styles.fieldIconWrap}>
                            <Mail size={16} color={theme.colors.textMuted} />
                        </View>
                        <View style={styles.fieldTextWrap}>
                            <Text style={styles.fieldLabel}>Email Address</Text>
                            <Text style={styles.fieldValueMuted}>{user?.email || "No email"}</Text>
                        </View>
                        <View style={styles.verifiedPill}>
                            <Check size={11} color="#059669" style={{ marginRight: 2 }} />
                            <Text style={styles.verifiedPillText}>VERIFIED</Text>
                        </View>
                    </View>

                    {/* Account Role (Locked) */}
                    <View style={styles.fieldRow}>
                        <View style={styles.fieldIconWrap}>
                            <Shield size={16} color={theme.colors.textMuted} />
                        </View>
                        <View style={styles.fieldTextWrap}>
                            <Text style={styles.fieldLabel}>Account Role</Text>
                            <Text style={styles.fieldValueMuted}>
                                {user?.role?.toUpperCase() || "STUDENT"}
                            </Text>
                        </View>
                        <View style={styles.lockedPill}>
                            <Text style={styles.lockedPillText}>SYSTEM</Text>
                        </View>
                    </View>

                    {/* Member Since (Locked) */}
                    <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
                        <View style={styles.fieldIconWrap}>
                            <Calendar size={16} color={theme.colors.textMuted} />
                        </View>
                        <View style={styles.fieldTextWrap}>
                            <Text style={styles.fieldLabel}>Member Since</Text>
                            <Text style={styles.fieldValueMuted}>{memberSinceDate}</Text>
                        </View>
                    </View>
                </View>

                {/* Section 2: Security */}
                <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>SECURITY</Text>
                    <TouchableOpacity
                        style={styles.actionRow}
                        onPress={() => {
                            setPasswordError("");
                            setOldPassword("");
                            setNewPassword("");
                            setNewPasswordConfirm("");
                            setPasswordModalVisible(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={styles.actionIconWrap}>
                            <Key size={18} color={theme.colors.primary} />
                        </View>
                        <View style={styles.actionTextWrap}>
                            <Text style={styles.actionTitle}>Change Password</Text>
                            <Text style={styles.actionSubtitle}>
                                Update your account login credentials
                            </Text>
                        </View>
                        <ChevronRight size={18} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Section 3: Danger Zone */}
                <View style={[styles.card, styles.dangerCard]}>
                    <Text style={[styles.cardSectionTitle, { color: theme.colors.error }]}>
                        DANGER ZONE
                    </Text>
                    <TouchableOpacity
                        style={styles.actionRow}
                        onPress={() => {
                            setDeactivateError("");
                            setDeactivatePassword("");
                            setDeactivateModalVisible(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <View
                            style={[
                                styles.actionIconWrap,
                                { backgroundColor: "rgba(211, 47, 47, 0.08)" },
                            ]}
                        >
                            <AlertTriangle size={18} color={theme.colors.error} />
                        </View>
                        <View style={styles.actionTextWrap}>
                            <Text style={[styles.actionTitle, { color: theme.colors.error }]}>
                                Deactivate Account
                            </Text>
                            <Text style={styles.actionSubtitle}>
                                Temporarily disable account access
                            </Text>
                        </View>
                        <ChevronRight size={18} color="rgba(211, 47, 47, 0.4)" />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* ================= MODAL 1: CHOOSE AVATAR ================= */}
            <Modal
                visible={avatarModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAvatarModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Choose Avatar</Text>
                            <TouchableOpacity
                                onPress={() => setAvatarModalVisible(false)}
                                style={styles.modalCloseBtn}
                            >
                                <X size={20} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={AVATARS}
                            numColumns={2}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.avatarGrid}
                            columnWrapperStyle={{ justifyContent: "space-between" }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.avatarOption,
                                        selectedAvatarId === item.id &&
                                            styles.avatarOptionSelected,
                                    ]}
                                    onPress={() => setSelectedAvatarId(item.id)}
                                    activeOpacity={0.8}
                                >
                                    <Image
                                        source={item.source}
                                        style={styles.avatarOptionImage}
                                    />
                                    {selectedAvatarId === item.id && (
                                        <View style={styles.avatarOptionOverlay}>
                                            <Check size={18} color="#FFFFFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalSecondaryBtn}
                                onPress={() => setAvatarModalVisible(false)}
                            >
                                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalPrimaryBtn}
                                onPress={handleSaveAvatar}
                                disabled={isSavingAvatar}
                            >
                                {isSavingAvatar ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.modalPrimaryBtnText}>Save Avatar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ================= MODAL 2: EDIT PROFILE ================= */}
            <Modal
                visible={editProfileVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setEditProfileVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Edit Profile Name</Text>
                            <TouchableOpacity
                                onPress={() => setEditProfileVisible(false)}
                                style={styles.modalCloseBtn}
                            >
                                <X size={20} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>FIRST NAME</Text>
                            <TextInput
                                style={styles.input}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="Enter first name"
                                placeholderTextColor={theme.colors.textMuted}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>LAST NAME</Text>
                            <TextInput
                                style={styles.input}
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Enter last name"
                                placeholderTextColor={theme.colors.textMuted}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalSecondaryBtn}
                                onPress={() => setEditProfileVisible(false)}
                            >
                                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalPrimaryBtn}
                                onPress={handleSaveProfile}
                                disabled={isSavingProfile}
                            >
                                {isSavingProfile ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.modalPrimaryBtnText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ================= MODAL 3: CHANGE PASSWORD ================= */}
            <Modal
                visible={passwordModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPasswordModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <TouchableOpacity
                                onPress={() => setPasswordModalVisible(false)}
                                style={styles.modalCloseBtn}
                            >
                                <X size={20} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {passwordError ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{passwordError}</Text>
                            </View>
                        ) : null}

                        {/* Current Password */}
                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
                            <View style={styles.inputWithIconWrap}>
                                <TextInput
                                    style={styles.inputWithIcon}
                                    value={oldPassword}
                                    onChangeText={setOldPassword}
                                    placeholder="Enter current password"
                                    placeholderTextColor={theme.colors.textMuted}
                                    secureTextEntry={!showOldPass}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowOldPass(!showOldPass)}
                                    style={styles.eyeBtn}
                                >
                                    {showOldPass ? (
                                        <EyeOff size={18} color={theme.colors.textMuted} />
                                    ) : (
                                        <Eye size={18} color={theme.colors.textMuted} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* New Password */}
                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>NEW PASSWORD (MIN 8 CHARS)</Text>
                            <View style={styles.inputWithIconWrap}>
                                <TextInput
                                    style={styles.inputWithIcon}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Enter new password"
                                    placeholderTextColor={theme.colors.textMuted}
                                    secureTextEntry={!showNewPass}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowNewPass(!showNewPass)}
                                    style={styles.eyeBtn}
                                >
                                    {showNewPass ? (
                                        <EyeOff size={18} color={theme.colors.textMuted} />
                                    ) : (
                                        <Eye size={18} color={theme.colors.textMuted} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm New Password */}
                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
                            <View style={styles.inputWithIconWrap}>
                                <TextInput
                                    style={styles.inputWithIcon}
                                    value={newPasswordConfirm}
                                    onChangeText={setNewPasswordConfirm}
                                    placeholder="Confirm new password"
                                    placeholderTextColor={theme.colors.textMuted}
                                    secureTextEntry={!showConfirmPass}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPass(!showConfirmPass)}
                                    style={styles.eyeBtn}
                                >
                                    {showConfirmPass ? (
                                        <EyeOff size={18} color={theme.colors.textMuted} />
                                    ) : (
                                        <Eye size={18} color={theme.colors.textMuted} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalSecondaryBtn}
                                onPress={() => setPasswordModalVisible(false)}
                            >
                                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalPrimaryBtn}
                                onPress={handleChangePassword}
                                disabled={isSavingPassword}
                            >
                                {isSavingPassword ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.modalPrimaryBtnText}>Update Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ================= MODAL 4: DEACTIVATE ACCOUNT ================= */}
            <Modal
                visible={deactivateModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDeactivateModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={[styles.modalTitle, { color: theme.colors.error }]}>
                                Deactivate Account
                            </Text>
                            <TouchableOpacity
                                onPress={() => setDeactivateModalVisible(false)}
                                style={styles.modalCloseBtn}
                            >
                                <X size={20} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Explanation Banner */}
                        <View style={styles.deactivateInfoBox}>
                            <AlertTriangle size={20} color={theme.colors.error} style={{ marginTop: 2, marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.deactivateInfoTitle}>
                                    What happens when you deactivate?
                                </Text>
                                <Text style={styles.deactivateInfoText}>
                                    • You will be immediately logged out.{"\n"}
                                    • Your account login will be disabled.{"\n"}
                                    • All your earned badges, EXP, and campus exploration progress are safely preserved.{"\n"}
                                    • You can reactivate and restore full access anytime by logging in again.
                                </Text>
                            </View>
                        </View>

                        {deactivateError ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{deactivateError}</Text>
                            </View>
                        ) : null}

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>ENTER PASSWORD TO CONFIRM</Text>
                            <View style={styles.inputWithIconWrap}>
                                <TextInput
                                    style={styles.inputWithIcon}
                                    value={deactivatePassword}
                                    onChangeText={setDeactivatePassword}
                                    placeholder="Enter your account password"
                                    placeholderTextColor={theme.colors.textMuted}
                                    secureTextEntry={!showDeactivatePass}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowDeactivatePass(!showDeactivatePass)}
                                    style={styles.eyeBtn}
                                >
                                    {showDeactivatePass ? (
                                        <EyeOff size={18} color={theme.colors.textMuted} />
                                    ) : (
                                        <Eye size={18} color={theme.colors.textMuted} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalSecondaryBtn}
                                onPress={() => setDeactivateModalVisible(false)}
                            >
                                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalDestructiveBtn}
                                onPress={handleDeactivate}
                                disabled={isDeactivating}
                            >
                                {isDeactivating ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.modalPrimaryBtnText}>Deactivate</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
    },
    headerTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 17,
        color: theme.colors.textPrimary,
        letterSpacing: 0.3,
    },
    content: {
        padding: 16,
    },
    avatarHero: {
        alignItems: "center",
        paddingVertical: 20,
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 16,
    },
    avatarWrapper: {
        position: "relative",
        marginBottom: 10,
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 6,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 6,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarPlaceholderText: {
        fontFamily: fonts.heading.bold,
        fontSize: 32,
        color: "#FFFFFF",
    },
    editAvatarBadge: {
        position: "absolute",
        bottom: -4,
        right: -4,
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#FFFFFF",
    },
    usernameText: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    roleBadge: {
        backgroundColor: "rgba(155, 27, 48, 0.08)",
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: "rgba(155, 27, 48, 0.15)",
    },
    roleBadgeText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10.5,
        color: theme.colors.primary,
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    dangerCard: {
        borderColor: "rgba(211, 47, 47, 0.3)",
    },
    cardHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    cardSectionTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: "#594040",
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    editHeaderBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(155, 27, 48, 0.06)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    editHeaderBtnText: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 11.5,
        color: theme.colors.primary,
    },
    fieldRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    fieldIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: "#F9FAFB",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    fieldTextWrap: {
        flex: 1,
    },
    fieldLabel: {
        fontFamily: fonts.body.regular,
        fontSize: 11.5,
        color: theme.colors.textMuted,
        marginBottom: 1,
    },
    fieldValue: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 13.5,
        color: theme.colors.textPrimary,
    },
    fieldValueMuted: {
        fontFamily: fonts.body.medium,
        fontSize: 13.5,
        color: theme.colors.textSecondary,
    },
    lockedPill: {
        backgroundColor: "#F3F4F6",
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    lockedPillText: {
        fontFamily: fonts.heading.bold,
        fontSize: 9.5,
        color: theme.colors.textMuted,
        letterSpacing: 0.4,
    },
    verifiedPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(16, 185, 129, 0.08)",
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    verifiedPillText: {
        fontFamily: fonts.heading.bold,
        fontSize: 9.5,
        color: "#059669",
        letterSpacing: 0.4,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
    },
    actionIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: "rgba(155, 27, 48, 0.08)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    actionTextWrap: {
        flex: 1,
    },
    actionTitle: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 14,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    actionSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modalContent: {
        width: "100%",
        maxWidth: 400,
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    modalHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    modalTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 17,
        color: theme.colors.textPrimary,
    },
    modalCloseBtn: {
        padding: 4,
    },
    formGroup: {
        marginBottom: 14,
    },
    inputLabel: {
        fontFamily: fonts.heading.bold,
        fontSize: 11,
        color: "#594040",
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    input: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: fonts.body.regular,
        fontSize: 13.5,
        color: theme.colors.textPrimary,
    },
    inputWithIconWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 6,
        paddingHorizontal: 12,
    },
    inputWithIcon: {
        flex: 1,
        paddingVertical: 10,
        fontFamily: fonts.body.regular,
        fontSize: 13.5,
        color: theme.colors.textPrimary,
    },
    eyeBtn: {
        padding: 4,
    },
    errorBox: {
        backgroundColor: "rgba(211, 47, 47, 0.08)",
        borderRadius: 6,
        padding: 10,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "rgba(211, 47, 47, 0.2)",
    },
    errorText: {
        fontFamily: fonts.body.medium,
        fontSize: 12,
        color: theme.colors.error,
        lineHeight: 16,
    },
    deactivateInfoBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "rgba(211, 47, 47, 0.05)",
        borderRadius: 6,
        padding: 12,
        borderWidth: 1,
        borderColor: "rgba(211, 47, 47, 0.2)",
        marginBottom: 14,
    },
    deactivateInfoTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 12.5,
        color: theme.colors.error,
        marginBottom: 4,
    },
    deactivateInfoText: {
        fontFamily: fonts.body.regular,
        fontSize: 11.5,
        color: theme.colors.textSecondary,
        lineHeight: 17,
    },
    avatarGrid: {
        paddingVertical: 10,
    },
    avatarOption: {
        width: "48%",
        aspectRatio: 1,
        backgroundColor: "#F9FAFB",
        borderRadius: 6,
        padding: 8,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
        borderWidth: 2,
        borderColor: "#E5E7EB",
        position: "relative",
    },
    avatarOptionSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: "rgba(155, 27, 48, 0.04)",
    },
    avatarOptionImage: {
        width: "80%",
        height: "80%",
        resizeMode: "contain",
    },
    avatarOptionOverlay: {
        position: "absolute",
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 16,
    },
    modalSecondaryBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    modalSecondaryBtnText: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    modalPrimaryBtn: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 6,
        backgroundColor: theme.colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    modalDestructiveBtn: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 6,
        backgroundColor: theme.colors.error,
        alignItems: "center",
        justifyContent: "center",
    },
    modalPrimaryBtnText: {
        fontFamily: fonts.heading.bold,
        fontSize: 13,
        color: "#FFFFFF",
    },
});
