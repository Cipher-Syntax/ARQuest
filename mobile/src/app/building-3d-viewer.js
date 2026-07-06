import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { theme } from "../theme/tokens";
import { useAssetCache } from "../hooks/useAssetCache";
import { assetService } from "../services/assetService";
import api from "../services/api";

export default function Building3DViewerScreen() {
    const { buildingId, buildingName, buildingDescription, modelUrl } =
        useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [webViewReady, setWebViewReady] = useState(false);
    const [localModelUrl, setLocalModelUrl] = useState(null);
    const [fetchedTrivia, setFetchedTrivia] = useState(null);
    const webViewRef = useRef(null);
    const {
        loadAsset,
        isLoading: isAssetLoading,
        progress: assetProgress,
    } = useAssetCache();

    const [fetchedDescription, setFetchedDescription] = useState(
        buildingDescription || null,
    );

    useEffect(() => {
        const fetchTriviaAndDetails = async () => {
            if (!buildingId) return;
            try {
                // Fetch trivia
                const resTrivia = await api.get(
                    `/api/buildings/trivias/?building_id=${buildingId}`,
                );
                if (
                    resTrivia.data &&
                    resTrivia.data.success &&
                    resTrivia.data.data &&
                    resTrivia.data.data.length > 0
                ) {
                    const trivias = resTrivia.data.data;
                    const randomTrivia =
                        trivias[Math.floor(Math.random() * trivias.length)];
                    setFetchedTrivia(randomTrivia.fact);
                }

                // Fetch full building details to get the description (bypassing Expo Router URL length limits)
                const resBuilding = await api.get(
                    `/api/buildings/${buildingId}/`,
                );
                if (
                    resBuilding.data &&
                    resBuilding.data.success &&
                    resBuilding.data.data
                ) {
                    setFetchedDescription(resBuilding.data.data.description);
                }
            } catch (err) {
                console.error(
                    "Failed to fetch trivia or building details:",
                    err,
                );
            }
        };
        fetchTriviaAndDetails();
    }, [buildingId]);

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
                // setLoading(false) will be called when the WebView sends 'loaded'
            }
        };

        initAsset();
    }, [buildingId, modelUrl]);

    useEffect(() => {
        if (webViewReady && webViewRef.current && localModelUrl) {
            console.log("Loading model from URL:", localModelUrl);
            const initMessage = JSON.stringify({
                type: "init",
                modelUrl: localModelUrl,
            });
            webViewRef.current.postMessage(initMessage);
        }

        return () => {
            if (webViewRef.current) {
                webViewRef.current.postMessage(
                    JSON.stringify({ type: "dispose" }),
                );
            }
        };
    }, [localModelUrl, webViewReady]);

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

    const viewerHtml = require("../../assets/viewer3d.html");

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

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
                <Text style={styles.hudSubtitle}>3D MODEL INITIALIZED</Text>
            </View>

            {/* Gamified WMSU HUD Overlay - Description & Trivia (Bottom) */}
            {fetchedDescription || fetchedTrivia ? (
                <View
                    style={styles.hudBottomContainer}
                    pointerEvents="box-none"
                >
                    {fetchedTrivia && (
                        <View style={styles.triviaContainer}>
                            <Text style={styles.triviaTitle}>
                                DID YOU KNOW?
                            </Text>
                            <Text style={styles.triviaText}>
                                {fetchedTrivia}
                            </Text>
                        </View>
                    )}
                    {fetchedDescription && (
                        <View
                            style={styles.descriptionContainer}
                            pointerEvents="auto"
                        >
                            <View style={styles.descriptionHeader}>
                                <Text style={styles.descriptionTitle}>
                                    DESCRIPTION
                                </Text>
                                <View style={styles.descriptionLine} />
                            </View>
                            <ScrollView
                                style={styles.descriptionScroll}
                                showsVerticalScrollIndicator={true}
                                nestedScrollEnabled={true}
                            >
                                <Text style={styles.buildingDescription}>
                                    {fetchedDescription}
                                </Text>
                            </ScrollView>
                        </View>
                    )}
                </View>
            ) : null}

            {/* Overlays for Loading / Errors */}
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

            {loading && !error && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator
                            size="large"
                            color={theme.colors.primary}
                        />
                        <Text style={styles.loadingText}>
                            {`Rendering 3D Model... ${progress}%`}
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
        backgroundColor: theme.colors.surfaceSoft,
    },
    webview: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "transparent",
    },
    floatingBackButton: {
        position: "absolute",
        top: 50,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surfaceSoft,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 20,
    },
    hudTopContainer: {
        position: "absolute",
        top: 100,
        left: 20,
        right: 20,
        zIndex: 10,
        alignItems: "center",
    },
    hudBottomContainer: {
        position: "absolute",
        bottom: 100,
        left: 20,
        right: 20,
        zIndex: 10,
    },
    buildingName: {
        fontSize: 16,
        fontWeight: "900",
        color: theme.colors.arHighlight,
        letterSpacing: 3,
        textTransform: "uppercase",
        textAlign: "center",
    },
    hudSubtitle: {
        fontSize: 10,
        color: theme.colors.success,
        fontWeight: "bold",
        letterSpacing: 2,
        marginTop: 4,
    },
    descriptionContainer: {
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: theme.radius.md,
    },
    descriptionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    descriptionTitle: {
        fontSize: 11,
        fontWeight: "900",
        color: theme.colors.textPrimary,
        letterSpacing: 2,
    },
    descriptionLine: {
        flex: 1,
        height: 2,
        backgroundColor: theme.colors.arHighlight,
        marginLeft: 12,
    },
    descriptionScroll: {
        maxHeight: 150,
    },
    buildingDescription: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        fontFamily: "monospace",
        textAlign: "justify",
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.surface,
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
        backgroundColor: theme.colors.surfaceSoft,
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
    triviaContainer: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: 12,
        borderRadius: theme.radius.md,
        marginBottom: 8,
    },
    triviaTitle: {
        fontSize: 11,
        fontWeight: "900",
        color: theme.colors.arHighlight,
        letterSpacing: 2,
        marginBottom: 4,
    },
    triviaText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontStyle: "italic",
        fontFamily: "monospace",
    },
});
