import { geofencingService } from "../services";

/**
 * Pure, React-free building utilities.
 * No hooks, no components — only functions testable outside the app runtime.
 */

export function filterBuildingsByQuery(buildings, query) {
    const q = query.toLowerCase();
    return buildings.filter(
        (b) =>
            b.name.toLowerCase().includes(q) ||
            (b.slug && b.slug.toLowerCase().includes(q)),
    );
}

export function sortBuildingsByAvailability(buildings, unlockedBuildings, role) {
    return [...buildings].sort((a, b) => {
        const aAvail =
            unlockedBuildings.some((u) => u.id === a.id) ||
            role === "visitor" ||
            a.status === "MAINTENANCE";
        const bAvail =
            unlockedBuildings.some((u) => u.id === b.id) ||
            role === "visitor" ||
            b.status === "MAINTENANCE";
        if (aAvail && !bAvail) return -1;
        if (!aAvail && bAvail) return 1;
        return a.name.localeCompare(b.name);
    });
}

export function calculateRouteDistance(
    calculatedRoute,
    routeTarget,
    routeOrigin,
    location,
) {
    if (calculatedRoute?.distanceMeters) {
        return calculatedRoute.distanceMeters;
    }
    if (!routeTarget) return null;

    let lat1, lon1;
    if (routeOrigin) {
        lat1 = parseFloat(routeOrigin.latitude);
        lon1 = parseFloat(routeOrigin.longitude);
    } else if (location) {
        lat1 = location.latitude;
        lon1 = location.longitude;
    } else {
        return null;
    }

    if (lat1 && lon1) {
        const lat2 = parseFloat(routeTarget.latitude);
        const lon2 = parseFloat(routeTarget.longitude);
        const dist = geofencingService.calculateDistance(lat1, lon1, lat2, lon2);
        return Math.round(dist);
    }
    return null;
}

export function getItemLayout(data, index) {
    return {
        length: 85,
        offset: 85 * index,
        index,
    };
}

export function isBuildingAccessible(building, unlockedBuildings, role) {
    const isUnlocked = unlockedBuildings.some((u) => u.id === building.id);
    return isUnlocked || role === "visitor" || building.status === "MAINTENANCE";
}

export function buildSelectedBuildingData(building, unlockedBuildings) {
    const unlockedData = unlockedBuildings.find((b) => b.id === building.id) || {};
    return { ...building, ...unlockedData };
}

export function hasBuildingModel(building) {
    return Boolean(building?.has_model ?? building?.model_url);
}

export function getBuildingModelUrl(building) {
    return building?.model_url || null;
}