import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../theme/tokens';
import { useAssetCache } from '../hooks/useAssetCache';
import { assetService } from '../services/assetService';

export default function Building3DViewerScreen() {
    const { buildingId, buildingName, buildingDescription, modelUrl } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [webViewReady, setWebViewReady] = useState(false);
    const [localModelUrl, setLocalModelUrl] = useState(null);
    const webViewRef = useRef(null);
    const { loadAsset, isLoading: isAssetLoading, progress: assetProgress } = useAssetCache();

    useEffect(() => {
        const initAsset = async () => {
            if (!buildingId) {
                if (modelUrl) {
                    setLocalModelUrl(modelUrl);
                } else {
                    setError('3D model not available');
                    setLoading(false);
                }
                return;
            }

            try {
                const assets = await assetService.getBuildingAssets(buildingId);
                const modelAsset = assets.find(a => a.asset_type === 'model');
                
                if (modelAsset) {
                    const uri = await loadAsset(modelAsset);
                    setLocalModelUrl(uri);
                } else if (modelUrl) {
                    setLocalModelUrl(modelUrl);
                } else {
                    setError('3D model not available');
                    setLoading(false);
                }
            } catch (err) {
                console.error('Failed to fetch building assets:', err);
                if (modelUrl) {
                    setLocalModelUrl(modelUrl);
                } else {
                    setError('Failed to load asset metadata');
                    setLoading(false);
                }
            }
        };

        initAsset();
    }, [buildingId, modelUrl]);

    useEffect(() => {
        if (webViewReady && webViewRef.current && localModelUrl) {
            console.log('Loading model from URL:', localModelUrl);
            const initMessage = JSON.stringify({ type: 'init', modelUrl: localModelUrl });
            webViewRef.current.postMessage(initMessage);
        }
        
        return () => {
            if (webViewRef.current) {
                webViewRef.current.postMessage(JSON.stringify({ type: 'dispose' }));
            }
        };
    }, [localModelUrl, webViewReady]);

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'loaded') {
                setLoading(false);
                setError(null);
            } else if (data.type === 'progress') {
                setProgress(data.percent);
            } else if (data.type === 'error') {
                setLoading(false);
                setError(data.message || 'Failed to load model');
            }
        } catch (e) {
            console.error('WebView message error:', e);
        }
    };

    const viewerHtml = require('../../assets/viewer3d.html');

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            
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
                originWhitelist={['*']}
            />

            {/* Gamified Floating Back Button */}
            <TouchableOpacity style={styles.floatingBackButton} onPress={() => router.back()}>
                <Ionicons name="close" size={24} color={theme.colors.arHighlight} />
            </TouchableOpacity>

            {/* Gamified WMSU HUD Overlay - Title (Top) */}
            <View style={styles.hudTopContainer} pointerEvents="none">
                <Text style={styles.buildingName}>{buildingName || 'UNKNOWN'}</Text>
                <Text style={styles.hudSubtitle}>3D MODEL INITIALIZED</Text>
            </View>

            {/* Gamified WMSU HUD Overlay - Description (Bottom) */}
            {buildingDescription ? (
                <View style={styles.hudBottomContainer} pointerEvents="box-none">
                    <ScrollView style={styles.descriptionScroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.buildingDescription}>{buildingDescription}</Text>
                    </ScrollView>
                </View>
            ) : null}

            {/* Overlays for Loading / Errors */}
            {error && (
                <View style={styles.errorOverlay}>
                    <View style={styles.errorCard}>
                        <Ionicons name="warning-outline" size={32} color={theme.colors.error} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                </View>
            )}

            {(loading || isAssetLoading) && !error && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.loadingText}>
                            {isAssetLoading 
                                ? `Downloading Asset... ${Math.round(assetProgress * 100)}%` 
                                : `Rendering 3D Model... ${progress}%`}
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
        backgroundColor: '#000',
    },
    webview: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
    floatingBackButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(0, 229, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    hudTopContainer: {
        position: 'absolute',
        top: 100,
        left: 20,
        right: 20,
        zIndex: 10,
        alignItems: 'center',
    },
    hudBottomContainer: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        zIndex: 10,
    },
    buildingName: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.colors.arHighlight,
        letterSpacing: 3,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    hudSubtitle: {
        fontSize: 10,
        color: theme.colors.success,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginTop: 4,
    },
    descriptionScroll: {
        maxHeight: 150,
        backgroundColor: 'rgba(10, 10, 15, 0.85)',
        padding: 16,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(0, 229, 255, 0.3)',
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.arHighlight,
    },
    buildingDescription: {
        fontSize: 13,
        color: '#ddd',
        lineHeight: 20,
        fontFamily: 'monospace',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(10, 10, 15, 0.95)',
        zIndex: 30,
    },
    loadingCard: {
        backgroundColor: 'transparent',
        alignItems: 'center',
    },
    loadingText: {
        color: theme.colors.arHighlight,
        marginTop: theme.spacing.md,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 30,
    },
    errorCard: {
        backgroundColor: '#fff',
        padding: theme.spacing.xl,
        borderRadius: theme.radius.lg,
        alignItems: 'center',
        maxWidth: '80%',
    },
    errorText: {
        color: theme.colors.error,
        marginTop: theme.spacing.md,
        fontSize: 16,
        textAlign: 'center',
        fontWeight: 'bold',
    },
});