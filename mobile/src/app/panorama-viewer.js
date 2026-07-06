import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import ViewerHeader from "../components/viewer/ViewerHeader";
import { theme } from "../theme/tokens";
import api from "../services/api";
import { useAssetCache } from "../hooks/useAssetCache";
import { assetService } from "../services/assetService";

export default function PanoramaViewerScreen() {
    const { buildingId, buildingName } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [walkthrough, setWalkthrough] = useState(null);
    const [currentScene, setCurrentScene] = useState(null);
    const [localImageUrl, setLocalImageUrl] = useState(null);
    const webViewRef = useRef(null);
    const {
        loadAsset,
        isLoading: isAssetLoading,
        progress: assetProgress,
    } = useAssetCache();

    useEffect(() => {
        // Unlock screen orientation for Virtual Tour
        const lockLandscape = async () => {
            await ScreenOrientation.lockAsync(
                ScreenOrientation.OrientationLock.LANDSCAPE,
            );
        };
        lockLandscape();

        return () => {
            // Lock back to portrait on exit
            ScreenOrientation.lockAsync(
                ScreenOrientation.OrientationLock.PORTRAIT,
            );
        };
    }, []);

    useEffect(() => {
        loadWalkthrough();
    }, [buildingId]);

    useEffect(() => {
        if (currentScene && webViewRef.current && walkthrough) {
            console.log("Sending scene to WebView:", currentScene.title);
            webViewRef.current.postMessage(
                JSON.stringify({
                    type: "init",
                    imageUrl: currentScene.image_url,
                    hotspots: currentScene.hotspots || [],
                }),
            );
        }
    }, [currentScene]);

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
                setCurrentScene(data.start_scene);
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

            if (data.type === "loaded" || data.type === "scene_loaded") {
                setLoading(false);
            } else if (data.type === "hotspot_clicked") {
                console.log(
                    "Hotspot clicked, target_scene_id:",
                    data.target_scene_id,
                );
                console.log("Available scenes:", walkthrough?.scenes);
                const targetScene = walkthrough?.scenes?.find(
                    (s) => s.id === data.target_scene_id,
                );
                if (targetScene) {
                    console.log("Loading scene:", targetScene.title);
                    setCurrentScene(targetScene);
                } else {
                    console.log("Scene not found");
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

            {/* Gamified Floating Back Button */}
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

            {/* Gamified WMSU HUD Overlay - Title (Top) */}
            <View style={styles.hudTopContainer} pointerEvents="none">
                <Text style={styles.buildingName}>
                    {buildingName || "UNKNOWN"}
                </Text>
                <Text style={styles.hudSubtitle}>360 WALKTHROUGH ACTIVE</Text>
            </View>

            {walkthrough && currentScene && (
                <WebView
                    ref={webViewRef}
                    source={require("../../assets/panorama-viewer.html")}
                    style={styles.webview}
                    onMessage={handleMessage}
                    onLoad={() => {
                        if (webViewRef.current && currentScene) {
                            setTimeout(() => {
                                webViewRef.current.postMessage(
                                    JSON.stringify({
                                        type: "init",
                                        imageUrl: currentScene.image_url,
                                        hotspots: currentScene.hotspots || [],
                                    }),
                                );
                            }, 1000);
                        }
                    }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    mixedContentMode="always"
                    originWhitelist={["*"]}
                    allowFileAccess={true}
                    allowFileAccessFromFileURLs={true}
                    allowUniversalAccessFromFileURLs={true}
                />
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
