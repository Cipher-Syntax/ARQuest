import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { QrCode, Camera as CameraIcon } from "lucide-react-native";

import { theme } from "../../theme/tokens";
import { styles } from "../../app/(tabs)/arStyles";

/**
 * Bottom action bar: QR scanner toggle and AR snapshot capture.
 */
export default function ARBottomControls({
    isScanningQr,
    capturing,
    onToggleQr,
    onCapture,
}) {
    return (
        <View style={styles.bottomControls}>
            <TouchableOpacity
                style={[styles.qrBigButton, isScanningQr && styles.qrBigButtonActive]}
                onPress={() => onToggleQr(!isScanningQr)}
            >
                <QrCode size={20} color={isScanningQr ? "#fff" : theme.colors.primary} />
                <Text style={[styles.qrBigButtonText, isScanningQr && { color: "#fff" }]}>
                    {isScanningQr ? "SCANNING QR..." : "SCAN QR CODE"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.captureButton}
                onPress={onCapture}
                disabled={capturing}
                activeOpacity={0.7}
            >
                <View style={styles.captureButtonInner}>
                    {capturing ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <CameraIcon size={28} color={theme.colors.primary} />
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
}
