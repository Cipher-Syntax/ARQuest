import React, { useState, useEffect } from 'react';
import {
    ViroARScene,
    Viro3DObject,
    ViroAmbientLight,
    ViroPolyline,
    ViroMaterials,
    ViroNode,
    ViroText,
    ViroBox,
    ViroAnimations,
    ViroDirectionalLight,
} from '@reactvision/react-viro';
import { getDistance, getRhumbLineBearing } from 'geolib';

/**
 * Calculates the relative angle (in degrees) and Cartesian offset (meters)
 * between the user's GPS + compass heading and the target GPS coordinate.
 *
 * In ViroReact (WebGL coordinate system):
 * - +X is Right
 * - -X is Left
 * - +Y is Up
 * - -Y is Down
 * - -Z is Forward (into screen)
 * - +Z is Backward
 */
function calculateTargetRelative(userLat, userLng, targetLat, targetLng, userHeading) {
    if (
        !userLat || !userLng || !targetLat || !targetLng ||
        userHeading === undefined || userHeading === null
    ) {
        return { angle: 0, distance: 0, bearing: 0 };
    }

    const bearing = getRhumbLineBearing(
        { latitude: userLat, longitude: userLng },
        { latitude: targetLat, longitude: targetLng }
    );

    const distance = getDistance(
        { latitude: userLat, longitude: userLng },
        { latitude: targetLat, longitude: targetLng }
    );

    // Relative angle: how many degrees to the left/right of the user's facing direction
    let angle = bearing - userHeading;
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;

    return { angle, distance, bearing };
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
    } = sceneNavigator.viroAppProps || {};

    const [distanceToTarget, setDistanceToTarget] = useState(null);
    const [targetAngle, setTargetAngle] = useState(0);
    const [chevronPositions, setChevronPositions] = useState([]);
    const [isNearby, setIsNearby] = useState(false);

    // Target to aim at (immediate walking waypoint or destination)
    const effectiveLat = nextWaypoint?.latitude ?? targetLat;
    const effectiveLng = nextWaypoint?.longitude ?? targetLng;

    useEffect(() => {
        if (!userLat || !userLng) return;

        // 1. Total distance to destination building
        if (targetLat && targetLng) {
            const dist = getDistance(
                { latitude: userLat, longitude: userLng },
                { latitude: targetLat, longitude: targetLng }
            );
            setDistanceToTarget(dist);
            setIsNearby(dist < 25);
        }

        // 2. Relative bearing and angle to next waypoint / target
        if (effectiveLat && effectiveLng) {
            const { angle, distance } = calculateTargetRelative(
                userLat, userLng,
                effectiveLat, effectiveLng,
                userHeading
            );
            setTargetAngle(angle);

            // Compute 4 ground arrow positions along the bearing path
            const rad = (angle * Math.PI) / 180;
            const distances = [1.2, 2.2, 3.2, 4.2];
            const chevrons = distances.map((d) => {
                const x = d * Math.sin(rad);
                const z = -(d * Math.cos(rad));
                return { x, y: -1.0, z, angle };
            });
            setChevronPositions(chevrons);
        }
    }, [userLat, userLng, userHeading, targetLat, targetLng, effectiveLat, effectiveLng]);

    // Position for the floating eye-level HUD marker (2.5m ahead in target direction)
    const hudRad = (targetAngle * Math.PI) / 180;
    const hudX = 2.2 * Math.sin(hudRad);
    const hudZ = -(2.2 * Math.cos(hudRad));

    return (
        <ViroARScene>
            {/* ── Scene Lighting ── */}
            <ViroAmbientLight color="#ffffff" intensity={1200} />
            <ViroDirectionalLight color="#ffffff" direction={[0, -1, -1]} castsShadow shadowOpacity={0.4} />
            <ViroDirectionalLight color="#ffffff" direction={[1, 0, 1]} intensity={600} />
            <ViroDirectionalLight color="#ffffff" direction={[-1, 0, 1]} intensity={600} />
            <ViroDirectionalLight color="#ffffff" direction={[0, 1, 0]} intensity={400} />

            {/* 
                ============================================================
                1. 3D AR NAVIGATION PATH (Ground Chevrons + Direction Arrows)
                Renders a glowing 3D arrow path along the ground pointing
                in the real-world direction of the building / waypoint.
                ============================================================
            */}
            {chevronPositions.map((chev, index) => (
                <ViroNode
                    key={`nav-chevron-${index}`}
                    position={[chev.x, chev.y, chev.z]}
                    rotation={[0, -chev.angle, 0]}
                    scale={[1 - index * 0.1, 1 - index * 0.1, 1 - index * 0.1]}
                >
                    {/* Glowing Chevron Arrowhead (Polyline) */}
                    <ViroPolyline
                        position={[0, 0, 0]}
                        points={[
                            [-0.45, 0, 0.4],
                            [0, 0, -0.1],
                            [0.45, 0, 0.4]
                        ]}
                        thickness={0.14}
                        materials={['glowArrow']}
                    />
                    {/* Central Arrow Shaft */}
                    <ViroPolyline
                        position={[0, 0, 0]}
                        points={[
                            [0, 0, 0.55],
                            [0, 0, -0.1]
                        ]}
                        thickness={0.12}
                        materials={['glowArrowGold']}
                    />
                </ViroNode>
            ))}

            {/*
                ============================================================
                2. FLOATING 3D EYE-LEVEL HUD BILLBOARD
                Hovers in the direction of the target so you can see where 
                to walk without looking straight down at the ground.
                ============================================================
            */}
            {distanceToTarget !== null && (
                <ViroNode
                    position={[hudX, 0.1, hudZ]}
                    rotation={[0, -targetAngle, 0]}
                    animation={{ name: 'hover', run: true, loop: true }}
                >
                    {/* Floating 3D Directional Indicator Arrow */}
                    <ViroText
                        text="▲ ▲ ▲"
                        scale={[0.6, 0.6, 0.6]}
                        position={[0, 0.45, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 26, fontWeight: 'bold', color: '#B21830' }}
                        materials={['glowArrow']}
                    />

                    {/* Target Building Name */}
                    <ViroText
                        text={buildingName || 'Destination'}
                        scale={[0.45, 0.45, 0.45]}
                        position={[0, 0.18, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' }}
                        materials={['textMaterial']}
                    />

                    {/* Distance Badge */}
                    <ViroText
                        text={`${Math.round(distanceToTarget)}m AWAY`}
                        scale={[0.35, 0.35, 0.35]}
                        position={[0, -0.05, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 20, fontWeight: 'bold', color: '#E8B923' }}
                        materials={['goldTextMaterial']}
                    />
                </ViroNode>
            )}

            {/*
                ============================================================
                3. ARRIVED MODE: 3D Miniature Building Model
                Spawns when user arrives within 25m of the target.
                Allows the user to view the building model in full 3D AR.
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
        diffuseColor: '#B21830',   // WMSU Crimson Red
        lightingModel: 'Constant', // Unaffected by dark environments
    },
    glowArrowGold: {
        diffuseColor: '#E8B923',   // WMSU Gold
        lightingModel: 'Constant',
    },
    textMaterial: {
        diffuseColor: '#FFFFFF',
    },
    goldTextMaterial: {
        diffuseColor: '#E8B923',
    }
});

// ── AR Animation Definitions ─────────────────────────────────────────────────
ViroAnimations.registerAnimations({
    hover: {
        properties: {
            positionY: '+=0.08',
        },
        duration: 1200,
        easing: 'EaseInEaseOut',
        direction: 'Alternate',
    },
});
