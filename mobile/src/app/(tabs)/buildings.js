import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Alert, TextInput, ScrollView } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import theme from "../../theme/tokens";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import api from "../../services/api";
import { geofencingService } from "../../services/geofencingService";
import { Crosshair, ShieldAlert, Navigation, Search, X } from "lucide-react-native";
import { fonts } from "../../constants/typography";

export default function BuildingsScreen() {
    const { unlockedBuildings, isLoading: isUnlockedLoading } = useUnlockedBuildings();
    const { location, startTracking } = useLocationTracking();
    const { canAccessBuildingFeatures, canView3D, canViewPanorama, role } = useRoleAccess();
    const router = useRouter();

    useEffect(() => {
        startTracking();
    }, []);
    
    const [allBuildings, setAllBuildings] = useState([]);
    const [isLoadingAll, setIsLoadingAll] = useState(true);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [routeTarget, setRouteTarget] = useState(null);
    
    const [originQuery, setOriginQuery] = useState('');
    const [isOriginFocused, setIsOriginFocused] = useState(false);
    const [routeOrigin, setRouteOrigin] = useState(null);
    
    const [routeDistance, setRouteDistance] = useState(null);
    
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
                hotspots: JSON.stringify(selectedBuilding.hotspots || [])
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

    const filteredTargetBuildings = allBuildings.filter(b => 
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (b.slug && b.slug.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const filteredOriginBuildings = allBuildings.filter(b => 
        b.name.toLowerCase().includes(originQuery.toLowerCase()) || 
        (b.slug && b.slug.toLowerCase().includes(originQuery.toLowerCase()))
    );

    useEffect(() => {
        if (routeTarget) {
            let lat1, lon1;
            if (routeOrigin) {
                lat1 = parseFloat(routeOrigin.latitude);
                lon1 = parseFloat(routeOrigin.longitude);
            } else if (location) {
                lat1 = location.latitude;
                lon1 = location.longitude;
            }

            if (lat1 && lon1) {
                const lat2 = parseFloat(routeTarget.latitude);
                const lon2 = parseFloat(routeTarget.longitude);
                const dist = geofencingService.calculateDistance(lat1, lon1, lat2, lon2);
                setRouteDistance(Math.round(dist));
            } else {
                setRouteDistance(null);
            }
        } else {
            setRouteDistance(null);
        }
    }, [routeTarget, routeOrigin, location]);

    const handleSelectRouteTarget = (building) => {
        setRouteTarget(building);
        setSearchQuery(building.name);
        setIsSearchFocused(false);
        
        if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({
                type: 'draw_route',
                buildingId: building.id,
                sourceBuildingId: routeOrigin ? routeOrigin.id : null
            }));
        }
    };

    const handleSelectRouteOrigin = (building) => {
        setRouteOrigin(building);
        setOriginQuery(building.name);
        setIsOriginFocused(false);

        if (routeTarget && webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({
                type: 'draw_route',
                buildingId: routeTarget.id,
                sourceBuildingId: building.id
            }));
        }
    };

    const handleClearOrigin = () => {
        setRouteOrigin(null);
        setOriginQuery('');
        if (routeTarget && webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({
                type: 'draw_route',
                buildingId: routeTarget.id,
                sourceBuildingId: null
            }));
        }
    };

    const handleClearRoute = () => {
        setRouteTarget(null);
        setSearchQuery('');
        
        if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({
                type: 'clear_route'
            }));
        }
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

            {/* Routing Search Overlay */}
            <View style={styles.hudTopBar}>
                <View style={styles.routeCard}>
                    <View style={styles.routeInputRow}>
                        <Navigation color={theme.colors.success} size={18} />
                        <View style={styles.routeInputWrapper}>
                            <TextInput 
                                style={[styles.routeInput, !routeOrigin && styles.routeInputDisabled]}
                                placeholder="Your Location (GPS)"
                                placeholderTextColor={theme.colors.success}
                                value={originQuery}
                                onChangeText={setOriginQuery}
                                onFocus={() => setIsOriginFocused(true)}
                                onBlur={() => setTimeout(() => setIsOriginFocused(false), 200)}
                            />
                        </View>
                        {routeOrigin && (
                            <TouchableOpacity onPress={handleClearOrigin} style={styles.clearRouteBtn}>
                                <X color={theme.colors.textMuted} size={18} />
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    <View style={styles.routeDivider} />
                    
                    <View style={styles.routeInputRow}>
                        <Search color={theme.colors.arHighlight} size={18} />
                        <View style={styles.routeInputWrapper}>
                            <TextInput 
                                style={styles.routeInput}
                                placeholder="Search target building..."
                                placeholderTextColor={theme.colors.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                            />
                        </View>
                        {routeTarget && (
                            <TouchableOpacity onPress={handleClearRoute} style={styles.clearRouteBtn}>
                                <X color={theme.colors.textMuted} size={18} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {routeDistance !== null && (
                        <View style={styles.distanceContainer}>
                            <Text style={styles.distanceText}>Straight-line distance: {routeDistance}m</Text>
                        </View>
                    )}
                </View>

                {isOriginFocused && originQuery.length > 0 && (
                    <View style={styles.searchResultsContainer}>
                        <ScrollView style={styles.searchResultsList} keyboardShouldPersistTaps="handled">
                            {filteredOriginBuildings.map(b => (
                                <TouchableOpacity 
                                    key={`origin-${b.id}`} 
                                    style={styles.searchResultItem}
                                    onPress={() => handleSelectRouteOrigin(b)}
                                >
                                    <View style={[styles.searchResultItemInner, b.primary_department && { borderLeftWidth: 4, borderLeftColor: b.primary_department.color_hex || '#B21830', paddingLeft: 8 }]}>
                                        <Text style={styles.searchResultName}>{b.name}</Text>
                                        <Text style={[styles.searchResultStatus, b.is_active === false && styles.searchResultStatusInactive]}>
                                            {b.primary_department ? `${b.primary_department.name} • ` : ''}
                                            {b.is_active === false ? 'CLOSED / INACTIVE' : 'AVAILABLE'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {filteredOriginBuildings.length === 0 && (
                                <Text style={styles.searchNoResult}>No buildings found.</Text>
                            )}
                        </ScrollView>
                    </View>
                )}

                {isSearchFocused && searchQuery.length > 0 && (
                    <View style={styles.searchResultsContainer}>
                        <ScrollView style={styles.searchResultsList} keyboardShouldPersistTaps="handled">
                            {filteredTargetBuildings.map(b => (
                                <TouchableOpacity 
                                    key={`target-${b.id}`} 
                                    style={styles.searchResultItem}
                                    onPress={() => handleSelectRouteTarget(b)}
                                >
                                    <View style={[styles.searchResultItemInner, b.primary_department && { borderLeftWidth: 4, borderLeftColor: b.primary_department.color_hex || '#B21830', paddingLeft: 8 }]}>
                                        <Text style={styles.searchResultName}>{b.name}</Text>
                                        <Text style={[styles.searchResultStatus, b.is_active === false && styles.searchResultStatusInactive]}>
                                            {b.primary_department ? `${b.primary_department.name} • ` : ''}
                                            {b.is_active === false ? 'CLOSED / INACTIVE' : 'AVAILABLE'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {filteredTargetBuildings.length === 0 && (
                                <Text style={styles.searchNoResult}>No buildings found.</Text>
                            )}
                        </ScrollView>
                    </View>
                )}
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
                                
                                {selectedBuilding.departments && selectedBuilding.departments.length > 0 && (
                                    <View style={{ marginVertical: 8, paddingHorizontal: 4 }}>
                                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted || '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Colleges</Text>
                                        {selectedBuilding.departments.map(dept => (
                                            <View key={dept.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                                <Text style={{ fontSize: 14, color: theme.colors.textPrimary || '#333' }}>• {dept.name} </Text>
                                                <Text style={{ fontSize: 12, color: '#10b981', fontWeight: 'bold' }}>(Available)</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                
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
        paddingTop: 50, // Safe area top
        paddingHorizontal: theme.spacing.md,
    },
    routeCard: {
        backgroundColor: theme.colors.bgPrimary,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.arHighlight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    routeInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
    },
    routeInputWrapper: {
        flex: 1,
        marginLeft: theme.spacing.sm,
    },
    routeInput: {
        height: 40,
        color: theme.colors.textPrimary,
        fontSize: 15,
        fontWeight: 'bold',
    },
    routeInputDisabled: {
        color: theme.colors.success,
    },
    routeDivider: {
        height: 1,
        backgroundColor: theme.colors.surfaceSoft,
        marginVertical: 4,
        marginLeft: 36,
    },
    clearRouteBtn: {
        padding: theme.spacing.xs,
    },
    searchResultsContainer: {
        marginTop: theme.spacing.sm,
        backgroundColor: theme.colors.bgPrimary,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 200,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchResultsList: {
        flexGrow: 0,
    },
    searchResultItem: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceSoft,
    },
    searchResultName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    searchResultStatus: {
        fontSize: 10,
        color: theme.colors.success,
        fontWeight: 'bold',
        marginTop: 2,
    },
    searchResultStatusInactive: {
        color: theme.colors.error,
    },
    searchNoResult: {
        padding: theme.spacing.md,
        color: theme.colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    distanceContainer: {
        marginTop: theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.surfaceSoft,
        alignItems: 'center',
    },
    distanceText: {
        color: theme.colors.arHighlight,
        fontSize: 12,
        fontWeight: 'bold',
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
        fontFamily: fonts.heading.bold,
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
        fontFamily: fonts.heading.bold,
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
        fontFamily: fonts.heading.bold,
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
