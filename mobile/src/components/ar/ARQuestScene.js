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
        onModelLoadingChange,
    } = sceneNavigator.viroAppProps || {};

    const [targetAngle, setTargetAngle] = useState(0);
    const [chevronPositions, setChevronPositions] = useState([]);
    const [hudPosition, setHudPosition] = useState([0, -0.1, -2]);
    const [modelError, setModelError] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);

    // Retain last valid modelUrl and buildingName so background network re-fetches cannot wipe them out mid-session
    const stableModelUrlRef = useRef(modelUrl);
    if (modelUrl) {
        stableModelUrlRef.current = modelUrl;
    }
    const effectiveModelUrl = modelUrl || stableModelUrlRef.current;

    const stableBuildingNameRef = useRef(buildingName);
    if (buildingName) {
        stableBuildingNameRef.current = buildingName;
    }
    const effectiveBuildingName = buildingName || stableBuildingNameRef.current;

    // Only reset model loaded/error if the model URL genuinely changes to a different string
    const prevModelUrlRef = useRef(effectiveModelUrl);
    useEffect(() => {
        if (effectiveModelUrl && effectiveModelUrl !== prevModelUrlRef.current) {
            prevModelUrlRef.current = effectiveModelUrl;
            setModelError(false);
            setModelLoaded(false);
        }
    }, [effectiveModelUrl]);

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

    // Latched arrival state with hysteresis:
    // Once arrived (<= 25m or isArrived), remains arrived until user walks far away (> 45m).
    // This eliminates flickering and disappearing models caused by natural GPS micro-drift.
    const [latchedArrived, setLatchedArrived] = useState(false);

    // Reset latched arrival whenever destination coordinates change
    useEffect(() => {
        setLatchedArrived(false);
    }, [targetLat, targetLng]);

    useEffect(() => {
        if (isArrived || (distanceToTarget !== null && distanceToTarget <= 25)) {
            setLatchedArrived(true);
        } else if (distanceToTarget !== null && distanceToTarget > 45) {
            setLatchedArrived(false);
        }
    }, [isArrived, distanceToTarget]);

    const isNearby = (distanceToTarget !== null && distanceToTarget <= 25) || isArrived;
    const hasArrived = isArrived || isNearby || latchedArrived;

    // Report model loading status to the parent 2D HUD overlay
    useEffect(() => {
        if (hasArrived && effectiveModelUrl && !modelLoaded && !modelError) {
            onModelLoadingChange?.(true);
        } else {
            onModelLoadingChange?.(false);
        }
    }, [hasArrived, effectiveModelUrl, modelLoaded, modelError, onModelLoadingChange]);

    /**
     * Recompute chevron and HUD world positions given a bearing angle and
     * the camera's current world-space position. Called from both the GPS
     * useEffect and the camera transform update so arrows always follow the user.
     */
    const recomputeNavPositions = useCallback((angle, camPos) => {
        const rad = (angle * Math.PI) / 180;
        const [cx, cy, cz] = camPos;
        // Single large road-marking arrow planted 1.8m ahead of the user.
        // The arrow assembly itself is wide at the base and tapers to the tip,
        // giving the road-painting perspective effect toward the building.
        setChevronPositions([{
            x: cx + 1.8 * Math.sin(rad),
            y: cy - 0.85,
            z: cz - 1.8 * Math.cos(rad),
            angle,
            pulseOffset: 0,
        }]);
        setHudPosition([
            cx + 3.5 * Math.sin(rad),
            cy - 0.1,
            cz - 3.5 * Math.cos(rad),
        ]);
    }, []);


    /**
     * Camera world-space transform update from ARCore/ARKit.
     * Throttled to ~4 Hz (250ms) AND distance delta (>= 24cm)
     * so chevrons smoothly lead the user forward as they walk.
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

        // Recompute if user physically walked >= 24cm or 800ms elapsed
        if (distSq >= 0.06 || timeDelta >= 800) {
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
            <ViroDirectionalLight color="#ffffff" direction={[0, -1, -1]} intensity={800} />
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
                    key={`nav-arrow-${index}`}
                    position={[chev.x, chev.y, chev.z]}
                    rotation={[0, -chev.angle, 0]}
                    scale={[1.4, 1.4, 1.4]}
                    animation={{
                        name: 'pulseChevron',
                        run: true,
                        loop: true,
                        delay: chev.pulseOffset,
                    }}
                >
                    {/*
                     * TAPERED ROAD-MARKING ARROW
                     *
                     * Mimics the perspective of a road/floor navigation marking:
                     * wide at the base (near user's feet), tapering to a narrow
                     * point toward the building — exactly like highway road paint.
                     *
                     * All geometry is flat on the ground (Y = 0.04 height).
                     * Arrow tip points forward (-Z / away from user).
                     *
                     *       ╲    ╱      ← Arrowhead wings (Gold, wide, rotated ±40°)
                     *        ╲  ╱
                     *         \/
                     *         ||  ← Shaft slab 4 — narrowest (0.16 wide)
                     *        ||||
                     *        |||| ← Shaft slab 3 (0.28 wide)
                     *       ||||||
                     *       |||||| ← Shaft slab 2 (0.40 wide)
                     *      ||||||||
                     *      |||||||| ← Shaft slab 1 — widest at user's feet (0.54 wide)
                     *        [YOU]
                     */}

                    {/* ── Shaft Slab 1 — widest, closest to user ── */}
                    <ViroBox
                        position={[0, 0, 0.62]}
                        scale={[0.54, 0.04, 0.22]}
                        materials={['glowArrow']}
                    />

                    {/* ── Shaft Slab 2 ── */}
                    <ViroBox
                        position={[0, 0, 0.38]}
                        scale={[0.40, 0.04, 0.22]}
                        materials={['glowArrow']}
                    />

                    {/* ── Shaft Slab 3 ── */}
                    <ViroBox
                        position={[0, 0, 0.14]}
                        scale={[0.28, 0.04, 0.22]}
                        materials={['glowArrow']}
                    />

                    {/* ── Shaft Slab 4 — narrowest, just before arrowhead ── */}
                    <ViroBox
                        position={[0, 0, -0.10]}
                        scale={[0.16, 0.04, 0.22]}
                        materials={['glowArrow']}
                    />

                    {/* ── Arrowhead: Left wing (Gold) ── */}
                    <ViroBox
                        position={[-0.30, 0, -0.34]}
                        rotation={[0, -40, 0]}
                        scale={[0.16, 0.04, 0.40]}
                        materials={['glowArrowGold']}
                    />

                    {/* ── Arrowhead: Right wing (Gold) ── */}
                    <ViroBox
                        position={[0.30, 0, -0.34]}
                        rotation={[0, 40, 0]}
                        scale={[0.16, 0.04, 0.40]}
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
                    {/* Target Building Name - Big Crimson Glow */}
                    <ViroText
                        text={buildingName || 'Destination'}
                        width={8}
                        height={1}
                        scale={[0.34, 0.34, 0.34]}
                        position={[0, 0.16, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 26, fontWeight: 'bold', color: '#B21830', textAlign: 'center', textAlignVertical: 'center' }}
                        materials={['glowArrow']}
                    />

                    {/* Distance Badge - Crimson Glow */}
                    <ViroText
                        text={`${Math.round(distanceToTarget)}m AWAY`}
                        width={6}
                        height={1}
                        scale={[0.24, 0.24, 0.24]}
                        position={[0, -0.06, 0]}
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
                <ViroNode position={[0, -0.60, -2.6]}>
                    {/* Header: Building Name (Hovering clearly above the building) */}
                    <ViroText
                        text={effectiveBuildingName || 'Destination'}
                        width={5}
                        height={1}
                        scale={[0.42, 0.42, 0.42]}
                        position={[0, 1.30, 0]}
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
                        position={[0, 1.05, 0]}
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

                    {/* Concentric Ground Rings Pedestal (Anchor base on the ground) */}
                    {/* Outer Ground Ring (Crimson) */}
                    <ViroPolyline
                        position={[0, 0, 0]}
                        points={[
                            [0, 0, 0.6],
                            [0.42, 0, 0.42],
                            [0.6, 0, 0],
                            [0.42, 0, -0.42],
                            [0, 0, -0.6],
                            [-0.42, 0, -0.42],
                            [-0.6, 0, 0],
                            [-0.42, 0, 0.42],
                            [0, 0, 0.6],
                        ]}
                        thickness={0.03}
                        materials={['glowArrow']}
                    />

                    {/* Inner Ground Ring (Gold) */}
                    <ViroPolyline
                        position={[0, 0, 0]}
                        points={[
                            [0, 0, 0.4],
                            [0.28, 0, 0.28],
                            [0.4, 0, 0],
                            [0.28, 0, -0.28],
                            [0, 0, -0.4],
                            [-0.28, 0, -0.28],
                            [-0.4, 0, 0],
                            [-0.28, 0, 0.28],
                            [0, 0, 0.4],
                        ]}
                        thickness={0.025}
                        materials={['glowArrowGold']}
                    />

                    {/* 3D Building Model (Smooth 360° turntable rotation on top of concentric ground rings) */}
                    {effectiveModelUrl && !modelError && (
                        <ViroNode
                            position={[0, 0, 0]}
                            animation={{
                                name: 'rotateModel',
                                run: modelLoaded,
                                loop: true,
                            }}
                        >
                            <Viro3DObject
                                source={{ uri: effectiveModelUrl }}
                                position={[0, 0, 0]}
                                scale={[0.038, 0.038, 0.038]}
                                type="GLB"
                                onLoadStart={() => {
                                    console.log('[ARQuestScene] Loading 3D model:', effectiveModelUrl);
                                }}
                                onLoadEnd={() => {
                                    console.log('[ARQuestScene] 3D Model loaded successfully');
                                    setModelLoaded(true);
                                }}
                                onError={(e) => {
                                    console.warn('[ARQuestScene] AR Model native load failed:', e?.nativeEvent?.error || 'Failed to load model');
                                    setModelError(true);
                                }}
                            />
                        </ViroNode>
                    )}

                    {/* While 3D model is loading, show clean gold status text floating above the ground rings */}
                    {effectiveModelUrl && !modelLoaded && !modelError && (
                        <ViroText
                            text="Loading 3D Model..."
                            width={4}
                            height={0.5}
                            scale={[0.22, 0.22, 0.22]}
                            position={[0, 0.35, 0]}
                            style={{
                                fontFamily: 'Arial',
                                fontSize: 18,
                                fontWeight: 'bold',
                                color: '#E8B923',
                                textAlign: 'center',
                                textAlignVertical: 'center',
                            }}
                            materials={['goldTextMaterial']}
                        />
                    )}

                    {/* Fallback text if 3D model fails to decode */}
                    {modelError && (
                        <ViroText
                            text="3D Model Unavailable"
                            width={4}
                            height={0.5}
                            scale={[0.20, 0.20, 0.20]}
                            position={[0, 0.35, 0]}
                            style={{
                                fontFamily: 'Arial',
                                fontSize: 16,
                                fontWeight: 'bold',
                                color: '#B21830',
                                textAlign: 'center',
                                textAlignVertical: 'center',
                            }}
                            materials={['textMaterial']}
                        />
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
    rotateModel: {
        properties: {
            rotateY: '+=360',
        },
        duration: 18000, // 18-second smooth continuous 360° turntable rotation from left to right
        easing: 'Linear',
        loop: true,
    },
    // Pulsing scale animation for ground runway chevrons.
    // Each chevron receives a staggered `delay` matching its pulseOffset,
    // so the pulse ripples forward (1st→2nd→3rd) like airport runway lights.
    pulseChevron: {
        properties: {
            scaleX: '+=0.18',
            scaleY: '+=0.18',
            scaleZ: '+=0.18',
        },
        duration: 900,
        easing: 'EaseInEaseOut',
        direction: 'Alternate',
    },
});

