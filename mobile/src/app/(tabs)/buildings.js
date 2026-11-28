import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { customAlert as Alert } from "../../components/ui/CustomAlert";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useIsFocused } from "../../hooks/useIsFocused";
import { useThemeColors } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { usePublicSettings } from "../../context/PublicSettingsContext";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import { authService } from "../../services";
import * as ScreenOrientation from "expo-screen-orientation";
import QuizModal from "../../components/features/QuizModal";
import QuickMissionsModal from "../../components/features/QuickMissionsModal";
import NavigationTurnHUD from "../../components/features/NavigationTurnHUD";
import SoundManager from "../../utils/SoundManager";

// --- Hooks ---
import { useBuildingsMap } from "../../hooks/useBuildingsMap";
import { useBuildingsRouting } from "../../hooks/useBuildingsRouting";
import { useQuickMissions } from "../../hooks/useQuickMissions";
import { useBuildingDetail } from "../../hooks/useBuildingDetail";

// --- Components ---
import { BuildingsMapView } from "../../components/buildings/BuildingsMapView";
import { BuildingsListView } from "../../components/buildings/BuildingsListView";
import { BuildingDetailModal } from "../../components/buildings/BuildingDetailModal";
import { ControlModePicker } from "../../components/buildings/ControlModePicker";
import { QuickMissionsButton } from "../../components/buildings/QuickMissionsButton";
import { createBuildingsStyles } from "../../components/buildings/buildingsStyles";

// --- View Mode Toggle Component ---
const ViewModeToggle = ({ viewMode, onChange, styles, colors }) => (
    <View style={styles.viewModeToggle}>
        <TouchableOpacity
            onPress={() => onChange("map")}
            style={[
                styles.viewModeBtn,
                viewMode === "map" && styles.viewModeBtnActive,
            ]}
        >
            <Text
                style={[
                    styles.viewModeBtnText,
                    viewMode === "map"
                        ? styles.viewModeBtnTextActive
                        : styles.viewModeBtnTextInactive,
                ]}
            >
                Map View
            </Text>
        </TouchableOpacity>
        <TouchableOpacity
            onPress={() => onChange("list")}
            style={[
                styles.viewModeBtn,
                viewMode === "list" && styles.viewModeBtnActive,
            ]}
        >
            <Text
                style={[
                    styles.viewModeBtnText,
                    viewMode === "list"
                        ? styles.viewModeBtnTextActive
                        : styles.viewModeBtnTextInactive,
                ]}
            >
                List View
            </Text>
        </TouchableOpacity>
    </View>
);

export default function BuildingsScreen() {
    const isFocused = useIsFocused();
    const router = useRouter();
    const { targetBuildingId } = useLocalSearchParams();
    const colors = useThemeColors();
    const styles = useThemedStyles(createBuildingsStyles);

    // --- Shared Services & Context ---
    const {
        unlockedBuildings,
        refresh: refreshUnlocked,
    } = useUnlockedBuildings();
    const { location, startTracking, stopTracking } = useLocationTracking();
    const {
        canAccessBuildingFeatures,
        canView3D,
        canViewPanorama,
        role,
    } = useRoleAccess();
    const { enable_trivia } = usePublicSettings();

    // --- Auth Token ---
    const [authToken, setAuthToken] = useState("");
    useEffect(() => {
        let isMounted = true;
        authService.getAccessToken().then((token) => {
            if (isMounted && token) setAuthToken(token);
        });
        return () => {
            isMounted = false;
        };
    }, []);

    // --- Callback Refs (defined before hooks to break circular deps) ---
    const handleBuildingClickRef = useRef(null);
    const handleRouteChangeRef = useRef(null);
    const handleDetailCloseRef = useRef(null);
    const turnInstructionRef = useRef(null);
    const turnClearRef = useRef(null);

    // --- Hooks ---
    const quickMissionsHook = useQuickMissions({ role });

    const mapHook = useBuildingsMap({
        unlockedBuildings,
        role,
        authToken,
        location,
        missionBuildingIds: quickMissionsHook.missionBuildingIds,
        onBuildingClick: (payload) => handleBuildingClickRef.current?.(payload),
        onTurnInstruction: (payload) => turnInstructionRef.current?.(payload),
        onTurnClear: () => turnClearRef.current?.(),
    });

    const routingHook = useBuildingsRouting({
        allBuildings: mapHook.allBuildings,
        location,
        webViewRef: mapHook.webViewRef,
        webViewReady: mapHook.webViewReady,
        authToken,
        role,
        onRouteChange: (changes) => handleRouteChangeRef.current?.(changes),
    });

    const detailHook = useBuildingDetail({
        unlockedBuildings,
        role,
        canAccessBuildingFeatures,
        canView3D,
        canViewPanorama,
        enable_trivia,
        onClose: (reason, building) => handleDetailCloseRef.current?.(reason, building),
    });

    // Update refs after hooks are initialized (useEffect to avoid render-time ref writes)
    useEffect(() => {
        turnInstructionRef.current = routingHook.handleTurnInstruction;
        turnClearRef.current = routingHook.handleTurnClear;
    }, [routingHook.handleTurnInstruction, routingHook.handleTurnClear]);

    // --- Local State ---
    const [viewMode, setViewMode] = useState("map");
    const [listSearchQuery, setListSearchQuery] = useState("");

    const lastTargetBuildingIdRef = useRef(null);

    // Stable refs for focus effect dependencies
    const fetchQuickMissionsRef = useRef(null);
    const sendMapUpdateRef = useRef(null);
    const selectRouteTargetRef = useRef(null);

    // Update refs after hooks are initialized
    useEffect(() => {
        fetchQuickMissionsRef.current = quickMissionsHook.fetchQuickMissions;
        sendMapUpdateRef.current = mapHook.sendMapUpdate;
        selectRouteTargetRef.current = routingHook.handleSelectRouteTarget;
    }, [quickMissionsHook.fetchQuickMissions, mapHook.sendMapUpdate, routingHook.handleSelectRouteTarget]);

    // --- Focus Effect ---
    useFocusEffect(
        useCallback(() => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
            startTracking();
            fetchQuickMissionsRef.current();
            refreshUnlocked(true); // Silent refresh
            SoundManager.init();
            if (sendMapUpdateRef.current) {
                sendMapUpdateRef.current();
            }
            return () => {
                stopTracking();
            };
        }, [startTracking, stopTracking, refreshUnlocked]),
    );

    // --- Handle targetBuildingId from deep link ---
    useEffect(() => {
        if (targetBuildingId && mapHook.allBuildings.length > 0) {
            const target = mapHook.allBuildings.find(
                (b) => b.id.toString() === targetBuildingId.toString(),
            );
            if (target && lastTargetBuildingIdRef.current !== targetBuildingId) {
                lastTargetBuildingIdRef.current = targetBuildingId;
                setTimeout(() => {
                    setViewMode("map");
                    selectRouteTargetRef.current(target);
                }, 0);
            }
        }
    }, [targetBuildingId, mapHook.allBuildings]);

    // --- Building Click from Map ---
    const handleBuildingClick = useCallback(
        (payload) => {
            const building = mapHook.allBuildings.find(
                (b) => b.id === payload.buildingId,
            );

            if (payload.navigateToAR) {
                router.push({
                    pathname: "/(tabs)/ar",
                    params: {
                        targetBuildingId: payload.buildingId,
                        buildingId: payload.buildingId,
                        routeOriginLat: routingHook.routeOrigin
                            ? String(routingHook.routeOrigin.latitude)
                            : undefined,
                        routeOriginLng: routingHook.routeOrigin
                            ? String(routingHook.routeOrigin.longitude)
                            : undefined,
                        routeOriginName: routingHook.routeOrigin
                            ? routingHook.routeOrigin.name || "Selected origin"
                            : undefined,
                    },
                });
                return;
            }

            if (
                payload.isUnlocked ||
                role === "visitor" ||
                (building && building.status === "MAINTENANCE")
            ) {
                const unlockedData =
                    unlockedBuildings.find((b) => b.id === payload.buildingId) || {};
                if (building) {
                    detailHook.openBuildingDetail({ ...building, ...unlockedData });
                }
            } else {
                Alert(
                    "Building Locked",
                    `Visit ${payload.name} in person to unlock it and access its features.`,
                    [{ text: "OK" }],
                );
            }
        },
        [
            mapHook.allBuildings,
            unlockedBuildings,
            role,
            detailHook,
            router,
            routingHook.routeOrigin,
        ],
    );

    // --- Route Change Callback ---
    const handleRouteChange = useCallback((changes) => {
        // Could trigger side effects if needed
    }, []);

    // --- Detail Modal Close Handler ---
    const handleDetailClose = useCallback((reason, building) => {
        if (reason === "locked") {
            Alert(
                "Building Locked",
                `Visit ${building?.name || "this building"} in person to unlock it and access its features.`,
                [{ text: "OK" }],
            );
        } else if (reason === "no_model") {
            Alert(
                "3D MODEL LOCKED",
                `Unlock ${building?.name || "this building"} by visiting it or scanning its QR code to view the 3D model.`,
                [{ text: "UNDERSTOOD" }],
            );
        }
    }, []);

    // Wire up callback refs after all callbacks are defined
    useEffect(() => {
        handleBuildingClickRef.current = handleBuildingClick;
        handleRouteChangeRef.current = handleRouteChange;
        handleDetailCloseRef.current = handleDetailClose;
    }, [handleBuildingClick, handleRouteChange, handleDetailClose]);

    // --- List View Item Press ---
    const handlePressBuildingItem = useCallback(
        (item) => {
            const isUnlocked = unlockedBuildings.some((u) => u.id === item.id);
            if (isUnlocked || role === "visitor" || (item && item.status === "MAINTENANCE")) {
                const unlockedData = unlockedBuildings.find((b) => b.id === item.id) || {};
                detailHook.openBuildingDetail({ ...item, ...unlockedData });
            } else {
                Alert(
                    "Building Locked",
                    `Visit ${item.name} in person to unlock it and access its features.`,
                    [{ text: "OK" }],
                );
            }
        },
        [unlockedBuildings, role, detailHook],
    );

    // --- Quick Mission Select ---
    const handleSelectQuickMission = useCallback(
        (mission) => {
            quickMissionsHook.handleSelectQuickMission(
                mission,
                mapHook.allBuildings,
                {
                    handleSelectRouteTarget: routingHook.handleSelectRouteTarget,
                },
            );
        },
        [quickMissionsHook, mapHook.allBuildings, routingHook.handleSelectRouteTarget],
    );

    // --- Render ---
    return (
        <View style={styles.container}>
            {isFocused && <StatusBar style="dark" />}

            {/* View Mode Toggle */}
            <ViewModeToggle
                viewMode={viewMode}
                onChange={setViewMode}
                styles={styles}
                colors={colors}
            />

            <View style={{ flex: 1 }}>
                {/* Map View */}
                <BuildingsMapView
                    {...mapHook}
                    {...routingHook}
                    role={role}
                    viewMode={viewMode}
                    onBuildingClick={handleBuildingClick}
                    mapStyle={mapHook.mapStyle}
                    setMapStyle={mapHook.setMapStyle}
                    styles={styles}
                    colors={colors}
                />

                {/* List View */}
                <BuildingsListView
                    allBuildings={mapHook.allBuildings}
                    unlockedBuildings={unlockedBuildings}
                    role={role}
                    listSearchQuery={listSearchQuery}
                    setListSearchQuery={setListSearchQuery}
                    viewMode={viewMode}
                    onPressBuilding={handlePressBuildingItem}
                    styles={styles}
                    colors={colors}
                />

                {/* Building Detail Modal */}
                <BuildingDetailModal
                    modalVisible={detailHook.modalVisible}
                    selectedBuilding={detailHook.selectedBuilding}
                    unlockedBuildings={unlockedBuildings}
                    role={role}
                    canAccessBuildingFeatures={detailHook.canAccessFeatures}
                    canView3D={canView3D}
                    canViewPanorama={canViewPanorama}
                    enable_trivia={enable_trivia}
                    selectedBuildingHasModel={detailHook.selectedBuildingHasModel}
                    selectedBuildingModelUrl={detailHook.selectedBuildingModelUrl}
                    onClose={detailHook.closeBuildingDetail}
                    onView3D={detailHook.handleView3D}
                    onVirtualTour={detailHook.handleVirtualTour}
                    onViewPanorama={detailHook.handleViewPanorama}
                    onTakeQuiz={detailHook.handleTakeQuiz}
                    styles={styles}
                    colors={colors}
                />

                {/* Control Mode Picker */}
                <ControlModePicker
                    visible={detailHook.controlPickerVisible}
                    onClose={() => detailHook.setControlPickerVisible(false)}
                    onLaunchVirtualTour={detailHook.launchVirtualTour}
                    styles={styles}
                    colors={colors}
                />

                {/* Quick Missions Button */}
                <QuickMissionsButton
                    role={role}
                    viewMode={viewMode}
                    isRouteActive={routingHook.isRouteActive}
                    routeTarget={routingHook.routeTarget}
                    modalVisible={detailHook.modalVisible}
                    quickQuests={quickMissionsHook.quickQuests}
                    isQuickUnlocked={quickMissionsHook.isQuickUnlocked}
                    dailyProgress={quickMissionsHook.dailyProgress}
                    onPress={() => {
                        quickMissionsHook.fetchQuickMissions();
                        quickMissionsHook.setQuickModalVisible(true);
                    }}
                    styles={styles}
                    colors={colors}
                />

                {/* Navigation Turn HUD */}
                <NavigationTurnHUD
                    visible={routingHook.turnHUD.visible && routingHook.isRouteActive}
                    turnType={routingHook.turnHUD.turnType}
                    distance={routingHook.turnHUD.distance}
                    instruction={routingHook.turnHUD.instruction}
                />

                {/* Trivia Quiz Modal */}
                <QuizModal
                    visible={detailHook.quizModalVisible}
                    building={detailHook.quizBuilding}
                    onClose={detailHook.closeQuizModal}
                />

                {/* Quick Missions Modal */}
                <QuickMissionsModal
                    visible={quickMissionsHook.quickModalVisible}
                    onClose={() => quickMissionsHook.setQuickModalVisible(false)}
                    onSelectMission={handleSelectQuickMission}
                    isUnlocked={quickMissionsHook.isQuickUnlocked}
                    dailyCompletedCount={quickMissionsHook.dailyProgress.completed}
                    dailyTotalCount={quickMissionsHook.dailyProgress.total}
                    quests={quickMissionsHook.quickQuests}
                    completedQuests={quickMissionsHook.completedQuickQuests}
                    onGoToHome={() => router.push("/(tabs)")}
                    userLocation={location}
                    allBuildings={mapHook.allBuildings}
                />
            </View>
        </View>
    );
}