import React from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { AlertTriangle, RefreshCw, Navigation, ShieldX } from "lucide-react-native";
import { theme } from "../../theme/tokens";

/**
 * Shown when QR-based building unlock fails.
 * Displays distance info and offers retry / dismiss actions.
 */
export default function ARQRErrorModal({
    visible,
    onDismiss,
    onRetry,
    isRetrying,
    message,
    distance,
    threshold,
    buildingName,
}) {
    if (!visible) return null;

    const isTooFar = message?.includes("meters") || message?.includes("too far");
    const isInvalidQR = message?.includes("Invalid");
    const isMaintenance = message?.includes("maintenance");
    const isVisitor = message?.includes("Visitors cannot");

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={onDismiss}
                />
                <View style={styles.card}>
                    {/* Icon Badge */}
                    <View style={styles.iconWrap}>
                        {isTooFar ? (
                            <Navigation size={32} color="#F1C40F" />
                        ) : isInvalidQR ? (
                            <ShieldX size={32} color="#E74C3C" />
                        ) : isMaintenance ? (
                            <AlertTriangle size={32} color="#E67E22" />
                        ) : (
                            <AlertTriangle size={32} color="#F1C40F" />
                        )}
                    </View>

                    {/* Title */}
                    <Text style={styles.tagline}>
                        {isTooFar ? "TOO FAR TO UNLOCK" : isInvalidQR ? "INVALID QR CODE" : isMaintenance ? "BUILDING UNAVAILABLE" : isVisitor ? "ACCESS DENIED" : "UNLOCK FAILED"}
                    </Text>
                    <Text style={styles.title}>{isTooFar ? "Outside Range" : isInvalidQR ? "QR Code Invalid" : isMaintenance ? "Under Maintenance" : "Error"}</Text>

                    {/* Distance info card for too-far case */}
                    {isTooFar && threshold != null && (
                        <View style={styles.distanceCard}>
                            <View style={styles.distanceRow}>
                                <View style={styles.distanceBox}>
                                    <Text style={styles.distanceLabel}>YOUR DISTANCE</Text>
                                    <Text style={styles.distanceValue}>{distance != null ? `${Math.round(distance)} m` : "—"}</Text>
                                </View>
                                <View style={styles.distanceDivider} />
                                <View style={styles.distanceBox}>
                                    <Text style={styles.distanceLabel}>ALLOWED RANGE</Text>
                                    <Text style={styles.distanceValue}>{Math.round(threshold)} m</Text>
                                </View>
                            </View>
                            {buildingName && (
                                <Text style={styles.buildingName}>Target: {buildingName}</Text>
                            )}
                        </View>
                    )}

                    {/* Error message */}
                    <Text style={styles.message}>{message}</Text>

                    {/* Guidance hint */}
                    {isTooFar && (
                        <View style={styles.hintBox}>
                            <Text style={styles.hintText}>
                                Walk closer to the building entrance and try again.
                            </Text>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.dismissBtn}
                            onPress={onDismiss}
                            activeOpacity={0.8}
                            disabled={isRetrying}
                        >
                            <Text style={styles.dismissText}>DISMISS</Text>
                        </TouchableOpacity>

                        {(!isVisitor && !isMaintenance) && (
                            <TouchableOpacity
                                style={[styles.retryBtn, isRetrying && styles.retryBtnDisabled]}
                                onPress={onRetry}
                                disabled={isRetrying}
                                activeOpacity={0.8}
                            >
                                {isRetrying ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <RefreshCw size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                        <Text style={styles.retryText}>TRY AGAIN</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    card: {
        width: "100%",
        maxWidth: 360,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 28,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 12,
    },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: theme.colors.primary + "15",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    tagline: {
        fontSize: 11,
        fontWeight: "700",
        color: theme.colors.primary,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginBottom: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: theme.colors.textPrimary,
        marginBottom: 16,
        textAlign: "center",
    },
    distanceCard: {
        width: "100%",
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: theme.radius.md,
        padding: 16,
        marginBottom: 16,
    },
    distanceRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    distanceBox: {
        flex: 1,
        alignItems: "center",
    },
    distanceLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: theme.colors.textMuted,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    distanceValue: {
        fontSize: 20,
        fontWeight: "700",
        color: theme.colors.textPrimary,
    },
    distanceDivider: {
        width: 1,
        height: 40,
        backgroundColor: theme.colors.border,
        marginHorizontal: 16,
    },
    buildingName: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: "center",
    },
    message: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 20,
        width: "100%",
    },
    hintBox: {
        width: "100%",
        backgroundColor: theme.colors.primary + "10",
        borderRadius: theme.radius.md,
        padding: 12,
        marginBottom: 20,
    },
    hintText: {
        fontSize: 13,
        color: theme.colors.primary,
        textAlign: "center",
        fontWeight: "500",
    },
    buttonRow: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    dismissBtn: {
        flex: 1,
        backgroundColor: theme.colors.surfaceLight,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: 14,
        borderRadius: theme.radius.md,
        alignItems: "center",
    },
    dismissText: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.textPrimary,
        letterSpacing: 0.5,
    },
    retryBtn: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: theme.radius.md,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
    },
    retryBtnDisabled: {
        opacity: 0.6,
    },
    retryText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
});