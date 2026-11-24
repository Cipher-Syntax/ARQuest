// src/app/(tabs)/ar.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
    ActivityIndicator,
    Easing,
} from "react-native";
import { customAlert as Alert } from "../../components/ui/CustomAlert";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library/legacy";
import { captureRef } from "react-native-view-shot";
import { router, useLocalSearchParams, useFocusEffect, useNavigation } from "expo-router";
import { useIsFocused } from "../../hooks/useIsFocused";
import { X, Camera as CameraIcon, Navigation, ArrowUp, ArrowLeft, ArrowRight, RotateCcw, Building2 } from "lucide-react-native";
import { useThemeColors } from "../../context/ThemeContext";
import { useArStyles } from "../../components/ar/arStyles";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { api } from "../../services";
import AR3DModelOverlay from "../../components/ar/AR3DModelOverlay";
import ARUnsupportedModal from "../../components/ar/ARUnsupportedModal";
import ARArrivalModal from "../../components/ar/ARArrivalModal";
import ARClaimErrorModal from "../../components/ar/ARClaimErrorModal";
import ARTriviaModal from "../../components/ar/ARTriviaModal";
import ARBottomControls from "../../components/ar/ARBottomControls";
import ARRouteMiniMap from "../../components/ar/ARRouteMiniMap";
import ARRewardToast from "../../components/ar/ARRewardToast";
import { checkARSupport } from "../../utils/ar-hardware-check";
import { ViroARSceneNavigator } from "@reactvision/react-viro";
import ARQuestScene from "../../components/ar/ARQuestScene";
import ARPostcardModal from "../../components/ar/ARPostcardModal";
import ARQRErrorModal from "../../components/ar/ARQRErrorModal";
import ARUnlockedModal from "../../components/ar/ARUnlockedModal";
import { usePublicSettings } from "../../context/PublicSettingsContext";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import { useAuth } from "../../hooks/useAuth";
import SoundManager from "../../utils/SoundManager";
import { GeoStatusIndicator } from "../../components/ui/GeoStatusIndicator";
import ErrorBoundary from "../../components/ui/ErrorBoundary";

// Import extracted hooks
import { useARNavigation } from "../../hooks/useARNavigation";
import { useARGeofence } from "../../hooks/useARGeofence";
import { useARModelCache } from "../../hooks/useARModelCache";
import { useARQuestTrivia } from "../../hooks/useARQuestTrivia";
import { useARQrUnlock } from "../../hooks/useARQrUnlock";
import { useARCapture } from "../../hooks/useARCapture";
import { useARArrival } from "../../hooks/useARArrival";
import { useARBuildingDetails } from "../../hooks/useARBuildingDetails";
import { useLocationTracking } from "../../hooks/useLocationTracking";

function formatModelSize(bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) return "SIZE UNAVAILABLE";
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export default function ARScreen() {
    const isFocused = useIsFocused();
    const colors = useThemeColors();
    const styles = useArStyles();
    const { user, checkToken } = useAuth();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
    const navigation = useNavigation();

    // --- Route Params ---
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

    // --- Auth & Settings ---
    const { canUseAR } = useRoleAccess();
    const {
        demoMode,
        enable_gps,
        enable_qr,
        enable_ar_selfie,
        enable_trivia,
        refresh: refreshPublicSettings,
    } = usePublicSettings();

    // --- Location & Unlocks ---
    const { location, heading, error: locationError, startTracking, stopTracking } = useLocationTracking();
    const { unlockedBuildings, attemptUnlock, unlockViaQr } = useUnlockedBuildings();

    // --- Navigation State (component-managed) ---
    const [navTargetFull, setNavTargetFull] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isArrivedLatched, setIsArrivedLatched] = useState(false);
    const [isScanningQr, setIsScanningQr] = useState(false);
    const [isCameraTransitioning, setIsCameraTransitioning] = useState(false);
    const [isArModelLoading, setIsArModelLoading] = useState(false);
    const [claimTargetQuest, setClaimTargetQuest] = useState(null);
    const [isARSupported, setIsARSupported] = useState(true);
    const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);

    // Reset arrival latch when navigation target changes
    useEffect(() => {
        setIsArrivedLatched(false);
    }, [activeTargetId]);

    // Nearby building ID state (updated from geofence hook)
    const [nearbyBuildingId, setNearbyBuildingId] = useState(null);

    // Unlocked IDs key for refetching
    const unlockedIdsKey = useMemo(
        () => (unlockedBuildings || []).map((b) => String(b.id)).sort().join(","),
        [unlockedBuildings]
    );

    // --- Compose Sub-Hooks ---

    // Building details & campus perimeter
    const {
        nearbyBuildingFull,
        setNearbyBuildingFull,
        campusPerimeter,
    } = useARBuildingDetails({
        nearbyBuildingId,
        unlockedIdsKey,
        activeTargetId,
        setNavTargetFull,
    });

    // Navigation hook
    const {
        routeCoordinates,
        nextWaypoint,
        turnDirection,
        distanceToTarget,
        navUserLat,
        navUserLng,
        refreshRoute,
        setRouteCoordinates,
        setNextWaypoint,
    } = useARNavigation({
        isCameraActive,
        navTargetFull,
        fixedRouteOrigin,
        location,
        heading,
        isArrived: isArrivedLatched,
    });

    // Geofence & Arrival hook
    const {
        nearbyBuilding,
        geofenceStatus,
        rawArrived,
        isInsideDestination,
        isArrived,
    } = useARGeofence({
        location,
        enableGps: enable_gps,
        isTargetMode,
        activeTargetId,
        navTargetFull,
        isFocused,
        isArrivedLatched,
        setIsArrivedLatched,
        distanceToTarget,
    });

    // Sync nearbyBuildingId from geofence hook for building details fetch
    useEffect(() => {
        setNearbyBuildingId(nearbyBuilding?.id ?? null);
    }, [nearbyBuilding]);

    // Active building target (derived from hook state)
    const activeTarget = navTargetFull || (!isTargetMode ? nearbyBuildingFull : null);

    // Stable references to prevent background geofence re-fetches from wiping model/name mid-session
    const stableModelUrlRef = useRef(null);
    const candidateModelUrl = activeTarget?.model_url;
    if (candidateModelUrl) {
        stableModelUrlRef.current = candidateModelUrl;
    }
    const effectiveModelUrl = candidateModelUrl || (isTargetMode ? null : stableModelUrlRef.current);

    const stableBuildingNameRef = useRef(null);
    const candidateBuildingName = activeTarget?.name;
    if (candidateBuildingName) {
        stableBuildingNameRef.current = candidateBuildingName;
    }
    const effectiveBuildingName = candidateBuildingName || (isTargetMode ? (navTargetFull?.name || "Loading Destination...") : stableBuildingNameRef.current);

    // Model Cache hook
    const {
        activeModelUri,
        effectiveModelUrl: modelEffectiveUrl,
        modelProgressPercent,
        modelDownloadProgress,
        matchingCachedModel,
        matchingModelProgress,
    } = useARModelCache({
        activeTarget,
        isTargetMode,
        navTargetFull,
        nearbyBuildingFull,
    });

    // Quest & Trivia hook
    const {
        matchingQuest,
        fetchedTrivia,
        claimedQuest,
        isClaiming,
        claimErrorMessage,
        claimErrorModalVisible,
        setClaimErrorModalVisible,
        triviaModalVisible,
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
        activeQuests: [],
        checkToken,
    });

    // Arrival hook (moved before QR Unlock to provide arrivalModalAnim)
    const {
        arrivalModalAnim,
        discoveryExpForArrival,
        handleDismissArrivalModal,
        showArrivalModal,
    } = useARArrival({
        isArrived,
        isFocused,
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
        isModalBlocked: showUnsupportedModal || isScanningQr,
    });

    // Arrival timer ref (needed for toggleQrScanner)
    const arrivalTimerRef = useRef(null);

    // QR Scanner toggle
    const toggleQrScanner = useCallback((enable) => {
        if (enable && !enable_qr) {
            Alert(
                "QR Scanning Disabled",
                "QR code scanning is turned off by the administrator.",
            );
            return;
        }
        setIsCameraTransitioning(true);
        setIsScanningQr(enable);
        if (enable) {
            // Use hook's dismiss function which clears internal timer and resets animation
            handleDismissArrivalModal();
        }
        setTimeout(() => {
            setIsCameraTransitioning(false);
        }, 250);
    }, [enable_qr, handleDismissArrivalModal]);

    // Admin can switch QR off while screen is open
    useEffect(() => {
        if (!enable_qr && isScanningQr) {
            toggleQrScanner(false);
        }
    }, [enable_qr, isScanningQr, toggleQrScanner]);

    // QR Unlock hook
    const {
        scannedData,
        setScannedData,
        qrErrorModalVisible,
        qrErrorMessage,
        qrErrorDistance,
        qrErrorThreshold,
        qrErrorBuildingName,
        qrErrorRetrying,
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
        isScanningQr,
        setIsScanningQr,
        location,
        demoMode,
        user,
        nearbyBuildingFull,
        setNearbyBuildingFull,
        refreshPublicSettings,
        checkToken,
        toggleQrScanner,
        unlockViaQr,
    });

    // Capture hook
    const cameraRef = useRef(null);
    const arViewRef = useRef(null);
    const viroNavRef = useRef(null);

    const {
        flashAnim,
        handleCaptureArSnapshot,
        handleClosePostcard,
        capturing,
        postcardPhotoUri,
        isPostcardModalVisible,
        setCapturing,
        setPostcardPhotoUri,
        setIsPostcardModalVisible,
    } = useARCapture({
        enableArSelfie: enable_ar_selfie,
        isScanningQr,
        cameraRef,
        arViewRef,
        viroNavRef,
        navTargetFull,
        nearbyBuildingFull,
        location,
        user,
    });

    // AR Support Check
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

    // Model size formatting
    const modelSizeLabel = formatModelSize(activeTarget?.model_file_size);
    const modelLoadingLabel = modelProgressPercent == null
        ? `${modelDownloadProgress?.status === "downloading" ? "DOWNLOADING MODEL" : "PREPARING MODEL"} · ${modelSizeLabel}`
        : `${modelDownloadProgress?.status === "ready" ? "PREPARING" : "DOWNLOADING"} ${modelProgressPercent}% / 100% · ${modelSizeLabel}`;

    // Handle exit
    const handleExit = useCallback(() => {
        setIsCameraActive(false);
        stopTracking();
        startTracking({ highFrequency: false });
        setNavTargetFull(null);
        setNextWaypoint(null);
        setRouteCoordinates([]);
        setCapturing(false);
        setIsPostcardModalVisible(false);
        setPostcardPhotoUri(null);
        setIsScanningQr(false);
        setScannedData(null);
        setIsArrivedLatched(false);
        stableModelUrlRef.current = null;
        stableBuildingNameRef.current = null;
        router.setParams({
            targetBuildingId: undefined,
            buildingId: undefined,
            questId: undefined,
            routeOriginLat: undefined,
            routeOriginLng: undefined,
            routeOriginName: undefined,
        });

        if (navigation?.canGoBack && navigation.canGoBack()) {
            navigation.goBack();
        } else {
            router.replace("/(tabs)/buildings");
        }
    }, [navigation, stopTracking, startTracking]);

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
                setNextWaypoint(null);
                setRouteCoordinates([]);
                setCapturing(false);
                setIsPostcardModalVisible(false);
                setPostcardPhotoUri(null);
                setIsScanningQr(false);
                setScannedData(null);
                setIsArrivedLatched(false);
            };
        }, [startTracking, stopTracking, fetchQuests])
    );

    // Pulse animation for scanning reticle
    const pulseAnim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ]),
        ).start();
    }, [pulseAnim]);

    // Permission/Role checks
    if (!canUseAR && !demoMode) {
        return (
            <View style={styles.container}>
                <View style={styles.permissionContainer}>
                    <CameraIcon size={64} color={colors.textMuted} />
                    <Text style={styles.permissionTitle}>
                        AR Access Restricted
                    </Text>
                    <Text style={styles.permissionText}>
                        Your current role does not have access to AR
                        features. Please sign in as a registered student to
                        use AR Quest scanning and missions.
                    </Text>
                    <TouchableOpacity
                        style={styles.permissionButton}
                        onPress={() => router.back()}
                    >
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
                    <CameraIcon size={64} color={colors.textMuted} />
                    <Text style={styles.permissionTitle}>
                        Camera Permission Required
                    </Text>
                    <Text style={styles.permissionText}>
                        ARQuest needs camera access to show AR building views
                        and capture selfies.
                    </Text>
                    <TouchableOpacity
                        style={styles.permissionButton}
                        onPress={requestCameraPermission}
                    >
                        <Text style={styles.permissionButtonText}>
                            Grant Permission
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {isFocused && <StatusBar style="dark" />}
            {/* --- CAPTURE TARGET --- */}
            <View
                ref={arViewRef}
                style={styles.captureContainer}
                collapsable={false}
            >
                {/* 1. Base Layer: Live AR Camera / QR Scanner */}
                {isCameraActive && !isCameraTransitioning && (
                    <ErrorBoundary
                        title="AR Camera Interrupted"
                        message="The camera or AR session was temporarily suspended. Tap to retry."
                        onReset={() => {
                            setIsCameraActive(false);
                            setTimeout(() => setIsCameraActive(true), 200);
                        }}
                    >
                        {!isScanningQr && isARSupported ? (
                            <ViroARSceneNavigator
                                ref={viroNavRef}
                                autofocus={true}
                                initialScene={{ scene: ARQuestScene }}
                                viroAppProps={{
                                    targetLat: navTargetFull?.latitude || (!isTargetMode ? nearbyBuildingFull?.latitude : undefined),
                                    targetLng: navTargetFull?.longitude || (!isTargetMode ? nearbyBuildingFull?.longitude : undefined),
                                    userLat: navUserLat,
                                    userLng: navUserLng,
                                    userHeading: heading,
                                    modelUrl: activeModelUri,
                                    modelFallbackUrl: modelEffectiveUrl,
                                    buildingName: effectiveBuildingName,
                                    nextWaypoint: nextWaypoint,
                                    isArrived: isArrived,
                                    onModelLoadingChange: setIsArModelLoading,
                                    brandColor: colors.primary,
                                }}
                                style={styles.camera}
                            />
                        ) : (
                            <CameraView
                                style={styles.camera}
                                facing="back"
                                ref={cameraRef}
                                onBarcodeScanned={handleBarCodeScanned}
                                barcodeScannerSettings={{
                                    barcodeTypes: ["qr"],
                                }}
                            />
                        )}
                    </ErrorBoundary>
                )}

                {/* --- Top Right Control (Exit) --- */}
                {!capturing && (
                    <View style={styles.topRightControls}>
                        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
                            <X size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* --- GPS Signal Banner --- */}
                {!capturing && locationError && (
                    <View style={styles.gpsBanner} pointerEvents="box-none">
                        <GeoStatusIndicator
                            mockedGPS={locationError.includes("Fake GPS")}
                            status={locationError && !locationError.includes("Fake GPS") ? "weak_signal" : undefined}
                            onRetry={() => {
                                stopTracking();
                                setTimeout(() => startTracking(), 300);
                            }}
                        />
                    </View>
                )}

                {/* --- Top Oval Header (Solid White Curve) --- */}
                {(navTargetFull || (!isTargetMode && (nearbyBuildingFull || nearbyBuilding))) && (
                    <View style={styles.topOvalContainer}>
                        <View style={styles.topOvalShape} />
                        {(() => {
                            const activeBldg = navTargetFull || (!isTargetMode ? (nearbyBuildingFull || nearbyBuilding) : null);
                            const dist = Math.round(isTargetMode ? (distanceToTarget || 0) : (geofenceStatus?.distance_meters || 0));

                            const getArrowLabel = (dir) => {
                                switch (dir) {
                                    case 'left': return 'LEFT';
                                    case 'right': return 'RIGHT';
                                    case 'around': return 'TURN AROUND';
                                    case 'ahead':
                                    default: return 'FORWARD';
                                }
                            };
                            const getArrowIcon = (dir) => {
                                switch (dir) {
                                    case 'left': return ArrowLeft;
                                    case 'right': return ArrowRight;
                                    case 'around': return RotateCcw;
                                    case 'ahead':
                                    default: return ArrowUp;
                                }
                            };
                            const arrowDir = turnDirection || 'ahead';
                            const arrowLabel = getArrowLabel(arrowDir);
                            const DirectionIcon = getArrowIcon(arrowDir);

                            return (
                                <View style={styles.topOvalContent}>
                                    {/* Direction arrow becomes the building thumbnail on arrival. */}
                                    <View style={styles.targetCardLeft}>
                                        {isArrived ? (
                                            activeBldg?.image_url ? (
                                                <Image
                                                    source={{ uri: activeBldg.image_url }}
                                                    style={styles.modelMiniature}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <Building2 size={42} color={colors.primary} />
                                            )
                                        ) : (
                                            <DirectionIcon
                                                size={48}
                                                color={colors.primary}
                                                strokeWidth={3}
                                                style={styles.directionArrowIcon}
                                            />
                                        )}
                                    </View>

                                    {/* Right Side: Arrow Label + Building Name */}
                                    <View style={styles.targetCardRight}>
                                        <Text style={styles.targetLabel}>
                                            {isArrived ? 'BUILDING ACQUIRED' : arrowLabel}
                                        </Text>
                                        <Text style={[styles.buildingLabel, { color: colors.primary }]} numberOfLines={1} ellipsizeMode="tail">
                                            {isArrived ? (activeBldg?.name || 'Building') : `to ${activeBldg?.name || 'Target'}`}
                                        </Text>

                                        {isArrived ? (
                                            isArModelLoading ? (
                                                <View style={{ marginTop: 2, width: '100%' }}>
                                                    <View style={styles.modelLoadingRow}>
                                                        <ActivityIndicator size="small" color="#E8B923" style={{ marginRight: 6 }} />
                                                        <Text
                                                            numberOfLines={1}
                                                            ellipsizeMode="tail"
                                                            style={[styles.buildingStatus, { color: '#E8B923', fontWeight: 'bold', fontSize: 10, letterSpacing: 0.1 }]}
                                                        >
                                                            {modelLoadingLabel}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ) : (
                                                <Text style={[styles.buildingStatus, { color: colors.success }]}>
                                                    ✓ You have arrived!
                                                </Text>
                                            )
                                        ) : (
                                            <>
                                                <Text style={[styles.buildingStatus, { color: colors.textSecondary }]}>
                                                    📍 {dist} meters away
                                                </Text>
                                                <Text style={[styles.buildingStatus, { fontSize: 10, marginTop: 4, color: colors.textMuted }]}>
                                                    Keep moving closer to unlock.
                                                </Text>
                                            </>
                                        )}

                                        {/* Gamified Claim / Info Button — ONLY when physically arrived at this target */}
                                        {!capturing && !triviaModalVisible && isArrived && (
                                            user?.role === 'student' && matchingQuest ? (
                                                <TouchableOpacity
                                                    style={[styles.claimQuestBtn, { backgroundColor: colors.primary }]}
                                                    onPress={() => handleClaimQuest(matchingQuest)}
                                                    disabled={isClaiming}
                                                    activeOpacity={0.8}
                                                >
                                                    {isClaiming ? (
                                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                                    ) : (
                                                        <>
                                                            <Ionicons name="gift" size={16} color="#FFD700" />
                                                            <Text style={styles.claimQuestBtnText}>
                                                                CLAIM REWARD (+{matchingQuest.reward_points || 50} EXP)
                                                            </Text>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            ) : null
                                        )}
                                    </View>
                                </View>
                            );
                        })()}
                        {!capturing &&
                            !triviaModalVisible &&
                            isArrived &&
                            activeTarget &&
                            enable_trivia &&
                            !(user?.role === 'student' && matchingQuest) && (
                                <TouchableOpacity
                                    style={[styles.viewInfoFloatingBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleViewTriviaOnly}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="information-circle" size={18} color="#FFFFFF" />
                                    <Text style={styles.claimQuestBtnText}>VIEW INFO</Text>
                                </TouchableOpacity>
                            )}
                    </View>
                )}

                {!capturing && !isArrived && activeTarget && (
                    <ARRouteMiniMap
                        coordinates={routeCoordinates}
                        currentLongitude={navUserLng}
                        currentLatitude={navUserLat}
                        targetLongitude={activeTarget.longitude}
                        targetLatitude={activeTarget.latitude}
                        buildingName={activeTarget.name}
                        originName={fixedRouteOriginName}
                        campusPerimeter={campusPerimeter}
                        distanceMeters={distanceToTarget}
                        isScanningQr={isScanningQr}
                        capturing={capturing}
                        onToggleQr={toggleQrScanner}
                        onCapture={handleCaptureArSnapshot}
                        showQr={enable_qr}
                        showCapture={enable_ar_selfie}
                    />
                )}

                {/* 3. Reticle Overlays */}
                {/* QR Scanner box — only when user explicitly toggles QR code scanning */}
                {isScanningQr && (
                    <View style={styles.scanningReticle} pointerEvents="none">
                        <Animated.View style={[styles.scannerLine, { opacity: pulseAnim }]} />
                        <Text style={styles.scanningText}>[ SCANNING QR ]</Text>
                    </View>
                )}

                {/* Camera shutter flash animation */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            backgroundColor: "#FFFFFF",
                            opacity: flashAnim,
                            zIndex: 9999,
                        },
                    ]}
                />
            </View>
            {/* --- END CAPTURE TARGET --- */}

            {/* --- AR POSTCARD MODAL --- */}
            <ARPostcardModal
                visible={isPostcardModalVisible}
                photoUri={postcardPhotoUri}
                building={navTargetFull || nearbyBuildingFull}
                location={location}
                user={user}
                onClose={handleClosePostcard}
            />

            {/* --- DEVICE NOT SUPPORTED MODAL --- */}
            <ARUnsupportedModal
                visible={showUnsupportedModal}
                onGoToMap={() => {
                    setShowUnsupportedModal(false);
                    router.push("/(tabs)/buildings");
                }}
                onUseQr={() => {
                    setShowUnsupportedModal(false);
                    toggleQrScanner(true);
                }}
            />

            {/* --- REWARD-STYLE CENTER ARRIVAL MODAL (Native Window Centered) --- */}
            <ARArrivalModal
                visible={Boolean(showArrivalModal && !showUnsupportedModal && !isScanningQr && !capturing && !triviaModalVisible)}
                onDismiss={handleDismissArrivalModal}
                anim={arrivalModalAnim}
                buildingName={effectiveBuildingName || (navTargetFull || nearbyBuildingFull)?.name || 'Destination'}
                missionExp={user?.role === 'student' && matchingQuest ? (matchingQuest.reward_points || 50) : null}
                discoveryExp={discoveryExpForArrival}
            />

            {/* --- QUEST CLAIM ERROR & RETRY MODAL (TC_AR_05 Step 3 Compliance) --- */}
            <ARClaimErrorModal
                visible={claimErrorModalVisible}
                onDismiss={() => setClaimErrorModalVisible(false)}
                onRetry={() => {
                    setClaimErrorModalVisible(false);
                    handleClaimQuest(claimTargetQuest || matchingQuest);
                }}
                isRetrying={isClaiming}
                message={claimErrorMessage || "The server took too long to respond. Tap Retry to resend your claim without losing progress."}
                questTitle={(claimTargetQuest || matchingQuest)?.title || ((claimTargetQuest || matchingQuest) ? "Campus Quest" : null)}
                questExp={(claimTargetQuest || matchingQuest)?.reward_points || 50}
            />

            {/* --- QR UNLOCK ERROR MODAL --- */}
            <ARQRErrorModal
                visible={qrErrorModalVisible}
                onDismiss={handleQrErrorDismiss}
                onRetry={handleQrErrorRetry}
                isRetrying={qrErrorRetrying}
                message={qrErrorMessage}
                distance={qrErrorDistance}
                threshold={qrErrorThreshold}
                buildingName={qrErrorBuildingName}
            />

            {/* --- QR UNLOCK SUCCESS MODAL --- */}
            <ARUnlockedModal
                visible={unlockedModalVisible}
                onDismiss={handleUnlockedDismiss}
                buildingName={unlockedModalBuilding}
                isDemo={unlockedModalIsDemo}
                alreadyUnlocked={unlockedModalAlready}
                expAwarded={unlockedModalExp}
            />

            {/* --- TRIVIA MODAL (GAMIFIED OR INFO) --- */}
            {triviaModalVisible && (
                <ARTriviaModal
                    onClose={closeTriviaModal}
                    slideAnim={slideAnim}
                    title={user?.role === "student" && claimedQuest ? "MISSION COMPLETED!" : "Building Information"}
                    buildingName={(navTargetFull || nearbyBuildingFull)?.name || "Unknown Building"}
                    body={fetchedTrivia || claimedQuest?.hint || (navTargetFull || nearbyBuildingFull)?.description || "No information available for this location."}
                    rewardPoints={user?.role === "student" && claimedQuest ? claimedQuest.reward_points : null}
                />
            )}

            {/* --- Bottom Camera Controls --- */}
            {!capturing && (!activeTarget || isArrived) && (
                <ARBottomControls
                    isScanningQr={isScanningQr}
                    capturing={capturing}
                    onToggleQr={toggleQrScanner}
                    onCapture={handleCaptureArSnapshot}
                    showQr={enable_qr}
                    showCapture={enable_ar_selfie}
                />
            )}

            {/* --- BADGE EARNED TOAST --- */}
            {user?.role === "student" && newlyEarnedBadges.length > 0 && (
                <ARRewardToast
                    variant="badge"
                    anim={badgeAnim}
                    emoji={newlyEarnedBadges[0].icon}
                    label="BADGE UNLOCKED"
                    name={newlyEarnedBadges[0].name}
                />
            )}

            {/* --- RANK UP TOAST --- */}
            {user?.role === "student" && rankUpInfo && (
                <ARRewardToast
                    variant="rank"
                    anim={rankAnim}
                    emoji={rankUpInfo.icon}
                    label="RANK UP!"
                    name={`Lv.${rankUpInfo.level} ${rankUpInfo.title}`}
                />
            )}
        </View>
    );
}