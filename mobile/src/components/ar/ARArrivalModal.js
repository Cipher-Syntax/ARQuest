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

import { styles } from "../../app/(tabs)/arStyles";

/**
 * Reward-style arrival card shown when the user reaches a destination.
 * `missionExp` is null when there is no claimable mission for this building.
 */
export default function ARArrivalModal({
    visible,
    onDismiss,
    anim,
    buildingName,
    missionExp,
}) {
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

                        {/* Model Loading Status Indicator */}
                        <View style={styles.arrivalRewardLoaderBox}>
                            <ActivityIndicator size="small" color="#FFD700" style={{ marginRight: 8 }} />
                            <Text style={styles.arrivalRewardLoaderText}>
                                Wait for 3D model to load...
                            </Text>
                        </View>

                        {/* Dismiss Hint */}
                        <Text style={styles.arrivalRewardDismissHint}>Tap anywhere to continue</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}
