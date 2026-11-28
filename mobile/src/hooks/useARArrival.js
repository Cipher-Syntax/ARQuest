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

// Module-level so the announcement memory survives tab switches, screen
// remounts, and exit/re-entry. Entries are dropped only when the student is
// provably away from the building (see the arrival effect below).
const announcedArrivalBldgIds = new Set();

// A failed unlock is retried at most this often while the student stays inside
// the building, so a transient network error cannot strand the HUD on
// "UNLOCKING…" and cannot hammer the endpoint on every GPS ping.
const UNLOCK_RETRY_COOLDOWN_MS = 10000;

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
    const [unlockStatus, setUnlockStatus] = useState("idle");
    const arrivalModalAnim = useRef(new Animated.Value(0)).current;
    const arrivalTimerRef = useRef(null);
    const lastUnlockAttemptAtRef = useRef(0);

    // Geofence unlock: a student physically entering a building unlocks it here,
    // mirroring the Explore tab so AR-only sessions still credit the visit.
    // Fires at most once per building entry; resets when the status leaves 'inside'.
    const lastGeofenceUnlockBldgIdRef = useRef(null);

    // Derived, not stored: the reset-to-idle cases are computed during render so
    // the effect below never needs a synchronous setState for them.
    const insideGeofenceBuilding =
        geofenceStatus?.status === "inside" ? geofenceStatus.building : null;
    const isInsideGeofenceUnlocked = Boolean(
        insideGeofenceBuilding &&
        unlockedBuildings.some(
            (b) => String(b.id) === String(insideGeofenceBuilding.id)
        )
    );
    const effectiveUnlockStatus =
        !insideGeofenceBuilding || isInsideGeofenceUnlocked ? "idle" : unlockStatus;

    useEffect(() => {
        const insideBuilding = insideGeofenceBuilding;

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

        const alreadyUnlocked = unlockedBuildings.some(
            (b) => String(b.id) === String(insideBuilding.id)
        );
        if (alreadyUnlocked) return;

        const sameBuilding =
            String(lastGeofenceUnlockBldgIdRef.current) ===
            String(insideBuilding.id);
        if (sameBuilding) {
            // Only a failed attempt may run again, and only after the cooldown.
            if (unlockStatus !== "failed") return;
            if (
                Date.now() - lastUnlockAttemptAtRef.current <
                UNLOCK_RETRY_COOLDOWN_MS
            ) {
                return;
            }
        }

        lastGeofenceUnlockBldgIdRef.current = insideBuilding.id;
        lastUnlockAttemptAtRef.current = Date.now();

        const runUnlock = async () => {
            setUnlockStatus("unlocking");
            try {
                // No sound here: the arrival effect already announces arrival.
                const result = await attemptUnlock(
                    location.latitude,
                    location.longitude,
                    location.accuracy || 10
                );
                setUnlockStatus("idle");
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
                setUnlockStatus("failed");
                // Non-fatal: retried after the cooldown while still inside.
                console.warn("AR geofence unlock failed:", err?.message || err);
            }
        };

        runUnlock();
    }, [
        geofenceStatus,
        insideGeofenceBuilding,
        user?.role,
        location,
        unlockedBuildings,
        attemptUnlock,
        enableGps,
        checkToken,
        unlockStatus,
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
            announcedArrivalBldgIds.clear();
        }

        if (!isFocused) return;

        // Keep the arrival cue queued while the unsupported-device overlay is
        // visible. If it had started underneath that overlay, reset its
        // announcement key so it can be presented after the user dismisses it.
        if (isModalBlocked) {
            if (currentBldgId) {
                announcedArrivalBldgIds.delete(String(currentBldgId));
            }
            if (arrivalTimerRef.current) {
                clearTimeout(arrivalTimerRef.current);
                arrivalTimerRef.current = null;
            }
            return;
        }

        if (isArrived && currentBldgId) {
            const arrivalKey = String(currentBldgId);
            if (announcedArrivalBldgIds.has(arrivalKey)) {
                return;
            }
            announcedArrivalBldgIds.add(arrivalKey);

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
        unlockStatus: effectiveUnlockStatus,
        announcedArrivalBldgIds,
    };
}