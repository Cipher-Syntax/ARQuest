// src/app/(tabs)/ar.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from "@expo/vector-icons";
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
    
    // Trivia & Quest State
    const [activeQuests, setActiveQuests] = useState([]);
    const [triviaModalVisible, setTriviaModalVisible] = useState(false);
    const [claimedQuest, setClaimedQuest] = useState(null);
    const slideAnim = useRef(new Animated.Value(400)).current;

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
        const fetchQuests = async () => {
            try {
                const res = await api.get('/api/gamification/quests/active/');
                if (res.data.success) {
                    setActiveQuests(res.data.data);
                }
            } catch (error) {
                console.error('Error fetching quests', error);
            }
        };
        fetchQuests();
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

    const matchingQuest = activeQuests.find(q => nearbyBuildingFull && q.target_building === nearbyBuildingFull.id && !q.is_completed);

    const handleClaimQuest = async () => {
        if (!matchingQuest) return;
        try {
            const res = await api.post(`/api/gamification/quests/${matchingQuest.id}/complete/`);
            if (res.data.success) {
                setClaimedQuest(matchingQuest);
                setActiveQuests(prev => prev.map(q => q.id === matchingQuest.id ? { ...q, is_completed: true } : q));
                setTriviaModalVisible(true);
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }).start();
            } else {
                Alert.alert("Error", res.data.error || "Failed to claim quest.");
            }
        } catch (err) {
            Alert.alert("Error", "Network error claiming quest.");
        }
    };

    const closeTriviaModal = () => {
        Animated.timing(slideAnim, {
            toValue: 400,
            duration: 250,
            useNativeDriver: true,
        }).start(() => setTriviaModalVisible(false));
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
                
                {/* 2. Middle Layer removed (Model moved into targetCard) */}

                {/* 3. Gamified HUD Overlays */}
                <View style={styles.reticleContainer} pointerEvents="none">
                    <View style={styles.reticleTopLeft} />
                    <View style={styles.reticleTopRight} />
                    <View style={styles.reticleBottomLeft} />
                    <View style={styles.reticleBottomRight} />
                    <View style={styles.reticleCenterPoint} />
                </View>

                {nearbyBuilding && (
                    <View style={styles.topOverlay}>
                        {/* Target Identification */}
                        <View style={styles.targetCard}>
                            <Text style={styles.targetLabel}>TARGET IDENTIFIED</Text>
                            <Text style={styles.buildingLabel}>{nearbyBuilding.name}</Text>
                            
                            {geofenceStatus?.status === 'inside' ? (
                                <Text style={[styles.buildingStatus, { color: theme.colors.success }]}>
                                    ✓ ZONE SECURED
                                </Text>
                            ) : (
                                <Text style={styles.buildingStatus}>
                                    📍 PROXIMITY WARNING: {Math.round(geofenceStatus?.distance || 0)}m
                                </Text>
                            )}

                            {/* 3D Model Miniature Projection */}
                            {isModelVisible && (
                                <AR3DModelOverlay
                                    modelUrl={nearbyBuildingFull.model_url}
                                    buildingName={nearbyBuildingFull.name}
                                    capturing={capturing}
                                    onSnapshotReady={() => setModelReady(true)}
                                    style={{
                                        position: 'relative',
                                        top: -10,
                                        left: 0,
                                        width: 100,
                                        height: 100,
                                        marginLeft: 0,
                                        alignSelf: 'center',
                                        marginTop: 0,
                                        marginBottom: -10,
                                    }}
                                />
                            )}

                        </View>
                        
                        {/* Gamified Claim Button (Uses existing Quest API) */}
                        {matchingQuest && geofenceStatus?.status === 'inside' && !triviaModalVisible && !capturing && (
                            <TouchableOpacity style={styles.claimQuestBtn} onPress={handleClaimQuest}>
                                <Ionicons name="hardware-chip" size={24} color="#000" />
                                <View style={{marginLeft: 8}}>
                                    <Text style={styles.claimQuestBtnText}>EXTRACT DATA FRAGMENT</Text>
                                    <Text style={styles.claimPointsText}>REWARD: +{matchingQuest.reward_points} EXP</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* 4. Top Layer: Absolute Frame */}
                <BrandedSelfieFrame
                    buildingName={nearbyBuildingFull?.name || 'Unknown Building'}
                    visible={capturing}
                />
            </View>
            {/* --- END CAPTURE TARGET --- */}

            {/* --- TRIVIA MODAL (GAMIFIED) --- */}
            {triviaModalVisible && claimedQuest && (
                <Animated.View style={[styles.triviaModal, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.triviaModalHeader}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Ionicons name="finger-print" color={theme.colors.arHighlight} size={22} style={{marginRight: 8}} />
                            <Text style={styles.triviaTitle}>DATA LOG DECRYPTED</Text>
                        </View>
                        <TouchableOpacity onPress={closeTriviaModal} style={styles.closeTriviaBtn}>
                            <X color={theme.colors.arHighlight} size={20} />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.triviaContentBorder}>
                        <Text style={styles.triviaBuildingName}>ARCHIVE: {nearbyBuildingFull?.name || "UNKNOWN"}</Text>
                        <Text style={styles.triviaText}>
                            {claimedQuest.hint || nearbyBuildingFull?.description || "No archived data available for this node."}
                        </Text>
                    </View>
                    
                    <View style={styles.rewardBadge}>
                        <Ionicons name="flash" color="#10B981" size={24} />
                        <Text style={styles.rewardText}>EXP DEPOSITED: +{claimedQuest.reward_points}</Text>
                    </View>
                </Animated.View>
            )}

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
        top: 60,
        left: 20,
        right: 20,
        zIndex: 10,
    },
    targetCard: {
        backgroundColor: theme.colors.surfaceSoft,
        borderWidth: 1,
        borderColor: theme.colors.arHighlight,
        borderRadius: theme.radius.md,
        padding: 16,
        shadowColor: theme.colors.arHighlight,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    targetLabel: {
        color: theme.colors.arHighlight,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 4,
    },
    buildingLabel: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    buildingStatus: {
        color: theme.colors.accent,
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 4,
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
        backgroundColor: theme.colors.surface,
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
    intelFeed: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    intelHeader: {
        color: theme.colors.textMuted,
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 4,
    },
    intelText: {
        color: '#ddd',
        fontSize: 12,
        lineHeight: 18,
        fontFamily: 'monospace',
    },
    claimQuestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.arHighlight,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: theme.radius.md,
        marginTop: 16,
        shadowColor: theme.colors.arHighlight,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    },
    claimQuestBtnText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    claimPointsText: {
        color: '#000',
        fontSize: 10,
        fontWeight: 'bold',
        opacity: 0.8,
    },
    reticleContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 200,
        height: 200,
        marginLeft: -100,
        marginTop: -100,
        zIndex: 5,
    },
    reticleTopLeft: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3, borderColor: theme.colors.primary },
    reticleTopRight: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 3, borderRightWidth: 3, borderColor: theme.colors.primary },
    reticleBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: theme.colors.primary },
    reticleBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 3, borderRightWidth: 3, borderColor: theme.colors.primary },
    reticleCenterPoint: { position: 'absolute', top: '50%', left: '50%', width: 4, height: 4, marginLeft: -2, marginTop: -2, backgroundColor: theme.colors.primary, borderRadius: 2 },
    triviaModal: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.surfaceSoft,
        borderTopLeftRadius: theme.radius.lg,
        borderTopRightRadius: theme.radius.lg,
        padding: 24,
        paddingBottom: 40,
        zIndex: 100,
        borderTopWidth: 2,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: theme.colors.arHighlight,
        shadowColor: theme.colors.arHighlight,
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    triviaModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    triviaTitle: {
        color: theme.colors.arHighlight,
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 3,
    },
    closeTriviaBtn: {
        backgroundColor: theme.colors.bgSecondary,
        padding: 6,
        borderRadius: 20,
    },
    triviaContentBorder: {
        borderLeftWidth: 2,
        borderLeftColor: theme.colors.border,
        paddingLeft: 12,
        marginBottom: 20,
    },
    triviaBuildingName: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 2,
        opacity: 0.7,
    },
    triviaText: {
        color: '#00E5FF',
        fontSize: 15,
        lineHeight: 24,
        fontFamily: 'monospace',
    },
    rewardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        alignSelf: 'center',
        width: '100%',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.4)',
    },
    rewardText: {
        color: '#10B981',
        fontSize: 16,
        fontWeight: '900',
        marginLeft: 10,
        letterSpacing: 1,
    },
});