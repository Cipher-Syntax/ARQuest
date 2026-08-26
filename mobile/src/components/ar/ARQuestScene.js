import React, { useState, useEffect } from 'react';
import {
    ViroARScene,
    Viro3DObject,
    ViroAmbientLight,
    ViroSphere,
    ViroMaterials,
    ViroNode,
    ViroText,
    ViroAnimations,
    ViroDirectionalLight,
} from '@reactvision/react-viro';
import { getDistance, getRhumbLineBearing } from 'geolib';

/**
 * Converts GPS bearing into an AR Cartesian offset (meters) from user's position.
 * In ViroReact: +X is Right, -X is Left, -Z is Forward, +Z is Backward.
 */
function bearingToAROffset(userLat, userLng, targetLat, targetLng, userHeading, meters) {
    if (
        !userLat || !userLng || !targetLat || !targetLng ||
        userHeading === undefined || userHeading === null
    ) {
        // Fallback: put the dot straight ahead
        return { x: 0, z: -(meters || 2) };
    }

    const bearing = getRhumbLineBearing(
        { latitude: userLat, longitude: userLng },
        { latitude: targetLat, longitude: targetLng }
    );

    // Relative angle: how many degrees left/right of where user is facing
    let angle = bearing - userHeading;
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;

    const rad = (angle * Math.PI) / 180;
    return {
        x: meters * Math.sin(rad),
        z: -(meters * Math.cos(rad)),
    };
}

export default function ARQuestScene(props) {
    const { sceneNavigator } = props;
    const {
        targetLat,
        targetLng,
        userLat,
        userLng,
        userHeading,
        modelUrl,
        nextWaypoint,
        buildingName,
    } = sceneNavigator.viroAppProps;

    const [dotPositions, setDotPositions] = useState([]);
    const [distanceToTarget, setDistanceToTarget] = useState(null);
    const [isNearby, setIsNearby] = useState(false);

    // Use the immediate waypoint if available, otherwise aim directly at destination
    const waypointLat = nextWaypoint?.latitude ?? targetLat;
    const waypointLng = nextWaypoint?.longitude ?? targetLng;

    useEffect(() => {
        if (!userLat || !userLng) return;

        // -- Calculate distance to building --
        if (targetLat && targetLng) {
            const dist = getDistance(
                { latitude: userLat, longitude: userLng },
                { latitude: targetLat, longitude: targetLng }
            );
            setDistanceToTarget(dist);
            // Show model miniature when within 25 meters
            setIsNearby(dist < 25);
        }

        // -- Compute 5 breadcrumb dot positions at 1m intervals in bearing direction --
        if (waypointLat && waypointLng) {
            const newDots = [1, 2, 3, 4, 5].map((d) => {
                const offset = bearingToAROffset(
                    userLat, userLng,
                    waypointLat, waypointLng,
                    userHeading,
                    d
                );
                // Y = 0 puts dots at the same height as the camera (eye level)
                return [offset.x, 0, offset.z];
            });
            setDotPositions(newDots);
        }
    }, [userLat, userLng, userHeading, targetLat, targetLng, waypointLat, waypointLng]);

    // Position the distance label just above the 2nd dot (2m ahead)
    const labelPos = dotPositions[1]
        ? [dotPositions[1][0], 0.5, dotPositions[1][2]]
        : [0, 0.5, -2];

    return (
        <ViroARScene>
            <ViroAmbientLight color="#ffffff" intensity={1000} />
            <ViroDirectionalLight color="#ffffff" direction={[0, -1, -1]} castsShadow shadowOpacity={0.4} />
            <ViroDirectionalLight color="#ffffff" direction={[1, 0, 1]} intensity={500} />
            <ViroDirectionalLight color="#ffffff" direction={[-1, 0, 1]} intensity={500} />

            {/*
                ============================================================
                NAVIGATION MODE: Floating Crimson Breadcrumb Dots
                Shown when user is > 25m from the target building.
                Dots float at eye-level (Y=0) in the bearing direction.
                They shrink slightly with distance for a depth-cue effect.
                ============================================================
            */}
            {/* === NAVIGATION: Crimson Breadcrumb Dots === */}
            {/* Always shown when navigating — even if nearby, dots confirm direction */}
            {dotPositions.map((pos, i) => (
                <ViroSphere
                    key={`nav-dot-${i}`}
                    position={pos}
                    radius={0.15 - i * 0.02}
                    materials={['glowArrow']}
                />
            ))}

            {/* Distance + Name label floating above the 2nd dot */}
            {distanceToTarget !== null && dotPositions.length > 1 && (
                <ViroText
                    position={labelPos}
                    text={`${buildingName || 'Target'} — ${Math.round(distanceToTarget)}m`}
                    scale={[0.5, 0.5, 0.5]}
                    style={{ fontFamily: 'Arial', fontSize: 20, color: '#FFFFFF' }}
                    materials={['textMaterial']}
                />
            )}

            {/*
                ============================================================
                ARRIVED MODE: 3D Miniature Building Model
                Shown when user is within 25m of the building.
                Placed 2 meters directly in front of the camera at eye level.
                User can drag it around the real-world floor.
                ============================================================
            */}
            {modelUrl && isNearby && (
                <ViroNode
                    position={[0, -0.5, -2]}
                    dragType="FixedToWorld"
                    onDrag={() => {}}
                >
                    <ViroText
                        text={buildingName || 'Target'}
                        scale={[1, 1, 1]}
                        position={[0, 0.8, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 24, color: '#FFFFFF' }}
                        extrusionDepth={2}
                        materials={['textMaterial']}
                    />
                    <Viro3DObject
                        source={{ uri: modelUrl }}
                        position={[0, -1, 0]}
                        scale={[0.005, 0.005, 0.005]}
                        type="GLB"
                        onError={(e) => console.log('AR Model Load Error:', e)}
                    />
                </ViroNode>
            )}
        </ViroARScene>
    );
}

// ── AR Material Definitions ──────────────────────────────────────────────────
ViroMaterials.createMaterials({
    glowArrow: {
        diffuseColor: '#B21830',   // WMSU Crimson
        lightingModel: 'Constant', // Unaffected by scene lighting = always bright
    },
    textMaterial: {
        diffuseColor: '#FFFFFF',
    },
});

// ── AR Animation Definitions ─────────────────────────────────────────────────
ViroAnimations.registerAnimations({
    spin: {
        properties: { rotateY: '+=360' },
        duration: 10000,
    },
});
