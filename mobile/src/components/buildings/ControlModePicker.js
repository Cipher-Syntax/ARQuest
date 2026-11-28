import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Control Mode Picker: Joystick vs Gyroscope for Virtual Tour.
 * Shown when user taps "Start Virtual Tour" in BuildingDetailModal.
 */
export function ControlModePicker({
    visible,
    onClose,
    onLaunchVirtualTour,
    styles,
    colors,
}) {
    if (!visible) return null;

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.controlPickerOverlay}>
                <View style={styles.controlPickerCard}>
                    {/* Header */}
                    <View style={styles.controlPickerHeader}>
                        <Ionicons
                            name="game-controller-outline"
                            size={28}
                            color={colors.arHighlight}
                        />
                        <Text style={styles.controlPickerTitle}>SELECT CONTROL MODE</Text>
                        <Text style={styles.controlPickerSubtitle}>
                            Choose how you want to navigate the virtual tour
                        </Text>
                    </View>

                    {/* Joystick Option */}
                    <TouchableOpacity
                        style={styles.controlOption}
                        onPress={() => onLaunchVirtualTour("joystick")}
                        activeOpacity={0.75}
                    >
                        <View style={styles.controlOptionIcon}>
                            <Ionicons
                                name="options-outline"
                                size={32}
                                color={colors.arHighlight}
                            />
                        </View>
                        <View style={styles.controlOptionText}>
                            <Text style={styles.controlOptionTitle}>ORBIT CONTROLS</Text>
                            <Text style={styles.controlOptionDesc}>
                                Left joystick to move · Drag right side to look around
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>

                    <View style={styles.controlDivider} />

                    {/* Gyroscope Option */}
                    <TouchableOpacity
                        style={styles.controlOption}
                        onPress={() => onLaunchVirtualTour("gyroscope")}
                        activeOpacity={0.75}
                    >
                        <View style={[styles.controlOptionIcon, styles.controlOptionIconGyro]}>
                            <Ionicons
                                name="phone-portrait-outline"
                                size={32}
                                color={colors.success}
                            />
                        </View>
                        <View style={styles.controlOptionText}>
                            <Text style={[{ color: colors.success }, styles.controlOptionTitle]}>
                                GYROSCOPE
                            </Text>
                            <Text style={styles.controlOptionDesc}>
                                Tilt & rotate your phone to look · Tap joystick side to move
                            </Text>
                            <Text style={styles.controlOptionBadge}>IMMERSIVE MODE</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>

                    {/* Cancel */}
                    <TouchableOpacity style={styles.controlCancelBtn} onPress={onClose}>
                        <Text style={styles.controlCancelText}>CANCEL</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export default ControlModePicker;