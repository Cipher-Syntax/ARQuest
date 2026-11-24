import { useEffect, useState } from "react";

/**
 * Registry of on-screen elements that onboarding overlays (OnboardingTutorial,
 * JustineGuideModal) need to highlight.
 *
 * Elements register themselves with `registerTourTarget(id, node)` from a ref
 * callback; overlays measure them live with `useTourTarget`, so highlights follow
 * the real layout (safe-area insets, font scale, header height, scroll position)
 * instead of hard-coded pixel offsets.
 *
 * Registered Views must set `collapsable={false}` or Android may flatten them
 * out of the native hierarchy and `measureInWindow` returns nothing.
 */

const targets = new Map();

export const TAB_TARGET_PREFIX = "tab-";
export const HOME_MISSION_TARGET = "home-mission-card";

export function tabTargetId(routeName) {
    return `${TAB_TARGET_PREFIX}${routeName}`;
}

export function registerTourTarget(id, node) {
    if (node) targets.set(id, node);
    else targets.delete(id);
}

function measureNode(node) {
    return new Promise((resolve) => {
        if (!node || typeof node.measureInWindow !== "function") {
            resolve(null);
            return;
        }
        const timer = setTimeout(() => resolve(null), 400);
        try {
            node.measureInWindow((x, y, width, height) => {
                clearTimeout(timer);
                if (
                    !Number.isFinite(x) ||
                    !Number.isFinite(y) ||
                    !(width > 0) ||
                    !(height > 0)
                ) {
                    resolve(null);
                    return;
                }
                resolve({ x, y, width, height });
            });
        } catch {
            clearTimeout(timer);
            resolve(null);
        }
    });
}

/**
 * Measure a registered target. When `originNode` (the overlay container) is
 * given, the result is expressed in that container's coordinate space, so the
 * overlay lines up even if its window differs from the app window (translucent
 * status/navigation bars, Modal quirks, etc.).
 */
export async function measureTourTarget(id, originNode) {
    const rect = await measureNode(targets.get(id));
    if (!rect) return null;

    let origin = { x: 0, y: 0, height: null };
    if (originNode) {
        const measured = await measureNode(originNode);
        if (measured) origin = measured;
    }

    const x = rect.x - origin.x;
    const y = rect.y - origin.y;
    return {
        x,
        y,
        width: rect.width,
        height: rect.height,
        cx: x + rect.width / 2,
        cy: y + rect.height / 2,
        containerHeight: origin.height,
    };
}

function sameRect(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
        Math.abs(a.x - b.x) < 0.5 &&
        Math.abs(a.y - b.y) < 0.5 &&
        Math.abs(a.width - b.width) < 0.5 &&
        Math.abs(a.height - b.height) < 0.5 &&
        a.containerHeight === b.containerHeight
    );
}

// The target may still be settling (tab switch, safe-area insets, data load),
// so re-measure a few times and keep the latest valid rect.
const REMEASURE_DELAYS_MS = [0, 120, 300, 650, 1100];

/**
 * Live rect of a registered target, in the coordinate space of `containerRef`.
 * Returns null until a valid measurement exists (or when `id` is falsy).
 */
export function useTourTarget(id, containerRef, active) {
    const [rect, setRect] = useState(null);

    useEffect(() => {
        if (!active || !id) return undefined;

        let cancelled = false;
        const run = async () => {
            const next = await measureTourTarget(id, containerRef?.current);
            if (cancelled || !next) return;
            setRect((prev) => (sameRect(prev, next) ? prev : next));
        };

        const timers = REMEASURE_DELAYS_MS.map((delay) => setTimeout(run, delay));
        return () => {
            cancelled = true;
            timers.forEach(clearTimeout);
        };
    }, [id, active, containerRef]);

    return active && id ? rect : null;
}
