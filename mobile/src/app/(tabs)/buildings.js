import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import theme from "../../theme/tokens";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import api from "../../services/api";
import { Crosshair, ShieldAlert } from "lucide-react-native";

export default function BuildingsScreen() {
    const { unlockedBuildings, isLoading: isUnlockedLoading } = useUnlockedBuildings();
    const { location } = useLocationTracking();
    const { canAccessBuildingFeatures, canView3D, canViewPanorama, role } = useRoleAccess();
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
                if (data.isUnlocked || role === 'visitor') {
                    const building = allBuildings.find(b => b.id === data.buildingId);
                    const unlockedData = unlockedBuildings.find(b => b.id === data.buildingId) || {};
                    if (building) {
                        setSelectedBuilding({ ...building, ...unlockedData });
                        setModalVisible(true);
                    }
                } else {
                    Alert.alert(
                        "ZONE LOCKED",
                        `You must physically deploy to ${data.name} to unlock its AR capabilities.`,
                        [{ text: "ACKNOWLEDGE" }]
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

    const handleVirtualTour = () => {
        setModalVisible(false);
        router.push({
            pathname: '/virtual-tour-viewer',
            params: {
                buildingId: selectedBuilding.id,
                buildingName: selectedBuilding.name,
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
            <StatusBar style="dark" />
            
            {(isUnlockedLoading || isLoadingAll) && !webViewReady && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.arHighlight} />
                    <Text style={styles.loadingText}>INITIALIZING MAP GRID...</Text>
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

            {/* Gamified HUD Top Bar Overlay */}
            <View style={styles.hudTopBar}>
                <View style={styles.hudContent}>
                    <Crosshair color={theme.colors.arHighlight} size={20} />
                    <View style={styles.hudTextContainer}>
                        <Text style={styles.topBarTitle}>CAMPUS BUILDINGS</Text>
                        <Text style={styles.topBarSubtitle}>
                            ZONES SECURED: <Text style={{color: theme.colors.accent}}>{unlockedBuildings.length} / {allBuildings.length}</Text>
                        </Text>
                    </View>
                </View>
            </View>

            {/* AR Gamified Bottom Sheet Modal */}
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
                                    <View style={[
                                        styles.badge, 
                                        selectedBuilding.unlock_source === 'role_access' && styles.badgeRole,
                                        selectedBuilding.is_active === false && styles.badgeInactive
                                    ]}>
                                        <Text style={[
                                            styles.badgeText,
                                            selectedBuilding.is_active === false && styles.badgeTextInactive
                                        ]}>
                                            {selectedBuilding.is_active === false ? 'INACTIVE' : (selectedBuilding.unlock_source === 'geofence' ? 'SECURED' : 'OVERRIDE')}
                                        </Text>
                                    </View>
                                </View>
                                
                                {selectedBuilding.description && (
                                    <Text style={styles.description} numberOfLines={8} ellipsizeMode="tail" >{selectedBuilding.description}</Text>
                                )}
                                
                                {selectedBuilding.is_active === false ? (
                                    <View style={styles.restrictedContainer}>
                                        <ShieldAlert color={theme.colors.error} size={20} style={{marginBottom: 4}} />
                                        <Text style={styles.restrictedText}>BUILDING CLOSED / UNDER RENOVATION</Text>
                                    </View>
                                ) : canAccessBuildingFeatures(true) ? (
                                    <View style={styles.actionButtons}>
                                        {selectedBuilding.model_active && selectedBuilding.model_url && canView3D ? (
                                            <TouchableOpacity style={styles.view3dButton} onPress={handleView3D}>
                                                <Ionicons name="cube-outline" size={20} color="#FFFFFF" />
                                                <Text style={styles.view3dText}>DEPLOY 3D MODEL</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={styles.no3dContainer}>
                                                <Text style={styles.no3dText}>3D assets currently offline</Text>
                                            </View>
                                        )}
                                        
                                        {/* Virtual Tour tailored for Professionals (and Admins) */}
                                        {canViewPanorama && (role === 'professional' || role === 'admin') && selectedBuilding.model_active && selectedBuilding.model_url && (
                                            <TouchableOpacity style={styles.viewPanoramaButton} onPress={handleVirtualTour}>
                                                <Ionicons name="glasses-outline" size={20} color={theme.colors.arHighlight} />
                                                <Text style={styles.viewPanoramaText}>ENTER VIRTUAL TOUR</Text>
                                            </TouchableOpacity>
                                        )}

                                        {/* Original 360 Walkthrough for Students (and Admins) */}
                                        {canViewPanorama && (role === 'student' || role === 'admin') && (
                                            <TouchableOpacity style={styles.viewPanoramaButton} onPress={handleViewPanorama}>
                                                <Ionicons name="camera-outline" size={20} color={theme.colors.arHighlight} />
                                                <Text style={styles.viewPanoramaText}>ENTER 360° SIMULATION</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    <View style={styles.restrictedContainer}>
                                        <ShieldAlert color={theme.colors.error} size={20} style={{marginBottom: 4}} />
                                        <Text style={styles.restrictedText}>CLEARANCE LEVEL INSUFFICIENT</Text>
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
        backgroundColor: theme.colors.surfaceSoft,
    },
    webview: {
        flex: 1,
        backgroundColor: theme.colors.surfaceSoft,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.bgPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    loadingText: {
        color: theme.colors.arHighlight,
        marginTop: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    hudTopBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.surface,
        paddingTop: 50, // Safe area top
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    hudContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hudTextContainer: {
        marginLeft: 10,
        alignItems: 'flex-start',
    },
    topBarTitle: {
        color: theme.colors.arHighlight,
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
    topBarSubtitle: {
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: 'bold',
        marginTop: 2,
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // Transparent white to see map
    },
    bottomSheet: {
        backgroundColor: theme.colors.bgPrimary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.arHighlight,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    sheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: theme.colors.bgSecondary,
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
        fontSize: 22,
        fontWeight: "900",
        color: theme.colors.textPrimary,
        flex: 1,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    badge: {
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        borderColor: theme.colors.success,
        borderWidth: 1,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.radius.sm,
    },
    badgeRole: {
        backgroundColor: theme.colors.surfaceSoft,
        borderColor: theme.colors.textSecondary,
    },
    badgeText: {
        color: theme.colors.textPrimary,
        fontSize: 10,
        fontWeight: "bold",
        letterSpacing: 1,
    },
    badgeInactive: {
        backgroundColor: "rgba(239, 68, 68, 0.2)",
        borderColor: theme.colors.error,
    },
    badgeTextInactive: {
        color: theme.colors.error,
    },
    description: {
        fontSize: 13,
        color: theme.colors.textMuted,
        marginBottom: theme.spacing.lg,
        lineHeight: 20,
    },
    actionButtons: {
        gap: theme.spacing.sm,
    },
    view3dButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.arHighlight,
        paddingVertical: 14,
        borderRadius: theme.radius.md,
    },
    view3dText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "900",
        letterSpacing: 1,
        marginLeft: theme.spacing.sm,
    },
    no3dContainer: {
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
    },
    no3dText: {
        fontSize: 12,
        color: theme.colors.textMuted,
        fontStyle: "italic",
    },
    viewPanoramaButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: theme.colors.arHighlight,
        paddingVertical: 12,
        borderRadius: theme.radius.md,
    },
    viewPanoramaText: {
        color: theme.colors.arHighlight,
        fontSize: 14,
        fontWeight: "bold",
        letterSpacing: 1,
        marginLeft: theme.spacing.sm,
    },
    restrictedContainer: {
        paddingVertical: theme.spacing.md,
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 1,
        borderColor: theme.colors.error,
        borderRadius: theme.radius.md,
        alignItems: 'center',
    },
    restrictedText: {
        fontSize: 12,
        color: theme.colors.error,
        fontWeight: "bold",
        letterSpacing: 1,
    },
});
