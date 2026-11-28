import React from "react";
import { View, Text, TouchableOpacity, Modal, ShieldAlert } from "react-native";
import { customAlert as Alert } from "../../components/ui/CustomAlert";
import { ModalSafeArea, BottomSheetSurface } from "../../components/ui/SafeAreaSheet";

/**
 * Building Detail Modal: 2×2 tactical action grid (3D Model, Virtual Tour, 360° Panorama, Take Quiz).
 * Includes lock states, role gating, and restricted building handling.
 */
export function BuildingDetailModal({
    modalVisible,
    selectedBuilding,
    unlockedBuildings,
    role,
    canAccessBuildingFeatures,
    canView3D,
    canViewPanorama,
    enable_trivia,
    selectedBuildingHasModel,
    selectedBuildingModelUrl,
    onClose,
    onView3D,
    onVirtualTour,
    onViewPanorama,
    onTakeQuiz,
    styles,
    colors,
}) {
    if (!modalVisible || !selectedBuilding) {
        return null;
    }

    const isUnlocked = unlockedBuildings.some((b) => b.id === selectedBuilding.id);
    const isLocked = role !== "visitor" && !isUnlocked;
    const isClosed = selectedBuilding.is_active === false;
    const isMaintenance = selectedBuilding.status === "MAINTENANCE";

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={onClose}
        >
            <ModalSafeArea>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <BottomSheetSurface base={40} style={styles.tacticalModalContainer}>
                        <View style={styles.tacticalModalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.tacticalModalSubtitle}>Selected Location</Text>
                                <Text style={styles.tacticalModalTitle} numberOfLines={2}>
                                    {selectedBuilding.name}
                                </Text>
                            </View>

                            <View
                                style={[
                                    styles.tacticalModalBadge,
                                    isLocked && styles.tacticalModalBadgeLocked,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.tacticalBadgeText,
                                        isLocked && styles.tacticalBadgeTextLocked,
                                    ]}
                                >
                                    {role === "visitor"
                                        ? "GUEST PANORAMA"
                                        : isUnlocked
                                        ? "UNLOCKED"
                                        : "LOCKED"}
                                </Text>
                            </View>
                        </View>

                        {isClosed ? (
                            <View style={styles.restrictedContainer}>
                                <ShieldAlert color={colors.error} size={20} style={{ marginBottom: 4 }} />
                                <Text style={styles.restrictedText}>
                                    Building Closed / Under Renovation
                                </Text>
                            </View>
                        ) : isMaintenance ? (
                            <View style={[styles.restrictedContainer, { borderColor: "#f97316", backgroundColor: "#fff7ed" }]}>
                                <ShieldAlert color="#f97316" size={20} style={{ marginBottom: 4 }} />
                                <Text style={[styles.restrictedText, { color: "#c2410c" }]}>
                                    Under Maintenance / Construction
                                </Text>
                            </View>
                        ) : canAccessBuildingFeatures ? (
                            <View style={styles.tacticalActionGrid}>
                                {/* View 3D Model */}
                                {!selectedBuilding.model_active || !selectedBuildingHasModel ? (
                                    <View style={[styles.tacticalActionBtn, styles.tacticalActionBtnDisabled]}>
                                        <Text
                                            style={[
                                                styles.tacticalActionText,
                                                { color: colors.textMuted },
                                            ]}
                                        >
                                            3D Assets Offline
                                        </Text>
                                    </View>
                                ) : role === "visitor" ? (
                                    <TouchableOpacity
                                        style={[styles.tacticalActionBtn, styles.tacticalActionBtnDisabled]}
                                        onPress={() =>
                                            Alert(
                                                "Guest Access Restricted",
                                                "3D architectural models are only accessible to registered students. Guests can view the 360° panorama tour below.",
                                                [{ text: "Understood" }],
                                            )
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.tacticalActionText,
                                                { color: colors.textMuted },
                                            ]}
                                        >
                                            3D Model (Student Only) 🔒
                                        </Text>
                                    </TouchableOpacity>
                                ) : selectedBuildingModelUrl && canView3D ? (
                                    <TouchableOpacity style={styles.tacticalActionBtn} onPress={onView3D}>
                                        <Text style={styles.tacticalActionText}>View 3D Model</Text>
                                    </TouchableOpacity>
                                ) : role === "student" ? (
                                    <TouchableOpacity
                                        style={[styles.tacticalActionBtn, styles.tacticalActionBtnDisabled]}
                                        onPress={() =>
                                            Alert(
                                                "3D MODEL LOCKED",
                                                `Unlock ${selectedBuilding.name} by visiting it or scanning its QR code to view the 3D model.`,
                                                [{ text: "UNDERSTOOD" }],
                                            )
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.tacticalActionText,
                                                { color: colors.textMuted },
                                            ]}
                                        >
                                            Unlock to View 3D 🔒
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={[styles.tacticalActionBtn, styles.tacticalActionBtnDisabled]}>
                                        <Text
                                            style={[
                                                styles.tacticalActionText,
                                                { color: colors.textMuted },
                                            ]}
                                        >
                                            3D Assets Offline
                                        </Text>
                                    </View>
                                )}

                                {/* Start Virtual Tour */}
                                {canViewPanorama &&
                                    (role === "student" || role === "professional" || role === "admin") &&
                                    selectedBuilding.model_active &&
                                    selectedBuilding.model_url && (
                                        <TouchableOpacity style={styles.tacticalActionBtn} onPress={onVirtualTour}>
                                            <Text style={styles.tacticalActionText}>Start Virtual Tour</Text>
                                        </TouchableOpacity>
                                    )}

                                {/* View 360° Panorama */}
                                {canViewPanorama && (
                                    <TouchableOpacity style={styles.tacticalActionBtn} onPress={onViewPanorama}>
                                        <Text style={styles.tacticalActionText}>View 360° Panorama</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Take Quiz */}
                                {role === "student" && enable_trivia && (
                                    <TouchableOpacity
                                        style={[
                                            styles.tacticalActionBtn,
                                            { borderColor: colors.primary },
                                        ]}
                                        onPress={onTakeQuiz}
                                    >
                                        <Text
                                            style={[
                                                styles.tacticalActionText,
                                                { color: colors.primary },
                                            ]}
                                        >
                                            Take Quiz
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View style={{ alignItems: "center", marginTop: 16 }}>
                                <ShieldAlert color={colors.primary} size={24} style={{ marginBottom: 8 }} />
                                <Text style={styles.tacticalWarningText}>
                                    ⚠ You must visit this location in person to unlock its features
                                </Text>
                            </View>
                        )}
                    </BottomSheetSurface>
                </TouchableOpacity>
            </ModalSafeArea>
        </Modal>
    );
}

export default BuildingDetailModal;