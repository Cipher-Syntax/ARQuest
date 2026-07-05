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
            <StatusBar style="dark" />
            
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

            {/* Routing Search Overlay */}
            <LinearGradient
                colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']}
                style={styles.searchTerminal}
                pointerEvents="box-none"
            >
                <Text style={styles.terminalHeader}>Map Navigation</Text>
                
                <View style={styles.terminalInputContainer}>
                    <View style={styles.terminalInputRow}>
                        <Text style={styles.terminalInputLabel}>FROM</Text>
                        <TextInput
                            style={[styles.terminalInput, !routeOrigin && { color: theme.colors.success, fontWeight: 'bold' }]}
                            placeholder="Your Location"
                            placeholderTextColor={!routeOrigin ? theme.colors.success : "#999999"}
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
                        <Text style={styles.terminalInputLabel}>TO</Text>
                        <TextInput
                            style={styles.terminalInputActive}
                            placeholder="Search Destination"
                            placeholderTextColor="#999999"
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
            </LinearGradient>

            <View style={{ position: 'absolute', top: 150, left: 0, right: 0, paddingHorizontal: 20, zIndex: 20 }} pointerEvents="box-none">
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
                    <TouchableOpacity activeOpacity={1} style={styles.tacticalModalContainer}>
                        
                        {selectedBuilding && (
                            <>
                                <View style={styles.tacticalModalHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.tacticalModalSubtitle}>Selected Location</Text>
                                        <Text style={styles.tacticalModalTitle} numberOfLines={2}>{selectedBuilding.name}</Text>
                                        {routeDistance && (
                                            <Text style={styles.tacticalModalDistance}>Distance: {routeDistance} meters</Text>
                                        )}
                                    </View>
                                    
                                    <View style={[
                                        styles.tacticalModalBadge, 
                                        !unlockedBuildings.some(b => b.id === selectedBuilding.id) && styles.tacticalModalBadgeLocked
                                    ]}>
                                        <Text style={[
                                            styles.tacticalBadgeText,
                                            !unlockedBuildings.some(b => b.id === selectedBuilding.id) && styles.tacticalBadgeTextLocked
                                        ]}>
                                            {unlockedBuildings.some(b => b.id === selectedBuilding.id) ? 'UNLOCKED' : 'LOCKED'}
                                        </Text>
                                    </View>
                                </View>

                                {selectedBuilding.is_active === false ? (
                                    <View style={styles.restrictedContainer}>
                                        <ShieldAlert color={theme.colors.error} size={20} style={{marginBottom: 4}} />
                                        <Text style={styles.restrictedText}>Building Closed / Under Renovation</Text>
                                    </View>
                                ) : canAccessBuildingFeatures(true) ? (
                                    <View style={styles.tacticalActionGrid}>
                                        {selectedBuilding.model_active && selectedBuilding.model_url && canView3D ? (
                                            <TouchableOpacity style={styles.tacticalActionBtn} onPress={handleView3D}>
                                                <Text style={styles.tacticalActionText}>View 3D Model</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={[styles.tacticalActionBtn, styles.tacticalActionBtnDisabled]}>
                                                <Text style={[styles.tacticalActionText, { color: theme.colors.textMuted }]}>3D Assets Offline</Text>
                                            </View>
                                        )}
                                        
                                        {canViewPanorama && (role === 'professional' || role === 'admin') && selectedBuilding.model_active && selectedBuilding.model_url && (
                                            <TouchableOpacity style={styles.tacticalActionBtn} onPress={handleVirtualTour}>
                                                <Text style={styles.tacticalActionText}>Start Virtual Tour</Text>
                                            </TouchableOpacity>
                                        )}

                                        {canViewPanorama && (
                                            <TouchableOpacity style={styles.tacticalActionBtn} onPress={handleViewPanorama}>
                                                <Text style={styles.tacticalActionText}>View 360° Panorama</Text>
                                            </TouchableOpacity>
                                        )}
                                        
                                        {role === 'student' && (
                                            <TouchableOpacity 
                                                style={[styles.tacticalActionBtn, { borderColor: theme.colors.primary }]} 
                                                onPress={() => {
                                                    setModalVisible(false);
                                                    setQuizModalVisible(true);
                                                }}
                                            >
                                                <Text style={[styles.tacticalActionText, { color: theme.colors.primary }]}>Take Quiz</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    <View style={{ alignItems: 'center', marginTop: 16 }}>
                                        <ShieldAlert color={theme.colors.primary} size={24} style={{marginBottom: 8}} />
                                        <Text style={styles.tacticalWarningText}>
                                            ⚠ You must visit this location in person to unlock its features
                                        </Text>
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
                        <Text style={styles.legendText}>{role === 'professional' ? 'Visited' : 'Unlocked'} Location</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: '#6b7280', borderWidth: 2, borderColor: '#FFFFFF' }]} />
                        <Text style={styles.legendText}>{role === 'professional' ? 'Unvisited' : 'Locked'} Location</Text>
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
        color: theme.colors.primary,
        marginTop: 10,
        fontFamily: fonts.heading.bold,
        letterSpacing: 1 },
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
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: theme.colors.primary,
        letterSpacing: 1,
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
        fontFamily: fonts.body.bold,
        fontSize: 12,
        color: theme.colors.textSecondary,
        width: 45,
    },
    terminalInput: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: theme.colors.textPrimary,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
    },
    terminalInputActive: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: theme.colors.primary,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        borderRadius: theme.radius.md,
    },
    clearRouteBtn: {
        padding: theme.spacing.xs },
    searchResultsContainer: {
        marginTop: theme.spacing.sm,
        backgroundColor: theme.colors.bgPrimary,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 200 },
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
    tacticalModalContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderTopWidth: 3,
        borderTopColor: theme.colors.primary,
        padding: 20,
        paddingBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    tacticalModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    tacticalModalSubtitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: theme.colors.primary,
        letterSpacing: 1,
        marginBottom: 4,
    },
    tacticalModalTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 22,
        color: '#000000',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    tacticalModalDistance: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    tacticalModalBadge: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderWidth: 1,
        borderColor: '#CCCCCC',
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginLeft: 12,
    },
    tacticalModalBadgeLocked: {
        backgroundColor: 'rgba(178,24,48,0.1)',
        borderColor: theme.colors.primary,
    },
    tacticalBadgeText: {
        fontFamily: fonts.body.bold,
        fontSize: 11,
        color: theme.colors.textPrimary,
        letterSpacing: 1,
    },
    tacticalBadgeTextLocked: {
        color: theme.colors.primary,
    },
    tacticalActionGrid: {
        flexDirection: 'column',
        gap: 8,
    },
    tacticalActionBtn: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#CCCCCC',
        borderRadius: theme.radius.md,
        alignItems: 'center',
    },
    tacticalActionBtnDisabled: {
        opacity: 0.5,
        backgroundColor: theme.colors.bgSecondary,
    },
    tacticalActionText: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: theme.colors.textPrimary,
        letterSpacing: 1,
    },
    tacticalWarningText: {
        fontFamily: fonts.body.bold,
        fontSize: 12,
        color: theme.colors.primary,
        textAlign: 'center',
    },
    restrictedContainer: {
        paddingVertical: 16,
        backgroundColor: "rgba(226, 54, 54, 0.05)",
        borderWidth: 1,
        borderColor: theme.colors.error,
        alignItems: 'center',
        width: '100%',
        marginTop: 12,
    },
    restrictedText: {
        fontSize: 12,
        fontFamily: fonts.heading.bold,
        color: theme.colors.error,
        letterSpacing: 1,
        marginTop: 8,
    },

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


