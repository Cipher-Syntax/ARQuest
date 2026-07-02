import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal,  TextInput, ScrollView } from "react-native"
import { customAlert as Alert } from '../../components/CustomAlert';
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from 'expo-linear-gradient';
import theme from "../../theme/tokens";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import api from "../../services/api";
import { geofencingService } from "../../services/geofencingService";
import { ShieldAlert, X } from "lucide-react-native";
import { fonts } from "../../constants/typography";
import QuizModal from "../../components/QuizModal";

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
    const [controlPickerVisible, setControlPickerVisible] = useState(false);
    const [quizModalVisible, setQuizModalVisible] = useState(false);
    
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
                    Alert(
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
                modelUrl: selectedBuilding.model_url } });
    };

    const handleVirtualTour = () => {
        setModalVisible(false);
        // Show control-mode picker before launching
        setControlPickerVisible(true);
    };

    const launchVirtualTour = (controlMode) => {
        setControlPickerVisible(false);
        router.push({
            pathname: '/virtual-tour-viewer',
            params: {
                buildingId: selectedBuilding.id,
                buildingName: selectedBuilding.name,
                modelUrl: selectedBuilding.model_url,
                hotspots: JSON.stringify(selectedBuilding.hotspots || []),
                controlMode: controlMode, // 'joystick' | 'gyroscope'
            } });
    };

    const handleViewPanorama = () => {
        setModalVisible(false);
        router.push({
            pathname: '/panorama-viewer',
            params: {
                buildingId: selectedBuilding.id,
                buildingName: selectedBuilding.name } });
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
            <StatusBar style="light" />
            
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
            <LinearGradient
                colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.8)', 'transparent']}
                style={styles.searchTerminal}
                pointerEvents="box-none"
            >
                <Text style={styles.terminalHeader}>[ NAV_SYS // ONLINE ]</Text>
                
                <View style={styles.terminalInputContainer}>
                    <View style={styles.terminalInputRow}>
                        <Text style={styles.terminalInputLabel}>ORG:</Text>
                        <TextInput
                            style={styles.terminalInput}
                            placeholder="LOCALIZATION ACTIVE"
                            placeholderTextColor="#666666"
                            value={originQuery}
                            onChangeText={setOriginQuery}
                            onFocus={() => { setIsOriginFocused(true); setIsSearchFocused(false); }}
                            onBlur={() => setTimeout(() => setIsOriginFocused(false), 200)}
                        />
                        {routeOrigin && (
                            <TouchableOpacity onPress={handleClearOrigin} style={styles.clearRouteBtn}>
                                <X color={theme.colors.textMuted} size={18} />
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    <View style={styles.terminalInputRowActive}>
                        <Text style={styles.terminalInputLabel}>DST:</Text>
                        <TextInput
                            style={styles.terminalInputActive}
                            placeholder="INPUT COORDINATES"
                            placeholderTextColor="#888888"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={() => { setIsSearchFocused(true); setIsOriginFocused(false); }}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        />
                        {routeTarget && (
                            <TouchableOpacity onPress={handleClearRoute} style={styles.clearRouteBtn}>
                                <X color={theme.colors.textMuted} size={18} />
                            </TouchableOpacity>
                        )}
                    </View>
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
            </LinearGradient>

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
                                        role === 'professional' && !selectedBuilding.visited && styles.badgeRole,
                                        selectedBuilding.unlock_source === 'role_access' && role !== 'professional' && styles.badgeRole,
                                        selectedBuilding.is_active === false && styles.badgeInactive
                                    ]}>
                                        <Text style={[
                                            styles.badgeText,
                                            selectedBuilding.is_active === false && styles.badgeTextInactive
                                        ]}>
                                            {selectedBuilding.is_active === false ? 'INACTIVE' : 
                                             role === 'professional' ? (selectedBuilding.visited ? 'VISITED' : 'NOT VISITED') :
                                             (selectedBuilding.unlock_source === 'geofence' || selectedBuilding.unlock_source === 'qr' ? 'SECURED' : 'OVERRIDE')}
                                        </Text>
                                    </View>
                                </View>
                                
                                {selectedBuilding.unlocked_at && (
                                    <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: -4, marginBottom: 8 }}>
                                        {role === 'professional' ? 'Visited on: ' : 'Unlocked on: '}
                                        {new Date(selectedBuilding.unlocked_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </Text>
                                )}
                                
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
                                        
                                        {/* Trivia Quiz */}
                                        <TouchableOpacity 
                                            style={[styles.viewPanoramaButton, { borderColor: theme.colors.primary, marginTop: theme.spacing.xs }]} 
                                            onPress={() => {
                                                setModalVisible(false);
                                                setQuizModalVisible(true);
                                            }}
                                        >
                                            <Ionicons name="school-outline" size={20} color={theme.colors.primary} />
                                            <Text style={[styles.viewPanoramaText, { color: theme.colors.primary }]}>PLAY TRIVIA QUIZ</Text>
                                        </TouchableOpacity>
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

            {/* Control Mode Picker Modal */}
            <Modal
                transparent
                animationType="fade"
                visible={controlPickerVisible}
                onRequestClose={() => setControlPickerVisible(false)}
            >
                <View style={styles.controlPickerOverlay}>
                    <View style={styles.controlPickerCard}>
                        {/* Header */}
                        <View style={styles.controlPickerHeader}>
                            <Ionicons name="game-controller-outline" size={28} color={theme.colors.arHighlight} />
                            <Text style={styles.controlPickerTitle}>SELECT CONTROL MODE</Text>
                            <Text style={styles.controlPickerSubtitle}>Choose how you want to navigate the virtual tour</Text>
                        </View>

                        {/* Joystick Option */}
                        <TouchableOpacity
                            style={styles.controlOption}
                            onPress={() => launchVirtualTour('joystick')}
                            activeOpacity={0.75}
                        >
                            <View style={styles.controlOptionIcon}>
                                <Ionicons name="options-outline" size={32} color={theme.colors.arHighlight} />
                            </View>
                            <View style={styles.controlOptionText}>
                                <Text style={styles.controlOptionTitle}>ORBIT CONTROLS</Text>
                                <Text style={styles.controlOptionDesc}>Left joystick to move · Drag right side to look around</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                        </TouchableOpacity>

                        <View style={styles.controlDivider} />

                        {/* Gyroscope Option */}
                        <TouchableOpacity
                            style={styles.controlOption}
                            onPress={() => launchVirtualTour('gyroscope')}
                            activeOpacity={0.75}
                        >
                            <View style={[styles.controlOptionIcon, styles.controlOptionIconGyro]}>
                                <Ionicons name="phone-portrait-outline" size={32} color={theme.colors.success} />
                            </View>
                            <View style={styles.controlOptionText}>
                                <Text style={[styles.controlOptionTitle, { color: theme.colors.success }]}>GYROSCOPE</Text>
                                <Text style={styles.controlOptionDesc}>Tilt &amp; rotate your phone to look · Tap joystick side to move</Text>
                                <Text style={styles.controlOptionBadge}>IMMERSIVE MODE</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                        </TouchableOpacity>

                        {/* Cancel */}
                        <TouchableOpacity
                            style={styles.controlCancelBtn}
                            onPress={() => setControlPickerVisible(false)}
                        >
                            <Text style={styles.controlCancelText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            
            {/* Map Legend */}
            {!modalVisible && (
                <View style={styles.mapLegend}>
                    <Text style={styles.legendTitle}>MAP LEGEND</Text>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: '#4285F4', borderWidth: 2, borderColor: '#FFFFFF' }]} />
                        <Text style={styles.legendText}>Your Location</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: '#8a1538', borderWidth: 2, borderColor: '#FFFFFF' }]} />
                        <Text style={styles.legendText}>{role === 'professional' ? 'Visited' : 'Unlocked'} Node</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: '#6b7280', borderWidth: 2, borderColor: '#FFFFFF' }]} />
                        <Text style={styles.legendText}>{role === 'professional' ? 'Unvisited' : 'Locked'} Node</Text>
                    </View>
                </View>
            )}
            
            {/* Trivia Quiz Modal */}
            <QuizModal 
                visible={quizModalVisible} 
                building={selectedBuilding} 
                onClose={() => setQuizModalVisible(false)} 
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surfaceSoft },
    webview: {
        flex: 1,
        backgroundColor: theme.colors.surfaceSoft },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.bgPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10 },
    loadingText: {
        color: theme.colors.arHighlight,
        marginTop: 10,
        fontWeight: 'bold',
        letterSpacing: 2 },
    searchTerminal: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 40,
        borderBottomWidth: 4,
        borderBottomColor: theme.colors.primary,
        zIndex: 10,
    },
    terminalHeader: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: theme.colors.primary,
        letterSpacing: 2,
        marginBottom: 16,
    },
    terminalInputContainer: {
        borderLeftWidth: 2,
        borderLeftColor: theme.colors.primary,
        paddingLeft: 12,
        gap: 12,
    },
    terminalInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    terminalInputRowActive: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    terminalInputLabel: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#666666',
        width: 35,
    },
    terminalInput: {
        flex: 1,
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#FFFFFF',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#333333',
    },
    terminalInputActive: {
        flex: 1,
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary,
        backgroundColor: 'rgba(178,24,48,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    clearRouteBtn: {
        padding: theme.spacing.xs },
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
        shadowRadius: 6,
        elevation: 4 },
    searchResultsList: {
        flexGrow: 0 },
    searchResultItem: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceSoft },
    searchResultName: {
        fontSize: 16,
        fontFamily: fonts.heading.bold,
        color: theme.colors.textPrimary },
    searchResultStatus: {
        fontSize: 11,
        fontFamily: fonts.body.bold,
        color: theme.colors.success,
        marginTop: 2,
        letterSpacing: 1 },
    searchResultStatusInactive: {
        color: theme.colors.error },
    searchNoResult: {
        padding: theme.spacing.md,
        color: theme.colors.textMuted,
        fontFamily: fonts.body.regular,
        fontStyle: 'italic',
        textAlign: 'center' },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.4)' },
    bottomSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: theme.spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10 },
    sheetHandle: {
        width: 48,
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20 },
    sheetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.sm },
    buildingName: {
        fontFamily: fonts.heading.bold,
        fontSize: 26,
        color: theme.colors.textPrimary,
        flex: 1,
        letterSpacing: 1,
        textTransform: 'uppercase' },
    badge: {
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderColor: theme.colors.success,
        borderWidth: 1,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.radius.sm },
    badgeRole: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderColor: theme.colors.textSecondary },
    badgeText: {
        color: theme.colors.success,
        fontFamily: fonts.body.bold,
        fontSize: 10,
        letterSpacing: 1 },
    badgeInactive: {
        backgroundColor: "rgba(226, 54, 54, 0.1)",
        borderColor: theme.colors.error },
    badgeTextInactive: {
        color: theme.colors.error },
    description: {
        fontSize: 14,
        fontFamily: fonts.body.regular,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
        lineHeight: 22 },
    actionButtons: {
        gap: theme.spacing.sm },
    view3dButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.arHighlight,
        paddingVertical: 14,
        borderRadius: theme.radius.md },
    view3dText: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "900",
        letterSpacing: 1,
        marginLeft: theme.spacing.sm },
    no3dContainer: {
        paddingVertical: theme.spacing.sm,
        alignItems: 'center' },
    no3dText: {
        fontSize: 12,
        color: theme.colors.textMuted,
        fontStyle: "italic" },
    viewPanoramaButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: theme.colors.arHighlight,
        paddingVertical: 12,
        borderRadius: theme.radius.md },
    viewPanoramaText: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.arHighlight,
        fontSize: 14,
        fontWeight: "bold",
        letterSpacing: 1,
        marginLeft: theme.spacing.sm },
    restrictedContainer: {
        paddingVertical: theme.spacing.lg,
        backgroundColor: "rgba(226, 54, 54, 0.05)",
        borderWidth: 1,
        borderColor: theme.colors.error,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        width: '100%' },
    restrictedText: {
        fontSize: 11,
        fontFamily: fonts.heading.bold,
        color: theme.colors.error,
        letterSpacing: 1,
        marginTop: 8 },

    // --- Control Mode Picker ---
    controlPickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24 },
    controlPickerCard: {
        width: '100%',
        backgroundColor: theme.colors.bgSecondary,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingBottom: theme.spacing.md,
        overflow: 'hidden' },
    controlPickerHeader: {
        alignItems: 'center',
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: 6 },
    controlPickerTitle: {
        color: theme.colors.arHighlight,
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 3,
        marginTop: 8 },
    controlPickerSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        textAlign: 'center' },
    controlOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: 18,
        gap: 14 },
    controlOptionIcon: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(0, 229, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center' },
    controlOptionIconGyro: {
        backgroundColor: 'rgba(46, 204, 113, 0.1)',
        borderColor: 'rgba(46, 204, 113, 0.3)' },
    controlOptionText: {
        flex: 1,
        gap: 3 },
    controlOptionTitle: {
        color: theme.colors.arHighlight,
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 2 },
    controlOptionDesc: {
        color: theme.colors.textMuted,
        fontSize: 12,
        lineHeight: 17 },
    controlOptionBadge: {
        color: theme.colors.success,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginTop: 2 },
    controlDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginHorizontal: theme.spacing.lg },
    controlCancelBtn: {
        marginTop: theme.spacing.md,
        marginHorizontal: theme.spacing.lg,
        paddingVertical: 12,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center' },
    controlCancelText: {
        color: theme.colors.textMuted,
        fontSize: 13,
        fontWeight: 'bold',
        letterSpacing: 2 },
    mapLegend: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4 },
    legendTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.textMuted,
        letterSpacing: 1,
        marginBottom: 8 },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6 },
    legendDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        marginRight: 8 },
    legendText: {
        fontSize: 12,
        color: theme.colors.textPrimary,
        fontWeight: '500' } });


