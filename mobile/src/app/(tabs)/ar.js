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
import { X, Camera as CameraIcon, QrCode, Navigation, AlertTriangle, Smartphone } from "lucide-react-native";
import { theme } from "../../theme/tokens";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { geofencingService, assetService } from "../../services";
import { api } from "../../services";
import AR3DModelOverlay from "../../components/ar/AR3DModelOverlay";
import { checkARSupport } from "../../utils/ar-hardware-check";
import { getUpcomingWaypoint, snapToWalkway } from "../../utils/geo-ar";
import { ViroARSceneNavigator } from "@reactvision/react-viro";
import ARQuestScene from "../../components/ar/ARQuestScene";
import ARPostcardModal from "../../components/ar/ARPostcardModal";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import { useAuth } from "../../hooks/useAuth";
import { fonts } from "../../constants/typography";
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

    const DeviceNotSupportedModal = () => (
        showUnsupportedModal ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 24 }]}>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 6, width: '100%', maxWidth: 360, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 10 }}>
                    {/* Header Ribbon */}
                    <View style={{ backgroundColor: theme.colors.primary, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <AlertTriangle size={20} color="#FFD700" />
                        <Text style={{ fontFamily: fonts.heading.bold, color: '#FFFFFF', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                            Spatial AR Not Supported
                        </Text>
                    </View>

                    {/* Content */}
                    <View style={{ padding: 20 }}>
                        <Text style={{ fontFamily: fonts.body.bold, color: theme.colors.textPrimary, fontSize: 14, marginBottom: 8 }}>
                            Google ARCore Not Detected
                        </Text>
                        <Text style={{ fontFamily: fonts.body.regular, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 20 }}>
                            Your device does not support native Spatial AR tracking. You can still navigate using the Campus 2D Map and scan building QR codes to complete quests.
                        </Text>

                        {/* Action Buttons */}
                        <View style={{ gap: 10 }}>
                            <TouchableOpacity 
                                style={{ backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                                onPress={() => {
                                    setShowUnsupportedModal(false);
                                    router.push("/(tabs)/buildings");
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={{ fontFamily: fonts.heading.bold, color: '#FFFFFF', fontSize: 12, letterSpacing: 1 }}>
                                    GO TO CAMPUS MAP
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={{ backgroundColor: 'transparent', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border }}
                                onPress={() => {
                                    setShowUnsupportedModal(false);
                                    toggleQrScanner(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontFamily: fonts.heading.bold, color: theme.colors.textPrimary, fontSize: 11, letterSpacing: 0.5 }}>
                                    USE QR SCANNER INSTEAD
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        ) : null
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

    const getBearing = (lat1, lon1, lat2, lon2) => {
        const toRad = (val) => (val * Math.PI) / 180;
        const toDeg = (val) => (val * 180) / Math.PI;

        const dLon = toRad(lon2 - lon1);
        const y = Math.sin(dLon) * Math.cos(toRad(lat2));
        const x =
            Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

        return (toDeg(Math.atan2(y, x)) + 360) % 360;
    };

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const p1 = (lat1 * Math.PI) / 180;
        const p2 = (lat2 * Math.PI) / 180;
        const dp = ((lat2 - lat1) * Math.PI) / 180;
        const dl = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

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
        distanceToTarget = getDistance(
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

    // Center Arrival Modal: Triggers for ~3.5 seconds when arriving at destination
    useEffect(() => {
        if (isArrived) {
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
                Animated.timing(arrivalModalAnim, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }).start(() => {
                    setShowArrivalModal(false);
                });
            }, 3500);
        } else {
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
    }, [isArrived]);

    const handleDismissArrivalModal = () => {
        if (arrivalTimerRef.current) {
            clearTimeout(arrivalTimerRef.current);
        }
        Animated.timing(arrivalModalAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setShowArrivalModal(false);
        });
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

    const handleClaimQuest = async () => {
        if (!matchingQuest || isClaiming) return;
        setIsClaiming(true);
        try {
            const res = await api.post(
                `/api/gamification/quests/${matchingQuest.id}/complete/`,
            );
            if (res.data.success) {
                SoundManager.play("quest_complete");
                setClaimedQuest(matchingQuest);
                setActiveQuests((prev) =>
                    (Array.isArray(prev) ? prev : []).map((q) =>
                        q.id === matchingQuest.id
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
                Alert("Error", res.data.error || "Failed to claim quest.");
            }
        } catch (err) {
            console.error("CLAIM QUEST ERROR:", err);
            const errorMessage =
                err?.data?.error ||
                err?.data?.detail ||
                err?.message ||
                JSON.stringify(err) ||
                "Unknown error occurred.";
            Alert("Error", errorMessage);
        } finally {
            setIsClaiming(false);
        }
    };

    const handleViewTriviaOnly = async () => {
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
        }).start(() => setTriviaModalVisible(false));
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
                        Your current role does not have access to the AR
                        features. Please sign in as a student or professional to
                        use AR Quest features.
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
                                                    onPress={handleClaimQuest}
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
                    <>
                        {turnDirection === 'around' && (
                            <Animated.View
                                style={[styles.turnIndicatorAround, { borderColor: ribbonPulseAnim.interpolate({ inputRange: [0.2, 1], outputRange: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.85)'] }) }]}
                                pointerEvents="none"
                            >
                                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                                <Text style={styles.turnIndicatorText}>TURN AROUND</Text>
                            </Animated.View>
                        )}
                        {turnDirection === 'left' && (
                            <Animated.View
                                style={[styles.turnIndicatorLeft, { borderColor: ribbonPulseAnim.interpolate({ inputRange: [0.2, 1], outputRange: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.85)'] }) }]}
                                pointerEvents="none"
                            >
                                <Animated.View style={{ opacity: ribbonPulseAnim }}>
                                    <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                                </Animated.View>
                                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                                <Text style={styles.turnIndicatorText}>TURN LEFT</Text>
                            </Animated.View>
                        )}
                        {turnDirection === 'right' && (
                            <Animated.View
                                style={[styles.turnIndicatorRight, { borderColor: ribbonPulseAnim.interpolate({ inputRange: [0.2, 1], outputRange: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.85)'] }) }]}
                                pointerEvents="none"
                            >
                                <Text style={styles.turnIndicatorText}>TURN RIGHT</Text>
                                <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
                                <Animated.View style={{ opacity: ribbonPulseAnim }}>
                                    <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
                                </Animated.View>
                            </Animated.View>
                        )}
                    </>
                )}

                {/* ── Center Arrival Modal (Pops up for ~3.5s upon arrival) ── */}
                {showArrivalModal && !isScanningQr && !capturing && !triviaModalVisible && (
                    <Animated.View
                        style={[
                            styles.arrivalModalContainer,
                            {
                                opacity: arrivalModalAnim,
                                transform: [
                                    {
                                        scale: arrivalModalAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.85, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                        pointerEvents="box-none"
                    >
                        <TouchableOpacity
                            style={styles.arrivalModalCard}
                            activeOpacity={0.9}
                            onPress={handleDismissArrivalModal}
                        >
                            {/* Glowing Pin Badge */}
                            <View style={styles.arrivalModalIconWrap}>
                                <Ionicons name="location" size={26} color="#E8B923" />
                            </View>

                            <Text style={styles.arrivalModalTagline}>CAMPUS LANDMARK REACHED</Text>
                            <Text style={styles.arrivalModalTitle}>YOU HAVE ARRIVED</Text>

                            <View style={styles.arrivalModalBldgWrap}>
                                <Text style={styles.arrivalModalBldgName} numberOfLines={2}>
                                    {effectiveBuildingName || activeBldg?.name || 'Destination'}
                                </Text>
                            </View>

                            {/* Loading subtext with spinner */}
                            <View style={styles.arrivalModalLoaderRow}>
                                <ActivityIndicator size="small" color="#E8B923" style={{ marginRight: 8 }} />
                                <Text style={styles.arrivalModalLoaderText}>
                                    Wait for 3D model to load...
                                </Text>
                            </View>

                            {/* Dismiss hint */}
                            <Text style={styles.arrivalModalDismissHint}>Tap to dismiss</Text>
                        </TouchableOpacity>
                    </Animated.View>
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
            <DeviceNotSupportedModal />



            {/* --- TRIVIA MODAL (GAMIFIED OR INFO) --- */}
            {triviaModalVisible && (
                <View style={[StyleSheet.absoluteFillObject, { zIndex: 100 }]} pointerEvents="box-none">
                        {/* Dark backdrop */}
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />

                        <Animated.View
                            style={[
                                styles.triviaModal,
                                { transform: [{ translateY: slideAnim }] },
                            ]}
                        >
                            <View style={styles.triviaModalHeader}>
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                }}
                            >
                                <Ionicons
                                    name="book"
                                    color={theme.colors.primary}
                                    size={22}
                                    style={{ marginRight: 8 }}
                                />
                                <Text style={styles.triviaTitle}>
                                    {user?.role === "student" && claimedQuest
                                        ? "MISSION COMPLETED!"
                                        : "Building Information"}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={closeTriviaModal}
                                style={styles.closeTriviaBtn}
                            >
                                <X color={theme.colors.primary} size={20} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.triviaContentBorder}>
                            <Text style={styles.triviaBuildingName}>
                                {(navTargetFull || nearbyBuildingFull)?.name || "Unknown Building"}
                            </Text>
                            <Text style={styles.triviaText}>
                                {fetchedTrivia ||
                                    claimedQuest?.hint ||
                                    (navTargetFull || nearbyBuildingFull)?.description ||
                                    "No information available for this location."}
                            </Text>
                        </View>

                        {user?.role === "student" && claimedQuest && (
                            <View style={styles.rewardBadge}>
                                <Ionicons
                                    name="sparkles"
                                    color={theme.colors.primary}
                                    size={20}
                                />
                                <Text style={styles.rewardText}>
                                    +{claimedQuest.reward_points} EXP
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                </View>
            )}

            {/* --- Bottom Camera Controls --- */}
            {!capturing && (
                <View style={styles.bottomControls}>
                    <TouchableOpacity 
                        style={[styles.qrBigButton, isScanningQr && styles.qrBigButtonActive]} 
                        onPress={() => toggleQrScanner(!isScanningQr)}
                    >
                        <QrCode size={20} color={isScanningQr ? "#fff" : theme.colors.primary} />
                        <Text style={[styles.qrBigButtonText, isScanningQr && { color: "#fff" }]}>
                            {isScanningQr ? "SCANNING QR..." : "SCAN QR CODE"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.captureButton}
                        onPress={handleCaptureArSnapshot}
                        disabled={capturing}
                        activeOpacity={0.7}
                    >
                        <View style={styles.captureButtonInner}>
                            {capturing ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <CameraIcon size={28} color={theme.colors.primary} />
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* --- BADGE EARNED TOAST --- */}
            {user?.role === "student" && newlyEarnedBadges.length > 0 && (
                <Animated.View
                    style={[
                        styles.badgeToast,
                        {
                            opacity: badgeAnim,
                            transform: [
                                {
                                    translateY: badgeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-80, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <Text style={styles.badgeToastEmoji}>
                        {newlyEarnedBadges[0].icon}
                    </Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.badgeToastLabel}>
                            BADGE UNLOCKED
                        </Text>
                        <Text style={styles.badgeToastName}>
                            {newlyEarnedBadges[0].name}
                        </Text>
                    </View>
                </Animated.View>
            )}

            {/* --- RANK UP TOAST --- */}
            {user?.role === "student" && rankUpInfo && (
                <Animated.View
                    style={[
                        styles.rankUpToast,
                        {
                            opacity: rankAnim,
                            transform: [
                                {
                                    translateY: rankAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-80, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <Text style={styles.rankUpToastEmoji}>
                        {rankUpInfo.icon}
                    </Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.rankUpToastLabel}>RANK UP!</Text>
                        <Text style={styles.rankUpToastName}>
                            Lv.{rankUpInfo.level} {rankUpInfo.title}
                        </Text>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    captureContainer: {
        flex: 1, // Must be flex 1 to expand the background
        backgroundColor: "#000",
    },
    camera: {
        flex: 1, // Crucial: Gives camera/image height to fill the screen naturally
        width: "100%",
        height: "100%",
    },
    messageText: {
        color: "#fff",
        fontSize: 16,
        textAlign: "center",
        marginTop: 100,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.xl,
    },
    permissionTitle: {
        fontSize: theme.typography.xl,
        fontWeight: "600",
        color: "#fff",
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    permissionText: {
        fontSize: theme.typography.md,
        color: theme.colors.textMuted,
        textAlign: "center",
        marginBottom: theme.spacing.xl,
    },
    permissionButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.radius.md,
    },
    permissionButtonText: {
        color: "#fff",
        fontSize: theme.typography.md,
        fontWeight: "600",
    },
    
    
    
    
    
    
    
    
    
    
    
    qrButton: {
        width: 48,
        height: 48,
        borderRadius: 6,
        backgroundColor: "rgba(255,255,255,0.9)",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    missionsPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(20, 20, 20, 0.75)",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    missionsPillText: {
        fontFamily: fonts.heading.bold,
        color: "#fff",
        fontSize: 11,
        letterSpacing: 1,
    },
    
    
    
    
    
    
    
    
    claimQuestBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        marginTop: 12,
    },
    claimQuestBtnText: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 12,
        letterSpacing: 1,
        marginLeft: 6,
    },
    
    qrBigButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    qrBigButtonActive: {
        backgroundColor: theme.colors.success,
    },
    qrBigButtonText: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.primary,
        fontSize: 14,
        letterSpacing: 0.5,
        marginLeft: 8,
    },
    navigationHud: {
        position: 'absolute',
        top: '40%',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        pointerEvents: 'none',
    },
    navTargetText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: fonts.heading.bold,
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        marginBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        overflow: 'hidden',
    },
    navPathContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 160,
    },
    navDistanceText: {
        color: theme.colors.success,
        fontSize: 18,
        fontFamily: fonts.heading.bold,
        marginTop: 20,
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        overflow: 'hidden',
    },
    bottomControls: {
        position: "absolute",
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 20,
    },
    scanningReticle: {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 240,
        height: 240,
        marginLeft: -120,
        marginTop: -120,
        borderWidth: 2,
        borderColor: "rgba(16, 185, 129, 0.6)",
        borderRadius: 6,
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        zIndex: 5,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    scannerLine: {
        position: "absolute",
        width: "100%",
        height: 2,
        backgroundColor: theme.colors.success,
        shadowColor: theme.colors.success,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
    },
    scanningText: {
        color: theme.colors.success,
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        letterSpacing: 2,
        marginTop: 80,
    },
    
    topLeftControls: {
        position: "absolute",
        top: 50,
        left: 20,
        zIndex: 20,
        flexDirection: "column",
        gap: 12,
        alignItems: "flex-start",
    },
    topOvalContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 15,
        alignItems: "center",
        paddingTop: 50,
        paddingBottom: 30,
        overflow: "hidden",
    },
    topOvalShape: {
        position: "absolute",
        top: -400,
        left: "-50%",
        width: "200%",
        height: 600,
        borderRadius: 300,
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    topOvalContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        width: "90%",
        paddingRight: 20,
        paddingLeft: 70, // Leaves space for the left controls
    },
    targetCardLeft: {
        width: 80,
        height: 80,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
        overflow: "hidden",
        borderRadius: 6,
        backgroundColor: theme.colors.surface,
    },
    modelMiniature: {
        width: "100%",
        height: "100%",
    },
    targetCardRight: {
        flex: 1,
    },
    targetLabel: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.textSecondary,
        fontSize: 10,
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    buildingLabel: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.primary,
        fontSize: 16,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    buildingStatus: {
        fontFamily: fonts.body.bold,
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
        letterSpacing: 0.5,
    },
    exitButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.surface,
        justifyContent: "center",
        alignItems: "center",
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: theme.colors.arHighlight,
    },
    captureButtonInner: {
        justifyContent: "center",
        alignItems: "center",
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
        fontWeight: "bold",
        letterSpacing: 1,
        marginBottom: 4,
    },
    intelText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 18,
        fontFamily: "monospace",
    },
    
    
    
    reticleContainer: {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 200,
        height: 200,
        marginLeft: -100,
        marginTop: -100,
        zIndex: 5,
    },
    reticleTopLeft: {
        position: "absolute",
        top: 0,
        left: 0,
        width: 30,
        height: 30,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderColor: "#B21830",
    },
    reticleTopRight: {
        position: "absolute",
        top: 0,
        right: 0,
        width: 30,
        height: 30,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderColor: "#B21830",
    },
    reticleBottomLeft: {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: 30,
        height: 30,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderColor: "#B21830",
    },
    reticleBottomRight: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 30,
        height: 30,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderColor: "#B21830",
    },
    reticleCenterPoint: {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 6,
        height: 6,
        marginLeft: -3,
        marginTop: -3,
        backgroundColor: "#B21830",
        borderRadius: 3,
    },
    triviaModal: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 40,
        zIndex: 100,
        borderTopWidth: 1,
        borderColor: theme.colors.border,
    },
    triviaModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    triviaTitle: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.primary,
        fontSize: 18,
        letterSpacing: 2,
    },
    closeTriviaBtn: {
        backgroundColor: theme.colors.surfaceSoft,
        padding: 6,
        borderRadius: 20,
    },
    triviaContentBorder: {
        borderLeftWidth: 2,
        borderLeftColor: theme.colors.primary,
        paddingLeft: 16,
        marginBottom: 20,
    },
    triviaBuildingName: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.primary,
        fontSize: 14,
        marginBottom: 8,
        letterSpacing: 2,
    },
    triviaText: {
        fontFamily: fonts.body.regular,
        color: theme.colors.textSecondary,
        fontSize: 14,
        lineHeight: 22,
    },
    rewardBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(178, 24, 48, 0.1)",
        alignSelf: "center",
        width: "100%",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: "rgba(178, 24, 48, 0.3)",
    },
    rewardText: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.primary,
        fontSize: 16,
        marginLeft: 8,
        letterSpacing: 1,
    },
    badgeToast: {
        position: "absolute",
        top: 110,
        left: 20,
        right: 20,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(20, 20, 20, 0.95)",
        borderRadius: 6,
        padding: 14,
        borderWidth: 1,
        borderColor: "#FFD700",
        gap: 12,
        zIndex: 200,
        shadowColor: "#FFD700",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
    },
    badgeToastEmoji: {
        fontSize: 32,
    },
    badgeToastLabel: {
        color: "#FFD700",
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 2,
        marginBottom: 2,
    },
    badgeToastName: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },
    rankUpToast: {
        position: "absolute",
        top: 60,
        left: 16,
        right: 16,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(30, 20, 60, 0.96)",
        borderRadius: 6,
        padding: 14,
        borderWidth: 1,
        borderColor: "#B25DFF",
        gap: 12,
        zIndex: 1000,
        shadowColor: "#B25DFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 20,
    },
    rankUpToastEmoji: {
        fontSize: 36,
    },
    rankUpToastLabel: {
        fontFamily: fonts.heading.bold,
        color: "#B25DFF",
        fontSize: 12,
        fontWeight: "900",
        letterSpacing: 3,
        marginBottom: 2,
    },
    rankUpToastName: {
        fontFamily: fonts.body.bold,
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        letterSpacing: 1,
    },
    turnIndicatorLeft: {
        position: 'absolute',
        left: 12,
        top: '46%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'rgba(178, 24, 48, 0.92)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        shadowColor: '#B21830',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 10,
        zIndex: 40,
    },
    turnIndicatorRight: {
        position: 'absolute',
        right: 12,
        top: '46%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'rgba(178, 24, 48, 0.92)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        shadowColor: '#B21830',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 10,
        zIndex: 40,
    },
    turnIndicatorAround: {
        position: 'absolute',
        top: '46%',
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(178, 24, 48, 0.94)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#B21830',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 14,
        elevation: 10,
        zIndex: 40,
    },
    turnIndicatorText: {
        fontFamily: fonts.heading.bold,
        color: '#FFFFFF',
        fontSize: 13,
        letterSpacing: 1.5,
    },
    arrivalModalContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 60,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    arrivalModalCard: {
        width: '84%',
        maxWidth: 330,
        backgroundColor: 'rgba(7, 42, 48, 0.96)',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#E8B923',
        paddingVertical: 22,
        paddingHorizontal: 20,
        alignItems: 'center',
        shadowColor: '#E8B923',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 18,
        elevation: 12,
    },
    arrivalModalIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(232, 185, 35, 0.15)',
        borderWidth: 1.5,
        borderColor: '#E8B923',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    arrivalModalTagline: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: '#00E5FF',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    arrivalModalTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 20,
        color: '#FFFFFF',
        letterSpacing: 1.5,
        textAlign: 'center',
        marginBottom: 8,
    },
    arrivalModalBldgWrap: {
        backgroundColor: 'rgba(18, 59, 68, 0.8)',
        borderWidth: 1,
        borderColor: '#2C5A63',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginBottom: 14,
        width: '100%',
        alignItems: 'center',
    },
    arrivalModalBldgName: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: '#E8B923',
        textAlign: 'center',
    },
    arrivalModalLoaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    arrivalModalLoaderText: {
        fontSize: 12,
        color: '#C9D6DA',
        fontWeight: '600',
    },
    arrivalModalDismissHint: {
        fontSize: 10,
        color: '#8AA3AA',
        letterSpacing: 0.5,
    },


    gpsBanner: {
        position: 'absolute',
        top: 90,
        left: 16,
        right: 16,
        zIndex: 50,
        alignItems: 'center',
    },
    modelLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modelLoadingTrack: {
        height: 4,
        width: '100%',
        backgroundColor: 'rgba(232, 185, 35, 0.25)',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 4,
    },
    modelLoadingBar: {
        height: '100%',
        width: 80,
        backgroundColor: '#E8B923',
        borderRadius: 2,
    },
});