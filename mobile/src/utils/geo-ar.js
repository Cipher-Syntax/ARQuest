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

    // Find the closest path segment [i, i+1] to the user's coordinates
    for (let i = 0; i < coords.length - 1; i++) {
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

    // Determine the next waypoint ahead of the user:
    // If the user has progressed past 80% of segment i and there is a subsequent segment,
    // look ahead to coords[bestIdx + 2] to smoothly anticipate turns.
    // Otherwise, direct the user to the end of the current segment: coords[bestIdx + 1].
    let targetIdx = bestIdx + 1;
    if (bestT > 0.80 && bestIdx + 2 < coords.length) {
        targetIdx = bestIdx + 2;
    }

    const targetCoord = coords[Math.min(targetIdx, coords.length - 1)];
    return { longitude: targetCoord[0], latitude: targetCoord[1] };
};
