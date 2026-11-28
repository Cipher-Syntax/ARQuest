// src/utils/ar-model.js
//
// Pure model-readiness resolution for the AR Scanner. Kept free of React, Viro,
// and theme imports so the phase rules can be exercised by a Node harness.
//
// The AR screen already knows four independent things:
//   1. whether the target has a 3D model at all (`has_model`),
//   2. whether this user may load it (`model_url` is server-gated by unlock),
//   3. whether the student is physically inside the active building,
//   4. what the asset cache and the Viro scene report.
// This module turns those into one honest phase.

export const MODEL_PHASE = {
    NONE: "none",
    NO_MODEL: "no_model",
    LOCKED: "locked",
    UNLOCKING: "unlocking",
    UNLOCK_FAILED: "unlock_failed",
    CHECKING: "checking",
    DOWNLOADING: "downloading",
    PREPARING: "preparing",
    READY: "ready",
    UNAVAILABLE: "unavailable",
};

const BUSY_PHASES = new Set([
    MODEL_PHASE.UNLOCKING,
    MODEL_PHASE.CHECKING,
    MODEL_PHASE.DOWNLOADING,
    MODEL_PHASE.PREPARING,
]);

/**
 * Resolve the single model phase for the active AR target.
 *
 * `unlockStatus` is "idle" | "unlocking" | "failed".
 * `progressStatus` is the asset cache status: null | "checking" | "downloading"
 * | "ready" | "fallback".
 * `sceneStatus` is the Viro report: "idle" | "loading" | "loaded" | "error".
 */
export function resolveModelPhase({
    hasTarget = false,
    hasModel = false,
    hasModelUrl = false,
    isInsideActiveBuilding = false,
    unlockStatus = "idle",
    progressStatus = null,
    sceneStatus = "idle",
} = {}) {
    if (!hasTarget) return MODEL_PHASE.NONE;
    if (!hasModel) return MODEL_PHASE.NO_MODEL;

    // The server withholds model_url until the student holds an unlock. Until
    // then there is nothing to download, so report why instead of pretending.
    if (!hasModelUrl) {
        if (unlockStatus === "failed") return MODEL_PHASE.UNLOCK_FAILED;
        if (unlockStatus === "unlocking" || isInsideActiveBuilding) {
            return MODEL_PHASE.UNLOCKING;
        }
        return MODEL_PHASE.LOCKED;
    }

    // The URL is available from here on.
    if (sceneStatus === "error") return MODEL_PHASE.UNAVAILABLE;
    if (progressStatus === "downloading") return MODEL_PHASE.DOWNLOADING;
    if (progressStatus === "checking") return MODEL_PHASE.CHECKING;
    if (sceneStatus === "loaded") return MODEL_PHASE.READY;

    if (
        progressStatus === "ready" ||
        progressStatus === "fallback" ||
        sceneStatus === "loading"
    ) {
        return MODEL_PHASE.PREPARING;
    }

    return MODEL_PHASE.CHECKING;
}

export function isModelPhaseBusy(phase) {
    return BUSY_PHASES.has(phase);
}

/**
 * Tone drives the colour choice in the HUD and the arrival card without the
 * utility knowing the theme: "success" | "error" | "warning" | "neutral".
 */
export function modelPhaseTone(phase) {
    switch (phase) {
        case MODEL_PHASE.READY:
            return "success";
        case MODEL_PHASE.UNLOCK_FAILED:
        case MODEL_PHASE.UNAVAILABLE:
            return "error";
        case MODEL_PHASE.LOCKED:
        case MODEL_PHASE.UNLOCKING:
        case MODEL_PHASE.CHECKING:
        case MODEL_PHASE.DOWNLOADING:
        case MODEL_PHASE.PREPARING:
            return "warning";
        default:
            return "neutral";
    }
}

/** Compact, uppercase label for the AR header. */
export function formatModelPhaseLabel(
    phase,
    { percent = null, sizeLabel = "SIZE UNAVAILABLE" } = {},
) {
    const hasPercent = Number.isFinite(percent);
    switch (phase) {
        case MODEL_PHASE.NO_MODEL:
            return "3D MODEL NOT AVAILABLE";
        case MODEL_PHASE.LOCKED:
            return "MOVE CLOSER TO UNLOCK";
        case MODEL_PHASE.UNLOCKING:
            return "UNLOCKING BUILDING…";
        case MODEL_PHASE.UNLOCK_FAILED:
            return "UNLOCK FAILED · MOVE CLOSER";
        case MODEL_PHASE.CHECKING:
            return `CHECKING MODEL · ${sizeLabel}`;
        case MODEL_PHASE.DOWNLOADING:
            return hasPercent
                ? `DOWNLOADING ${percent}% / 100% · ${sizeLabel}`
                : `DOWNLOADING MODEL · ${sizeLabel}`;
        case MODEL_PHASE.PREPARING:
            return `PREPARING MODEL · ${sizeLabel}`;
        case MODEL_PHASE.READY:
            return "✓ 3D MODEL READY";
        case MODEL_PHASE.UNAVAILABLE:
            return "3D MODEL UNAVAILABLE";
        default:
            return "";
    }
}

/** Sentence-case label for the arrival card. */
export function formatModelPhaseCardLabel(phase, { percent = null } = {}) {
    const hasPercent = Number.isFinite(percent);
    switch (phase) {
        case MODEL_PHASE.NO_MODEL:
            return "No 3D model for this building.";
        case MODEL_PHASE.LOCKED:
            return "Move inside the geofence to unlock the 3D model.";
        case MODEL_PHASE.UNLOCKING:
            return "Unlocking building…";
        case MODEL_PHASE.UNLOCK_FAILED:
            return "Unlock failed. Move closer; it will retry.";
        case MODEL_PHASE.CHECKING:
            return "Checking saved model…";
        case MODEL_PHASE.DOWNLOADING:
            return hasPercent
                ? `Downloading 3D model… ${percent}%`
                : "Downloading 3D model…";
        case MODEL_PHASE.PREPARING:
            return "Preparing 3D model…";
        case MODEL_PHASE.READY:
            return "3D model ready.";
        case MODEL_PHASE.UNAVAILABLE:
            return "3D model unavailable.";
        default:
            return "";
    }
}
