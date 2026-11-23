import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import {
    ViroARScene,
    Viro3DObject,
    ViroAmbientLight,
    ViroPolyline,
    ViroPolygon,
    ViroMaterials,
    ViroNode,
    ViroText,
    ViroAnimations,
    ViroDirectionalLight,
} from '@reactvision/react-viro';


import { getDistance, getRhumbLineBearing } from 'geolib';
import baseTheme, { colors } from '../../theme/tokens';

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
    brandColor,
    isLoading,
    isUnavailable,
    onModelLoadStart,
    onModelLoadEnd,
    onModelError,
}) {
    const modelSource = useMemo(() => ({ uri: modelUri }), [modelUri]);
    const primaryColor = brandColor || colors.primary;

    // Rotate only after the GLB has actually loaded. Starting Viro's native
    // animation before onLoadEnd makes a model that later fails/unloads crash
    // the C++ animation thread when the node is torn down.
    const isModelReady = Boolean(modelUri) && !isLoading && !isUnavailable;
    const modelAnimation = useMemo(
        () => ({ name: 'rotateModel', run: isModelReady, loop: true }),
        [isModelReady],
    );

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
                    color: primaryColor,
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

            {/* The animated wrapper must stay mounted for as long as the model
                exists. Viro crashes in native code when a node with a running
                animation is unmounted, so an unavailable model toggles the GLB
                out and stops the animation instead of removing the node. */}
            {modelUri && (
                <ViroNode position={ORIGIN} animation={modelAnimation}>
                    {!isUnavailable && (
                        <Viro3DObject
                            source={modelSource}
                            position={ORIGIN}
                            scale={ARRIVED_MODEL_SCALE}
                            type="GLB"
                            onLoadStart={onModelLoadStart}
                            onLoadEnd={onModelLoadEnd}
                            onError={onModelError}
                        />
                    )}
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
                        color: primaryColor,
                        textAlign: 'center',
                        textAlignVertical: 'center',
                    }}
                    materials={['textMaterial']}
                />
            )}
        </>
    );
});

// ==== Ground guide path ======================================================
// Three stacked arrowheads on the ground, like the reference design, with a red
// border on each and no lane behind them. Built from ViroPolygon so they lie flat and need no textures.
// Everything below is module-level and computed once, so the memoized component
// never rebuilds while the parent re-renders.
//
// Local axes inside the guide node: +Z is the direction of travel (the parent
// node adds a 180 degree turn so +Z points at the destination) and +X is right.
// ViroPolygon is drawn in the XY plane, so each polygon is rotated -90 degrees
// around X to lie flat. After that rotation polygon +Y maps to -Z, so a forward
// distance f is stored as polygon y = -f.
const GROUND_ROTATION = [-90, 0, 0];

// Arrowhead: a swept-back dart with a notch in the tail. The concave shape is
// split into two triangles so triangulation can never go wrong.
// Points are [x, forward] around the arrow's own center.
// The last arrow is a plain pointed triangle: its notch sits on the back edge,
// so the tail is flat and the shape ends in a single point.
const ARROW_TIP = [0, 0.28];
const ARROW_WING_LEFT = [-0.34, -0.22];
const ARROW_WING_RIGHT = [0.34, -0.22];
const ARROW_NOTCH = [0, -0.08];
const ARROW_NOTCH_POINTED = [0, -0.22];

// Border thickness in meters at scale 1. The border sits outside the gold shape,
// so the gold arrow keeps its size and the outline is added around it.
const ARROW_BORDER = 0.035;

// Pushes every edge of a counter-clockwise outline outward by d. Corners use a
// mitre join, so the border has the same thickness along every edge.
function offsetOutline(points, d) {
    const n = points.length;
    return points.map((p, i) => {
        const a = points[(i + n - 1) % n];
        const b = points[(i + 1) % n];
        const e1 = [p[0] - a[0], p[1] - a[1]];
        const e2 = [b[0] - p[0], b[1] - p[1]];
        const l1 = Math.hypot(e1[0], e1[1]);
        const l2 = Math.hypot(e2[0], e2[1]);
        const n1 = [e1[1] / l1, -e1[0] / l1];
        const n2 = [e2[1] / l2, -e2[0] / l2];
        const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
        return [p[0] + (n1[0] + n2[0]) * k, p[1] + (n1[1] + n2[1]) * k];
    });
}

// Returns the two body triangles plus the border as four flat quads, one per
// edge. The border is a ring (not a filled shape underneath), so a faded gold
// arrow never gets tinted red by what is behind it.
function buildArrow(scale, pointed) {
    const outline = [
        ARROW_TIP,
        ARROW_WING_LEFT,
        pointed ? ARROW_NOTCH_POINTED : ARROW_NOTCH,
        ARROW_WING_RIGHT,
    ];
    const outer = offsetOutline(outline, ARROW_BORDER);
    const toPolygon = ([x, f]) => [x * scale, -f * scale];
    const [tip, wingL, notch, wingR] = outline.map(toPolygon);

    const border = outline.map((_, i) => {
        const j = (i + 1) % outline.length;
        return [
            toPolygon(outline[i]),
            toPolygon(outline[j]),
            toPolygon(outer[j]),
            toPolygon(outer[i]),
        ];
    });

    return {
        left: [tip, wingL, notch],
        right: [tip, notch, wingR],
        border,
    };
}

// Closest arrow is largest and brightest; the other arrows remain visibly
// separated and static to avoid a shimmering/pulsing trail in the live camera.
const ARROW_SPECS = [
    { z: -0.05, scale: 1.0, material: 'trailArrow0', borderMaterial: 'trailBorder0' },
    { z: 1.2, scale: 0.78, material: 'trailArrow1', borderMaterial: 'trailBorder1' },
    { z: 2.4, scale: 0.58, material: 'trailArrow2', borderMaterial: 'trailBorder2', pointed: true },
];

const ARROWS = ARROW_SPECS.map((spec) => ({
    material: spec.material,
    borderMaterial: spec.borderMaterial,
    position: [0, 0.012, spec.z],
    shape: buildArrow(spec.scale, spec.pointed),
}));

/**
 * Ground guide: three stacked gold arrowheads with a red border, no background.
 *
 *   TOP-DOWN VIEW (travel direction is up):
 *
 *          /\            far, small, faded, plain point
 *         /__\
 *
 *        /\  /\          middle
 *       /  \/  \
 *
 *      /\      /\        near, large, solid
 *     /  \_  _/  \
 *    /_____\/_____\
 *
 * The parent ViroNode rotates the whole assembly to the target bearing.
 */
const GuidePath = React.memo(function GuidePath() {
    return (
        <ViroNode>
            {ARROWS.map((arrow, i) => (
                <ViroNode
                    key={`arrow-${i}`}
                    position={arrow.position}
                    animation={arrow.animation}
                >
                    {/* Solid gold arrowhead */}
                    <ViroPolygon
                        position={ORIGIN}
                        rotation={GROUND_ROTATION}
                        vertices={arrow.shape.left}
                        materials={[arrow.material]}
                    />
                    <ViroPolygon
                        position={ORIGIN}
                        rotation={GROUND_ROTATION}
                        vertices={arrow.shape.right}
                        materials={[arrow.material]}
                    />

                    {/* Red border around the arrowhead, one quad per edge */}
                    {arrow.shape.border.map((quad, j) => (
                        <ViroPolygon
                            key={`border-${j}`}
                            position={ORIGIN}
                            rotation={GROUND_ROTATION}
                            vertices={quad}
                            materials={[arrow.borderMaterial]}
                        />
                    ))}
                </ViroNode>
            ))}
        </ViroNode>
    );
});

/**
 * Main AR Scene Component
 * Renders the AR navigation guide path, HUD billboard, and arrived beacon.
 */
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
        brandColor,
    } = sceneNavigator.viroAppProps || {};

    const primaryColor = brandColor || colors.primary;

    const [targetAngle, setTargetAngle] = useState(0);
    const [chevronPositions, setChevronPositions] = useState([]);
    const [hudPosition, setHudPosition] = useState([0, -0.1, -2]);
    const [modelError, setModelError] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);
    // Camera-following position for the arrived 3D model — updated every camera frame
    const [arrivedModelPosition, setArrivedModelPosition] = useState([0, -0.60, -2.6]);

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
        const hasModelSource = effectiveModelUrl || modelFallbackUrl;
        if (hasArrived && hasModelSource && !modelLoaded && !modelError) {
            onModelLoadingChange?.(true);
        } else {
            onModelLoadingChange?.(false);
        }
    }, [hasArrived, effectiveModelUrl, modelFallbackUrl, modelLoaded, modelError, onModelLoadingChange]);

    /**
     * Recompute chevron and HUD world positions given a bearing angle and
     * the camera's current world-space position. Called from both the GPS
     * useEffect and the camera transform update so arrows always follow the user.
     */
    const recomputeNavPositions = useCallback((angle, camPos) => {
        const rad = (angle * Math.PI) / 180;
        const [cx, cy, cz] = camPos;
        // Three chevrons forming a trail: closest=largest, furthest=smallest.
        // Spaced ~1.35m apart so they read as a dotted path on the ground.
        const spacing = 1.35;
        const baseY = cy - 0.85;
        setChevronPositions([
            // 1st chevron — closest to user, largest
            {
                x: cx + spacing * Math.sin(rad),
                y: baseY,
                z: cz - spacing * Math.cos(rad),
                angle,
                scale: 1.15,
                pulseOffset: 0,
            },
            // 2nd chevron — medium
            {
                x: cx + 2 * spacing * Math.sin(rad),
                y: baseY,
                z: cz - 2 * spacing * Math.cos(rad),
                angle,
                scale: 0.85,
                pulseOffset: 200,
            },
            // 3rd chevron — furthest, smallest
            {
                x: cx + 3 * spacing * Math.sin(rad),
                y: baseY,
                z: cz - 3 * spacing * Math.cos(rad),
                angle,
                scale: 0.6,
                pulseOffset: 400,
            },
        ]);
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

        // Recompute only after meaningful movement or a real turn. Re-anchoring
        // on a timer while stationary lets camera tracking noise make the guide
        // visibly shimmer in place.
        if (distSq >= 0.06 || turned) {
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

    // The guide path is one group of arrows anchored at the first chevron position.
    // The other two entries from recomputeNavPositions are no longer needed.
    const guide = chevronPositions[0];

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
                1. 3D AR NAVIGATION PATH (Stacked Arrowheads)
                Three flat gold arrowheads with a red border that shrink and fade
                toward the destination. The last one is a plain pointed tip.
                Position is offset from the camera's current world-space
                position so it follows the user as they walk.
                Hidden when arrived at the destination.
                ============================================================
            */}
            {!hasArrived && guide && (
                <ViroNode
                    position={[guide.x, guide.y, guide.z]}
                    // +180° because GuidePath is built with +Z as the travel direction
                    rotation={[0, -guide.angle + 180, 0]}
                >
                    <GuidePath />
                </ViroNode>
            )}




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
                        style={{ fontFamily: 'Arial', fontSize: 26, fontWeight: 'bold', color: primaryColor, textAlign: 'center', textAlignVertical: 'center' }}
                        materials={['glowArrow']}
                    />

                    {/* Distance Badge - Crimson Glow */}
                    <ViroText
                        text={`${Math.round(distanceToTarget)}m AWAY`}
                        width={6}
                        height={1}
                        scale={[0.24, 0.24, 0.24]}
                        position={[0, -0.06, 0]}
                        style={{ fontFamily: 'Arial', fontSize: 22, fontWeight: 'bold', color: primaryColor, textAlign: 'center', textAlignVertical: 'center' }}
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
                        brandColor={primaryColor}
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
// Seeded with the base palette so the first frame has a valid material.
ViroMaterials.createMaterials({
    glowArrow: {
        diffuseColor: colors.primary,
        lightingModel: 'Constant', // Unaffected by dark environments
    },
    glowArrowGold: {
        diffuseColor: '#E8B923',   // WMSU Gold
        lightingModel: 'Constant',
    },

    // Guide arrowheads: WMSU Gold, fading with distance (closest is solid).
    trailArrow0: {
        diffuseColor: '#E8B923',
        lightingModel: 'Constant',
        blendMode: 'Alpha',
        opacity: 1.0,
        cullMode: 'None',
    },
    trailArrow1: {
        diffuseColor: '#E8B923',
        lightingModel: 'Constant',
        blendMode: 'Alpha',
        opacity: 0.85,
        cullMode: 'None',
    },
    trailArrow2: {
        diffuseColor: '#E8B923',
        lightingModel: 'Constant',
        blendMode: 'Alpha',
        opacity: 0.65,
        cullMode: 'None',
    },

    // Red border: base color, same opacity steps as the arrow it outlines.
    trailBorder0: {
        diffuseColor: colors.primary,
        lightingModel: 'Constant',
        blendMode: 'Alpha',
        opacity: 1.0,
        cullMode: 'None',
    },
    trailBorder1: {
        diffuseColor: colors.primary,
        lightingModel: 'Constant',
        blendMode: 'Alpha',
        opacity: 0.85,
        cullMode: 'None',
    },
    trailBorder2: {
        diffuseColor: colors.primary,
        lightingModel: 'Constant',
        blendMode: 'Alpha',
        opacity: 0.65,
        cullMode: 'None',
    },

    beaconCrystal: {
        diffuseColor: '#E8B923',   // Glowing WMSU Gold
        lightingModel: 'Constant',
    },
    beaconBase: {
        diffuseColor: colors.primary,
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
});
