// src/hooks/useARCapture.js
import { useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { captureRef } from "react-native-view-shot";
import SoundManager from "../utils/SoundManager";
import { Animated } from "react-native";

/**
 * Custom hook for AR camera capture (postcard/snapshot):
 * - Captures AR view with 3D model overlay (via Viro native screenshot)
 * - Falls back to camera capture or view shot if Viro unavailable
 * - Manages postcard modal with photo preview
 * - Handles shutter animation and sound feedback
 */
export function useARCapture({
    enableArSelfie,
    isScanningQr,
    cameraRef,
    arViewRef,
    viroNavRef,
    navTargetFull,
    nearbyBuildingFull,
    location,
    user,
}) {
    const [capturing, setCapturing] = useState(false);
    const [postcardPhotoUri, setPostcardPhotoUri] = useState(null);
    const [isPostcardModalVisible, setIsPostcardModalVisible] = useState(false);

    const flashAnim = useRef(new Animated.Value(0)).current;

    const handleCaptureArSnapshot = useCallback(async () => {
        if (!enableArSelfie) {
            Alert(
                "AR Selfie Disabled",
                "AR selfie capture is turned off by the administrator.",
            );
            return;
        }
        if (capturing) return;
        setCapturing(true);

        // 1. Immediate shutter feedback: sound & camera flash
        try {
            SoundManager.play("trivia_correct");
        } catch {
            // Non-fatal
        }

        flashAnim.setValue(1);
        Animated.timing(flashAnim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
        }).start();

        let snapshotUri = null;

        // 2. Capture native 3D AR view from ViroARSceneNavigator if active
        if (!isScanningQr && viroNavRef.current) {
            try {
                const fileName = `wmsu_ar_snap_${Date.now()}`;
                const takeFn =
                    viroNavRef.current.takeScreenshot ||
                    viroNavRef.current._takeScreenshot;

                if (typeof takeFn === "function") {
                    const res = await takeFn.call(viroNavRef.current, fileName, false);
                    if (res && res.success && res.url) {
                        snapshotUri = res.url;
                    }
                }
            } catch (viroErr) {
                console.warn("Viro native screenshot failed, attempting fallback:", viroErr);
            }
        }

        // 3. Fallback: if scanning QR or Viro screenshot not available
        if (!snapshotUri) {
            try {
                if (isScanningQr && cameraRef.current?.takePictureAsync) {
                    const photo = await cameraRef.current.takePictureAsync({
                        quality: 0.9,
                        base64: false,
                    });
                    snapshotUri = photo?.uri;
                } else if (arViewRef.current) {
                    snapshotUri = await captureRef(arViewRef, {
                        format: "jpg",
                        quality: 0.9,
                    });
                }
            } catch (fallbackErr) {
                console.error("Fallback snapshot capture error:", fallbackErr);
            }
        }

        setCapturing(false);

        if (!snapshotUri) {
            Alert(
                "Capture Failed",
                "Unable to capture AR view. Please ensure camera permissions are active and try again."
            );
            return;
        }

        // Ensure proper URI formatting
        if (
            !snapshotUri.startsWith("file://") &&
            !snapshotUri.startsWith("content://") &&
            !snapshotUri.startsWith("http")
        ) {
            snapshotUri = `file://${snapshotUri}`;
        }

        setPostcardPhotoUri(snapshotUri);
        setIsPostcardModalVisible(true);
    }, [
        enableArSelfie,
        isScanningQr,
        capturing,
        cameraRef,
        arViewRef,
        viroNavRef,
    ]);

    const handleClosePostcard = useCallback(() => {
        setIsPostcardModalVisible(false);
        setPostcardPhotoUri(null);
    }, []);

    return {
        capturing,
        postcardPhotoUri,
        isPostcardModalVisible,
        flashAnim,
        handleCaptureArSnapshot,
        handleClosePostcard,
        setCapturing,
        setPostcardPhotoUri,
        setIsPostcardModalVisible,
    };
}