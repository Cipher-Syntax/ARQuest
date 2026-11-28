import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../services";
import { createBridgeMessage } from "../utils/WebViewBridge";
import {
    filterBuildingsByQuery,
    calculateRouteDistance,
} from "../utils/buildings";
import SoundManager from "../utils/SoundManager";

/**
 * Owns the Buildings screen's routing/navigation state:
 * - origin/destination search queries and focus
 * - route target/origin selection
 * - route calculation (server A* + straight-line fallback)
 * - WebView `draw_route` / `clear_route` bridge messages
 * - turn HUD state (from WebView turn_instruction/turn_clear)
 * - active route key deduping
 *
 * Presentation stays in components/buildings/BuildingsMapView.js (search terminal)
 */
export function useBuildingsRouting({
    allBuildings,
    location,
    webViewRef,
    webViewReady,
    authToken,
    role,
    onRouteChange,
}) {
    const [routeTarget, setRouteTarget] = useState(null);
    const [routeOrigin, setRouteOrigin] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [originQuery, setOriginQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isOriginFocused, setIsOriginFocused] = useState(false);
    const [isRouteActive, setIsRouteActive] = useState(false);
    const [calculatedRoute, setCalculatedRoute] = useState(null);
    const [isRouteLoading, setIsRouteLoading] = useState(false);
    const [turnHUD, setTurnHUD] = useState({
        visible: false,
        turnType: "STRAIGHT",
        distance: 10,
        instruction: "",
    });

    const activeRouteKeyRef = useRef("");

    // Derived: filtered building lists for search autocomplete
    const filteredTargetBuildings = filterBuildingsByQuery(allBuildings, searchQuery);
    const filteredOriginBuildings = filterBuildingsByQuery(allBuildings, originQuery);

    // Derived: route distance (server or Haversine fallback)
    const routeDistance = calculateRouteDistance(
        calculatedRoute,
        routeTarget,
        routeOrigin,
        location,
    );

    // Fetch route from backend A* engine
    const fetchRouteData = useCallback(
        async (target, origin = null) => {
            if (!target) return null;
            let fromLat, fromLng;
            if (origin) {
                fromLat = parseFloat(origin.latitude);
                fromLng = parseFloat(origin.longitude);
            } else if (location && location.latitude && location.longitude) {
                fromLat = parseFloat(location.latitude);
                fromLng = parseFloat(location.longitude);
            } else {
                // Default WMSU campus center
                fromLat = 6.9125;
                fromLng = 122.0594;
            }

            try {
                const res = await api.get("/api/navigation/route/", {
                    params: {
                        from_lat: fromLat,
                        from_lng: fromLng,
                        to_building_id: target.id,
                    },
                });

                if (res.data?.success && res.data?.data?.features?.[0]) {
                    const feat = res.data.data.features[0];
                    const coords = feat.geometry?.coordinates;
                    if (Array.isArray(coords) && coords.length >= 2) {
                        return {
                            coordinates: coords,
                            distanceMeters: feat.properties?.distance_meters,
                            estimatedMinutes: feat.properties?.estimated_minutes,
                            isFallback: Boolean(feat.properties?.fallback),
                        };
                    }
                }
            } catch (err) {
                console.log(
                    "[useBuildingsRouting] Route calculation notice:",
                    err?.response?.data || err?.message,
                );
            }

            // Fallback straight line if server route is unavailable
            const targetLat = parseFloat(target.latitude);
            const targetLng = parseFloat(target.longitude);
            if (
                !isNaN(fromLat) &&
                !isNaN(fromLng) &&
                !isNaN(targetLat) &&
                !isNaN(targetLng)
            ) {
                return {
                    coordinates: [
                        [fromLng, fromLat],
                        [targetLng, targetLat],
                    ],
                    distanceMeters: null,
                    estimatedMinutes: null,
                    isFallback: true,
                };
            }
            return null;
        },
        [location],
    );

    // Send draw_route to WebView
    const triggerDrawRoute = useCallback(
        async (target, origin = null) => {
            if (!target || !webViewRef.current) return;
            setIsRouteLoading(true);
            try {
                const route = await fetchRouteData(target, origin);
                if (route && webViewRef.current) {
                    setCalculatedRoute(route);
                    const apiBase = process.env.EXPO_PUBLIC_API_URL || "";
                    const message = createBridgeMessage("draw_route", {
                        buildingId: target.id,
                        sourceBuildingId: origin ? origin.id : null,
                        coordinates: route.coordinates,
                        distanceMeters: route.distanceMeters,
                        estimatedMinutes: route.estimatedMinutes,
                        isFallback: route.isFallback,
                        apiBase: apiBase,
                        authToken: authToken,
                    });
                    webViewRef.current.postMessage(message);
                }
            } finally {
                setIsRouteLoading(false);
            }
        },
        [fetchRouteData, webViewRef, authToken],
    );

    // Handlers
    const handleSelectRouteTarget = useCallback(
        (building) => {
            if (role === "visitor") {
                // Visitors just open detail modal; handled by caller
                return;
            }
            setRouteTarget(building);
            setSearchQuery(building.name);
            setIsSearchFocused(false);
            setIsRouteActive(false);
            setCalculatedRoute(null);
            activeRouteKeyRef.current = "";

            if (webViewRef.current) {
                const message = createBridgeMessage("clear_route");
                webViewRef.current.postMessage(message);
            }
            onRouteChange?.({ routeTarget: building, isRouteActive: false });
        },
        [role, webViewRef, onRouteChange],
    );

    const handleSelectRouteOrigin = useCallback(
        (building) => {
            setRouteOrigin(building);
            setOriginQuery(building.name);
            setIsOriginFocused(false);

            if (isRouteActive && routeTarget) {
                activeRouteKeyRef.current = `${routeTarget.id}_${building.id}`;
                triggerDrawRoute(routeTarget, building);
            }
        },
        [isRouteActive, routeTarget, triggerDrawRoute],
    );

    const handleClearOrigin = useCallback(() => {
        setRouteOrigin(null);
        setOriginQuery("");
        if (isRouteActive && routeTarget) {
            activeRouteKeyRef.current = `${routeTarget.id}_gps`;
            triggerDrawRoute(routeTarget, null);
        }
    }, [isRouteActive, routeTarget, triggerDrawRoute]);

    const handleClearRoute = useCallback(() => {
        setRouteTarget(null);
        setSearchQuery("");
        setIsRouteActive(false);
        setCalculatedRoute(null);
        activeRouteKeyRef.current = "";
        setTurnHUD({ visible: false, turnType: "STRAIGHT", distance: 0, instruction: "" });

        if (webViewRef.current) {
            const message = createBridgeMessage("clear_route");
            webViewRef.current.postMessage(message);
        }
        onRouteChange?.({ routeTarget: null, isRouteActive: false });
    }, [webViewRef, onRouteChange]);

    const handleStartRoute = useCallback(() => {
        if (role === "visitor") {
            // Caller shows alert
            return false;
        }
        if (!routeTarget) return false;
        setIsRouteActive(true);
        activeRouteKeyRef.current = `${routeTarget.id}_${routeOrigin ? routeOrigin.id : "gps"}`;
        triggerDrawRoute(routeTarget, routeOrigin);
        onRouteChange?.({ routeTarget, isRouteActive: true });
        return true;
    }, [role, routeTarget, routeOrigin, triggerDrawRoute, onRouteChange]);

    const handleStopRoute = useCallback(() => {
        setIsRouteActive(false);
        setCalculatedRoute(null);
        activeRouteKeyRef.current = "";
        setTurnHUD({ visible: false, turnType: "STRAIGHT", distance: 0, instruction: "" });
        if (webViewRef.current) {
            const message = createBridgeMessage("clear_route");
            webViewRef.current.postMessage(message);
        }
        onRouteChange?.({ routeTarget, isRouteActive: false });
    }, [webViewRef, routeTarget, onRouteChange]);

    // Auto-draw when route becomes active and params change
    useEffect(() => {
        if (isRouteActive && routeTarget && webViewReady) {
            const routeKey = `${routeTarget.id}_${routeOrigin ? routeOrigin.id : "gps"}`;
            if (activeRouteKeyRef.current !== routeKey) {
                activeRouteKeyRef.current = routeKey;
                triggerDrawRoute(routeTarget, routeOrigin);
            }
        } else if (!isRouteActive) {
            activeRouteKeyRef.current = "";
        }
    }, [isRouteActive, routeTarget, routeOrigin, webViewReady, triggerDrawRoute]);

    // Turn HUD handlers (called from map hook on WebView messages)
    const handleTurnInstruction = useCallback((payload) => {
        setTurnHUD({
            visible: true,
            turnType: payload.turnType,
            distance: payload.distance,
            instruction: payload.instruction,
        });

        // Play turn sound based on turn type
        const turn = payload.turn || payload.turnType;
        if (turn === "LEFT") {
            SoundManager.play("nav_turn_left");
        } else if (turn === "RIGHT") {
            SoundManager.play("nav_turn_right");
        } else if (turn === "ARRIVED") {
            SoundManager.play("nav_arrived");
        }
    }, []);

    const handleTurnClear = useCallback(() => {
        setTurnHUD({
            visible: false,
            turnType: "STRAIGHT",
            distance: 0,
            instruction: "",
        });
    }, []);

    return {
        // State
        routeTarget,
        routeOrigin,
        searchQuery,
        setSearchQuery,
        originQuery,
        setOriginQuery,
        isSearchFocused,
        setIsSearchFocused,
        isOriginFocused,
        setIsOriginFocused,
        isRouteActive,
        setIsRouteActive,
        calculatedRoute,
        isRouteLoading,
        turnHUD,
        // Derived
        filteredTargetBuildings,
        filteredOriginBuildings,
        routeDistance,
        // Handlers
        handleSelectRouteTarget,
        handleSelectRouteOrigin,
        handleClearOrigin,
        handleClearRoute,
        handleStartRoute,
        handleStopRoute,
        handleTurnInstruction,
        handleTurnClear,
    };
}

export default useBuildingsRouting;