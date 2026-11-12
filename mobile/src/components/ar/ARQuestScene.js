import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

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
    ViroImage,
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

/**
 * Horizontal forward vector (XZ plane) from Viro's camera quaternion [x, y, z, w].
 * Rotating (0, 0, -1) by the quaternion and projecting onto the ground gives the
 * direction the user is actually looking, which is where the arrived model should
 * sit so it follows the camera instead of a fixed compass bearing.
 */
function getHorizontalForward(rotation) {
    if (!rotation || rotation.length < 4) return { x: 0, z: -1 };
    const [qx, qy, qz, qw] = rotation;
    const fx = -2 * (qw * qy + qx * qz);
    const fz = 2 * (qx * qx + qy * qy) - 1;
    const len = Math.hypot(fx, fz);
    if (len < 0.0001) return { x: 0, z: -1 };
    return { x: fx / len, z: fz / len };
}

// ==== Arrived beacon =========================================================
// Stable, module-level props. Viro reloads a Viro3DObject whenever its `source`
// object identity changes, and the arrived anchor is repositioned several times
// per second while the user walks. Reusing the same constants and the same
// memoized element keeps the GLB mounted instead of unload/reload, which is what
// made the model blink out and come back on every step.
const ORIGIN = [0, 0, 0];
const ARRIVED_MODEL_SCALE = [0.038, 0.038, 0.038];
const ARRIVED_MODEL_ANIMATION = { name: 'rotateModel', run: true, loop: true };
const MODEL_NAME_SCALE = [0.42, 0.42, 0.42];
const MODEL_STATUS_SCALE = [0.28, 0.28, 0.28];
const MODEL_NOTE_SCALE = [0.22, 0.22, 0.22];
const MODEL_ERROR_SCALE = [0.20, 0.20, 0.20];
const OUTER_RING_POINTS = [
    [0, 0, 0.6],
    [0.42, 0, 0.42],
    [0.6, 0, 0],
    [0.42, 0, -0.42],
    [0, 0, -0.6],
    [-0.42, 0, -0.42],
    [-0.6, 0, 0],
    [-0.42, 0, 0.42],
    [0, 0, 0.6],
];
const INNER_RING_POINTS = [
    [0, 0, 0.4],
    [0.28, 0, 0.28],
    [0.4, 0, 0],
    [0.28, 0, -0.28],
    [0, 0, -0.4],
    [-0.28, 0, -0.28],
    [-0.4, 0, 0],
    [-0.28, 0, 0.28],
    [0, 0, 0.4],
];

/**
 * Arrived pedestal, name, status and GLB. Memoized so the camera-following
 * re-renders of the parent node only move it, never rebuild it.
 */
const ArrivedBeacon = React.memo(function ArrivedBeacon({
    buildingName,
    modelUri,
    isLoading,
    isUnavailable,
    onModelLoadStart,
    onModelLoadEnd,
    onModelError,
}) {
    const modelSource = useMemo(() => ({ uri: modelUri }), [modelUri]);

    return (
        <>
            <ViroText
                text={buildingName || 'Destination'}
                width={5}
                height={1}
                scale={MODEL_NAME_SCALE}
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

            <ViroText
                text="📍 YOU HAVE ARRIVED"
                width={5}
                height={0.8}
                scale={MODEL_STATUS_SCALE}
                position={[0, 1.05, 0]}
                style={{
                    fontFamily: 'Arial',
                    fontSize: 22,
                    fontWeight: 'bold',
                    color: '#E8B923',
                    textAlign: 'center',
                    textAlignVertical: 'center',
                }}
                materials={['glowArrowGold']}
            />

            <ViroPolyline
                position={ORIGIN}
                points={OUTER_RING_POINTS}
                thickness={0.03}
                materials={['glowArrow']}
            />

            <ViroPolyline
                position={ORIGIN}
                points={INNER_RING_POINTS}
                thickness={0.025}
                materials={['glowArrowGold']}
            />

            {modelUri && !isUnavailable && (
                <ViroNode position={ORIGIN} animation={ARRIVED_MODEL_ANIMATION}>
                    <Viro3DObject
                        source={modelSource}
                        position={ORIGIN}
                        scale={ARRIVED_MODEL_SCALE}
                        type="GLB"
                        onLoadStart={onModelLoadStart}
                        onLoadEnd={onModelLoadEnd}
                        onError={onModelError}
                    />
                </ViroNode>
            )}

            {modelUri && isLoading && !isUnavailable && (
                <ViroText
                    text="Loading 3D Model..."
                    width={4}
                    height={0.5}
                    scale={MODEL_NOTE_SCALE}
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

            {isUnavailable && (
                <ViroText
                    text="3D Model Unavailable"
                    width={4}
                    height={0.5}
                    scale={MODEL_ERROR_SCALE}
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
        </>
    );
});

export default function ARQuestScene(props) {
    const { sceneNavigator } = props;
    const {
        targetLat,
        targetLng,
        userLat,
        userLng,
        userHeading,
        modelUrl,
        modelFallbackUrl,
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
    // Camera-following position for the arrived 3D model — updated every camera frame
    const [arrivedModelPosition, setArrivedModelPosition] = useState([0, -0.60, -2.6]);

    // Retain last valid modelUrl and buildingName so background network re-fetches cannot wipe them out mid-session
    const stableModelUrlRef = useRef(modelUrl);
    if (modelUrl) {
        stableModelUrlRef.current = modelUrl;
    }
    const effectiveModelUrl = modelUrl || stableModelUrlRef.current;

    // Viro's support for local file:// model URIs is not guaranteed on every
    // device, so a failed local load falls back to the network URL once. The
    // override is tagged with the URL it belongs to so a target change cannot
    // inherit the previous building's fallback.
    const [sourceOverride, setSourceOverride] = useState(null);
    const sceneModelUri = useMemo(
        () =>
            sourceOverride && sourceOverride.forUrl === effectiveModelUrl
                ? sourceOverride.uri
                : effectiveModelUrl,
        [sourceOverride, effectiveModelUrl],
    );

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
    // Last horizontal camera-forward vector, used to detect turning so the
    // arrived model can stay in front of the user's view.
    const lastForwardRef = useRef([0, -1]);
    // Ref so onCameraTransformUpdate (a memoized callback) can read hasArrived without stale closure
    const hasArrivedRef = useRef(false);

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

    // Keep the callback ref in sync with the latest hasArrived value every render
    hasArrivedRef.current = hasArrived;

    // Seed an accurate arrived model position the instant hasArrived first becomes true
    // so the model appears in front of the user right away, before the next camera frame
    useEffect(() => {
        if (hasArrived) {
            const [cx, cy, cz] = cameraPositionRef.current;
            const [fx, fz] = lastForwardRef.current;
            setArrivedModelPosition([
                cx + 2.6 * fx,
                cy - 0.60,
                cz + 2.6 * fz,
            ]);
        }
    }, [hasArrived]);

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
        // Compact pedestrian dashed walking arrow planted 1.35m ahead of the user.
        // Subtle human-stride scale so it never dominates the screen.
        setChevronPositions([{
            x: cx + 1.35 * Math.sin(rad),
            y: cy - 0.85,
            z: cz - 1.35 * Math.cos(rad),
            angle,
            pulseOffset: 0,
        }]);
        setHudPosition([
            cx + 3.0 * Math.sin(rad),
            cy - 0.1,
            cz - 3.0 * Math.cos(rad),
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

        // Camera yaw, so the arrived model can follow the view direction.
        const forward = getHorizontalForward(camTransform?.cameraTransform?.rotation);
        const [lfx, lfz] = lastForwardRef.current;
        const viewDot = forward.x * lfx + forward.z * lfz;
        const turned = viewDot < 0.985; // ~10 degrees of yaw change

        // Recompute if the user physically walked >= 24cm, turned >= 10deg,
        // or 800ms elapsed (whichever comes first).
        if (distSq >= 0.06 || turned || timeDelta >= 800) {
            lastRecomputeTimeRef.current = now;
            lastAnchorPosRef.current = [pos[0], pos[1], pos[2]];
            lastForwardRef.current = [forward.x, forward.z];

            if (hasArrivedRef.current) {
                // Keep the arrived model directly in front of the camera, so
                // turning around does not hide it. The model stays planted in
                // world space and only re-anchors when the view really changes.
                setArrivedModelPosition([
                    pos[0] + 2.6 * forward.x,
                    pos[1] - 0.60,
                    pos[2] + 2.6 * forward.z,
                ]);
            } else {
                recomputeNavPositions(lastAngleRef.current, pos);
            }
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

    // Stable handlers for the memoized arrived beacon. Recreating these on every
    // camera frame would change the props identity, defeat React.memo and make
    // the GLB reload (blink) again.
    const handleModelLoadStart = useCallback(() => {
        console.log('[ARQuestScene] Loading 3D model:', sceneModelUri);
    }, [sceneModelUri]);

    const handleModelLoadEnd = useCallback(() => {
        console.log('[ARQuestScene] 3D Model loaded successfully');
        setModelLoaded(true);
    }, []);

    const handleModelErrorEvent = useCallback((e) => {
        console.warn(
            '[ARQuestScene] AR Model native load failed:',
            e?.nativeEvent?.error || 'Failed to load model'
        );
        // A cached file:// path may be unsupported by the native renderer;
        // retry once with the network URL, otherwise fall back to the text.
        if (modelFallbackUrl && sceneModelUri !== modelFallbackUrl) {
            setSourceOverride({
                forUrl: effectiveModelUrl,
                uri: modelFallbackUrl,
            });
            setModelLoaded(false);
            return;
        }
        setModelError(true);
    }, [modelFallbackUrl, sceneModelUri, effectiveModelUrl]);

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
                    scale={[1.0, 1.0, 1.0]}
                    animation={{
                        name: 'pulseChevron',
                        run: true,
                        loop: true,
                        delay: chev.pulseOffset,
                    }}
                >
                    {/*
                     * GROUND COMPASS MARK
                     *
                     * Fixed crimson ring with a solid navigation arrow, taken
                     * from the reference mark. The node above rotates it to the
                     * target bearing, so the arrow always points the way to walk
                     * while the ring reads as a dial on the pavement.
                     */}
                    <ViroImage
                        source={require('../../../assets/images/nav-compass-arrow.png')}
                        rotation={[-90, 0, 0]}
                        width={0.85}
                        height={0.85}
                        position={[0, 0, 0]}
                        format="RGBA8"
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
                <ViroNode position={arrivedModelPosition}>
                    <ArrivedBeacon
                        buildingName={effectiveBuildingName}
                        modelUri={sceneModelUri}
                        isLoading={
                            Boolean(sceneModelUri) && !modelLoaded && !modelError
                        }
                        isUnavailable={modelError}
                        onModelLoadStart={handleModelLoadStart}
                        onModelLoadEnd={handleModelLoadEnd}
                        onModelError={handleModelErrorEvent}
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
            scaleX: '+=0.04',
            scaleY: '+=0.04',
            scaleZ: '+=0.04',
        },
        duration: 1200,
        easing: 'EaseInEaseOut',
        direction: 'Alternate',
    },
});

