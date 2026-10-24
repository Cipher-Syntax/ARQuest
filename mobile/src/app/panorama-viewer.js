import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { WebView } from "react-native-webview";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import ViewerHeader from "../components/viewer/ViewerHeader";
import { theme } from "../theme/tokens";
import { api } from "../services";
import { assetService } from "../services";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { panoramaViewerHtmlString } from "../../assets/panorama-viewer";

export default function PanoramaViewerScreen() {
    const { buildingId, buildingName, targetSceneId, fromVirtualTour } =
        useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [walkthrough, setWalkthrough] = useState(null);
    const [currentScene, setCurrentScene] = useState(null);
    const webViewRef = useRef(null);

    // ── Screen orientation: lock to landscape for 360 viewer ──
    useFocusEffect(
        useCallback(() => {
            ScreenOrientation.lockAsync(
                ScreenOrientation.OrientationLock.LANDSCAPE,
            );

            return () => {
                // If exiting to a non-Virtual-Tour screen (e.g. buildings tab), restore portrait
                if (fromVirtualTour !== "true") {
                    ScreenOrientation.lockAsync(
                        ScreenOrientation.OrientationLock.PORTRAIT,
                    );
                }
            };
        }, [fromVirtualTour]),
    );

    useEffect(() => {
        return () => {
            // Restore portrait on unmount only if not returning to Virtual Tour
            if (fromVirtualTour !== "true") {
                ScreenOrientation.lockAsync(
                    ScreenOrientation.OrientationLock.PORTRAIT,
                );
            }
        };
    }, [fromVirtualTour]);

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            if (fromVirtualTour !== "true") {
                ScreenOrientation.lockAsync(
                    ScreenOrientation.OrientationLock.PORTRAIT,
                );
            }
            router.replace("/(tabs)/buildings");
        }
    };

    useEffect(() => {
        loadWalkthrough();
    }, [buildingId, targetSceneId]);

    /**
     * Resolve a panorama scene image to something the WebView can render
     * without a network round trip. Falls back to the remote URL when the
     * image is missing, too large, or the cache is unavailable.
     */
    const resolveSceneImageUrl = useCallback(async (scene) => {
        const remoteUrl = scene?.image_url;
        if (!remoteUrl) return null;

        try {
            const assetId = `panorama_${scene.id}`;
            const version = 1;
            const isCached = await assetService.isCached(
                assetId,
                version,
                remoteUrl,
            );
            const localUri = isCached
                ? assetService.getLocalPath(assetId, version, remoteUrl)
                : await assetService.downloadAsset(remoteUrl, assetId, version);

            const dataUri = await assetService.getAssetDataUri(localUri);
            return dataUri || remoteUrl;
        } catch (e) {
            console.warn(
                "Panorama image cache unavailable, using network:",
                e,
            );
            return remoteUrl;
        }
    }, []);

    useEffect(() => {
        if (currentScene && webViewRef.current && walkthrough) {
            console.log("Sending scene to WebView:", currentScene.title);
            let isCancelled = false;
            const sendScene = async () => {
                // Panorama images are cached on disk like the 3D models, then
                // handed to the WebView as a data URI: file:// URLs are blocked
                // from an https://localhost baseUrl.
                const resolvedUrl = await resolveSceneImageUrl(currentScene);

                if (!isCancelled && webViewRef.current) {
                    webViewRef.current.postMessage(
                        JSON.stringify({
                            type: "init",
                            imageUrl: resolvedUrl,
                            hotspots: currentScene.hotspots || [],
                            title: currentScene.title || "Room View",
                            buildingName: buildingName || walkthrough?.building_name || "Campus Walkthrough",
                            allScenes: walkthrough?.scenes?.map((s) => ({
                                id: s.id,
                                title: s.title,
                                image_url: s.image_url,
                                is_start_scene: Boolean(s.id === walkthrough.start_scene?.id),
                            })) || [],
                        }),
                    );
                }
            };
            sendScene();
            return () => {
                isCancelled = true;
            };
        }
    }, [currentScene, walkthrough, buildingName, resolveSceneImageUrl]);

    useEffect(() => {
        return () => {
            if (webViewRef.current) {
                webViewRef.current.postMessage(
                    JSON.stringify({ type: "dispose" }),
                );
            }
        };
    }, []);

    const loadWalkthrough = async () => {
        try {
            setLoading(true);
            const response = await api.get(
                `/api/buildings/${buildingId}/panorama/`,
            );
            if (response.data.success) {
                const data = response.data.data;
                console.log("Walkthrough loaded:", data);
                setWalkthrough(data);

                // Unit 30: Start at targetSceneId if passed from 3D Virtual Tour portal or proximity HUD
                let initialScene = data.start_scene;
                if (targetSceneId && data.scenes && data.scenes.length > 0) {
                    const foundTarget = data.scenes.find(
                        (s) => s.id === targetSceneId
                    );
                    if (foundTarget) {
                        initialScene = foundTarget;
                    }
                }
                setCurrentScene(initialScene);
                setError(null);
            } else {

                setError(response.data.message || "Failed to load panorama");
            }
        } catch (err) {
            console.error("Panorama load error:", err);
            setError("No panorama walkthrough available");
        } finally {
            setLoading(false);
        }
    };

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log("WebView message:", data);

            if (data.type === "loaded" || data.type === "scene_loaded" || data.type === "fallback_loaded") {
                setLoading(false);
            } else if (data.type === "hotspot_clicked") {
                console.log(
                    "Hotspot clicked, target_scene_id:",
                    data.target_scene_id,
                );
                const rawTargetId = data.target_scene_id;
                const targetId = typeof rawTargetId === "object" && rawTargetId ? rawTargetId.id : rawTargetId;
                const targetScene = walkthrough?.scenes?.find(
                    (s) => s.id === targetId || String(s.id) === String(targetId),
                );
                if (targetScene) {
                    console.log("Loading scene:", targetScene.title);
                    setCurrentScene(targetScene);
                } else {
                    console.log("Scene not found:", targetId);
                }
            } else if (data.type === "reset_to_start") {
                const start = walkthrough?.scenes?.find((s) => s.is_start_scene) || walkthrough?.start_scene || walkthrough?.scenes?.[0];
                if (start) {
                    setCurrentScene(start);
                }
            } else if (data.type === "error") {
                setLoading(false);
                setError(data.message || "Failed to load panorama");
            }
        } catch (e) {
            console.error("WebView message error:", e);
        }
    };

    if (error && !walkthrough) {
        return (
            <View style={styles.container}>
                <ViewerHeader title={buildingName || "Panorama View"} />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" hidden={true} />
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        size="large"
                        color={theme.colors.arHighlight}
                    />
                    <Text style={styles.loadingText}>Loading Panorama...</Text>
                </View>
            ) : null}

            {/* Floating Back Button */}
            <TouchableOpacity
                style={styles.floatingBackButton}
                onPress={handleBack}
            >
                <Ionicons
                    name="close"
                    size={24}
                    color="#FFFFFF"
                />
            </TouchableOpacity>

            {walkthrough && currentScene && (
                <ErrorBoundary
                    title="Panorama Disrupted"
                    message="WebGL rendering was interrupted. Tap to reload."
                    onReset={() => loadWalkthrough()}
                >
                    <WebView
                        ref={webViewRef}
                        source={{ html: panoramaViewerHtmlString, baseUrl: "https://localhost/" }}
                        style={styles.webview}
                        onMessage={handleMessage}
                        onLoad={() => {
                            if (webViewRef.current && currentScene && walkthrough) {
                                setTimeout(() => {
                                    webViewRef.current.postMessage(
                                        JSON.stringify({
                                            type: "init",
                                            imageUrl: currentScene.image_url,
                                            hotspots: currentScene.hotspots || [],
                                            title: currentScene.title || "Room View",
                                            buildingName: buildingName || walkthrough?.building_name || "Campus Walkthrough",
                                            allScenes: walkthrough?.scenes?.map((s) => ({
                                                id: s.id,
                                                title: s.title,
                                                image_url: s.image_url,
                                                is_start_scene: Boolean(s.id === walkthrough.start_scene?.id),
                                            })) || [],
                                        }),
                                    );
                                }, 300);
                            }
                        }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        cacheEnabled={true}
                        cacheMode="LOAD_CACHE_ELSE_NETWORK"
                        mixedContentMode="always"
                        originWhitelist={["*"]}
                        allowFileAccess={true}
                        allowFileAccessFromFileURLs={true}
                        allowUniversalAccessFromFileURLs={true}
                    />
                </ErrorBoundary>
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
        zIndex: 1,
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
    loadingContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
        zIndex: 5,
    },
    loadingText: {
        color: "#fff",
        marginTop: theme.spacing.md,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.lg,
    },
    errorText: {
        color: "#fff",
        fontSize: 16,
        textAlign: "center",
    },
});
