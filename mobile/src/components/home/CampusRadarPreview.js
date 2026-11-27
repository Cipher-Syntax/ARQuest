import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScanLine } from "lucide-react-native";
import { WebView } from "react-native-webview";
import { router } from "expo-router";

import { useHomeStyles } from "./homeStyles";

/**
 * Read-only campus map preview. The WebView keeps its in-memory HTML source
 * (no file assets) and a touch interceptor swallows gestures so the preview
 * never fights the surrounding ScrollView.
 */
export default function CampusRadarPreview({ webViewRef, mapHtml, onWebViewLoadEnd }) {
    const styles = useHomeStyles();

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campus Map</Text>
            <View style={styles.mapPreviewContainer}>
                <View style={styles.mapPreviewWrapper}>
                    <WebView
                        ref={webViewRef}
                        onLoadEnd={onWebViewLoadEnd}
                        source={{ html: mapHtml, baseUrl: "https://api.mapbox.com/" }}
                        style={styles.mapPreviewWebview}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        allowFileAccess={true}
                        allowUniversalAccessFromFileURLs={true}
                        originWhitelist={["*"]}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                    />
                    {/* Touch interceptor to prevent accidental interactions */}
                    <View style={styles.mapTouchInterceptor} />
                </View>
                <LinearGradient
                    colors={[
                        "transparent",
                        "rgba(249, 250, 251, 0.9)",
                        "#F9FAFB",
                    ]}
                    style={styles.mapGradientOverlay}
                    pointerEvents="none"
                />

                <TouchableOpacity
                    style={styles.mapFullscreenBtn}
                    onPress={() => router.push("/(tabs)/buildings")}
                    activeOpacity={0.9}
                >
                    <ScanLine
                        color="#FFFFFF"
                        size={18}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={styles.mapFullscreenText}>
                        View Full Map
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
