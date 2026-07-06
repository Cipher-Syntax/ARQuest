import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { customAlert as Alert } from "../components/CustomAlert";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { DeviceMotion } from "expo-sensors";
import { theme } from "../theme/tokens";
import { useAssetCache } from "../hooks/useAssetCache";
import { assetService } from "../services/assetService";
import api from "../services/api";

export default function VirtualTourViewerScreen() {
    const {
        buildingId,
        buildingName,
        buildingDescription,
        modelUrl,
        hotspots,
        controlMode,
    } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [webViewReady, setWebViewReady] = useState(false);
    const [localModelUrl, setLocalModelUrl] = useState(null);
    const [liveHotspots, setLiveHotspots] = useState([]);
    const webViewRef = useRef(null);
    const gyroSubscriptionRef = useRef(null);
    const {
        loadAsset,
        isLoading: isAssetLoading,
        progress: assetProgress,
    } = useAssetCache();

    // ── Screen orientation: lock to landscape for VR feel ─────────
    useEffect(() => {
        ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE,
        );
        return () => {
            ScreenOrientation.lockAsync(
                ScreenOrientation.OrientationLock.PORTRAIT,
            );
        };
    }, []);

    // ── Asset loading ──────────────────────────────────────────────
    useEffect(() => {
        const initAsset = async () => {
            if (!buildingId) {
                if (modelUrl) {
                    setLocalModelUrl(modelUrl);
                } else {
                    setError("3D model not available");
                    setLoading(false);
                }
                return;
            }

            try {
                // Fetch fresh building data for latest hotspots
                try {
                    const bRes = await api.get(`/api/buildings/${buildingId}/`);
                    if (bRes.data.success && bRes.data.data.hotspots) {
                        setLiveHotspots(bRes.data.data.hotspots);
                    }
                } catch (bErr) {
                    console.log(
                        "Could not fetch fresh hotspots, falling back to params",
                        bErr,
                    );
                    if (hotspots) {
                        try {
                            setLiveHotspots(JSON.parse(hotspots));
                        } catch (e) {
                            console.error("Params Error", e.message);
                        }
                    }
                }

                const assets = await assetService.getBuildingAssets(buildingId);
                const modelAsset = assets.find((a) => a.asset_type === "model");

                if (modelAsset && modelAsset.file_url) {
                    setLocalModelUrl(modelAsset.file_url);
                } else if (modelUrl) {
                    setLocalModelUrl(modelUrl);
                } else {
                    setError("3D model not available");
                }
            } catch (err) {
                console.error("Failed to fetch building assets:", err);
                if (modelUrl) {
                    setLocalModelUrl(modelUrl);
                } else {
                    setError("Failed to load asset metadata");
                }
            } finally {
                // We let the WebView handle the actual loading progress
            }
        };

        initAsset();
    }, [buildingId, modelUrl]);

    // ── Send init message when WebView + model are both ready ─────
    useEffect(() => {
        if (webViewReady && webViewRef.current && localModelUrl) {
            console.log("Loading model from URL:", localModelUrl);
            webViewRef.current.postMessage(
                JSON.stringify({
                    type: "init",
                    modelUrl: localModelUrl,
                    hotspots: liveHotspots,
                    controlMode: controlMode || "joystick",
                }),
            );
        }

        return () => {
            if (webViewRef.current) {
                webViewRef.current.postMessage(
                    JSON.stringify({ type: "dispose" }),
                );
            }
        };
    }, [localModelUrl, webViewReady, liveHotspots]);

    // ── Native Gyroscope Bridge ────────────────────────────────────
    // React Native WebView (Android) does NOT forward deviceorientation
    // events to the web context. We read orientation natively via
    // expo-sensors DeviceMotion and post the values into the WebView.
    // We also include the real screen orientation angle (from expo-screen-orientation)
    // because window.screen.orientation.angle always returns 0 inside Android WebViews.
    useEffect(() => {
        if (controlMode !== "gyroscope") return;

        let active = true;

        // Map expo-screen-orientation Orientation enum → degrees
        // Orientation.PORTRAIT_UP   = 1 →   0°
        // Orientation.PORTRAIT_DOWN = 2 → 180°
        // Orientation.LANDSCAPE_LEFT  = 3 → 270° (phone rotated counter-clockwise, home on left)
        // Orientation.LANDSCAPE_RIGHT = 4 →  90° (phone rotated clockwise,         home on right)
        const getOrientAngleDeg = async () => {
            try {
                const info = await ScreenOrientation.getOrientationAsync();
                // ScreenOrientation.Orientation enum values
                if (info === 3) return 270; // LANDSCAPE_LEFT
                if (info === 4) return 90; // LANDSCAPE_RIGHT
                return 0; // portrait fallback
            } catch {
                return 90; // safe default: landscape-right
            }
        };

        const startGyro = async () => {
            // DeviceMotion update interval in ms (16ms ≈ 60fps)
            DeviceMotion.setUpdateInterval(16);

            // Fetch orient once at start; re-fetch on orientation change events
            let orientAngleDeg = await getOrientAngleDeg();

            // Re-detect if the phone is flipped to landscape-left while in the tour
            const orientSub = ScreenOrientation.addOrientationChangeListener(
                async () => {
                    orientAngleDeg = await getOrientAngleDeg();
                },
            );

            gyroSubscriptionRef.current = DeviceMotion.addListener(
                (motionData) => {
                    if (!active || !webViewRef.current || !motionData.rotation)
                        return;

                    // DeviceMotion.rotation values are in RADIANS:
                    //   alpha → rotation around Z  (yaw,   0–2π)
                    //   beta  → rotation around X  (pitch, -π–π)
                    //   gamma → rotation around Y  (roll,  -π/2–π/2)
                    // Convert to degrees → same convention as W3C DeviceOrientationEvent
                    const { alpha, beta, gamma } = motionData.rotation;
                    const toDeg = 180 / Math.PI;

                    webViewRef.current.postMessage(
                        JSON.stringify({
                            type: "gyro_data",
                            alpha: alpha * toDeg, // 0–360   compass/yaw
                            beta: beta * toDeg, // -180–180 front-back tilt/pitch
                            gamma: gamma * toDeg, // -90–90   left-right tilt/roll
                            orientAngle: orientAngleDeg, // reliable from expo-screen-orientation
                        }),
                    );
                },
            );

            // Store the orientSub so we can clean it up
            gyroSubscriptionRef.current._orientSub = orientSub;
        };

        startGyro();

        return () => {
            active = false;
            if (gyroSubscriptionRef.current) {
                if (gyroSubscriptionRef.current._orientSub) {
                    ScreenOrientation.removeOrientationChangeListener(
                        gyroSubscriptionRef.current._orientSub,
                    );
                }
                gyroSubscriptionRef.current.remove();
                gyroSubscriptionRef.current = null;
            }
        };
    }, [controlMode, webViewReady]);

    // ── WebView → RN message handler ──────────────────────────────
    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "loaded") {
                setLoading(false);
                setError(null);
            } else if (data.type === "progress") {
                setProgress(data.percent);
            } else if (data.type === "error") {
                setLoading(false);
                setError(data.message || "Failed to load model");
            }
        } catch (e) {
            console.error("WebView message error:", e);
        }
    };

    const viewerHtml = require("../../assets/virtual-tour-viewer.html");

    return (
        <View style={styles.container}>
            <StatusBar style="dark" hidden={true} />

            {/* Fullscreen 3D Canvas */}
            <WebView
                ref={webViewRef}
                source={viewerHtml}
                style={styles.webview}
                onMessage={handleMessage}
                onLoadEnd={() => setWebViewReady(true)}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowFileAccess={true}
                allowFileAccessFromFileURLs={true}
                allowUniversalAccessFromFileURLs={true}
                mixedContentMode="always"
                originWhitelist={["*"]}
            />

            {/* Floating Back Button */}
            <TouchableOpacity
                style={styles.floatingBackButton}
                onPress={() => router.back()}
            >
                <Ionicons
                    name="close"
                    size={24}
                    color={theme.colors.arHighlight}
                />
            </TouchableOpacity>

            {/* HUD Overlay */}
            <View style={styles.hudTopContainer} pointerEvents="none">
                <Text style={styles.buildingName}>
                    {buildingName || "UNKNOWN"}
                </Text>
                <Text style={styles.hudSubtitle}>
                    {controlMode === "gyroscope"
                        ? "GYROSCOPE MODE ACTIVE"
                        : "VIRTUAL TOUR ACTIVE"}
                </Text>
            </View>

            {/* Error overlay */}
            {error && (
                <View style={styles.errorOverlay}>
                    <View style={styles.errorCard}>
                        <Ionicons
                            name="warning-outline"
                            size={32}
                            color={theme.colors.error}
                        />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                </View>
            )}

            {/* Loading overlay */}
            {loading && !error && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator
                            size="large"
                            color={theme.colors.primary}
                        />
                        <Text style={styles.loadingText}>
                            {`Initializing Virtual Tour... ${progress}%`}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    webview: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "transparent",
    },
    floatingBackButton: {
        position: "absolute",
        top: 20,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0,0,0,0.5)",
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 20,
    },
    hudTopContainer: {
        position: "absolute",
        top: 20,
        left: 20,
        zIndex: 10,
        alignItems: "flex-start",
    },
    buildingName: {
        fontSize: 16,
        fontWeight: "900",
        color: theme.colors.arHighlight,
        letterSpacing: 3,
        textTransform: "uppercase",
        textShadowColor: "rgba(0, 0, 0, 0.75)",
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    hudSubtitle: {
        fontSize: 10,
        color: theme.colors.success,
        fontWeight: "bold",
        letterSpacing: 2,
        marginTop: 4,
        textShadowColor: "rgba(0, 0, 0, 0.75)",
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
        zIndex: 30,
    },
    loadingCard: {
        backgroundColor: "transparent",
        alignItems: "center",
    },
    loadingText: {
        color: theme.colors.arHighlight,
        marginTop: theme.spacing.md,
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 2,
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
        zIndex: 30,
    },
    errorCard: {
        backgroundColor: "#fff",
        padding: theme.spacing.xl,
        borderRadius: theme.radius.lg,
        alignItems: "center",
        maxWidth: "80%",
    },
    errorText: {
        color: theme.colors.error,
        marginTop: theme.spacing.md,
        fontSize: 16,
        textAlign: "center",
        fontWeight: "bold",
    },
});
