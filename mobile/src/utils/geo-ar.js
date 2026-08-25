import { getDistance, getCompassDirection } from 'geolib';

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
    const targetBearing = getCompassDirection(
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
