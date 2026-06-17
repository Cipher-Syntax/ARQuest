import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import ViewerHeader from '../components/viewer/ViewerHeader';
import { theme } from '../theme/tokens';
import api from '../services/api';
import { useAssetCache } from '../hooks/useAssetCache';
import { assetService } from '../services/assetService';

export default function PanoramaViewerScreen() {
    const { buildingId, buildingName } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [walkthrough, setWalkthrough] = useState(null);
    const [currentScene, setCurrentScene] = useState(null);
    const [localImageUrl, setLocalImageUrl] = useState(null);
    const webViewRef = useRef(null);
    const { loadAsset, isLoading: isAssetLoading, progress: assetProgress } = useAssetCache();

    useEffect(() => {
        loadWalkthrough();
    }, [buildingId]);

    useEffect(() => {
        const loadSceneImage = async () => {
            if (currentScene && walkthrough) {
                try {
                    // Try to match with an asset from the backend to get true versioning, 
                    // or generate a pseudo-asset object for caching based on scene id and updated_at
                    const version = new Date(currentScene.updated_at || Date.now()).getTime();
                    
                    const uri = await loadAsset({
                        id: currentScene.id + 10000, // Offset to avoid ID collision with BuildingAsset if needed, though they use same cache dir
                        version: version,
                        file_url: currentScene.image_url
                    });
                    setLocalImageUrl(uri);
                } catch (e) {
                    console.error('Failed to cache panorama image', e);
                    setLocalImageUrl(currentScene.image_url);
                }
            }
        };
        loadSceneImage();
    }, [currentScene]);

    useEffect(() => {
        if (localImageUrl && webViewRef.current && walkthrough) {
            console.log('Sending scene to WebView:', currentScene.title);
            webViewRef.current.postMessage(JSON.stringify({
                type: 'init',
                imageUrl: localImageUrl,
                hotspots: currentScene.hotspots || []
            }));
        }
    }, [localImageUrl]);

    const loadWalkthrough = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/buildings/${buildingId}/panorama/`);
            if (response.data.success) {
                const data = response.data.data;
                console.log('Walkthrough loaded:', data);
                setWalkthrough(data);
                setCurrentScene(data.start_scene);
                setError(null);
            } else {
                setError(response.data.message || 'Failed to load panorama');
            }
        } catch (err) {
            console.error('Panorama load error:', err);
            setError('No panorama walkthrough available');
        } finally {
            setLoading(false);
        }
    };

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('WebView message:', data);
            
            if (data.type === 'loaded' || data.type === 'scene_loaded') {
                setLoading(false);
            } else if (data.type === 'hotspot_clicked') {
                console.log('Hotspot clicked, target_scene_id:', data.target_scene_id);
                console.log('Available scenes:', walkthrough?.scenes);
                const targetScene = walkthrough?.scenes?.find(s => s.id === data.target_scene_id);
                if (targetScene) {
                    console.log('Loading scene:', targetScene.title);
                    setCurrentScene(targetScene);
                } else {
                    console.log('Scene not found');
                }
            } else if (data.type === 'error') {
                setLoading(false);
                setError(data.message || 'Failed to load panorama');
            }
        } catch (e) {
            console.error('WebView message error:', e);
        }
    };

    if (error && !walkthrough) {
        return (
            <View style={styles.container}>
                <ViewerHeader title={buildingName || 'Panorama View'} />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {loading || isAssetLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.arHighlight} />
                    <Text style={styles.loadingText}>
                        {isAssetLoading 
                            ? `Downloading Panorama... ${Math.round(assetProgress * 100)}%` 
                            : 'Loading Panorama...'}
                    </Text>
                </View>
            ) : null}
            
            {walkthrough && currentScene && localImageUrl && (
                <WebView
                    ref={webViewRef}
                    source={require('../../assets/panorama-viewer.html')}
                    style={styles.webview}
                    onMessage={handleMessage}
                    onLoad={() => {
                        if (webViewRef.current && localImageUrl) {
                            setTimeout(() => {
                                webViewRef.current.postMessage(JSON.stringify({
                                    type: 'init',
                                    imageUrl: localImageUrl,
                                    hotspots: currentScene.hotspots || []
                                }));
                            }, 1000);
                        }
                    }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    mixedContentMode="always"
                    originWhitelist={['*']}
                />
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
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        zIndex: 5,
    },
    loadingText: {
        color: '#fff',
        marginTop: theme.spacing.md,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    errorText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
});
