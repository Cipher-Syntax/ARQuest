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
import { X, Camera as CameraIcon, Navigation } from "lucide-react-native";
import { theme } from "../../theme/tokens";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { geofencingService, assetService } from "../../services";
import { api } from "../../services";
import AR3DModelOverlay from "../../components/ar/AR3DModelOverlay";
import ARCompassOverlay from "../../components/ar/ARCompassOverlay";
import ARTurnIndicator from "../../components/ar/ARTurnIndicator";
import ARUnsupportedModal from "../../components/ar/ARUnsupportedModal";
import ARArrivalModal from "../../components/ar/ARArrivalModal";
import ARClaimErrorModal from "../../components/ar/ARClaimErrorModal";
import ARTriviaModal from "../../components/ar/ARTriviaModal";
import ARBottomControls from "../../components/ar/ARBottomControls";
import ARRewardToast from "../../components/ar/ARRewardToast";
import { checkARSupport } from "../../utils/ar-hardware-check";
import {
    getBearing,
    getHaversineDistance,
    getUpcomingWaypoint,
    snapToWalkway,
} from "../../utils/geo-ar";
import { ViroARSceneNavigator } from "@reactvision/react-viro";
import ARQuestScene from "../../components/ar/ARQuestScene";
import ARPostcardModal from "../../components/ar/ARPostcardModal";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import { useAuth } from "../../hooks/useAuth";
import { styles } from "./arStyles";
import SoundManager from "../../utils/SoundManager";
import { GeoStatusIndicator } from "../../components/ui/GeoStatusIndicator";
import ErrorBoundary from "../../components/ui/ErrorBoundary";

export default function ARScreen() {
    const isFocused = useIsFocused();
    const { user, checkToken } = useAuth();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [mediaPermission, requestMediaPermission] =
        MediaLibrary.usePermissions();
    const [nearbyBuilding, setNearbyBuilding] = useState(null);
    const [nearbyBuildingFull, setNearbyBuildingFull] = useState(null);
    const [geofenceStatus, setGeofenceStatus] = useState(null);
    const lastGeofenceCheckTimeRef = useRef(0);
    const consecutiveOutsideCountRef = useRef(0);
    const [capturing, setCapturing] = useState(false);
    const [postcardPhotoUri, setPostcardPhotoUri] = useState(null);
    const [isPostcardModalVisible, setIsPostcardModalVisible] = useState(false);
    const [isScanningQr, setIsScanningQr] = useState(false);
    const [isCameraTransitioning, setIsCameraTransitioning] = useState(false);
    const [scannedData, setScannedData] = useState(null);
    const [isARSupported, setIsARSupported] = useState(true); // Assume supported; set false if check fails
    const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);
    const [cachedModelUri, setCachedModelUri] = useState(null);
    const [claimErrorModalVisible, setClaimErrorModalVisible] = useState(false);
    const [claimErrorMessage, setClaimErrorMessage] = useState("");
    const [claimTargetQuest, setClaimTargetQuest] = useState(null);

    const navigation = useNavigation();
    const { targetBuildingId, buildingId, questId } = useLocalSearchParams();
    const activeTargetId = targetBuildingId || buildingId;
    const isTargetMode = Boolean(activeTargetId);

    const [navTargetFull, setNavTargetFull] = useState(null);
    const [nextWaypoint, setNextWaypoint] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const [isArrivedLatched, setIsArrivedLatched] = useState(false);

    // Reset arrival latch and stable references whenever navigation target changes
    useEffect(() => {
        setIsArrivedLatched(false);
        lastAnnouncedArrivalBldgIdRef.current = null;
        stableModelUrlRef.current = null;
        stableBuildingNameRef.current = null;
    }, [activeTargetId]);

    // Active building target: In target navigation mode, ONLY use navTargetFull.
    // Never fall back to the building where the user is currently standing.
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

    useEffect(() => {
        const targetBldg = navTargetFull || (!isTargetMode ? nearbyBuildingFull : null);
        if (targetBldg && targetBldg.model_url) {
            const assetId = `building_${targetBldg.id}_model`;
            const version = targetBldg.updated_at ? new Date(targetBldg.updated_at).getTime() : "1";
            assetService.isCached(assetId, version, targetBldg.model_url).then((isCached) => {
                if (isCached) {
                    const localPath = assetService.getLocalPath(assetId, version, targetBldg.model_url);
                    setCachedModelUri(localPath);
                } else {
                    setCachedModelUri(targetBldg.model_url);
                }
            }).catch(() => {
                setCachedModelUri(targetBldg.model_url);
            });
        } else {
            setCachedModelUri(null);
        }
    }, [navTargetFull?.id, isTargetMode ? null : nearbyBuildingFull?.id, navTargetFull?.model_url, isTargetMode ? null : nearbyBuildingFull?.model_url]);

    const toggleQrScanner = useCallback((enable) => {
        setIsCameraTransitioning(true);
        setIsScanningQr(enable);
        if (enable) {
            if (arrivalTimerRef.current) {
                clearTimeout(arrivalTimerRef.current);
            }
            setShowArrivalModal(false);
            arrivalModalAnim.setValue(0);
        }
        setTimeout(() => {
            setIsCameraTransitioning(false);
        }, 250);
    }, []);

    useEffect(() => {
        checkARSupport()
            .then((supported) => {
                setIsARSupported(supported);
                if (!supported) {
                    setShowUnsupportedModal(true);
                    setIsScanningQr(true);
                }
            })
            .catch((err) => {
                console.log("checkARSupport error:", err);
                setIsARSupported(true);
            });
    }, []);


    // Trivia & Quest State
    const [activeQuests, setActiveQuests] = useState([]);
    const [triviaModalVisible, setTriviaModalVisible] = useState(false);
    const [claimedQuest, setClaimedQuest] = useState(null);
    const [fetchedTrivia, setFetchedTrivia] = useState(null);
    const [newlyEarnedBadges, setNewlyEarnedBadges] = useState([]);
    const [isClaiming, setIsClaiming] = useState(false);
    const [rankUpInfo, setRankUpInfo] = useState(null);
    const slideAnim = useRef(new Animated.Value(400)).current;
    const badgeAnim = useRef(new Animated.Value(0)).current;
    const rankAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0.3)).current;
    // Turn indicator glow pulse (border opacity animation)
    const ribbonPulseAnim = useRef(new Animated.Value(0)).current;

    // Center Arrival Modal states & animation
    const [showArrivalModal, setShowArrivalModal] = useState(false);
    const arrivalModalAnim = useRef(new Animated.Value(0)).current;
    const arrivalTimerRef = useRef(null);
    const lastAnnouncedArrivalBldgIdRef = useRef(null);

    const fetchQuests = useCallback(async () => {
        if (user?.role !== "student") return;
        try {
            const res = await api.get("/api/gamification/quests/active/");
            if (res.data.success) {
                const quests = res.data.data?.quests || (Array.isArray(res.data.data) ? res.data.data : []);
                setActiveQuests(quests);
            }
        } catch (error) {
            console.error("Error fetching quests", error);
        }
    }, [user?.role]);



    // 3D Model Loading State in AR
    const [isArModelLoading, setIsArModelLoading] = useState(false);
    const loadingShimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isArModelLoading) {
            const loop = Animated.loop(
                Animated.timing(loadingShimmerAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            loop.start();
            return () => loop.stop();
        } else {
            loadingShimmerAnim.setValue(0);
        }
    }, [isArModelLoading]);

    // Continuous pulsing border glow on turn indicators (loop opacity 0→1→0)
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(ribbonPulseAnim, {
                    toValue: 1,
                    duration: 700,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                Animated.timing(ribbonPulseAnim, {
                    toValue: 0.2,
                    duration: 700,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);


    const cameraRef = useRef(null);
    const arViewRef = useRef(null);
    const viroNavRef = useRef(null);

    const flashAnim = useRef(new Animated.Value(0)).current;
    const { canUseAR } = useRoleAccess();

    const { location, heading, error: locationError, startTracking, stopTracking } = useLocationTracking();
    const { unlockedBuildings } = useUnlockedBuildings();

    useEffect(() => {
        if (!isCameraActive || !navTargetFull?.id) {
            setRouteCoordinates([]);
            setNextWaypoint(null);
            return;
        }

        let isMounted = true;

        const fetchRoute = async () => {
            if (!isMounted || !isCameraActive || !navTargetFull?.id) return;
            const startLng = location?.longitude ?? location?.coords?.longitude;
            const startLat = location?.latitude ?? location?.coords?.latitude;

            if (startLat && startLng) {
                const fallbackWaypoint = {
                    longitude: navTargetFull.longitude,
                    latitude: navTargetFull.latitude,
                };

                try {
                    const res = await api.get(
                        `/api/navigation/route/?from_lat=${startLat}&from_lng=${startLng}&to_building_id=${navTargetFull.id}`
                    );

                    if (
                        isMounted &&
                        isCameraActive &&
                        res.data?.success &&
                        res.data?.data?.features?.[0]?.geometry?.coordinates
                    ) {
                        const coords = res.data.data.features[0].geometry.coordinates;
                        if (Array.isArray(coords) && coords.length >= 2) {
                            setRouteCoordinates(coords);
                            const upcoming = getUpcomingWaypoint(coords, startLat, startLng);
                            if (upcoming) {
                                setNextWaypoint(upcoming);
                            }
                            return;
                        }
                    }
                } catch (e) {
                    console.log("Campus navigation route unavailable, falling back to direct line-of-sight:", e?.message || e);
                }

                if (isMounted) {
                    setRouteCoordinates([]);
                    setNextWaypoint(fallbackWaypoint);
                }
            }
        };

        fetchRoute();

        // Refresh global route every 10 seconds only while camera is active in foreground
        const interval = setInterval(fetchRoute, 10000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [
        isCameraActive,
        navTargetFull?.id,
        navTargetFull?.latitude,
        navTargetFull?.longitude,
        !(location?.latitude ?? location?.coords?.latitude),
    ]);

    // Continuously update immediate upcoming waypoint along active campus walking route as user moves
    useEffect(() => {
        if (isCameraActive && routeCoordinates && routeCoordinates.length >= 2 && location) {
            const curLat = location?.latitude ?? location?.coords?.latitude;
            const curLng = location?.longitude ?? location?.coords?.longitude;
            if (curLat && curLng) {
                const upcoming = getUpcomingWaypoint(routeCoordinates, curLat, curLng);
                if (upcoming) {
                    setNextWaypoint(prev => {
                        if (!prev || Math.abs(prev.latitude - upcoming.latitude) > 0.00001 || Math.abs(prev.longitude - upcoming.longitude) > 0.00001) {
                            return upcoming;
                        }
                        return prev;
                    });
                }
            }
        }
    }, [
        isCameraActive,
        location?.latitude,
        location?.longitude,
        location?.coords?.latitude,
        location?.coords?.longitude,
        routeCoordinates,
    ]);

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
        setIsArModelLoading(false);
        stableModelUrlRef.current = null;
        stableBuildingNameRef.current = null;
        router.setParams({ targetBuildingId: undefined, buildingId: undefined, questId: undefined });

        if (navigation?.canGoBack && navigation.canGoBack()) {
            navigation.goBack();
        } else {
            router.replace("/(tabs)/buildings");
        }
    }, [navigation, stopTracking, startTracking]);

    useFocusEffect(
        React.useCallback(() => {
            setIsCameraActive(true);
            startTracking({ highFrequency: true });
            fetchQuests();

            return () => {
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
                setIsArModelLoading(false);
                stableModelUrlRef.current = null;
                stableBuildingNameRef.current = null;
                router.setParams({ targetBuildingId: undefined, buildingId: undefined, questId: undefined });
            };
        }, [startTracking, stopTracking, fetchQuests])
    );

    useEffect(() => {
        fetchQuests();
    }, [fetchQuests]);

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
            console.error("Error fetching full building details:", error);
        }
    };

    const safeActiveQuests = Array.isArray(activeQuests) ? activeQuests : [];
    const matchingQuest = safeActiveQuests.find((q) => {
        if (q.is_completed) return false;
        // 1. Explicit questId from route params
        if (questId && String(q.id) === String(questId)) {
            return true;
        }
        // 2. Navigation target building
        if (navTargetFull?.id && String(q.target_building) === String(navTargetFull.id)) {
            return true;
        }
        // 3. Navigation target ID from route params
        if (activeTargetId && String(q.target_building) === String(activeTargetId)) {
            return true;
        }
        // 4. Geofence nearby building
        if (nearbyBuildingFull?.id && String(q.target_building) === String(nearbyBuildingFull.id)) {
            return true;
        }
        if (nearbyBuilding?.id && String(q.target_building) === String(nearbyBuilding.id)) {
            return true;
        }
        return false;
    });

    useEffect(() => {
        if (activeTargetId) {
            api.get(`/api/buildings/${activeTargetId}/`)
                .then((res) => {
                    if (res.data.success) {
                        setNavTargetFull(res.data.data);
                    }
                })
                .catch((err) => console.error("Error fetching nav target", err));
        } else {
            setNavTargetFull(null);
        }
    }, [activeTargetId]);

    let arrowAngle = 0;
    let distanceToTarget = null;
    let turnDirection = null; // 'left' | 'right' | 'around' | 'ahead'
    const curLat = location?.latitude ?? location?.coords?.latitude;
    const curLng = location?.longitude ?? location?.coords?.longitude;

    // Pathway Snapping (Map-Matching): Snaps user position to the nearest campus walkway segment
    // within 25m, smoothing out GPS multipath reflections and satellite jumps from building walls.
    const effectiveUserCoords = useMemo(() => {
        if (!curLat || !curLng) return null;
        if (routeCoordinates && routeCoordinates.length >= 2) {
            return snapToWalkway(routeCoordinates, curLat, curLng, 25);
        }
        return { latitude: curLat, longitude: curLng, isSnapped: false };
    }, [curLat, curLng, routeCoordinates]);

    const navUserLat = effectiveUserCoords?.latitude ?? curLat;
    const navUserLng = effectiveUserCoords?.longitude ?? curLng;

    if (navTargetFull && navUserLat && navUserLng) {
        distanceToTarget = getHaversineDistance(
            navUserLat,
            navUserLng,
            navTargetFull.latitude,
            navTargetFull.longitude
        );
    }

    // Destination geofence check: True ONLY if inside the actual destination building geofence
    const isInsideDestination = Boolean(
        isTargetMode &&
        geofenceStatus?.status === 'inside' &&
        (String(nearbyBuildingFull?.id) === String(activeTargetId) || String(nearbyBuilding?.id) === String(activeTargetId))
    );

    // In target navigation mode: user is arrived ONLY if they reached the destination (distance <= 25m or inside destination geofence)
    // In free exploration mode: arrived when inside any campus building geofence
    const rawArrived = Boolean(isTargetMode
        ? (navTargetFull && distanceToTarget !== null && (distanceToTarget <= 25 || isInsideDestination))
        : (geofenceStatus?.status === 'inside'));

    useEffect(() => {
        if (rawArrived) {
            setIsArrivedLatched(true);
        } else if (isTargetMode) {
            // In target navigation mode: unlatch when far from destination and not inside destination
            if (distanceToTarget !== null && distanceToTarget > 45 && !isInsideDestination) {
                setIsArrivedLatched(false);
            }
        } else if (geofenceStatus?.status !== 'inside') {
            setIsArrivedLatched(false);
        }
    }, [rawArrived, distanceToTarget, isInsideDestination, isTargetMode, geofenceStatus?.status]);

    const isArrived = Boolean(isArrivedLatched || rawArrived);

    // Center Arrival Modal: Triggers for ~3.5 seconds ONCE when arriving at destination
    useEffect(() => {
        const currentBldgId = isTargetMode
            ? navTargetFull?.id
            : (nearbyBuildingFull?.id || nearbyBuilding?.id);

        if (isArrived && currentBldgId) {
            // Only announce arrival ONCE per building session — do not re-trigger while standing inside
            if (lastAnnouncedArrivalBldgIdRef.current === currentBldgId) {
                return;
            }
            lastAnnouncedArrivalBldgIdRef.current = currentBldgId;

            try {
                SoundManager.play("building_unlock");
            } catch {
                // Non-fatal if audio fails
            }
            setShowArrivalModal(true);
            Animated.timing(arrivalModalAnim, {
                toValue: 1,
                duration: 350,
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: true,
            }).start();

            if (arrivalTimerRef.current) {
                clearTimeout(arrivalTimerRef.current);
            }

            arrivalTimerRef.current = setTimeout(() => {
                setShowArrivalModal(false);
                arrivalModalAnim.setValue(0);
            }, 3500);
        } else if (!isArrived) {
            // Reset announced building reference when user departs the building geofence
            lastAnnouncedArrivalBldgIdRef.current = null;
            if (arrivalTimerRef.current) {
                clearTimeout(arrivalTimerRef.current);
            }
            setShowArrivalModal(false);
            arrivalModalAnim.setValue(0);
        }

        return () => {
            if (arrivalTimerRef.current) {
                clearTimeout(arrivalTimerRef.current);
            }
        };
    }, [isArrived, navTargetFull?.id, nearbyBuildingFull?.id, nearbyBuilding?.id, isTargetMode]);

    // Cleanup arrival modal immediately when switching away from the AR tab
    useFocusEffect(
        useCallback(() => {
            return () => {
                if (arrivalTimerRef.current) {
                    clearTimeout(arrivalTimerRef.current);
                }
                setShowArrivalModal(false);
                arrivalModalAnim.setValue(0);
            };
        }, [])
    );

    const handleDismissArrivalModal = () => {
        if (arrivalTimerRef.current) {
            clearTimeout(arrivalTimerRef.current);
        }
        setShowArrivalModal(false);
        arrivalModalAnim.setValue(0);
    };

    if (navTargetFull && navUserLat && navUserLng && heading !== undefined && heading !== null && !isArrived) {
        const targetLat = nextWaypoint?.latitude ?? navTargetFull.latitude;
        const targetLng = nextWaypoint?.longitude ?? navTargetFull.longitude;

        const bearing = getBearing(
            navUserLat,
            navUserLng,
            targetLat,
            targetLng
        );
        arrowAngle = (bearing - heading + 360) % 360;
        let diff = (bearing - heading + 360) % 360;
        if (diff > 180) diff -= 360;

        // Camera FOV is ~75° (±37.5°). The 3D arrow is visible within ±45°.
        // Only show turn indicators when the target is genuinely off-screen (|diff| > 45°).
        // Display "TURN AROUND" when the target is behind the user (|diff| > 135°),
        // preventing rapid left/right oscillation from compass micro-jitter.
        if (Math.abs(diff) > 135) {
            turnDirection = 'around';
        } else if (diff < -45) {
            turnDirection = 'left';
        } else if (diff > 45) {
            turnDirection = 'right';
        } else {
            turnDirection = 'ahead'; // Visible inside camera view!
        }
    }

    const handleClaimQuest = async (questOverride = null) => {
        // Prevent React Native event object from being treated as questOverride
        const validOverride = (questOverride && typeof questOverride === 'object' && questOverride.id && !questOverride.nativeEvent)
            ? questOverride
            : null;
        const validClaimTarget = (claimTargetQuest && claimTargetQuest.id) ? claimTargetQuest : null;
        const validMatching = (matchingQuest && matchingQuest.id) ? matchingQuest : null;
        const targetQuest = validOverride || validClaimTarget || validMatching;
        if (!targetQuest || !targetQuest.id || isClaiming) return;
        setClaimTargetQuest(targetQuest);
        setIsClaiming(true);
        try {
            const res = await api.post(
                `/api/gamification/quests/${targetQuest.id}/complete/`,
            );
            if (res.data.success) {
                SoundManager.play("quest_complete");
                setClaimedQuest(targetQuest);
                setClaimTargetQuest(null);
                setActiveQuests((prev) =>
                    (Array.isArray(prev) ? prev : []).map((q) =>
                        q.id === targetQuest.id
                            ? { ...q, is_completed: true }
                            : q,
                    ),
                );

                // Show newly earned badges
                const earned = res.data.data?.newly_earned_badges || [];
                if (earned.length > 0) {
                    setTimeout(() => {
                        SoundManager.play("badge_earned");
                    }, 1200); // Wait for quest sound to finish

                    setNewlyEarnedBadges(earned);
                    Animated.sequence([
                        Animated.delay(600),
                        Animated.spring(badgeAnim, {
                            toValue: 1,
                            tension: 60,
                            friction: 8,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        setTimeout(() => {
                            Animated.timing(badgeAnim, {
                                toValue: 0,
                                duration: 300,
                                useNativeDriver: true,
                            }).start(() => setNewlyEarnedBadges([]));
                        }, 3500);
                    });
                }

                // Show rank up toast if applicable
                const newRankInfo = res.data.data?.rank_info;
                if (
                    newRankInfo &&
                    user?.rank_info &&
                    newRankInfo.level > user.rank_info.level
                ) {
                    setRankUpInfo(newRankInfo);
                    Animated.sequence([
                        Animated.delay(earned.length > 0 ? 4500 : 600),
                        Animated.spring(rankAnim, {
                            toValue: 1,
                            tension: 60,
                            friction: 8,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        setTimeout(() => {
                            Animated.timing(rankAnim, {
                                toValue: 0,
                                duration: 300,
                                useNativeDriver: true,
                            }).start(() => {
                                setRankUpInfo(null);
                                checkToken(); // refresh user data after rank toast
                            });
                        }, 4000);
                    });
                } else {
                    checkToken(); // refresh user data anyway to update EXP
                }

                // Fetch Trivia Fact
                try {
                    const activeBldg = navTargetFull || nearbyBuildingFull;
                    const triviaRes = await api.get(
                        `/api/buildings/trivias/?building_id=${activeBldg?.id}`,
                    );
                    if (
                        triviaRes.data.success &&
                        triviaRes.data.data.length > 0
                    ) {
                        const trivias = triviaRes.data.data;
                        const randomTrivia =
                            trivias[Math.floor(Math.random() * trivias.length)];
                        setFetchedTrivia(randomTrivia.fact);
                    } else {
                        setFetchedTrivia(null);
                    }
                } catch (e) {
                    console.error("Error fetching trivia", e);
                    setFetchedTrivia(null);
                }

                setTriviaModalVisible(true);
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }).start();
            } else {
                setClaimErrorMessage(res?.data?.error || "Failed to complete quest.");
                setClaimErrorModalVisible(true);
            }
        } catch (err) {
            console.error("CLAIM QUEST ERROR:", err);
            let errorMessage = "The server took too long to respond. Please check your connection and retry.";
            if (typeof err?.data === "string" && err.data.includes("<html")) {
                if (err.status === 404) {
                    errorMessage = "Quest could not be located on the server (404).";
                } else if (err.status >= 500) {
                    errorMessage = "Server error encountered (500). Please try again shortly.";
                }
            } else if (err?.data?.error) {
                errorMessage = err.data.error;
            } else if (err?.data?.detail) {
                errorMessage = err.data.detail;
            } else if (err?.message) {
                errorMessage = err.message;
            } else if (typeof err === "string") {
                errorMessage = err;
            }
            setClaimErrorMessage(errorMessage);
            setClaimErrorModalVisible(true);
        } finally {
            setIsClaiming(false);
        }
    };

    const handleViewTriviaOnly = async () => {
        setClaimedQuest(null); // Ensure clean trivia view without previous quest completion badge
        const activeBldg = navTargetFull || nearbyBuildingFull;
        if (!activeBldg) return;
        try {
            const triviaRes = await api.get(
                `/api/buildings/trivias/?building_id=${activeBldg.id}`,
            );
            if (triviaRes.data.success && triviaRes.data.data.length > 0) {
                const trivias = triviaRes.data.data;
                const randomTrivia =
                    trivias[Math.floor(Math.random() * trivias.length)];
                setFetchedTrivia(randomTrivia.fact);
            } else {
                setFetchedTrivia(null);
            }
        } catch (e) {
            console.error("Error fetching trivia", e);
            setFetchedTrivia(null);
        }

        setTriviaModalVisible(true);
        Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();
    };

    const closeTriviaModal = () => {
        Animated.timing(slideAnim, {
            toValue: 400,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setTriviaModalVisible(false);
            setClaimedQuest(null);
        });
    };

    const checkGeofenceStatus = async () => {
        if (!location) return;
        const now = Date.now();
        // Throttle geofence backend checks to at most once every 2500ms to avoid network thrashing
        if (now - lastGeofenceCheckTimeRef.current < 2500) return;
        lastGeofenceCheckTimeRef.current = now;

        try {
            const status = await geofencingService.validateLocation(
                location.latitude,
                location.longitude,
                location.accuracy,
            );
            setGeofenceStatus(status);
            if (status?.building) {
                consecutiveOutsideCountRef.current = 0;
                setNearbyBuilding(status.building);
            } else {
                consecutiveOutsideCountRef.current += 1;
                // Require 2 consecutive outside checks before clearing nearbyBuilding
                if (consecutiveOutsideCountRef.current >= 2) {
                    setNearbyBuilding(null);
                }
            }
        } catch (error) {
            if (error?.response?.data?.error?.code === "SPOOFING_DETECTED") {
                console.warn("Location validation notice: Spoofing/velocity alert from backend.");
            } else {
                console.warn("Location validation notice:", error?.message || error);
            }
        }
    };

    const isModelVisible = !!(
        nearbyBuildingFull &&
        unlockedBuildings.some((b) => b.id === nearbyBuildingFull.id) &&
        (nearbyBuildingFull.image_url || nearbyBuildingFull.model_url)
    );

    const handleBarCodeScanned = async ({ type, data }) => {
        if (!isScanningQr || scannedData === data) return;
        setScannedData(data);
        setIsScanningQr(false); // Stop scanning immediately after successful read

        if (!location) {
            setScannedData(null);
            Alert("Permission Required", "Please enable GPS location permissions to verify this QR code.");
            return;
        }

        try {
            const res = await api.post("/api/buildings/unlock/qr/", {
                qr_code_secret: data,
                lat: location?.latitude,
                lng: location?.longitude
            });
            if (res.data.success) {
                if (user?.role === "student") {
                    SoundManager.play("building_unlock");
                }
                Alert("Unlocked!", `Successfully unlocked via QR code!`);
                if (
                    nearbyBuildingFull &&
                    nearbyBuildingFull.id === res.data.data.building
                ) {
                    setNearbyBuildingFull({
                        ...nearbyBuildingFull,
                        is_unlocked: true,
                    });
                }
                // Show badge toast if earned (students only)
                const earned = res.data.data?.newly_earned_badges || [];
                if (user?.role === "student" && earned.length > 0) {
                    setTimeout(() => {
                        SoundManager.play("badge_earned");
                    }, 1200);
                    setNewlyEarnedBadges(earned);
                    badgeAnim.setValue(0);
                    Animated.sequence([
                        Animated.spring(badgeAnim, {
                            toValue: 1,
                            tension: 60,
                            friction: 8,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        setTimeout(() => {
                            Animated.timing(badgeAnim, {
                                toValue: 0,
                                duration: 300,
                                useNativeDriver: true,
                            }).start(() => setNewlyEarnedBadges([]));
                        }, 3500);
                    });
                }
            } else {
                Alert("Scan Failed", res.data.error || "Invalid QR Code");
                setScannedData(null);
            }
        } catch (error) {
            console.error("QR unlock error:", error);
            const errorMsg = error.response?.data?.error || "Failed to connect to server.";
            Alert("Error", errorMsg);
            setScannedData(null); // allow rescan
        }
    };

    const handleCaptureArSnapshot = async () => {
        if (capturing) return;
        setCapturing(true);

        // 1. Immediate shutter feedback: sound & camera flash
        try {
            SoundManager.play("trivia_correct");
        } catch {
            // Non-fatal
        }

        flashAnim.setValue(1);
        Animated.timing(flashAnim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
        }).start();

        let snapshotUri = null;

        // 2. Capture native 3D AR view from ViroARSceneNavigator if active
        if (!isScanningQr && viroNavRef.current) {
            try {
                const fileName = `wmsu_ar_snap_${Date.now()}`;
                const takeFn =
                    viroNavRef.current.takeScreenshot ||
                    viroNavRef.current._takeScreenshot;

                if (typeof takeFn === "function") {
                    const res = await takeFn.call(viroNavRef.current, fileName, false);
                    if (res && res.success && res.url) {
                        snapshotUri = res.url;
                    }
                }
            } catch (viroErr) {
                console.warn("Viro native screenshot failed, attempting fallback:", viroErr);
            }
        }

        // 3. Fallback: if scanning QR or Viro screenshot not available
        if (!snapshotUri) {
            try {
                if (isScanningQr && cameraRef.current?.takePictureAsync) {
                    const photo = await cameraRef.current.takePictureAsync({
                        quality: 0.9,
                        base64: false,
                    });
                    snapshotUri = photo?.uri;
                } else if (arViewRef.current) {
                    snapshotUri = await captureRef(arViewRef, {
                        format: "jpg",
                        quality: 0.9,
                    });
                }
            } catch (fallbackErr) {
                console.error("Fallback snapshot capture error:", fallbackErr);
            }
        }

        setCapturing(false);

        if (!snapshotUri) {
            Alert(
                "Capture Failed",
                "Unable to capture AR view. Please ensure camera permissions are active and try again."
            );
            return;
        }

        // Ensure proper URI formatting
        if (
            !snapshotUri.startsWith("file://") &&
            !snapshotUri.startsWith("content://") &&
            !snapshotUri.startsWith("http")
        ) {
            snapshotUri = `file://${snapshotUri}`;
        }

        setPostcardPhotoUri(snapshotUri);
        setIsPostcardModalVisible(true);
    };

    if (!canUseAR) {
        return (
            <View style={styles.container}>
                <View style={styles.permissionContainer}>
                    <CameraIcon size={64} color={theme.colors.textMuted} />
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
                    <CameraIcon size={64} color={theme.colors.textMuted} />
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
                                    modelUrl: effectiveModelUrl,
                                    buildingName: effectiveBuildingName,
                                    nextWaypoint: nextWaypoint,
                                    isArrived: isArrived,
                                    onModelLoadingChange: setIsArModelLoading,
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

                {/* 2. Middle Layer removed (Model moved into targetCard) */}

                {/* --- Top Left Controls (Exit, QR, Active Missions) --- */}
                {!capturing && (
                    <View style={styles.topLeftControls}>
                        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
                            <X size={24} color={theme.colors.primary} />
                        </TouchableOpacity>

                        
                        
                        {/* Active Missions Pill */}
                        {user?.role === "student" && Array.isArray(activeQuests) && activeQuests.length > 0 && !triviaModalVisible && (
                            <TouchableOpacity style={styles.missionsPill}>
                                <Ionicons name="list" size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
                                <Text style={styles.missionsPillText}>
                                    {activeQuests.filter(q => !q.is_completed).length} MISSIONS
                                </Text>
                            </TouchableOpacity>
                        )}
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

                            return (
                                <View style={styles.topOvalContent}>
                                    {/* Left Side: 2D Building Image */}
                                    {isModelVisible && (
                                        <View style={styles.targetCardLeft}>
                                            <Image
                                                source={{ uri: activeBldg?.image_url }}
                                                style={styles.modelMiniature}
                                                resizeMode="cover"
                                            />
                                        </View>
                                    )}

                                    {/* Right Side: Info & Claim */}
                                    <View style={styles.targetCardRight}>
                                        <Text style={styles.targetLabel}>
                                            {isArrived ? 'TARGET ACQUIRED' : 'TARGET DETECTED'}
                                        </Text>
                                        <Text style={[styles.buildingLabel, { color: theme.colors.primary }]} numberOfLines={1} ellipsizeMode="tail">
                                            {activeBldg?.name || 'Target'}
                                        </Text>
                                        
                                        {isArrived ? (
                                            isArModelLoading ? (
                                                <View style={{ marginTop: 2, width: '100%' }}>
                                                    <View style={styles.modelLoadingRow}>
                                                        <ActivityIndicator size="small" color="#E8B923" style={{ marginRight: 6 }} />
                                                        <Text style={[styles.buildingStatus, { color: '#E8B923', fontWeight: 'bold' }]}>
                                                            Loading 3D Model...
                                                        </Text>
                                                    </View>
                                                    <View style={styles.modelLoadingTrack}>
                                                        <Animated.View
                                                            style={[
                                                                styles.modelLoadingBar,
                                                                {
                                                                    transform: [{
                                                                        translateX: loadingShimmerAnim.interpolate({
                                                                            inputRange: [0, 1],
                                                                            outputRange: [-80, 180],
                                                                        }),
                                                                    }],
                                                                },
                                                            ]}
                                                        />
                                                    </View>
                                                </View>
                                            ) : (
                                                <Text style={[styles.buildingStatus, { color: theme.colors.success }]}>
                                                    ✓ You have arrived!
                                                </Text>
                                            )
                                        ) : (
                                            <>
                                                <Text style={[styles.buildingStatus, { color: theme.colors.textSecondary }]}>
                                                    📍 {dist} meters away
                                                </Text>
                                                <Text style={[styles.buildingStatus, { fontSize: 10, marginTop: 4, color: theme.colors.textMuted }]}>
                                                    Keep moving closer to unlock.
                                                </Text>
                                            </>
                                        )}

                                        {/* Gamified Claim / Info Button — ONLY when physically arrived at this target */}
                                        {!capturing && !triviaModalVisible && isArrived && (
                                            user?.role === 'student' && matchingQuest ? (
                                                <TouchableOpacity 
                                                    style={[styles.claimQuestBtn, { backgroundColor: '#B21830' }]} 
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
                                            ) : activeBldg ? (
                                                <TouchableOpacity 
                                                    style={styles.claimQuestBtn} 
                                                    onPress={handleViewTriviaOnly}
                                                    activeOpacity={0.8}
                                                >
                                                    <Ionicons name="information-circle" size={16} color="#FFFFFF" />
                                                    <Text style={styles.claimQuestBtnText}>VIEW INFO</Text>
                                                </TouchableOpacity>
                                            ) : null
                                        )}
                                    </View>
                                </View>
                            );
                        })()}
                    </View>
                )}


                {/* ── Enhanced Animated Turn Indicators (Option 5 — Pulsing Glow Arrows) ── */}
                {navTargetFull && !isArrived && !isScanningQr && !capturing && !triviaModalVisible && (
                    <ARTurnIndicator
                        turnDirection={turnDirection}
                        pulseAnim={ribbonPulseAnim}
                    />
                )}

                {/* 4. Persistent Compass Navigation Overlay */}
                {/* Positioned in top-right corner below the white header background */}
                {navTargetFull && !isArrived && !isScanningQr && !capturing && !triviaModalVisible && heading !== null && heading !== undefined && (arrowAngle !== null) && (
                    <ARCompassOverlay
                        arrowAngle={arrowAngle}
                        distanceToTarget={distanceToTarget}
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
                onClose={() => setIsPostcardModalVisible(false)}
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
                visible={Boolean(showArrivalModal && !isScanningQr && !capturing && !triviaModalVisible)}
                onDismiss={handleDismissArrivalModal}
                anim={arrivalModalAnim}
                buildingName={effectiveBuildingName || (navTargetFull || nearbyBuildingFull)?.name || 'Destination'}
                missionExp={user?.role === 'student' && matchingQuest ? (matchingQuest.reward_points || 50) : null}
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
            {!capturing && (
                <ARBottomControls
                    isScanningQr={isScanningQr}
                    capturing={capturing}
                    onToggleQr={toggleQrScanner}
                    onCapture={handleCaptureArSnapshot}
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
