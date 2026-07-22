import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Image } from "react-native";
import { WebView } from "react-native-webview";
import { theme } from "../../theme/tokens";

export default function AR3DModelOverlay({
    modelUrl,
    buildingName,
    capturing,
    onSnapshotReady,
    style,
}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [webViewReady, setWebViewReady] = useState(false);
    const [snapshotData, setSnapshotData] = useState(null);
    const webViewRef = useRef(null);

    useEffect(() => {
        if (webViewReady && webViewRef.current && modelUrl) {
            console.log("AR Overlay: Sending init message with URL:", modelUrl);
            const initMessage = JSON.stringify({ type: "init", modelUrl });
            webViewRef.current.postMessage(initMessage);
        }
    }, [modelUrl, webViewReady]);

    useEffect(() => {
        if (capturing && webViewRef.current) {
            webViewRef.current.postMessage(
                JSON.stringify({ type: "request_snapshot" }),
            );
        } else if (!capturing) {
            setSnapshotData(null);
        }
    }, [capturing]);

    if (!modelUrl) {
        return null;
    }

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log("AR Overlay received:", data.type);
            if (data.type === "loaded") {
                setLoading(false);
                setError(false);
            } else if (data.type === "error") {
                console.error("AR Overlay error:", data.message);
                setLoading(false);
                setError(true);
            } else if (data.type === "snapshot") {
                setSnapshotData(data.data);
                if (onSnapshotReady) onSnapshotReady();
            } else if (data.type === "debug") {
                console.log("AR Debug:", data.message);
            }
        } catch (err) {
            console.error("Error parsing WebView message:", err);
        }
    };

    const viewerHtml = require("../../assets/ar-viewer.html");

    return (
        <View style={[styles.container, style]} pointerEvents="none">
            <WebView
                ref={webViewRef}
                source={viewerHtml}
                style={[styles.webview, snapshotData ? { opacity: 0 } : {}]}
                originWhitelist={["*"]}
                onMessage={handleMessage}
                onLoadEnd={() => {
                    console.log("AR Overlay: WebView loaded");
                    setWebViewReady(true);
                }}
                onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error("AR Overlay WebView error:", nativeEvent);
                }}
                androidLayerType="hardware"
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowFileAccess={true}
                allowFileAccessFromFileURLs={true}
                allowUniversalAccessFromFileURLs={true}
                scrollEnabled={false}
                bounces={false}
                scalesPageToFit={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
            />
            {snapshotData && (
                <Image
                    source={{ uri: snapshotData }}
                    style={[styles.webview, StyleSheet.absoluteFillObject]}
                    resizeMode="contain"
                />
            )}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator
                        size="large"
                        color={theme.colors.accent}
                    />
                    <Text style={styles.loadingText}>Loading 3D Model...</Text>
                </View>
            )}
            {error && (
                <View style={styles.errorOverlay}>
                    <Text style={styles.errorText}>
                        Failed to load 3D model
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 80,
        left: "50%",
        width: 320,
        height: 320,
        marginLeft: -160,
        overflow: "visible",
    },
    webview: {
        flex: 1,
        backgroundColor: "transparent",
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
    },
    loadingText: {
        marginTop: 8,
        color: theme.colors.textPrimary,
        fontSize: 10,
        textShadowColor: "rgba(0,0,0,0.8)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 4,
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
        paddingHorizontal: 16,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 10,
        textAlign: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: 8,
        borderRadius: 4,
    },
});
