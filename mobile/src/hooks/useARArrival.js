// src/hooks/useARArrival.js
import { useState, useEffect, useRef, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Animated, Easing } from "react-native";
import SoundManager from "../utils/SoundManager";

/**
 * Custom hook for AR arrival experience:
 * - Manages center arrival modal with bounce animation
 * - Handles session-level arrival announcement deduplication
 * - Plays unlock sound for first-time building visits
 * - Manages discovery EXP display
 */
export function useARArrival({
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
    enableGps,
    user,
    isModalBlocked = false,
}) {
    const [showArrivalModal, setShowArrivalModal] = useState(false);
    const [discoveryExp, setDiscoveryExp] = useState(null);
    const arrivalModalAnim = useRef(new Animated.Value(0)).current;
    const arrivalTimerRef = useRef(null);

    // Session-level arrival announcement tracking (persists across tab switches)
    const announcedArrivalBldgIdsRef = useRef(new Set());

    // Geofence unlock: a student physically entering a building unlocks it here,
    // mirroring the Explore tab so AR-only sessions still credit the visit.
    // Fires at most once per building entry; resets when the status leaves 'inside'.
    const lastGeofenceUnlockBldgIdRef = useRef(null);

    useEffect(() => {
        const insideBuilding =
            geofenceStatus?.status === "inside" ? geofenceStatus.building : null;

        // GPS geofencing is switched off by the administrator.
        if (!enableGps) return;

        if (!insideBuilding) {
            lastGeofenceUnlockBldgIdRef.current = null;
            return;
        }

        // Only students earn unlocks; visitors and professionals have role access.
        if (user?.role !== "student") return;
        if (insideBuilding.is_active === false) return;
        if (insideBuilding.status === "MAINTENANCE") return;
        if (
            unlockedBuildings.some(
                (b) => String(b.id) === String(insideBuilding.id)
            )
        ) {
            return;
        }
        if (
            String(lastGeofenceUnlockBldgIdRef.current) ===
            String(insideBuilding.id)
        ) {
            return;
        }

        lastGeofenceUnlockBldgIdRef.current = insideBuilding.id;

        const runUnlock = async () => {
            try {
                // No sound here: the arrival effect already announces arrival.
                const result = await attemptUnlock(
                    location.latitude,
                    location.longitude,
                    location.accuracy || 10
                );
                // First-time discovery bonus: surface it on the arrival card
                // and refresh the cached EXP shown on Home/Profile.
                if (result?.newly_unlocked === true && result?.exp_awarded > 0) {
                    setDiscoveryExp({
                        buildingId: result.building,
                        amount: result.exp_awarded,
                    });
                    checkToken();
                }
            } catch (err) {
                // Non-fatal: next entry (or Explore) will retry.
                console.warn("AR geofence unlock failed:", err?.message || err);
            }
        };

        runUnlock();
    }, [
        geofenceStatus,
        user?.role,
        location,
        unlockedBuildings,
        attemptUnlock,
        enableGps,
        checkToken,
    ]);

    // Center Arrival Modal: Triggers for ~3.5 seconds ONCE per building visit.
    useEffect(() => {
        const currentBldgId = isTargetMode
            ? navTargetFull?.id
            : (nearbyBuildingFull?.id || nearbyBuilding?.id);

        const isInsideCurrentBuilding =
            Boolean(currentBldgId) &&
            geofenceStatus?.status === "inside" &&
            String(geofenceStatus.building?.id) === String(currentBldgId);
        const isProvablyAway =
            !isInsideCurrentBuilding &&
            (geofenceStatus?.status === "outside" ||
                (distanceToTarget !== null && distanceToTarget > 45));

        // Do not reset the visit guard from a stale/large route distance while
        // geofence validation still confirms arrival. Clear only after arrival
        // has ended and the user is demonstrably outside the visit area.
        if (isProvablyAway && !isArrived) {
            announcedArrivalBldgIdsRef.current.clear();
        }

        if (!isFocused) return;

        // Keep the arrival cue queued while the unsupported-device overlay is
        // visible. If it had started underneath that overlay, reset its
        // announcement key so it can be presented after the user dismisses it.
        if (isModalBlocked) {
            if (currentBldgId) {
                announcedArrivalBldgIdsRef.current.delete(String(currentBldgId));
            }
            if (arrivalTimerRef.current) {
                clearTimeout(arrivalTimerRef.current);
                arrivalTimerRef.current = null;
            }
            return;
        }

        if (isArrived && currentBldgId) {
            const arrivalKey = String(currentBldgId);
            if (announcedArrivalBldgIdsRef.current.has(arrivalKey)) {
                return;
            }
            announcedArrivalBldgIdsRef.current.add(arrivalKey);

            // Only sound the unlock chime for a building the user does not own
            // yet. Arriving at an already-unlocked building still shows the
            // "You have arrived" card, but silently, so the unlock stinger does
            // not replay on every visit.
            const isAlreadyUnlocked = unlockedBuildings.some(
                (b) => String(b.id) === arrivalKey
            );
            if (!isAlreadyUnlocked) {
                try {
                    SoundManager.play("building_unlock");
                } catch {
                    // Non-fatal if audio fails
                }
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
                arrivalTimerRef.current = null;
                setShowArrivalModal(false);
                arrivalModalAnim.setValue(0);
            }, 3500);
        } else if (!isArrived) {
            if (arrivalTimerRef.current) {
                clearTimeout(arrivalTimerRef.current);
                arrivalTimerRef.current = null;
            }
            setShowArrivalModal(false);
            arrivalModalAnim.setValue(0);
        }

    }, [
        isArrived,
        isFocused,
        isModalBlocked,
        navTargetFull?.id,
        nearbyBuildingFull?.id,
        nearbyBuilding?.id,
        isTargetMode,
        geofenceStatus?.status,
        distanceToTarget,
        unlockedBuildings,
    ]);

    // Cleanup arrival modal immediately when switching away from the AR tab
    useFocusEffect(
        useCallback(() => {
            return () => {
                if (arrivalTimerRef.current) {
                    clearTimeout(arrivalTimerRef.current);
                    arrivalTimerRef.current = null;
                }
                setShowArrivalModal(false);
                arrivalModalAnim.setValue(0);
            };
        }, [])
    );

    const handleDismissArrivalModal = useCallback(() => {
        if (arrivalTimerRef.current) {
            clearTimeout(arrivalTimerRef.current);
            arrivalTimerRef.current = null;
        }
        setShowArrivalModal(false);
        arrivalModalAnim.setValue(0);
    }, []);

    const discoveryExpForArrival =
        discoveryExp &&
        (isTargetMode ? navTargetFull?.id : (nearbyBuildingFull?.id || nearbyBuilding?.id)) != null &&
        String(discoveryExp.buildingId) === String(isTargetMode ? navTargetFull?.id : (nearbyBuildingFull?.id || nearbyBuilding?.id))
            ? discoveryExp.amount
            : 0;

    return {
        showArrivalModal,
        arrivalModalAnim,
        discoveryExpForArrival,
        handleDismissArrivalModal,
        announcedArrivalBldgIds: announcedArrivalBldgIdsRef.current,
    };
}