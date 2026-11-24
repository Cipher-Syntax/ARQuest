// src/hooks/useARNavigation.js
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { api } from "../services";
import { getBearing, getHaversineDistance, getUpcomingWaypoint, snapToWalkway } from "../utils/geo-ar";

/**
 * Custom hook for AR navigation: route fetching, waypoint tracking,
 * turn direction calculation, and pathway snapping.
 *
 * Handles:
 * - Fetching campus walking route from backend (A* pathfinding)
 * - Continuous waypoint updates as user moves along route
 * - Turn direction calculation (left/right/around/ahead) for HUD
 * - GPS pathway snapping (map-matching within 25m tolerance)
 */
export function useARNavigation({
    isCameraActive,
    navTargetFull,
    fixedRouteOrigin,
    location,
    heading,
    isArrived,
}) {
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [nextWaypoint, setNextWaypoint] = useState(null);
    const [turnDirection, setTurnDirection] = useState(null);
    const [distanceToTarget, setDistanceToTarget] = useState(null);
    const [isRouteLoading, setIsRouteLoading] = useState(false);

    const fetchRouteRef = useRef(null);

    // Fetch initial route and set up periodic refresh
    useEffect(() => {
        if (!isCameraActive || !navTargetFull?.id) {
            setRouteCoordinates([]);
            setNextWaypoint(null);
            setTurnDirection(null);
            setDistanceToTarget(null);
            return;
        }

        let isMounted = true;

        const fetchRoute = async () => {
            if (!isMounted || !isCameraActive || !navTargetFull?.id) return;

            const startLng = fixedRouteOrigin?.longitude ?? location?.longitude ?? location?.coords?.longitude;
            const startLat = fixedRouteOrigin?.latitude ?? location?.latitude ?? location?.coords?.latitude;

            if (!startLat || !startLng) {
                if (isMounted) {
                    setRouteCoordinates([]);
                    const fallback = {
                        longitude: navTargetFull.longitude,
                        latitude: navTargetFull.latitude,
                    };
                    setNextWaypoint(fallback);
                }
                return;
            }

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
        };

        fetchRoute();
        setIsRouteLoading(false);

        // Refresh global route every 10 seconds only while camera is active in foreground
        const interval = setInterval(fetchRoute, 10000);
        fetchRouteRef.current = fetchRoute;

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [
        isCameraActive,
        navTargetFull?.id,
        navTargetFull?.latitude,
        navTargetFull?.longitude,
        fixedRouteOrigin?.latitude,
        fixedRouteOrigin?.longitude,
        location?.latitude,
        location?.longitude,
        location?.coords?.latitude,
        location?.coords?.longitude,
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

    // Pathway Snapping (Map-Matching): Snaps user position to the nearest campus walkway segment
    // within 25m, smoothing out GPS multipath reflections and satellite jumps from building walls.
    const effectiveUserCoords = useMemo(() => {
        const curLat = location?.latitude ?? location?.coords?.latitude;
        const curLng = location?.longitude ?? location?.coords?.longitude;
        if (!curLat || !curLng) return null;
        if (routeCoordinates && routeCoordinates.length >= 2) {
            return snapToWalkway(routeCoordinates, curLat, curLng, 25);
        }
        return { latitude: curLat, longitude: curLng, isSnapped: false };
    }, [location?.latitude, location?.longitude, location?.coords?.latitude, location?.coords?.longitude, routeCoordinates]);

    const navUserLat = effectiveUserCoords?.latitude ?? location?.latitude ?? location?.coords?.latitude;
    const navUserLng = effectiveUserCoords?.longitude ?? location?.longitude ?? location?.coords?.longitude;

    // Calculate distance to target
    useEffect(() => {
        if (navTargetFull && navUserLat && navUserLng) {
            const dist = getHaversineDistance(
                navUserLat,
                navUserLng,
                navTargetFull.latitude,
                navTargetFull.longitude
            );
            setDistanceToTarget(dist);
        } else {
            setDistanceToTarget(null);
        }
    }, [navTargetFull, navUserLat, navUserLng]);

    // Turn direction calculation for HUD
    useEffect(() => {
        if (navTargetFull && navUserLat && navUserLng && heading !== undefined && heading !== null && !isArrived) {
            const targetLat = nextWaypoint?.latitude ?? navTargetFull.latitude;
            const targetLng = nextWaypoint?.longitude ?? navTargetFull.longitude;

            if (targetLat !== null && targetLat !== undefined && targetLng !== null && targetLng !== undefined) {
                const bearing = getBearing(navUserLat, navUserLng, targetLat, targetLng);
                let diff = (bearing - heading + 360) % 360;
                if (diff > 180) diff -= 360;

                if (Math.abs(diff) > 135) {
                    setTurnDirection("around");
                } else if (diff < -45) {
                    setTurnDirection("left");
                } else if (diff > 45) {
                    setTurnDirection("right");
                } else {
                    setTurnDirection("ahead");
                }
            }
        } else {
            setTurnDirection(null);
        }
    }, [navTargetFull, navUserLat, navUserLng, heading, nextWaypoint, isArrived]);

    const refreshRoute = useCallback(() => {
        if (fetchRouteRef.current) {
            fetchRouteRef.current();
        }
    }, []);

    return {
        routeCoordinates,
        nextWaypoint,
        turnDirection,
        distanceToTarget,
        navUserLat,
        navUserLng,
        effectiveUserCoords,
        isRouteLoading,
        refreshRoute,
        setRouteCoordinates,
        setNextWaypoint,
    };
}