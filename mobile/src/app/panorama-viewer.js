import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import ViewerHeader from '../components/viewer/ViewerHeader';
import { theme } from '../theme/tokens';
import api from '../services/api';

export default function PanoramaViewerScreen() {
    const { buildingId, buildingName } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [walkthrough, setWalkthrough] = useState(null);
    const [currentScene, setCurrentScene] = useState(null);
    const webViewRef = useRef(null);

    useEffect(() => {
        loadWalkthrough();
    }, [buildingId]);

    useEffect(() => {
        if (currentScene && webViewRef.current && walkthrough) {
            console.log('Sending scene to WebView:', currentScene.title);
            webViewRef.current.postMessage(JSON.stringify({
                type: 'init',
                imageUrl: currentScene.image_url,
                hotspots: currentScene.hotspots || []
            }));
        }
    }, [currentScene]);

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
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.arHighlight} />
                    <Text style={styles.loadingText}>Loading Panorama...</Text>
                </View>
            )}
            
            {walkthrough && currentScene && (
                <WebView
                    ref={webViewRef}
                    source={require('../../assets/panorama-viewer.html')}
                    style={styles.webview}
                    onMessage={handleMessage}
                    onLoad={() => {
                        if (webViewRef.current && currentScene) {
                            setTimeout(() => {
                                webViewRef.current.postMessage(JSON.stringify({
                                    type: 'init',
                                    imageUrl: currentScene.image_url,
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
