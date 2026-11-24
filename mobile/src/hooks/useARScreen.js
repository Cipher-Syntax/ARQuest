// src/hooks/useARScreen.js
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { useARNavigation } from "./useARNavigation";
import { useARGeofence } from "./useARGeofence";
import { useARModelCache } from "./useARModelCache";
import { useARQuestTrivia } from "./useARQuestTrivia";
import { useARQrUnlock } from "./useARQrUnlock";
import { useARCapture } from "./useARCapture";
import { useARArrival } from "./useARArrival";
import { useARBuildingDetails } from "./useARBuildingDetails";
import { useLocationTracking } from "./useLocationTracking";
import { useUnlockedBuildings } from "./useUnlockedBuildings";
import { usePublicSettings } from "../context/PublicSettingsContext";
import { useAuth } from "./useAuth";
import { useRoleAccess } from "./useRoleAccess";
import { checkARSupport } from "../utils/ar-hardware-check";

/**
 * Main composite hook for AR Screen - combines all AR sub-hooks
 * Provides a clean API for the ARScreen component
 */
export function useARScreen() {
    // Auth & Settings
    const { user, checkToken } = useAuth();
    const { canUseAR } = useRoleAccess();
    const {
        demoMode,
        enable_gps,
        enable_qr,
        enable_ar_selfie,
        enable_trivia,
        refresh: refreshPublicSettings,
    } = usePublicSettings();

    // Location & Unlocks
    const { location, heading, error: locationError, startTracking, stopTracking } = useLocationTracking();
    const { unlockedBuildings, attemptUnlock, unlockViaQr } = useUnlockedBuildings();

    // Route params
    const {
        targetBuildingId,
        buildingId,
        questId,
        routeOriginLat,
        routeOriginLng,
        routeOriginName,
    } = useLocalSearchParams();
    const routeOriginLatitude = Array.isArray(routeOriginLat) ? routeOriginLat[0] : routeOriginLat;
    const routeOriginLongitude = Array.isArray(routeOriginLng) ? routeOriginLng[0] : routeOriginLng;
    const fixedRouteOrigin =
        routeOriginLatitude != null && routeOriginLatitude !== "" &&
        routeOriginLongitude != null && routeOriginLongitude !== "" &&
        Number.isFinite(Number(routeOriginLatitude)) &&
        Number.isFinite(Number(routeOriginLongitude))
            ? { latitude: Number(routeOriginLatitude), longitude: Number(routeOriginLongitude) }
            : null;
    const fixedRouteOriginName = Array.isArray(routeOriginName) ? routeOriginName[0] : routeOriginName;
    const activeTargetId = targetBuildingId || buildingId;
    const isTargetMode = Boolean(activeTargetId);

    // Navigation target state
    const [navTargetFull, setNavTargetFull] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isArrivedLatched, setIsArrivedLatched] = useState(false);

    // Reset arrival latch when navigation target changes
    useEffect(() => {
        setIsArrivedLatched(false);
    }, [activeTargetId]);

    // Active building target
    const activeTarget = navTargetFull || (!isTargetMode ? nearbyBuildingFull : null);

    // Stable building name reference
    const stableBuildingNameRef = useRef(null);
    const candidateBuildingName = activeTarget?.name;
    if (candidateBuildingName) {
        stableBuildingNameRef.current = candidateBuildingName;
    }
    const effectiveBuildingName = candidateBuildingName || (isTargetMode ? (navTargetFull?.name || "Loading Destination...") : stableBuildingNameRef.current);

    // Unlocked IDs key for refetching
    const unlockedIdsKey = useMemo(
        () => (unlockedBuildings || []).map((b) => String(b.id)).sort().join(","),
        [unlockedBuildings]
    );

    // --- Compose Sub-Hooks ---

    // Building details & campus perimeter
    const { nearbyBuildingFull, campusPerimeter } = useARBuildingDetails({
        nearbyBuildingId: nearbyBuilding?.id,
        unlockedIdsKey,
        activeTargetId,
        setNavTargetFull,
    });

    // Navigation
    const {
        routeCoordinates,
        nextWaypoint,
        turnDirection,
        distanceToTarget,
        navUserLat,
        navUserLng,
        effectiveUserCoords,
        refreshRoute,
    } = useARNavigation({
        isCameraActive,
        navTargetFull,
        fixedRouteOrigin,
        location,
        heading,
        isArrived: isArrivedLatched, // Will be updated after geofence hook
    });

    // Geofence & Arrival
    const {
        nearbyBuilding: geofenceNearbyBuilding,
        geofenceStatus,
        rawArrived,
        isInsideDestination,
        triggerArrivalModal,
        announcedArrivalBldgIds,
        clearAnnouncedArrivals,
    } = useARGeofence({
        location,
        enableGps: enable_gps,
        isTargetMode,
        activeTargetId,
        navTargetFull,
        nearbyBuildingFull,
        nearbyBuilding: geofenceNearbyBuilding, // This will be the initial value
        isFocused: true, // Will be overridden by useIsFocused
        isArrivedLatched,
        setIsArrivedLatched,
        distanceToTarget,
        geofenceStatus: null, // Will be set by hook
    });

    // Update nearbyBuilding from geofence hook
    const nearbyBuilding = geofenceNearbyBuilding;

    // Model Cache
    const {
        activeModelUri,
        effectiveModelUrl,
        modelProgressPercent,
        matchingCachedModel,
        matchingModelProgress,
    } = useARModelCache({
        activeTarget,
        isTargetMode,
        navTargetFull,
        nearbyBuildingFull,
    });

    // Quest & Trivia
    const {
        activeQuests,
        matchingQuest,
        fetchedTrivia,
        claimedQuest,
        isClaiming,
        claimErrorMessage,
        claimErrorModalVisible,
        setClaimErrorModalVisible,
        triviaModalVisible,
        setTriviaModalVisible,
        newlyEarnedBadges,
        rankUpInfo,
        slideAnim,
        badgeAnim,
        rankAnim,
        fetchQuests,
        handleClaimQuest,
        handleViewTriviaOnly,
        closeTriviaModal,
    } = useARQuestTrivia({
        user,
        enableTrivia: enable_trivia,
        navTargetFull,
        nearbyBuildingFull,
        activeQuests: [], // Initial empty, fetched by hook
        checkToken,
    });

    // QR Unlock
    const {
        scannedData,
        setScannedData,
        qrErrorModalVisible,
        qrErrorMessage,
        qrErrorDistance,
        qrErrorThreshold,
        qrErrorBuildingName,
        qrErrorRetrying,
        setQrErrorRetrying,
        handleBarCodeScanned,
        handleQrErrorRetry,
        handleQrErrorDismiss,
        unlockedModalVisible,
        unlockedModalBuilding,
        unlockedModalIsDemo,
        unlockedModalAlready,
        unlockedModalExp,
        handleUnlockedDismiss,
    } = useARQrUnlock({
        isScanningQr: false, // Will be managed by parent
        setIsScanningQr: () => {}, // Will be managed by parent
        location,
        demoMode,
        user,
        nearbyBuildingFull,
        setNearbyBuildingFull: () => {}, // Will be managed by parent
        refreshPublicSettings,
        checkToken,
        toggleQrScanner: () => {}, // Will be managed by parent
        unlockViaQr,
    });

    // Capture
    const {
        capturing,
        postcardPhotoUri,
        isPostcardModalVisible,
        flashAnim,
        handleCaptureArSnapshot,
        handleClosePostcard,
    } = useARCapture({
        enableArSelfie: enable_ar_selfie,
        isScanningQr: false, // Will be managed by parent
        cameraRef: { current: null }, // Will be managed by parent
        arViewRef: { current: null }, // Will be managed by parent
        viroNavRef: { current: null }, // Will be managed by parent
        navTargetFull,
        nearbyBuildingFull,
        location,
        user,
    });

    // Arrival
    const {
        showArrivalModal,
        arrivalModalAnim,
        discoveryExpForArrival,
        handleDismissArrivalModal,
    } = useARArrival({
        isArrived: isArrivedLatched || rawArrived,
        isFocused: true, // Will be overridden by useIsFocused
        isTargetMode,
        navTargetFull,
        nearbyBuildingFull,
        nearbyBuilding,
        geofenceStatus,
        distanceToTarget,
        unlockedBuildings,
        effectiveBuildingName,
        checkToken,
        attemptUnlock,
        location,
        enableGps: enable_gps,
        user,
    });

    // AR Support Check
    const [isARSupported, setIsARSupported] = useState(true);
    const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);

    useEffect(() => {
        checkARSupport()
            .then((supported) => {
                setIsARSupported(supported);
                if (!supported) {
                    setShowUnsupportedModal(true);
                }
            })
            .catch((err) => {
                console.log("checkARSupport error:", err);
                setIsARSupported(true);
            });
    }, []);

    // Camera permission handling
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();

    // Focus effect
    useFocusEffect(
        useCallback(() => {
            setIsCameraActive(true);
            startTracking({ highFrequency: true });
            fetchQuests();

            return () => {
                setIsCameraActive(false);
                stopTracking();
                startTracking({ highFrequency: false });
            };
        }, [startTracking, stopTracking, fetchQuests])
    );

    // Model size formatting
    const formatModelSize = (bytes) => {
        const size = Number(bytes);
        if (!Number.isFinite(size) || size <= 0) return "SIZE UNAVAILABLE";
        if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        return `${Math.max(1, Math.round(size / 1024))} KB`;
    };

    const modelSizeLabel = formatModelSize(activeTarget?.model_file_size);
    const modelLoadingLabel = modelProgressPercent == null
        ? `${modelDownloadProgress?.status === "downloading" ? "DOWNLOADING MODEL" : "PREPARING MODEL"} · ${modelSizeLabel}`
        : `${modelDownloadProgress.status === "ready" ? "PREPARING" : "DOWNLOADING"} ${modelProgressPercent}% / 100% · ${modelSizeLabel}`;

    // isArrived calculation
    const isArrived = Boolean(isArrivedLatched || rawArrived);

    return {
        // Auth & Permissions
        user,
        checkToken,
        canUseAR,
        cameraPermission,
        requestCameraPermission,

        // Settings
        demoMode,
        enable_gps,
        enable_qr,
        enable_ar_selfie,
        enable_trivia,
        refreshPublicSettings,

        // Location
        location,
        heading,
        locationError,
        startTracking,
        stopTracking,

        // Route Params
        activeTargetId,
        isTargetMode,
        fixedRouteOrigin,
        fixedRouteOriginName,

        // Navigation State
        navTargetFull,
        setNavTargetFull,
        isCameraActive,
        setIsCameraActive,
        isArrivedLatched,
        setIsArrivedLatched,

        // Computed
        activeTarget,
        effectiveBuildingName,
        nearbyBuilding,
        nearbyBuildingFull,
        campusPerimeter,
        unlockedBuildings,
        unlockedIdsKey,

        // Navigation Hook Results
        routeCoordinates,
        nextWaypoint,
        turnDirection,
        distanceToTarget,
        navUserLat,
        navUserLng,
        effectiveUserCoords,
        refreshRoute,

        // Geofence Hook Results
        geofenceStatus,
        rawArrived,
        isInsideDestination,
        isArrived,
        triggerArrivalModal,
        announcedArrivalBldgIds,
        clearAnnouncedArrivals,

        // Model Cache Hook Results
        activeModelUri,
        effectiveModelUrl,
        modelProgressPercent,
        modelSizeLabel,
        modelLoadingLabel,
        matchingCachedModel,
        matchingModelProgress,

        // Quest/Trivia Hook Results
        activeQuests,
        matchingQuest,
        fetchedTrivia,
        claimedQuest,
        isClaiming,
        claimErrorMessage,
        claimErrorModalVisible,
        setClaimErrorModalVisible,
        triviaModalVisible,
        setTriviaModalVisible,
        newlyEarnedBadges,
        rankUpInfo,
        slideAnim,
        badgeAnim,
        rankAnim,
        fetchQuests,
        handleClaimQuest,
        handleViewTriviaOnly,
        closeTriviaModal,

        // QR Unlock Hook Results
        scannedData,
        setScannedData,
        qrErrorModalVisible,
        qrErrorMessage,
        qrErrorDistance,
        qrErrorThreshold,
        qrErrorBuildingName,
        qrErrorRetrying,
        setQrErrorRetrying,
        handleBarCodeScanned,
        handleQrErrorRetry,
        handleQrErrorDismiss,
        unlockedModalVisible,
        unlockedModalBuilding,
        unlockedModalIsDemo,
        unlockedModalAlready,
        unlockedModalExp,
        handleUnlockedDismiss,

        // Capture Hook Results
        capturing,
        postcardPhotoUri,
        isPostcardModalVisible,
        flashAnim,
        handleCaptureArSnapshot,
        handleClosePostcard,

        // Arrival Hook Results
        showArrivalModal,
        arrivalModalAnim,
        discoveryExpForArrival,
        handleDismissArrivalModal,

        // AR Support
        isARSupported,
        showUnsupportedModal,
        setShowUnsupportedModal,
    };
}