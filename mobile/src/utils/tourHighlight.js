import { useSyncExternalStore } from "react";

/**
 * Shared state for the onboarding overlays (OnboardingTutorial, JustineGuideModal).
 *
 * The overlays never measure or guess screen coordinates. Instead the element
 * being highlighted draws its own highlight, so it is centered by construction:
 *   - CustomTabBar draws a ring around the highlighted tab's own icon
 *   - the Home mission card draws its own frame / arrow / speech bubble
 * The overlays only say *what* to highlight (this store) and stop above the tab
 * bar (`tabBarHeight`, reported by the tab bar's own onLayout).
 */

// Order of the tab routes in (tabs)/_layout.js — five equal-width slots.
export const TAB_ORDER = ["index", "buildings", "ar", "explore", "profile"];

const IDLE = {
    tab: null, // route name of the highlighted tab, or null
    tone: "primary", // "primary" | "gold"
    pulse: false, // animate the ring
    missionCard: false, // highlight the Home Daily Objective card
    missionText: "", // speech shown next to the highlighted mission card
    tabBarHeight: 0, // reported by the tab bar (includes the bottom inset)
};

let state = IDLE;
const listeners = new Set();

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return state;
}

export function setTourHighlight(patch) {
    const next = { ...state, ...patch };
    if (Object.keys(next).every((key) => next[key] === state[key])) return;
    state = next;
    listeners.forEach((listener) => listener());
}

export function clearTourHighlight() {
    setTourHighlight({
        tab: null,
        tone: "primary",
        pulse: false,
        missionCard: false,
        missionText: "",
    });
}

export function useTourHighlight() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Horizontal center of a tab slot for a row of the given width (equal slots). */
export function tabCenterX(tab, width) {
    const index = TAB_ORDER.indexOf(tab);
    if (index < 0 || !(width > 0)) return null;
    return (width * (index + 0.5)) / TAB_ORDER.length;
}
