import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import theme from "../../theme/tokens";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import api from "../../services/api";

export default function BuildingsScreen() {
    const { unlockedBuildings, isLoading: isUnlockedLoading } = useUnlockedBuildings();
    const { location } = useLocationTracking();
    const { canAccessBuildingFeatures, canView3D, canViewPanorama } = useRoleAccess();
    const router = useRouter();
    
    const [allBuildings, setAllBuildings] = useState([]);
    const [isLoadingAll, setIsLoadingAll] = useState(true);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    
    const webViewRef = useRef(null);
    const [webViewReady, setWebViewReady] = useState(false);

    useEffect(() => {
        const fetchBuildings = async () => {
            try {
                const res = await api.get('/api/buildings/');
                if (res.data.success) {
                    setAllBuildings(res.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch all buildings:", err);
            } finally {
                setIsLoadingAll(false);
            }
        };
        fetchBuildings();
    }, []);

    // Sync data to WebView
    useEffect(() => {
        if (webViewReady && webViewRef.current && allBuildings.length > 0) {
            const unlockedIds = unlockedBuildings.map(b => b.id);
            const message = JSON.stringify({
                type: 'update',
                buildings: allBuildings,
                unlockedIds: unlockedIds,
                userLocation: location
            });
            webViewRef.current.postMessage(message);
        }
    }, [webViewReady, allBuildings, unlockedBuildings, location]);

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'building_click') {
                if (data.isUnlocked) {
                    const building = allBuildings.find(b => b.id === data.buildingId);
                    // Add unlock source from unlockedBuildings if available
                    const unlockedData = unlockedBuildings.find(b => b.id === data.buildingId);
                    if (building) {
                        setSelectedBuilding({ ...building, ...unlockedData });
                        setModalVisible(true);
                    }
                } else {
                    Alert.alert(
                        "Building Locked",
                        `You must visit ${data.name} to unlock its AR features. Walk to its location on campus!`,
                        [{ text: "OK" }]
                    );
                }
            }
        } catch (e) {
            console.error("WebView message error", e);
        }
    };

    const handleView3D = () => {
        setModalVisible(false);
        router.push({
            pathname: '/building-3d-viewer',
            params: {
                buildingId: selectedBuilding.id,
                buildingName: selectedBuilding.name,
                buildingDescription: selectedBuilding.description,
                modelUrl: selectedBuilding.model_url,
            },
        });
    };

    const handleViewPanorama = () => {
        setModalVisible(false);
        router.push({
            pathname: '/panorama-viewer',
            params: {
                buildingId: selectedBuilding.id,
                buildingName: selectedBuilding.name,
            },
        });
    };

    const mapHtml = require('../../../assets/buildings-map.html');

    return (
        <View style={styles.container}>
            {(isUnlockedLoading || isLoadingAll) && !webViewReady && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading Map...</Text>
                </View>
            )}

            <WebView
                ref={webViewRef}
                source={mapHtml}
                style={styles.webview}
                onMessage={handleMessage}
                onLoadEnd={() => setWebViewReady(true)}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
                originWhitelist={['*']}
            />

            {/* Top Bar Overlay */}
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>Campus Map</Text>
                <Text style={styles.topBarSubtitle}>
                    {unlockedBuildings.length} of {allBuildings.length} Unlocked
                </Text>
            </View>

            {/* Bottom Sheet Modal for Unlocked Building */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
                        <View style={styles.sheetHandle} />
                        
                        {selectedBuilding && (
                            <>
                                <View style={styles.sheetHeader}>
                                    <Text style={styles.buildingName}>{selectedBuilding.name}</Text>
                                    <View style={[styles.badge, selectedBuilding.unlock_source === 'role_access' && styles.badgeRole]}>
                                        <Text style={styles.badgeText}>
                                            {selectedBuilding.unlock_source === 'geofence' ? '✓ Unlocked' : '★ Role Access'}
                                        </Text>
                                    </View>
                                </View>
                                
                                {selectedBuilding.description && (
                                    <Text style={styles.description} numberOfLines={8} ellipsizeMode="tail" >{selectedBuilding.description}</Text>
                                )}
                                
                                {canAccessBuildingFeatures(true) ? (
                                    <View style={styles.actionButtons}>
                                        {selectedBuilding.model_active && selectedBuilding.model_url && canView3D ? (
                                            <TouchableOpacity style={styles.view3dButton} onPress={handleView3D}>
                                                <Ionicons name="cube-outline" size={20} color={theme.colors.white} />
                                                <Text style={styles.view3dText}>View 3D Model</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={styles.no3dContainer}>
                                                <Text style={styles.no3dText}>3D model not available</Text>
                                            </View>
                                        )}
                                        
                                        {canViewPanorama && (
                                            <TouchableOpacity style={styles.viewPanoramaButton} onPress={handleViewPanorama}>
                                                <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
                                                <Text style={styles.viewPanoramaText}>360° Walkthrough</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    <View style={styles.restrictedContainer}>
                                        <Text style={styles.restrictedText}>Advanced view features restricted by role</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
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
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontWeight: 'bold',
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingTop: 50, // Safe area top
        paddingBottom: 15,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    topBarTitle: {
        color: theme.colors.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    topBarSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: theme.spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    sheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: theme.colors.border,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: theme.spacing.md,
    },
    sheetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.sm,
    },
    buildingName: {
        fontSize: theme.typography.xl,
        fontWeight: "bold",
        color: theme.colors.textPrimary,
        flex: 1,
    },
    badge: {
        backgroundColor: theme.colors.success,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.radius.sm,
    },
    badgeRole: {
        backgroundColor: theme.colors.accent,
    },
    badgeText: {
        color: theme.colors.white,
        fontSize: theme.typography.xs,
        fontWeight: "600",
    },
    description: {
        fontSize: theme.typography.md,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,

    },
    actionButtons: {
        gap: theme.spacing.sm,
    },
    view3dButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: theme.radius.md,
    },
    view3dText: {
        color: theme.colors.white,
        fontSize: theme.typography.md,
        fontWeight: "bold",
        marginLeft: theme.spacing.sm,
    },
    no3dContainer: {
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
    },
    no3dText: {
        fontSize: theme.typography.sm,
        color: theme.colors.textMuted,
        fontStyle: "italic",
    },
    viewPanoramaButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.bgPrimary,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        paddingVertical: 12,
        borderRadius: theme.radius.md,
    },
    viewPanoramaText: {
        color: theme.colors.primary,
        fontSize: theme.typography.md,
        fontWeight: "bold",
        marginLeft: theme.spacing.sm,
    },
    restrictedContainer: {
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.bgSecondary,
        borderRadius: theme.radius.md,
        alignItems: 'center',
    },
    restrictedText: {
        fontSize: theme.typography.sm,
        color: theme.colors.error,
        fontStyle: "italic",
    },
});
