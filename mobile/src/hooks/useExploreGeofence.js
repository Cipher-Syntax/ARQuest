import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLocationTracking } from "./useLocationTracking";
import { useUnlockedBuildings } from "./useUnlockedBuildings";
import { useRoleAccess } from "./useRoleAccess";

import {
    findNearestBuilding,
    canSkipValidation,
    validateLocationWithBackend,
    maybePrefetchBuildingAssets,
    buildNearbyBuildings,
    computeInsideFlags,
} from "../utils/geofence";

/**
 * Owns the Explore screen's geofence validation loop, nearby-buildings list,
 * and asset prefetching. Buildings screen only needs a subset of this.
 *
 * Returns:
 *   validationResult, isValidating, nearbyBuildings, insideBuilding,
 *   insideLockedForStudent, insideOwned, refreshValidation
 */
export function useExploreGeofence({ buildingsList }) {
    const { location } = useLocationTracking();
    const { unlockedBuildings } = useUnlockedBuildings();
    const { role } = useRoleAccess();

    const [validationResult, setValidationResult] = useState(null);
    const [isValidating, setIsValidating] = useState(false);

    const hasInitialValidationRef = useRef(false);
    const lastValidatedStatusRef = useRef(null);
    const prefetchedBuildingsRef = useRef(new Set());

    // --- Validation loop (runs whenever location changes) ---
    const validateLocation = useCallback(async () => {
        if (!location) return;

        const nearest = findNearestBuilding(location, buildingsList);

        // Short-circuit: outside → outside, skip HTTP
        if (hasInitialValidationRef.current && canSkipValidation(nearest, lastValidatedStatusRef.current)) {
            setValidationResult({
                status: "outside",
                distance_meters: Math.round(nearest.distance),
                building: null,
            });
            return;
        }

        setIsValidating(true);
        try {
            const result = await validateLocationWithBackend(
                location.latitude,
                location.longitude,
                location.accuracy || 10
            );
            hasInitialValidationRef.current = true;
            lastValidatedStatusRef.current = result?.status || "outside";
            setValidationResult(result);

            // Asset prefetch when nearby/inside
            if ((result?.status === "nearby" || result?.status === "inside") && result?.building) {
                const buildingId = result.building.id;
                if (!prefetchedBuildingsRef.current.has(buildingId)) {
                    prefetchedBuildingsRef.current.add(buildingId);
                    maybePrefetchBuildingAssets(result.building);
                }
            }
        } finally {
            setIsValidating(false);
        }
    }, [location, buildingsList]);

    useEffect(() => {
        validateLocation();
    }, [validateLocation]);

    // --- Nearby buildings memo (derived state, useMemo like baseline) ---
    const nearbyBuildings = useMemo(() => {
        const insideBuildingId =
            validationResult?.status === "inside"
                ? validationResult.building?.id
                : null;

        return buildNearbyBuildings(location, buildingsList, insideBuildingId);
    }, [location, buildingsList, validationResult?.status, validationResult?.building?.id]);

    // --- Inside flags ---
    const { insideBuilding, insideLockedForStudent, insideOwned } = computeInsideFlags(
        validationResult,
        unlockedBuildings,
        role
    );

    const refreshValidation = useCallback(() => {
        hasInitialValidationRef.current = false;
        validateLocation();
    }, [validateLocation]);

    return {
        validationResult,
        isValidating,
        nearbyBuildings,
        insideBuilding,
        insideLockedForStudent,
        insideOwned,
        refreshValidation,
    };
}

export default useExploreGeofence;