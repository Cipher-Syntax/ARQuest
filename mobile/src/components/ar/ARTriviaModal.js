import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { X } from "lucide-react-native";

import { theme } from "../../theme/tokens";
import { styles } from "./arStyles";

/**
 * Bottom sheet with building trivia or the completion message for a mission.
 * `rewardPoints` is null unless the user just completed a claimable mission.
 */
export default function ARTriviaModal({
    onClose,
    slideAnim,
    title,
    buildingName,
    body,
    rewardPoints,
}) {
    return (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 100 }]} pointerEvents="box-none">
            {/* Dark backdrop */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.65)" }]} />

            <Animated.View
                style={[styles.triviaModal, { transform: [{ translateY: slideAnim }] }]}
            >
                <View style={styles.triviaModalHeader}>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        <Ionicons
                            name="book"
                            color={theme.colors.primary}
                            size={22}
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.triviaTitle}>{title}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeTriviaBtn}>
                        <X color={theme.colors.primary} size={20} />
                    </TouchableOpacity>
                </View>

                <View style={styles.triviaContentBorder}>
                    <Text style={styles.triviaBuildingName}>{buildingName}</Text>
                    <Text style={styles.triviaText}>{body}</Text>
                </View>

                {rewardPoints !== null && (
                    <View style={styles.rewardBadge}>
                        <Ionicons name="flash" color={theme.colors.primary} size={20} />
                        <Text style={styles.rewardText}>+{rewardPoints} EXP</Text>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}
