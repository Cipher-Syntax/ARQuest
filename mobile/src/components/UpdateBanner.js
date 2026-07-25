import React from "react";
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./styles/UpdateBanner.styles";

const UpdateBanner = ({
    visible,
    isUpdating = false,
    onUpdatePress,
    onDismissPress,
    title = "Update available",
}) => {
    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={typeof onDismissPress === "function" ? onDismissPress : undefined}
        >
            <View style={styles.backdrop}>
                <View style={styles.modalCard}>
                    <View style={styles.iconWrap}>
                        <Ionicons name="cloud-download-outline" size={34} color="#1D4ED8" />
                    </View>

                    <View style={styles.headerRow}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.subtitle}>A newer version is ready. Update now for the latest fixes and features. </Text>
                    </View>

                    <View style={styles.actionsRow}>
                        {typeof onDismissPress === "function" ? (
                            <TouchableOpacity
                                style={[styles.dismissButton, isUpdating && styles.dismissButtonDisabled]}
                                onPress={onDismissPress}
                                disabled={isUpdating}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.dismissText}>Later</Text>
                            </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                            style={[
                                styles.updateButton,
                                typeof onDismissPress !== "function" && styles.singleButton,
                                isUpdating && styles.updateButtonDisabled,
                            ]}
                            onPress={onUpdatePress}
                            disabled={isUpdating}
                            activeOpacity={0.9}
                        >
                            {isUpdating ? (
                                <View style={styles.updatingContent}>
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                    <Text style={styles.updateButtonText}>Updating...</Text>
                                </View>
                            ) : (
                                <Text style={styles.updateButtonText}>Update now</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default UpdateBanner;
