/**
 * Pure Home dashboard helpers.
 *
 * Kept free of React and React Native imports so the copy rules can be unit
 * tested without mounting a screen.
 */

/**
 * Builds the "Ask Justine" hint for the student's current state, in priority
 * order: pending daily missions first, then an all-cleared celebration, then a
 * generic campus-exploration nudge.
 */
export function buildJustineHint({
    activeQuests = [],
    hasCompletedAllToday = false,
    nearestBuilding = null,
    distanceToNearest = null,
} = {}) {
    let title = "Ready for Adventure! 🎒";
    let message =
        "Welcome to WMSU! Explore buildings, follow walking paths on the map, and scan AR markers across campus to earn EXP and level up!";

    if (activeQuests && activeQuests.length > 0) {
        title = "Missions Waiting! 🎯";
        const targetBuilding = nearestBuilding
            ? nearestBuilding.name
            : "campus buildings";
        const distInfo =
            distanceToNearest !== null
                ? ` (about ${distanceToNearest}m away)`
                : "";
        message = `You have ${activeQuests.length} daily mission(s) ready! The closest facility is ${targetBuilding}${distInfo}. Head over to begin your quest!`;
    } else if (hasCompletedAllToday) {
        title = "All Daily Missions Cleared! 🏆";
        message =
            "Awesome job clearing your daily missions today! You can still explore campus buildings on the map, inspect 3D models in the Explore tab, or view your rank on the Leaderboard!";
    } else {
        title = "Campus Exploration 🗺️";
        message =
            "Check the Maps tab anytime to pull up campus walking paths, or head over to any landmark and tap the AR button to scan for EXP!";
    }

    return { title, message };
}
