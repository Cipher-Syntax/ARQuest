// src/app/(tabs)/ar.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library/legacy';
import { captureRef } from 'react-native-view-shot';
import { router } from 'expo-router';
import { X, Camera as CameraIcon } from 'lucide-react-native';
import { theme } from '../../theme/tokens';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { useUnlockedBuildings } from '../../hooks/useUnlockedBuildings';
import { geofencingService } from '../../services/geofencingService';
import { api } from '../../services/api';
import AR3DModelOverlay from '../../components/AR3DModelOverlay';
import BrandedSelfieFrame from '../../components/BrandedSelfieFrame';
import { useRoleAccess } from '../../hooks/useRoleAccess';

export default function ARScreen() {
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
    const [nearbyBuilding, setNearbyBuilding] = useState(null);
    const [nearbyBuildingFull, setNearbyBuildingFull] = useState(null);
    const [geofenceStatus, setGeofenceStatus] = useState(null);
    const [capturing, setCapturing] = useState(false);
    const [capturedBg, setCapturedBg] = useState(null); 
    const [bgReady, setBgReady] = useState(false);
    const [modelReady, setModelReady] = useState(true);
    const cameraRef = useRef(null);
    const arViewRef = useRef(null);
    const { canUseAR } = useRoleAccess();

    const { location, startTracking, stopTracking } = useLocationTracking();
    const { unlockedBuildings } = useUnlockedBuildings();

    useEffect(() => {
        startTracking();
        return () => {
            stopTracking();
        };
    }, []);

    useEffect(() => {
        if (location) {
            checkGeofenceStatus();
        }
    }, [location]);

    useEffect(() => {
        if (nearbyBuilding?.id) {
            fetchFullBuildingDetails(nearbyBuilding.id);
        } else {
            setNearbyBuildingFull(null);
        }
    }, [nearbyBuilding?.id]);

    const fetchFullBuildingDetails = async (buildingId) => {
        try {
            const response = await api.get(`/api/buildings/${buildingId}/`);
            if (response.data.success) {
                setNearbyBuildingFull(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching full building details:', error);
        }
    };

    const checkGeofenceStatus = async () => {
        if (!location) return;
        try {
            const status = await geofencingService.validateLocation(
                location.latitude,
                location.longitude,
                location.accuracy
            );
            setGeofenceStatus(status);
            if (status?.building) {
                setNearbyBuilding(status.building);
            } else {
                setNearbyBuilding(null);
            }
        } catch (error) {
            console.error('Error validating location for AR overlay:', error);
        }
    };

    const isModelVisible = !!(nearbyBuildingFull && unlockedBuildings.some(b => b.id === nearbyBuildingFull.id) && nearbyBuildingFull.model_url);

    const handleCaptureSelfie = async () => {
        if (!nearbyBuildingFull || !cameraRef.current) {
            Alert.alert('No Building', 'Get closer to a building to take a branded selfie!');
            return;
        }

        try {
            // Reset readiness state
            setBgReady(false);
            setModelReady(!isModelVisible); // If no model, it's immediately ready
            setCapturing(true); // Hide controls, show frame

            // Take native photo to use as the static background
            const photo = await cameraRef.current.takePictureAsync({
                quality: 1,
                base64: false,
            });

            // Setting this triggers the Image component to mount over the live camera
            setCapturedBg(photo.uri);

        } catch (error) {
            console.error('Selfie capture error:', error);
            Alert.alert('Error', 'Failed to capture photo');
            setCapturing(false);
        }
    };

    const onBackgroundImageLoad = () => {
        setBgReady(true);
    };

    // Trigger the final composite capture when both layers are completely rendered
    useEffect(() => {
        if (capturing && bgReady && modelReady) {
            // Small delay guarantees React Native layout passes are completely finished
            setTimeout(async () => {
                try {
                    if (!arViewRef.current) return;
                    
                    // Capture the parent wrapper containing the Image + 3D Model + Overlays
                    const compositeUri = await captureRef(arViewRef, {
                        format: 'jpg',
                        quality: 0.9,
                    });

                    let permissionResponse = mediaPermission;
                    if (!permissionResponse?.granted) {
                        permissionResponse = await requestMediaPermission();
                    }

                    if (permissionResponse.granted) {
                        await MediaLibrary.saveToLibraryAsync(compositeUri);
                        Alert.alert('Success', 'Branded selfie saved to your gallery!');
                    } else {
                        Alert.alert('Permission Denied', 'Need media library permissions to save the photo.');
                    }
                } catch (captureError) {
                    console.error('Composite capture error:', captureError);
                    Alert.alert('Error', 'Failed to composite the AR elements.');
                } finally {
                    // Cleanup: restore live camera feed and UI controls
                    setCapturedBg(null);
                    setCapturing(false);
                    setBgReady(false);
                }
            }, 300); 
        }
    }, [capturing, bgReady, modelReady]);

    if (!canUseAR) {
        return (
            <View style={styles.container}>
                <View style={styles.permissionContainer}>
                    <CameraIcon size={64} color={theme.colors.textMuted} />
                    <Text style={styles.permissionTitle}>AR Access Restricted</Text>
                    <Text style={styles.permissionText}>
                        Your current role does not have access to the AR features. Please sign in as a student or professional to use AR Quest features.
                    </Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={() => router.back()}>
                        <Text style={styles.permissionButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (!cameraPermission) {
        return (
            <View style={styles.container}>
                <Text style={styles.messageText}>Loading camera...</Text>
            </View>
        );
    }

    if (!cameraPermission.granted) {
        return (
            <View style={styles.container}>
                <View style={styles.permissionContainer}>
                    <CameraIcon size={64} color={theme.colors.textMuted} />
                    <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                    <Text style={styles.permissionText}>
                        ARQuest needs camera access to show AR building views and capture selfies.
                    </Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
                        <Text style={styles.permissionButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* --- CAPTURE TARGET --- */}
            <View ref={arViewRef} style={styles.captureContainer} collapsable={false}>
                
                {/* 1. Base Layer: Flexed Camera View or Static Captured Image */}
                {capturedBg ? (
                    <Image 
                        source={{ uri: capturedBg }} 
                        style={styles.camera} 
                        resizeMode="cover" 
                        onLoad={onBackgroundImageLoad} 
                    />
                ) : (
                    <CameraView style={styles.camera} facing="back" ref={cameraRef} />
                )}
                
                {/* 2. Middle Layer: Absolute 3D Model */}
                {(() => {
                    return isModelVisible ? (
                        <AR3DModelOverlay
                            modelUrl={nearbyBuildingFull.model_url}
                            buildingName={nearbyBuildingFull.name}
                            capturing={capturing}
                            onSnapshotReady={() => setModelReady(true)}
                        />
                    ) : null;
                })()}

                {/* 3. Top Layer: Absolute Geofence Status Label */}
                {nearbyBuilding && (
                    <View style={styles.topOverlay}>
                        <View style={styles.buildingLabelContainer}>
                            <Text style={styles.buildingLabel}>{nearbyBuilding.name}</Text>
                            {geofenceStatus?.status && (
                                <Text style={styles.buildingStatus}>
                                    {geofenceStatus.status === 'inside' && '✓ Inside'}
                                    {geofenceStatus.status === 'nearby' && `📍 ${Math.round(geofenceStatus.distance)}m away`}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* 4. Top Layer: Absolute Frame */}
                <BrandedSelfieFrame
                    buildingName={nearbyBuildingFull?.name || 'Unknown Building'}
                    visible={capturing}
                />
            </View>
            {/* --- END CAPTURE TARGET --- */}

            {/* --- CONTROLS: Hidden during capture so they don't get snapshotted --- */}
            {!capturing && (
                <View style={styles.controls}>
                    <TouchableOpacity style={styles.exitButton} onPress={() => router.back()}>
                        <X size={24} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.captureButton} onPress={handleCaptureSelfie}>
                        <View style={styles.captureButtonInner}>
                            <CameraIcon size={24} color={theme.colors.primary} />
                        </View>
                    </TouchableOpacity>
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
    captureContainer: {
        flex: 1, // Must be flex 1 to expand the background
        backgroundColor: '#000',
    },
    camera: {
        flex: 1, // Crucial: Gives camera/image height to fill the screen naturally
        width: '100%',
        height: '100%',
    },
    messageText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 100,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    permissionTitle: {
        fontSize: theme.typography.xl,
        fontWeight: '600',
        color: '#fff',
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    permissionText: {
        fontSize: theme.typography.md,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
    },
    permissionButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.radius.md,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: theme.typography.md,
        fontWeight: '600',
    },
    topOverlay: {
        position: 'absolute',
        top: 380, // Positioned right under the 3D model (80 + 320 = 400, so slightly overlapping or just below)
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    buildingLabelContainer: {
        backgroundColor: 'rgba(138, 21, 56, 0.85)', // WMSU Crimson with opacity
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: 30, // Pill shape
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
        shadowColor: theme.colors.arHighlight,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 5,
    },
    buildingLabel: {
        color: '#fff',
        fontSize: theme.typography.lg,
        fontWeight: '900',
        letterSpacing: 1.5,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    buildingStatus: {
        color: theme.colors.arHighlight,
        fontSize: theme.typography.sm,
        fontWeight: 'bold',
        marginTop: 4,
        textAlign: 'center',
        letterSpacing: 1,
    },
    controls: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
        zIndex: 20,
    },
    exitButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: theme.colors.arHighlight,
    },
    captureButtonInner: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});