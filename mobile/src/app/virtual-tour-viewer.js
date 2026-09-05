import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    ScrollView,
} from "react-native";
import { customAlert as Alert } from "../components/ui/CustomAlert";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { DeviceMotion } from "expo-sensors";
import { theme } from "../theme/tokens";
import { useAssetCache } from "../hooks/useAssetCache";
import { assetService } from "../services";
import { api } from "../services";

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
    const [hasPanorama, setHasPanorama] = useState(false);
    const [checkingPanorama, setCheckingPanorama] = useState(
        Boolean(buildingId),
    );
    // Unit 30: Panorama Walkthrough Data & Spatial Linking States
    const [panoramaData, setPanoramaData] = useState(null);
    const [nearbyScene, setNearbyScene] = useState(null);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const webViewRef = useRef(null);

    const gyroSubscriptionRef = useRef(null);
    const {
        loadAsset,
        isLoading: isAssetLoading,
        progress: assetProgress,
    } = useAssetCache();

    // ── Screen orientation: lock to landscape for VR / 3D exploration ──
    useFocusEffect(
        useCallback(() => {
            ScreenOrientation.lockAsync(
                ScreenOrientation.OrientationLock.LANDSCAPE,
            );
        }, []),
    );

    useEffect(() => {
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

    // ── Check if 360° Panorama equivalent exists for this building ──
    useEffect(() => {
        if (!buildingId) return;
        let isMounted = true;
        api.get(`/api/buildings/${buildingId}/panorama/`)
            .then((res) => {
                if (isMounted) {
                    if (
                        res.data &&
                        res.data.success &&
                        res.data.data &&
                        res.data.data.start_scene
                    ) {
                        setPanoramaData(res.data.data);
                        setHasPanorama(true);
                    } else {
                        setPanoramaData(null);
                        setHasPanorama(false);
                    }
                }
            })
            .catch(() => {
                if (isMounted) {
                    setPanoramaData(null);
                    setHasPanorama(false);
                }
            })
            .finally(() => {
                if (isMounted) setCheckingPanorama(false);
            });

        return () => {
            isMounted = false;
        };
    }, [buildingId]);

    const handleOpenPanorama = () => {
        if (!buildingId) {
            Alert("PANORAMA", "Building details are unavailable.", [
                { text: "ACKNOWLEDGE" },
            ]);
            return;
        }

        if (!hasPanorama && !checkingPanorama) {
            Alert(
                "PANORAMA UNAVAILABLE",
                `No 360° photo panorama walkthrough has been linked to ${buildingName || "this building"} yet.`,
                [{ text: "ACKNOWLEDGE" }],
            );
            return;
        }

        // If user is near a specific mapped room anchor, open that room directly
        if (nearbyScene) {
            router.push({
                pathname: "/panorama-viewer",
                params: {
                    buildingId: buildingId,
                    buildingName: buildingName || "Building Panorama",
                    targetSceneId: nearbyScene.id,
                    fromVirtualTour: "true",
                },
            });
            return;
        }

        // If multiple rooms exist and user is in an unmapped zone, show Room Selector modal
        if (panoramaData?.scenes && panoramaData.scenes.length > 1) {
            setShowRoomModal(true);
            return;
        }

        // Fallback: open default start scene
        router.push({
            pathname: "/panorama-viewer",
            params: {
                buildingId: buildingId,
                buildingName: buildingName || "Building Panorama",
                targetSceneId: panoramaData?.start_scene?.id,
                fromVirtualTour: "true",
            },
        });
    };

    const handleSelectRoom = (scene) => {
        setShowRoomModal(false);
        router.push({
            pathname: "/panorama-viewer",
            params: {
                buildingId: buildingId,
                buildingName: buildingName || "Building Panorama",
                targetSceneId: scene.id,
                fromVirtualTour: "true",
            },
        });
    };

    // ── Send init message when WebView + model are both ready ─────
    useEffect(() => {
        if (webViewReady && webViewRef.current && localModelUrl) {
            console.log("Loading model from URL:", localModelUrl);
            webViewRef.current.postMessage(
                JSON.stringify({
                    type: "init",
                    modelUrl: localModelUrl,
                    hotspots: liveHotspots,
                    panoramaScenes: panoramaData?.scenes || [],
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
    }, [localModelUrl, webViewReady, liveHotspots, panoramaData]);


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
            } else if (data.type === "portal_clicked") {
                // Direct jump into the room's 360 photo when user taps a 3D portal badge
                router.push({
                    pathname: "/panorama-viewer",
                    params: {
                        buildingId: buildingId,
                        buildingName: buildingName || "Building Panorama",
                        targetSceneId: data.sceneId,
                        fromVirtualTour: "true",
                    },
                });
            } else if (data.type === "camera_position") {
                // Calculate proximity to mapped panorama scenes (Unit 30)
                const scenes = panoramaData?.scenes || [];
                let closest = null;
                let minDistance = Infinity;
                for (const scene of scenes) {
                    if (scene.anchor_x != null && scene.anchor_z != null) {
                        const dx = data.x - scene.anchor_x;
                        const dy =
                            (data.y || 1.6) -
                            (scene.anchor_y != null ? scene.anchor_y : 1.6);
                        const dz = data.z - scene.anchor_z;
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        const radius = scene.anchor_radius || 5.0;
                        if (dist <= radius && dist < minDistance) {
                            minDistance = dist;
                            closest = scene;
                        }
                    }
                }
                setNearbyScene(closest);
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

            {/* Top Right Action Controls */}
            <View style={styles.topRightActions}>
                {/* 360° Panorama Action Button (Text-only, no icon, cyan theme) */}
                <TouchableOpacity
                    style={[
                        styles.panoramaEquivBtn,
                        nearbyScene && styles.panoramaEquivBtnActive,
                        !hasPanorama &&
                            !checkingPanorama &&
                            styles.panoramaEquivBtnDisabled,
                    ]}
                    onPress={handleOpenPanorama}
                    activeOpacity={0.8}
                >
                    <Text
                        style={[
                            styles.panoramaEquivText,
                            nearbyScene && styles.panoramaEquivTextActive,
                            !hasPanorama &&
                                !checkingPanorama &&
                                styles.panoramaEquivTextDisabled,
                        ]}
                        numberOfLines={1}
                    >
                        {nearbyScene
                            ? `VIEW ${nearbyScene.title.toUpperCase()} 360°`
                            : "360° PANORAMA"}
                    </Text>
                </TouchableOpacity>



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
            </View>

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

            {/* Unit 30: Unmapped Area Room Selector Modal */}
            <Modal

                visible={showRoomModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowRoomModal(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <Ionicons
                                    name="globe-outline"
                                    size={20}
                                    color={theme.colors.arHighlight}
                                />
                                <Text style={styles.modalTitle}>
                                    SELECT 360° ROOM
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowRoomModal(false)}
                                style={styles.modalCloseBtn}
                            >
                                <Ionicons name="close" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>
                            Select any room or area in{" "}
                            {buildingName || "this building"} to view its 360°
                            photo walkthrough:
                        </Text>
                        <ScrollView
                            style={styles.roomList}
                            showsVerticalScrollIndicator={false}
                        >
                            {(panoramaData?.scenes || []).map((scene) => (
                                <TouchableOpacity
                                    key={scene.id}
                                    style={styles.roomItem}
                                    onPress={() => handleSelectRoom(scene)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.roomItemLeft}>
                                        <Ionicons
                                            name={
                                                scene.is_start_scene
                                                    ? "star"
                                                    : "business-outline"
                                            }
                                            size={18}
                                            color={theme.colors.arHighlight}
                                        />
                                        <View>
                                            <Text style={styles.roomItemTitle}>
                                                {scene.title}
                                            </Text>
                                            {scene.is_start_scene && (
                                                <Text
                                                    style={styles.roomItemBadge}
                                                >
                                                    MAIN ENTRANCE / START
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={18}
                                        color="rgba(255,255,255,0.5)"
                                    />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    topRightActions: {
        position: "absolute",
        top: 20,
        right: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        zIndex: 25,
    },
    panoramaEquivBtn: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 229, 255, 0.15)",
        borderWidth: 1,
        borderColor: theme.colors.arHighlight,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 22,
        shadowColor: theme.colors.arHighlight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    panoramaEquivBtnActive: {
        backgroundColor: "rgba(0, 229, 255, 0.35)",
        borderColor: theme.colors.arHighlight,
        shadowColor: theme.colors.arHighlight,
        shadowOpacity: 0.7,
    },
    panoramaEquivBtnDisabled: {
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    panoramaEquivText: {
        color: theme.colors.arHighlight,
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 1,
    },
    panoramaEquivTextActive: {
        color: "#FFFFFF",
    },

    panoramaEquivTextDisabled: {
        color: "rgba(255, 255, 255, 0.4)",
    },

    floatingBackButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0,0,0,0.5)",
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: "center",
        alignItems: "center",
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
        color: theme.colors.arHighlight,
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
    // Unit 30: Room Selector Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.75)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalCard: {
        backgroundColor: "#072A30",
        borderWidth: 1.5,
        borderColor: "#00E5FF",
        borderRadius: 16,
        padding: 20,
        width: "80%",
        maxWidth: 520,
        maxHeight: "85%",
        shadowColor: "#00E5FF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "900",
        color: "#00E5FF",
        letterSpacing: 2,
    },
    modalCloseBtn: {
        padding: 4,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    modalSubtitle: {
        fontSize: 12,
        color: "#C9D6DA",
        marginBottom: 16,
        lineHeight: 18,
    },
    roomList: {
        maxHeight: 220,
    },
    roomItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#123B44",
        borderWidth: 1,
        borderColor: "#2C5A63",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 8,
    },
    roomItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    roomItemTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#FFFFFF",
    },
    roomItemBadge: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#00E5FF",
        marginTop: 2,
        letterSpacing: 1,
    },
});

