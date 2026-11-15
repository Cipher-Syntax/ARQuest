import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { QrCode, Camera as CameraIcon } from "lucide-react-native";

import { useThemeColors } from "../../context/ThemeContext";
import { useArStyles } from "./arStyles";

/**
 * Bottom action bar: QR scanner toggle and AR snapshot capture.
 */
export default function ARBottomControls({
    isScanningQr,
    capturing,
    onToggleQr,
    onCapture,
    showQr = true,
    showCapture = true,
}) {
    const colors = useThemeColors();
    const styles = useArStyles();
    return (
        <View style={styles.bottomControls}>
            {showQr && (
                <TouchableOpacity
                    style={[styles.qrBigButton, isScanningQr && styles.qrBigButtonActive]}
                    onPress={() => onToggleQr(!isScanningQr)}
                >
                    <QrCode size={20} color={isScanningQr ? "#fff" : colors.primary} />
                    <Text style={[styles.qrBigButtonText, isScanningQr && { color: "#fff" }]}>
                        {isScanningQr ? "SCANNING QR..." : "SCAN QR CODE"}
                    </Text>
                </TouchableOpacity>
            )}

            {showCapture && (
                <TouchableOpacity
                    style={styles.captureButton}
                    onPress={onCapture}
                    disabled={capturing}
                    activeOpacity={0.7}
                >
                    <View style={styles.captureButtonInner}>
                        {capturing ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <CameraIcon size={28} color={colors.primary} />
                        )}
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
}
