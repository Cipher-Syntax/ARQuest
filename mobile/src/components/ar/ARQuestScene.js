import React, { useState, useEffect, useRef, useCallback } from 'react';
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

    const angle = (bearing - userHeading + 360) % 360;

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
        isArrived = false,
    } = sceneNavigator.viroAppProps || {};

    const [targetAngle, setTargetAngle] = useState(0);
    const [chevronPositions, setChevronPositions] = useState([]);
    const [hudPosition, setHudPosition] = useState([0, -0.1, -2]);

    const smoothedAngleRef = useRef(0);
    const hasInitRef = useRef(false);
    // Track camera's real-world position so navigation elements follow the user
    const cameraPositionRef = useRef([0, 0, 0]);
    const lastCamUpdateRef = useRef(0);
    const lastAngleRef = useRef(0);

    // Target to aim at (immediate walking waypoint or destination)
    const effectiveLat = nextWaypoint?.latitude ?? targetLat;
    const effectiveLng = nextWaypoint?.longitude ?? targetLng;

    // Derived values calculated directly in render (avoids cascading state updates)
    const distanceToTarget = (userLat && userLng && targetLat && targetLng)
        ? getDistance(
            { latitude: userLat, longitude: userLng },
            { latitude: targetLat, longitude: targetLng }
        )
        : null;
    const isNearby = (distanceToTarget !== null && distanceToTarget <= 25) || isArrived;
    const hasArrived = isArrived || isNearby;

    /**
     * Recompute chevron and HUD world positions given a bearing angle and
     * the camera's current world-space position. Called from both the GPS
     * useEffect and the camera transform update so arrows always follow the user.
     */
    const recomputeNavPositions = useCallback((angle, camPos) => {
        const rad = (angle * Math.PI) / 180;
        const [cx, cy, cz] = camPos;
        const distances = [1.0, 1.8, 2.6, 3.4];
        const chevrons = distances.map((d) => ({
            x: cx + d * Math.sin(rad),
            y: cy - 0.9,
            z: cz - d * Math.cos(rad),
            angle,
        }));
        setChevronPositions(chevrons);
        setHudPosition([
            cx + 2.0 * Math.sin(rad),
            cy - 0.1,
            cz - 2.0 * Math.cos(rad),
        ]);
    }, []);

    /**
     * Camera world-space transform update — fires every frame from ARCore/ARKit.
     * Throttled to ~30fps. Updates arrow positions so they always float in
     * front of wherever the user is RIGHT NOW, not where the session started.
     */
    const onCameraTransformUpdate = useCallback((camTransform) => {
        const now = Date.now();
        if (now - lastCamUpdateRef.current < 33) return; // ~30fps throttle
        lastCamUpdateRef.current = now;

        const pos = camTransform.cameraTransform.position;
        cameraPositionRef.current = pos;

        // Re-anchor navigation elements to the user's current camera position
        if (hasInitRef.current) {
            recomputeNavPositions(lastAngleRef.current, pos);
        }
    }, [recomputeNavPositions]);

    useEffect(() => {
        if (!userLat || !userLng) return;

        // Relative bearing and angle to next waypoint / target with EMA smoothing
        if (effectiveLat && effectiveLng) {
            const { angle: rawAngle } = calculateTargetRelative(
                userLat, userLng,
                effectiveLat, effectiveLng,
                userHeading
            );

            let chosenAngle = rawAngle;
            if (!hasInitRef.current) {
                smoothedAngleRef.current = rawAngle;
                hasInitRef.current = true;
                chosenAngle = rawAngle;
            } else {
                let diff = (rawAngle - smoothedAngleRef.current + 180) % 360 - 180;
                if (diff < -180) diff += 360;

                // Deadband: ignore micro-jitters under 1.5 degrees
                if (Math.abs(diff) >= 1.5) {
                    chosenAngle = (smoothedAngleRef.current + diff * 0.35 + 360) % 360;
                    smoothedAngleRef.current = chosenAngle;
                } else {
                    chosenAngle = smoothedAngleRef.current;
                }
            }

            setTargetAngle(chosenAngle);
            lastAngleRef.current = chosenAngle;

            // Recompute positions offset from the camera's current world position
            recomputeNavPositions(chosenAngle, cameraPositionRef.current);
        }
    }, [userLat, userLng, userHeading, targetLat, targetLng, effectiveLat, effectiveLng, isArrived, recomputeNavPositions]);

    return (
        <ViroARScene onCameraTransformUpdate={onCameraTransformUpdate}>
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
                Positions are offset from the camera's current world-space
                position so they follow the user as they walk.
                Hidden when arrived at the destination.
                ============================================================
            */}
            {!hasArrived && chevronPositions.map((chev, index) => (
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
                    {/* Central Arrow Shaft - Gold/Yellow */}
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
                Position is kept at the camera's current world offset so it
                always floats in front of the user, not at session-start origin.
                Hidden when arrived at the destination.
                ============================================================
            */}
            {!hasArrived && distanceToTarget !== null && (
                <ViroNode
                    position={hudPosition}
                    rotation={[0, -targetAngle, 0]}
                    animation={{ name: 'hover', run: true, loop: true }}
                >
                    {/* Floating Direction Arrow */}
                    <ViroText
                        text="▲"
                        scale={[0.35, 0.35, 0.35]}
                        position={[0, 0.38, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 26, fontWeight: 'bold', color: '#B21830' }}
                        materials={['glowArrow']}
                    />

                    {/* Target Building Name - Big Crimson Glow */}
                    <ViroText
                        text={buildingName || 'Destination'}
                        width={8}
                        height={1}
                        scale={[0.34, 0.34, 0.34]}
                        position={[0, 0.14, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 26, fontWeight: 'bold', color: '#B21830', textAlign: 'center', textAlignVertical: 'center' }}
                        materials={['glowArrow']}
                    />

                    {/* Distance Badge - Crimson Glow */}
                    <ViroText
                        text={`${Math.round(distanceToTarget)}m AWAY`}
                        width={6}
                        height={1}
                        scale={[0.24, 0.24, 0.24]}
                        position={[0, -0.08, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 22, fontWeight: 'bold', color: '#B21830', textAlign: 'center', textAlignVertical: 'center' }}
                        materials={['glowArrow']}
                    />
                </ViroNode>
            )}

            {/*
                ============================================================
                3. ARRIVED MODE: 3D Miniature Building Model
                Spawns when user arrives within 25m or inside geofence.
                Positioned at 2.6m distance with 0.038 scale.
                ============================================================
            */}
            {modelUrl && hasArrived && (
                <ViroNode
                    position={[0, -0.65, -2.6]}
                    dragType="FixedToWorld"
                    onDrag={() => {}}
                >
                    <ViroText
                        text={buildingName || 'Target'}
                        width={4}
                        height={1}
                        scale={[0.45, 0.45, 0.45]}
                        position={[0, 0.5, 0]}
                        style={{
                            fontFamily: 'Arial',
                            fontSize: 26,
                            fontWeight: 'bold',
                            color: '#B21830',
                            textAlign: 'center',
                            textAlignVertical: 'center',
                        }}
                        materials={['glowArrow']}
                    />
                    <Viro3DObject
                        source={{ uri: modelUrl }}
                        position={[0, 0, 0]}
                        scale={[0.038, 0.038, 0.038]}
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
