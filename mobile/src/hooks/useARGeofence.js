// src/hooks/useARGeofence.js
import { useState, useEffect, useRef, useCallback } from "react";
import { geofencingService } from "../services";

/**
 * Custom hook for AR geofence management:
 * - Validates user location against campus building geofences
 * - Tracks nearby building (inside/outside/nearby)
 * - Handles arrival detection with hysteresis
 * - Manages session-level arrival announcement deduplication
 */
export function useARGeofence({
    location,
    enableGps,
    isTargetMode,
    activeTargetId,
    navTargetFull,
    isFocused,
    isArrivedLatched,
    setIsArrivedLatched,
    distanceToTarget,
}) {
    const [nearbyBuildingState, setNearbyBuildingState] = useState(null);
    const [geofenceStatusState, setGeofenceStatusState] = useState(null);
    const lastGeofenceCheckTimeRef = useRef(0);
    const consecutiveOutsideCountRef = useRef(0);

    // Session-level arrival announcement tracking (persists across tab switches)
    const announcedArrivalBldgIdsRef = useRef(new Set());

    // Check geofence status when location updates
    useEffect(() => {
        if (!location) return;

        const checkGeofenceStatus = async () => {
            const now = Date.now();
            // Throttle geofence backend checks to at most once every 2500ms
            if (now - lastGeofenceCheckTimeRef.current < 2500) return;
            lastGeofenceCheckTimeRef.current = now;

            try {
                const status = await geofencingService.validateLocation(
                    location.latitude,
                    location.longitude,
                    location.accuracy,
                );
                setGeofenceStatusState(status);
                if (status?.building) {
                    consecutiveOutsideCountRef.current = 0;
                    setNearbyBuildingState(status.building);
                } else {
                    consecutiveOutsideCountRef.current += 1;
                    // Require 2 consecutive outside checks before clearing nearbyBuilding
                    if (consecutiveOutsideCountRef.current >= 2) {
                        setNearbyBuildingState(null);
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

        checkGeofenceStatus();
    }, [location, enableGps]);

    // Arrival latch logic - use internal nearbyBuildingState instead of props
    const isInsideDestination = Boolean(
        isTargetMode &&
        geofenceStatusState?.status === 'inside' &&
        (
            String(geofenceStatusState?.building?.id) === String(activeTargetId) ||
            String(nearbyBuildingState?.id) === String(activeTargetId)
        )
    );

    const rawArrived = Boolean(isTargetMode
        ? (
            isInsideDestination ||
            (navTargetFull && distanceToTarget !== null && distanceToTarget <= 25)
        )
        : (geofenceStatusState?.status === 'inside'));
    const isArrived = Boolean(isArrivedLatched || rawArrived);

    useEffect(() => {
        if (rawArrived) {
            setIsArrivedLatched(true);
        } else if (isTargetMode) {
            // In target navigation mode: unlatch when far from destination and not inside destination
            if (distanceToTarget !== null && distanceToTarget > 45 && !isInsideDestination) {
                setIsArrivedLatched(false);
            }
        } else if (geofenceStatusState?.status !== 'inside') {
            setIsArrivedLatched(false);
        }
    }, [rawArrived, distanceToTarget, isInsideDestination, isTargetMode, geofenceStatusState?.status, setIsArrivedLatched]);

    // Arrival modal trigger with session-level deduplication
    const triggerArrivalModal = useCallback(({
        currentBldgId,
        isArrived,
        geofenceStatus: currentGeofenceStatus,
        distanceToTarget: currentDistance,
        unlockedBuildings,
        onPlayUnlockSound,
        onSetDiscoveryExp,
        checkToken,
    }) => {
        if (!isFocused) return;

        const isProvablyAway =
            currentGeofenceStatus?.status === "outside" ||
            (currentDistance !== null && currentDistance > 45);

        if (isProvablyAway) {
            announcedArrivalBldgIdsRef.current.clear();
        }

        if (isArrived && currentBldgId) {
            const arrivalKey = String(currentBldgId);
            if (announcedArrivalBldgIdsRef.current.has(arrivalKey)) {
                return { shouldShow: false };
            }
            announcedArrivalBldgIdsRef.current.add(arrivalKey);

            // Only sound the unlock chime for a building the user does not own yet
            const isAlreadyUnlocked = unlockedBuildings.some(
                (b) => String(b.id) === arrivalKey
            );

            let discoveryExp = null;
            if (!isAlreadyUnlocked) {
                onPlayUnlockSound();
            }

            return {
                shouldShow: true,
                isAlreadyUnlocked,
                discoveryExp,
            };
        }

        return { shouldShow: false };
    }, [isFocused]);

    return {
        nearbyBuilding: nearbyBuildingState,
        geofenceStatus: geofenceStatusState,
        rawArrived,
        isInsideDestination,
        isArrived,
        triggerArrivalModal,
        announcedArrivalBldgIds: announcedArrivalBldgIdsRef.current,
        clearAnnouncedArrivals: () => announcedArrivalBldgIdsRef.current.clear(),
    };
}