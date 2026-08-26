import React, { useState, useEffect } from 'react';
import {
    ViroARScene,
    Viro3DObject,
    ViroAmbientLight,
    ViroPolyline,
    ViroMaterials,
    ViroNode,
    ViroText,
    ViroAnimations,
    ViroDirectionalLight,
} from '@reactvision/react-viro';
import { getDistance, getRhumbLineBearing } from 'geolib';

/**
 * Calculates relative angle (degrees) and Cartesian offset (meters)
 * between user's GPS + compass heading and the target coordinate.
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

    // Relative angle: how many degrees to the left/right of where the user is facing
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
            const { angle } = calculateTargetRelative(
                userLat, userLng,
                effectiveLat, effectiveLng,
                userHeading
            );
            setTargetAngle(angle);

            // Compute 4 ground arrow positions along the bearing path (proportional spacing)
            const rad = (angle * Math.PI) / 180;
            const distances = [1.0, 1.8, 2.6, 3.4];
            const chevrons = distances.map((d) => {
                const x = d * Math.sin(rad);
                const z = -(d * Math.cos(rad));
                return { x, y: -0.9, z, angle };
            });
            setChevronPositions(chevrons);
        }
    }, [userLat, userLng, userHeading, targetLat, targetLng, effectiveLat, effectiveLng]);

    // Position for the sleek floating HUD marker (2.0m ahead in target direction)
    const hudRad = (targetAngle * Math.PI) / 180;
    const hudX = 2.0 * Math.sin(hudRad);
    const hudZ = -(2.0 * Math.cos(hudRad));

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
                1. 3D AR NAVIGATION PATH (Sleek Ground Chevrons)
                Renders proportional, glowing 3D arrow chevrons along the ground
                pointing in the real-world direction of the building.
                ============================================================
            */}
            {chevronPositions.map((chev, index) => (
                <ViroNode
                    key={`nav-chevron-${index}`}
                    position={[chev.x, chev.y, chev.z]}
                    rotation={[0, -chev.angle, 0]}
                    scale={[0.7 - index * 0.08, 0.7 - index * 0.08, 0.7 - index * 0.08]}
                >
                    {/* Glowing Chevron Wings (Polyline) */}
                    <ViroPolyline
                        position={[0, 0, 0]}
                        points={[
                            [-0.22, 0, 0.22],
                            [0, 0, -0.05],
                            [0.22, 0, 0.22]
                        ]}
                        thickness={0.06}
                        materials={['glowArrow']}
                    />
                    {/* Central Arrow Shaft */}
                    <ViroPolyline
                        position={[0, 0, 0]}
                        points={[
                            [0, 0, 0.3],
                            [0, 0, -0.05]
                        ]}
                        thickness={0.05}
                        materials={['glowArrowGold']}
                    />
                </ViroNode>
            ))}

            {/*
                ============================================================
                2. SLEEK FLOATING 3D DIRECTION HUD BILLBOARD
                Hovers cleanly in the direction of the destination.
                ============================================================
            */}
            {distanceToTarget !== null && (
                <ViroNode
                    position={[hudX, -0.1, hudZ]}
                    rotation={[0, -targetAngle, 0]}
                    animation={{ name: 'hover', run: true, loop: true }}
                >
                    {/* Floating Direction Arrow */}
                    <ViroText
                        text="▲"
                        scale={[0.3, 0.3, 0.3]}
                        position={[0, 0.32, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 24, fontWeight: 'bold', color: '#B21830' }}
                        materials={['glowArrow']}
                    />

                    {/* Target Building Name */}
                    <ViroText
                        text={buildingName || 'Destination'}
                        scale={[0.22, 0.22, 0.22]}
                        position={[0, 0.12, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' }}
                        materials={['textMaterial']}
                    />

                    {/* Distance Badge */}
                    <ViroText
                        text={`${Math.round(distanceToTarget)}m AWAY`}
                        scale={[0.18, 0.18, 0.18]}
                        position={[0, -0.04, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 18, fontWeight: 'bold', color: '#E8B923' }}
                        materials={['goldTextMaterial']}
                    />
                </ViroNode>
            )}

            {/*
                ============================================================
                3. ARRIVED MODE: 3D Miniature Building Model
                Spawns when user arrives within 25m of the target.
                Positioned at a comfortable 4.2m distance for full overview.
                ============================================================
            */}
            {modelUrl && isNearby && (
                <ViroNode
                    position={[0, -0.4, -4.2]}
                    dragType="FixedToWorld"
                    onDrag={() => {}}
                >
                    <ViroText
                        text={buildingName || 'Target'}
                        scale={[0.7, 0.7, 0.7]}
                        position={[0, 0.85, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' }}
                        extrusionDepth={1}
                        materials={['textMaterial']}
                    />
                    <Viro3DObject
                        source={{ uri: modelUrl }}
                        position={[0, 0, 0]}
                        scale={[0.0035, 0.0035, 0.0035]}
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
            positionY: '+=0.05',
        },
        duration: 1200,
        easing: 'EaseInEaseOut',
        direction: 'Alternate',
    },
});
