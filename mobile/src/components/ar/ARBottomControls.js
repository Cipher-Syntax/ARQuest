import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { QrCode, Camera as CameraIcon } from "lucide-react-native";

import { useThemeColors } from "../../context/ThemeContext";
import { useArStyles } from "./arStyles";

/** Side action rail: QR scanner toggle and AR snapshot capture. */
export default function ARBottomControls({
    isScanningQr,
    capturing,
    onToggleQr,
    onCapture,
    showQr = true,
    showCapture = true,
    layout = "side",
}) {
    const colors = useThemeColors();
    const styles = useArStyles();

    return (
        <View style={layout === "inline" ? styles.inlineControls : styles.sideControls}>
            {showQr && (
                <TouchableOpacity
                    style={[
                        layout === "inline" ? styles.inlineActionButton : styles.sideActionButton,
                        isScanningQr && styles.qrBigButtonActive,
                    ]}
                    onPress={() => onToggleQr(!isScanningQr)}
                    accessibilityRole="button"
                    accessibilityLabel={isScanningQr ? "Stop QR scanner" : "Scan QR code"}
                    activeOpacity={0.8}
                >
                    <QrCode size={layout === "inline" ? 20 : 22} color={isScanningQr ? "#FFFFFF" : colors.primary} />
                </TouchableOpacity>
            )}

            {showCapture && (
                <TouchableOpacity
                    style={[
                        layout === "inline" ? styles.inlineActionButton : styles.sideActionButton,
                        layout !== "inline" && styles.sideCaptureButton,
                    ]}
                    onPress={onCapture}
                    disabled={capturing}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Capture AR view"
                >
                    {capturing ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <CameraIcon size={layout === "inline" ? 20 : 24} color={colors.primary} />
                    )}
                </TouchableOpacity>
            )}
        </View>
    );
}
