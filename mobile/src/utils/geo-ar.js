import { getDistance, getRhumbLineBearing } from 'geolib';

/**
 * Converts global GPS coordinates into local Cartesian coordinates (X, Y, Z) in meters,
 * relative to the user's current GPS position and compass heading.
 *
 * In ViroReact (WebGL coordinates):
 * +X is Right
 * -X is Left
 * +Y is Up
 * -Y is Down
 * -Z is Forward
 * +Z is Backward
 *
 * @param {number} userLat - User's current latitude
 * @param {number} userLng - User's current longitude
 * @param {number} targetLat - Target's latitude
 * @param {number} targetLng - Target's longitude
 * @param {number} userHeading - User's true compass heading (0-360)
 * @returns {{x: number, y: number, z: number}} Local AR coordinates in meters
 */
export const gpsToARCoordinates = (userLat, userLng, targetLat, targetLng, userHeading) => {
    if (!userLat || !userLng || !targetLat || !targetLng || userHeading === undefined || userHeading === null) {
        return { x: 0, y: 0, z: -5 }; // Fallback 5 meters ahead if data is missing
    }

    // Calculate raw bearing to target (True North = 0/360)
    const targetBearing = getRhumbLineBearing(
        { latitude: userLat, longitude: userLng },
        { latitude: targetLat, longitude: targetLng }
    );

    // Distance to target in meters
    const distance = getDistance(
        { latitude: userLat, longitude: userLng },
        { latitude: targetLat, longitude: targetLng }
    );

    // Calculate relative angle from the direction the user is facing
    // e.g., If target is East (90) and user is facing East (90), relative angle is 0 (straight ahead).
    let angle = targetBearing - userHeading;
    
    // Normalize angle to -180 to 180
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;

    // Convert degrees to radians for trigonometric functions
    const angleRad = (angle * Math.PI) / 180;

    // Convert polar coordinates (distance, angle) to Cartesian (x, z)
    // -Z is forward in Viro, so Math.cos gives us the forward/backward projection
    const x = distance * Math.sin(angleRad);
    const z = -(distance * Math.cos(angleRad));

    return { x, y: 0, z };
};

/**
 * Snaps the user's raw GPS coordinates to the closest point along the campus walkway polyline
 * (map-matching), eliminating GPS multipath reflections from nearby building walls.
 *
 * @param {Array<[number, number]>} coords - Polyline coordinate pairs [[lng, lat], ...]
 * @param {number} userLat - User's raw GPS latitude
 * @param {number} userLng - User's raw GPS longitude
 * @param {number} maxSnapMeters - Maximum perpendicular distance (in meters) to snap. Default 25m.
 * @returns {{ latitude: number, longitude: number, isSnapped: boolean, distance: number }} Snapped GPS coordinates
 */
export const snapToWalkway = (coords, userLat, userLng, maxSnapMeters = 25) => {
    if (!coords || !Array.isArray(coords) || coords.length < 2 || userLat == null || userLng == null) {
        return { latitude: userLat, longitude: userLng, isSnapped: false, distance: 0 };
    }

    const px = userLng;
    const py = userLat;
    let bestDist2 = Infinity;
    let bestQ = null;

    // Evaluate against walkway segments (prefer real walkway geometry when available)
    const startSegment = coords.length >= 3 ? 1 : 0;

    for (let i = startSegment; i < coords.length - 1; i++) {
        const ax = coords[i][0];
        const ay = coords[i][1];
        const bx = coords[i + 1][0];
        const by = coords[i + 1][1];

        const dx = bx - ax;
        const dy = by - ay;
        const ab2 = dx * dx + dy * dy;
        let t = 0;
        if (ab2 > 0) {
            t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / ab2));
        }
        const qx = ax + t * dx;
        const qy = ay + t * dy;
        const dist2 = (px - qx) * (px - qx) + (py - qy) * (py - qy);

        if (dist2 < bestDist2) {
            bestDist2 = dist2;
            bestQ = [qx, qy];
        }
    }

    if (!bestQ) {
        return { latitude: userLat, longitude: userLng, isSnapped: false, distance: 0 };
    }

    const distMeters = getDistance(
        { latitude: userLat, longitude: userLng },
        { latitude: bestQ[1], longitude: bestQ[0] }
    );

    if (distMeters <= maxSnapMeters) {
        return {
            latitude: bestQ[1],
            longitude: bestQ[0],
            isSnapped: true,
            distance: distMeters,
        };
    }

    return {
        latitude: userLat,
        longitude: userLng,
        isSnapped: false,
        distance: distMeters,
    };
};

/**
 * Determines the next immediate waypoint (GPS coordinate) along a route polyline
 * that the user should be directed toward in AR.
 *
 * @param {Array<[number, number]>} coords - Array of [longitude, latitude] coordinates along the path.
 * @param {number} userLat - User's current latitude.
 * @param {number} userLng - User's current longitude.
 * @returns {{ longitude: number, latitude: number } | null} The next target waypoint for AR chevrons.
 */
export const getUpcomingWaypoint = (coords, userLat, userLng) => {
    if (!coords || !Array.isArray(coords) || coords.length === 0) {
        return null;
    }
    if (coords.length === 1) {
        return { longitude: coords[0][0], latitude: coords[0][1] };
    }
    if (userLat === undefined || userLat === null || userLng === undefined || userLng === null) {
        const firstPt = coords[1] || coords[0];
        return { longitude: firstPt[0], latitude: firstPt[1] };
    }

    const px = userLng;
    const py = userLat;
    let bestDist2 = Infinity;
    let bestIdx = 0;
    let bestT = 0;

    // If route has >= 3 points, start search at segment 1 to evaluate against real authored walkways
    // rather than the artificial segment 0 connecting user's initial GPS to start_node.
    const startIdx = coords.length >= 3 ? 1 : 0;

    for (let i = startIdx; i < coords.length - 1; i++) {
        const ax = coords[i][0];
        const ay = coords[i][1];
        const bx = coords[i + 1][0];
        const by = coords[i + 1][1];

        const dx = bx - ax;
        const dy = by - ay;
        const ab2 = dx * dx + dy * dy;
        let t = 0;
        if (ab2 > 0) {
            t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / ab2));
        }
        const qx = ax + t * dx;
        const qy = ay + t * dy;
        const dist2 = (px - qx) * (px - qx) + (py - qy) * (py - qy);

        if (dist2 < bestDist2) {
            bestDist2 = dist2;
            bestIdx = i;
            bestT = t;
        }
    }

    // Candidate target is at least the end of the current segment: coords[bestIdx + 1]
    let targetIdx = bestIdx + 1;

    // Final destination coordinate
    const finalCoord = coords[coords.length - 1];
    const userDistToFinal = getDistance(
        { latitude: userLat, longitude: userLng },
        { latitude: finalCoord[1], longitude: finalCoord[0] }
    );

    // Strict forward-progression gating:
    // Advance targetIdx forward if:
    // 1. User is within 4.5m catchment of candidate node.
    // 2. Or candidate node is geometrically behind user along path direction (dot <= 0).
    // 3. Or user is already closer to the final destination than the candidate node (smart start-node skip).
    while (targetIdx < coords.length) {
        const targetLng = coords[targetIdx][0];
        const targetLat = coords[targetIdx][1];

        const distMeters = getDistance(
            { latitude: userLat, longitude: userLng },
            { latitude: targetLat, longitude: targetLng }
        );

        // Vector from previous node to target node (direction of path travel)
        const prevLng = coords[targetIdx - 1][0];
        const prevLat = coords[targetIdx - 1][1];
        const segDx = targetLng - prevLng;
        const segDy = targetLat - prevLat;

        // Vector from user to target node
        const uDx = targetLng - px;
        const uDy = targetLat - py;

        // Dot product: if <= 0, the target node is geometrically behind the user in the direction of path travel
        const dot = segDx * uDx + segDy * uDy;

        // Destination progress: if target node is farther from destination than the user is (with 3.5m deadband)
        const targetDistToFinal = getDistance(
            { latitude: targetLat, longitude: targetLng },
            { latitude: finalCoord[1], longitude: finalCoord[0] }
        );
        const isBehindUserTowardsDestination = userDistToFinal < (targetDistToFinal - 3.5);

        // If target is reached (<= 4.5m), overshot (dot <= 0), or geometrically behind towards destination:
        if ((distMeters <= 4.5 || dot <= 0 || isBehindUserTowardsDestination) && targetIdx + 1 < coords.length) {
            targetIdx++;
        } else {
            break;
        }
    }

    const targetCoord = coords[Math.min(targetIdx, coords.length - 1)];
    return { longitude: targetCoord[0], latitude: targetCoord[1] };
};
