import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AlertTriangle, RefreshCw } from "lucide-react-native";

import { styles } from "../../app/(tabs)/arStyles";

/**
 * Shown when claiming a quest fails (e.g. timeout) so progress is not lost.
 */
export default function ARClaimErrorModal({
    visible,
    onDismiss,
    onRetry,
    isRetrying,
    message,
    questTitle,
    questExp,
}) {
    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={onDismiss}
        >
            <View style={styles.claimErrorOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={onDismiss}
                />
                <View style={styles.claimErrorCard}>
                    {/* Warning/Alert Icon Badge */}
                    <View style={styles.claimErrorIconWrap}>
                        <AlertTriangle size={30} color="#F1C40F" />
                    </View>

                    <Text style={styles.claimErrorTagline}>QUEST CLAIM INTERRUPTED</Text>
                    <Text style={styles.claimErrorTitle}>Connection Issue</Text>

                    <Text style={styles.claimErrorMessage}>{message}</Text>

                    {/* Active Quest Context Pill */}
                    {questTitle ? (
                        <View style={styles.claimErrorQuestPill}>
                            <Ionicons name="gift-outline" size={16} color="#FFD700" style={{ marginRight: 6 }} />
                            <Text style={styles.claimErrorQuestText} numberOfLines={1}>
                                {questTitle} (+{questExp} EXP)
                            </Text>
                        </View>
                    ) : null}

                    {/* Action Buttons Row */}
                    <View style={styles.claimErrorButtonRow}>
                        <TouchableOpacity
                            style={styles.claimErrorDismissBtn}
                            onPress={onDismiss}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.claimErrorDismissText}>DISMISS</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.claimErrorRetryBtn}
                            onPress={onRetry}
                            disabled={isRetrying}
                            activeOpacity={0.8}
                        >
                            {isRetrying ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <RefreshCw size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.claimErrorRetryText}>RETRY CLAIM</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
