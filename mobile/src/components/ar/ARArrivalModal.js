import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    Animated,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useArStyles } from "./arStyles";
import { useThemeColors } from "../../context/ThemeContext";

/**
 * Reward-style arrival card shown when the user reaches a destination.
 * `missionExp` is null when there is no claimable mission for this building.
 *
 * The 3D-model row mirrors the same phase the AR header shows, so the card
 * never promises a model that is still locked or downloading.
 */
export default function ARArrivalModal({
    visible,
    onDismiss,
    anim,
    buildingName,
    missionExp,
    discoveryExp = 0,
    modelPhase = "none",
    modelPercent = null,
    modelPhaseLabel = "",
    modelPhaseBusy = false,
}) {
    const styles = useArStyles();
    const colors = useThemeColors();

    const isErrorPhase =
        modelPhase === "unlock_failed" || modelPhase === "unavailable";
    const isSuccessPhase = modelPhase === "ready";

    const statusIcon = isSuccessPhase
        ? { name: "checkmark-circle", color: colors.success }
        : modelPhase === "locked"
            ? { name: "lock-closed", color: "#E8B923" }
            : isErrorPhase
                ? { name: "alert-circle", color: colors.error }
                : { name: "information-circle", color: colors.textMuted };

    const statusTextStyle = isSuccessPhase
        ? styles.arrivalRewardLoaderTextSuccess
        : isErrorPhase
            ? styles.arrivalRewardLoaderTextError
            : modelPhaseBusy || modelPhase === "locked"
                ? styles.arrivalRewardLoaderText
                : styles.arrivalRewardLoaderTextMuted;

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="none"
            statusBarTranslucent={true}
            onRequestClose={onDismiss}
        >
            <View style={styles.arrivalModalOverlay}>
                {/* Backdrop touch to dismiss */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={onDismiss}
                />

                <Animated.View
                    style={[
                        styles.arrivalRewardCard,
                        {
                            opacity: anim,
                            transform: [
                                {
                                    scale: anim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.85, 1],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={styles.arrivalRewardCardInner}
                        onPress={onDismiss}
                    >
                        {/* Glowing Trophy Badge */}
                        <View style={styles.arrivalRewardTrophyWrap}>
                            <Ionicons name="trophy" size={32} color="#FFD700" />
                        </View>

                        {/* Banner Tag */}
                        <View style={styles.arrivalRewardBanner}>
                            <Ionicons name="trophy" size={12} color="#FFD700" style={{ marginRight: 5 }} />
                            <Text style={styles.arrivalRewardTagline}>DESTINATION REACHED</Text>
                            <Ionicons name="trophy" size={12} color="#FFD700" style={{ marginLeft: 5 }} />
                        </View>

                        <Text style={styles.arrivalRewardTitle}>YOU HAVE ARRIVED</Text>

                        {/* Building Plaque / Certificate Box */}
                        <View style={styles.arrivalRewardBldgPlaque}>
                            <Ionicons name="location-sharp" size={18} color="#FFD700" style={{ marginRight: 6 }} />
                            <Text style={styles.arrivalRewardBldgName} numberOfLines={2}>
                                {buildingName}
                            </Text>
                        </View>

                        {/* Gamified Reward / Discovery Pill */}
                        {missionExp !== null ? (
                            <View style={styles.arrivalRewardExpPill}>
                                <Ionicons name="gift" size={16} color="#FFD700" style={{ marginRight: 6 }} />
                                <Text style={styles.arrivalRewardExpText}>
                                    MISSION AVAILABLE: +{missionExp} EXP
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.arrivalRewardBadgePill}>
                                <Ionicons name="ribbon" size={15} color="#00E5FF" style={{ marginRight: 6 }} />
                                <Text style={styles.arrivalRewardBadgeText}>
                                    CAMPUS LANDMARK UNLOCKED
                                </Text>
                            </View>
                        )}

                        {/* First-time discovery EXP, credited when this arrival
                            also performed the unlock. */}
                        {discoveryExp > 0 && (
                            <View style={styles.arrivalRewardExpPill}>
                                <Ionicons name="sparkles" size={15} color="#FFD700" style={{ marginRight: 6 }} />
                                <Text style={styles.arrivalRewardExpText}>
                                    FIRST DISCOVERY: +{discoveryExp} EXP
                                </Text>
                            </View>
                        )}

                        {/* Model Readiness Status Indicator */}
                        {modelPhaseLabel ? (
                            <View style={{ width: "100%" }}>
                                <View style={styles.arrivalRewardLoaderBox}>
                                    {modelPhaseBusy ? (
                                        <ActivityIndicator size="small" color="#E8B923" style={{ marginRight: 8 }} />
                                    ) : (
                                        <Ionicons
                                            name={statusIcon.name}
                                            size={15}
                                            color={statusIcon.color}
                                            style={{ marginRight: 8 }}
                                        />
                                    )}
                                    <Text style={[styles.arrivalRewardLoaderText, statusTextStyle]}>
                                        {modelPhaseLabel}
                                    </Text>
                                </View>
                                {modelPhaseBusy && modelPercent != null && (
                                    <View style={styles.arrivalRewardProgressTrack}>
                                        <View
                                            style={[
                                                styles.arrivalRewardProgressFill,
                                                { width: `${Math.max(0, Math.min(100, modelPercent))}%` },
                                            ]}
                                        />
                                    </View>
                                )}
                            </View>
                        ) : null}

                        {/* Dismiss Hint */}
                        <Text style={styles.arrivalRewardDismissHint}>Tap anywhere to continue</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}
