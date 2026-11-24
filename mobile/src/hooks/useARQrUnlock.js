// src/hooks/useARQrUnlock.js
import { useState, useCallback } from "react";
import { Alert } from "react-native";
import SoundManager from "../utils/SoundManager";

/**
 * Custom hook for AR QR code scanning and building unlock:
 * - Handles QR code scanning via camera
 * - Processes unlock via QR with location verification
 * - Manages unlock success/error modals
 * - Handles demo mode unlocks
 */
export function useARQrUnlock({
    isScanningQr,
    setIsScanningQr,
    location,
    demoMode,
    user,
    nearbyBuildingFull,
    setNearbyBuildingFull,
    refreshPublicSettings,
    checkToken,
    toggleQrScanner,
    unlockViaQr,
}) {
    const [scannedData, setScannedData] = useState(null);
    const [qrErrorModalVisible, setQrErrorModalVisible] = useState(false);
    const [qrErrorMessage, setQrErrorMessage] = useState("");
    const [qrErrorDistance, setQrErrorDistance] = useState(null);
    const [qrErrorThreshold, setQrErrorThreshold] = useState(null);
    const [qrErrorBuildingName, setQrErrorBuildingName] = useState("");
    const [qrErrorRetrying, setQrErrorRetrying] = useState(false);

    const [unlockedModalVisible, setUnlockedModalVisible] = useState(false);
    const [unlockedModalBuilding, setUnlockedModalBuilding] = useState("");
    const [unlockedModalIsDemo, setUnlockedModalIsDemo] = useState(false);
    const [unlockedModalAlready, setUnlockedModalAlready] = useState(false);
    const [unlockedModalExp, setUnlockedModalExp] = useState(0);

    const handleBarCodeScanned = useCallback(async ({ type, data }) => {
        if (!isScanningQr || scannedData === data) return;
        setScannedData(data);
        setIsScanningQr(false); // Stop scanning immediately after successful read

        if (!location && !demoMode) {
            setScannedData(null);
            Alert("Permission Required", "Please enable GPS location permissions to verify this QR code.");
            return;
        }

        try {
            // Routed through the shared context so the global unlocked list
            // refreshes immediately and the Maps tab reflects the unlock.
            const result = await unlockViaQr(
                data,
                location?.latitude ?? null,
                location?.longitude ?? null
            );

            const isNewUnlock = result?.newly_unlocked !== false;
            const isDemoUnlock = result?.demo_mode ?? demoMode;

            // Keep the banner/context in sync if the admin flipped Demo Mode
            // while this app was already in the foreground.
            if (
                typeof result?.demo_mode === "boolean" &&
                result.demo_mode !== demoMode
            ) {
                refreshPublicSettings();
            }
            if (nearbyBuildingFull &&
                String(nearbyBuildingFull.id) === String(result?.building)) {
                setNearbyBuildingFull({
                    ...nearbyBuildingFull,
                    is_unlocked: true,
                });
            }
            if (isNewUnlock) {
                // Same unlock feedback as a real unlock; demo visitors hear it
                // too so the exhibit feels identical.
                if (user?.role === "student" || isDemoUnlock) {
                    SoundManager.play("building_unlock");
                }
                // Show badge toast if earned (students only)
                const earned = result?.newly_earned_badges || [];
                if (user?.role === "student" && earned.length > 0) {
                    setTimeout(() => {
                        SoundManager.play("badge_earned");
                    }, 1200);
                    // Badge animation handled by parent component
                }
                // Discovery EXP is credited server-side; refresh the cached
                // totals so Home/Profile show the new balance immediately.
                if (user?.role === "student" && result?.exp_awarded > 0) {
                    checkToken();
                }
            }

            // Custom modal instead of a native alert; demo unlocks are labelled
            // so exhibitors know the unlock is temporary.
            setUnlockedModalBuilding(
                result?.building_name || nearbyBuildingFull?.name || "Building",
            );
            setUnlockedModalIsDemo(!!isDemoUnlock);
            setUnlockedModalAlready(!isNewUnlock);
            setUnlockedModalExp(isNewUnlock ? (result?.exp_awarded || 0) : 0);
            setUnlockedModalVisible(true);
        } catch (error) {
            console.error("QR unlock error:", error);
            const errorMsg =
                error.data?.error?.message ||
                error.data?.detail ||
                "Failed to connect to server.";

            // Parse distance/threshold from backend message if present
            // Format: "You must be within X meters... You are currently Y meters away."
            let distance = null, threshold = null;
            const distMatch = errorMsg.match(/You are currently (\d+) meters? away/);
            const threshMatch = errorMsg.match(/within (\d+) meters? of the building/);
            if (distMatch) distance = parseInt(distMatch[1], 10);
            if (threshMatch) threshold = parseInt(threshMatch[1], 10);

            // Get building name from nearby building if available
            const buildingName = nearbyBuildingFull?.name || "";

            setQrErrorMessage(errorMsg);
            setQrErrorDistance(distance);
            setQrErrorThreshold(threshold);
            setQrErrorBuildingName(buildingName);
            setQrErrorRetrying(false);
            setQrErrorModalVisible(true);
            setScannedData(null); // allow rescan
        }
    }, [
        isScanningQr,
        scannedData,
        location,
        demoMode,
        user,
        nearbyBuildingFull,
        setNearbyBuildingFull,
        refreshPublicSettings,
        checkToken,
        unlockViaQr,
    ]);

    const handleQrErrorRetry = useCallback(() => {
        setQrErrorModalVisible(false);
        setScannedData(null);
        toggleQrScanner(true);
    }, [toggleQrScanner]);

    const handleQrErrorDismiss = useCallback(() => {
        setQrErrorModalVisible(false);
        setScannedData(null);
    }, []);

    const handleUnlockedDismiss = useCallback(() => {
        setUnlockedModalVisible(false);
        setScannedData(null);
    }, []);

    return {
        scannedData,
        setScannedData,
        qrErrorModalVisible,
        qrErrorMessage,
        qrErrorDistance,
        qrErrorThreshold,
        qrErrorBuildingName,
        qrErrorRetrying,
        setQrErrorRetrying,
        handleBarCodeScanned,
        handleQrErrorRetry,
        handleQrErrorDismiss,
        unlockedModalVisible,
        unlockedModalBuilding,
        unlockedModalIsDemo,
        unlockedModalAlready,
        unlockedModalExp,
        handleUnlockedDismiss,
    };
}