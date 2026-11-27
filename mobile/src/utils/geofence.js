/**
 * Shared geofence validation and asset prefetching logic for Explore and Buildings.
 *
 * Explore owns the validation loop (runs continuously while screen is focused).
 * Buildings only needs the distance calculation and occasional validation calls.
 * This module keeps the pure math + prefetch so neither screen duplicates it.
 */
import { geofencingService, assetService, api } from "../services";

/**
 * Haversine distance in metres. Pure, no side effects, unit-testable.
 */
export function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const dLatRad = ((lat2 - lat1) * Math.PI) / 180;
    const dLonRad = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLatRad / 2) ** 2 +
        Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(dLonRad / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.floor(R * c);
}

/**
 * Given a location + buildings array, returns the closest building and distance.
 * Returns { building, distance } or { building: null, distance: Infinity }.
 */
export function findNearestBuilding(location, buildings) {
    if (!location || !buildings.length) return { building: null, distance: Infinity };

    let minDistance = Infinity;
    let closest = null;

    for (const b of buildings) {
        if (b.latitude && b.longitude) {
            const d = haversineMeters(
                location.latitude,
                location.longitude,
                b.latitude,
                b.longitude
            );
            if (d < minDistance) {
                minDistance = d;
                closest = b;
            }
        }
    }
    return { building: closest, distance: minDistance };
}

/**
 * Determines whether we should skip the HTTP validation call based on the
 * "outside → outside" short-circuit rule used by Explore.
 *
 * @param {Object} nearest  { building, distance } from findNearestBuilding
 * @param {string} lastValidatedStatus  "inside" | "nearby" | "outside" | null
 * @returns {boolean} true if we can safely return a local "outside" result
 */
export function canSkipValidation(nearest, lastValidatedStatus) {
    if (!nearest.building) return false;

    const radius =
        nearest.building.geofence?.radius_meters ||
        nearest.building.geofence?.radius ||
        30;
    const threshold = radius + 20;

    return (
        lastValidatedStatus === "outside" &&
        nearest.distance > 75 &&
        nearest.distance > threshold
    );
}

/**
 * Prefetches the 3D model asset for a building if we haven't already.
 * Fire-and-forget; failures are logged but don't throw.
 */
export async function maybePrefetchBuildingAssets(building) {
    if (!building?.model_url) return;

    const key = assetService.getModelKey(building);
    if (!key) return;

    try {
        const cached = await assetService.isCached(
            key.assetId,
            key.version,
            key.url
        );
        if (!cached) {
            await assetService.downloadAsset(key.url, key.assetId, key.version);
        }
    } catch (err) {
        console.warn("Failed to pre-fetch building assets", err);
    }
}

/**
 * Calls the backend geofence validation endpoint.
 * Returns the parsed result or null on error.
 */
export async function validateLocationWithBackend(lat, lng, accuracy = 10) {
    try {
        const result = await geofencingService.validateLocation(lat, lng, accuracy);
        return result;
    } catch (err) {
        if (err?.response?.data?.error?.code === "SPOOFING_DETECTED") {
            console.warn(
                "Location validation notice: Spoofing/velocity alert from backend."
            );
        } else {
            console.warn("Validation error:", err?.message || err);
        }
        return null;
    }
}

/**
 * Builds the nearby-buildings array (distance + sort + slice) used by Explore.
 * Pure function; no React hooks.
 */
export function buildNearbyBuildings(location, buildingsList, insideBuildingId) {
    if (!location || !buildingsList.length) return [];

    return buildingsList
        .filter(
            (b) =>
                insideBuildingId == null ||
                String(b.id) !== String(insideBuildingId)
        )
        .map((b) => ({
            ...b,
            distance: haversineMeters(
                location.latitude,
                location.longitude,
                b.latitude,
                b.longitude
            ),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
}

/**
 * Determines the "insideLockedForStudent" and "insideOwned" booleans
 * used by both Explore (read-only badge) and Buildings (modal gating).
 */
export function computeInsideFlags(
    validationResult,
    unlockedBuildings,
    role
) {
    const insideBuilding =
        validationResult?.status === "inside" ? validationResult.building : null;

    const insideLockedForStudent =
        role === "student" &&
        Boolean(insideBuilding) &&
        insideBuilding.is_active !== false &&
        insideBuilding.status !== "MAINTENANCE" &&
        !unlockedBuildings.some(
            (ub) => String(ub.id) === String(insideBuilding.id)
        );

    const insideOwned =
        Boolean(insideBuilding) &&
        insideBuilding.is_active !== false &&
        insideBuilding.status !== "MAINTENANCE" &&
        !insideLockedForStudent;

    return { insideBuilding, insideLockedForStudent, insideOwned };
}