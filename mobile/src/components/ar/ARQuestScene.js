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
    ViroBox,
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
    const [modelError, setModelError] = useState(false);

    useEffect(() => {
        setModelError(false);
    }, [modelUrl]);

    const smoothedAngleRef = useRef(0);
    const hasInitRef = useRef(false);
    // Track camera's real-world position so navigation elements follow the user
    const cameraPositionRef = useRef([0, 0, 0]);
    const lastCamUpdateRef = useRef(0);
    const lastAngleRef = useRef(0);
    const lastAnchorPosRef = useRef([0, 0, 0]);
    const lastRecomputeTimeRef = useRef(0);

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
     * Camera world-space transform update from ARCore/ARKit.
     * Decoupled: Throttled to ~4 Hz (250ms) AND distance delta (>= 35cm)
     * to eliminate 30Hz React Native JS state thrashing and GC pauses.
     */
    const onCameraTransformUpdate = useCallback((camTransform) => {
        const pos = camTransform.cameraTransform.position;
        cameraPositionRef.current = pos;

        if (!hasInitRef.current) return;

        const now = Date.now();
        const timeDelta = now - lastRecomputeTimeRef.current;
        if (timeDelta < 250) return; // 4Hz maximum throttle

        const [lx, ly, lz] = lastAnchorPosRef.current;
        const distSq = (pos[0] - lx) ** 2 + (pos[1] - ly) ** 2 + (pos[2] - lz) ** 2;

        // Only recompute if user physically walked >= 35cm or 1.5s elapsed
        if (distSq >= 0.12 || timeDelta >= 1500) {
            lastRecomputeTimeRef.current = now;
            lastAnchorPosRef.current = [pos[0], pos[1], pos[2]];
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
                lastAngleRef.current = chosenAngle;
                setTargetAngle(chosenAngle);
                recomputeNavPositions(chosenAngle, cameraPositionRef.current);
            } else {
                let diff = (rawAngle - smoothedAngleRef.current + 180) % 360 - 180;
                if (diff < -180) diff += 360;

                // Deadband: ignore micro-jitters under 2.5 degrees to avoid redundant state renders
                if (Math.abs(diff) >= 2.5) {
                    chosenAngle = (smoothedAngleRef.current + diff * 0.35 + 360) % 360;
                    smoothedAngleRef.current = chosenAngle;
                    lastAngleRef.current = chosenAngle;
                    setTargetAngle(chosenAngle);
                    recomputeNavPositions(chosenAngle, cameraPositionRef.current);
                }
            }
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
                3. ARRIVED MODE: 3D Destination Landmark / Building Model
                Spawns when user arrives within 25m or inside geofence.
                Renders 3D GLB model when supported, with resilient 3D
                Holographic Monument Beacon fallback on WebP/native decode errors.
                ============================================================
            */}
            {hasArrived && (
                <ViroNode
                    position={[0, -0.45, -2.6]}
                    dragType="FixedToWorld"
                    onDrag={() => {}}
                >
                    {/* Header: Building Name */}
                    <ViroText
                        text={buildingName || 'Destination'}
                        width={5}
                        height={1}
                        scale={[0.42, 0.42, 0.42]}
                        position={[0, 0.72, 0]}
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

                    {/* Subtitle: Arrived Status Badge */}
                    <ViroText
                        text="📍 DESTINATION REACHED"
                        width={4}
                        height={0.6}
                        scale={[0.26, 0.26, 0.26]}
                        position={[0, 0.50, 0]}
                        style={{
                            fontFamily: 'Arial',
                            fontSize: 20,
                            fontWeight: 'bold',
                            color: '#E8B923',
                            textAlign: 'center',
                            textAlignVertical: 'center',
                        }}
                        materials={['glowArrowGold']}
                    />

                    {/* If modelUrl is available and hasn't errored, attempt 3D GLB model */}
                    {modelUrl && !modelError ? (
                        <Viro3DObject
                            source={{ uri: modelUrl }}
                            position={[0, 0, 0]}
                            scale={[0.038, 0.038, 0.038]}
                            type="GLB"
                            onError={(e) => {
                                console.warn('AR Model native load failed, falling back to 3D beacon:', e?.nativeEvent?.error || 'Failed to load model');
                                setModelError(true);
                            }}
                        />
                    ) : (
                        /* 3D Holographic Campus Landmark Monument */
                        <ViroNode position={[0, -0.05, 0]}>
                            {/* Rotating 3D Crystal Gem (Tilted Cube) */}
                            <ViroNode
                                rotation={[45, 45, 0]}
                                animation={{ name: 'spinBeacon', run: true, loop: true }}
                            >
                                <ViroBox
                                    position={[0, 0, 0]}
                                    scale={[0.26, 0.26, 0.26]}
                                    materials={['beaconCrystal']}
                                />
                            </ViroNode>

                            {/* Outer Ground Ring (Crimson) */}
                            <ViroPolyline
                                position={[0, -0.45, 0]}
                                points={[
                                    [0, 0, 0.5],
                                    [0.35, 0, 0.35],
                                    [0.5, 0, 0],
                                    [0.35, 0, -0.35],
                                    [0, 0, -0.5],
                                    [-0.35, 0, -0.35],
                                    [-0.5, 0, 0],
                                    [-0.35, 0, 0.35],
                                    [0, 0, 0.5],
                                ]}
                                thickness={0.03}
                                materials={['glowArrow']}
                            />

                            {/* Inner Ground Ring (Gold) */}
                            <ViroPolyline
                                position={[0, -0.45, 0]}
                                points={[
                                    [0, 0, 0.3],
                                    [0.21, 0, 0.21],
                                    [0.3, 0, 0],
                                    [0.21, 0, -0.21],
                                    [0, 0, -0.3],
                                    [-0.21, 0, -0.21],
                                    [-0.3, 0, 0],
                                    [-0.21, 0, 0.21],
                                    [0, 0, 0.3],
                                ]}
                                thickness={0.025}
                                materials={['glowArrowGold']}
                            />
                        </ViroNode>
                    )}
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
    beaconCrystal: {
        diffuseColor: '#E8B923',   // Glowing WMSU Gold
        lightingModel: 'Constant',
    },
    beaconBase: {
        diffuseColor: '#B21830',   // WMSU Crimson Red
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
    spinBeacon: {
        properties: {
            rotateY: '+=360',
        },
        duration: 4000,
        loop: true,
    },
});
