import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import ViewerHeader from '../components/viewer/ViewerHeader';
import { theme } from '../theme/tokens';

export default function Building3DViewerScreen() {
    const { buildingId, buildingName, modelUrl } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [webViewReady, setWebViewReady] = useState(false); // Track when WebView HTML finishes loading
    const webViewRef = useRef(null);

    useEffect(() => {
        if (!modelUrl) {
            setError('3D model not available');
            setLoading(false);
        }
    }, [modelUrl]);

    // Only send the init message when BOTH the URL is available AND the WebView is fully ready
    useEffect(() => {
        if (webViewReady && webViewRef.current && modelUrl) {
            console.log('Loading model from URL:', modelUrl);
            const initMessage = JSON.stringify({ type: 'init', modelUrl });
            webViewRef.current.postMessage(initMessage);
        }
        
        return () => {
            if (webViewRef.current) {
                webViewRef.current.postMessage(JSON.stringify({ type: 'dispose' }));
            }
        };
    }, [modelUrl, webViewReady]);

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
            <ViewerHeader title={buildingName || 'Building 3D View'} />
            
            {error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <>
                    {loading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.arHighlight} />
                            <Text style={styles.loadingText}>Loading 3D Model... {progress}%</Text>
                        </View>
                    )}
                    <WebView
                        ref={webViewRef}
                        source={viewerHtml}
                        style={styles.webview}
                        onMessage={handleMessage}
                        onLoadEnd={() => setWebViewReady(true)} // Wait for HTML to load before passing messages
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        allowFileAccess={true}
                        allowUniversalAccessFromFileURLs={true}
                        mixedContentMode="always"
                    />
                </>
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