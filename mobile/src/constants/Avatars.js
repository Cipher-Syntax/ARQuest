/**
 * Fallback avatar catalog (used when server catalog is unavailable).
 * Server catalog from /api/auth/avatars/ takes precedence when available.
 */
export const AVATARS = [
    {
        id: "explorer_1",
        source: require("../../assets/avatars/explorer_1.png"),
        fallback: true,
    },
    {
        id: "explorer_2",
        source: require("../../assets/avatars/explorer_2.png"),
        fallback: true,
    },
    {
        id: "mascot_1",
        source: require("../../assets/avatars/mascot_1.png"),
        fallback: true,
    },
    {
        id: "student_1",
        source: require("../../assets/avatars/student_1.png"),
        fallback: true,
    },
    {
        id: "student_2",
        source: require("../../assets/avatars/student_2.png"),
        fallback: true,
    },
    {
        id: "visitor_1",
        source: require("../../assets/avatars/visitor_1.png"),
        fallback: true,
    },
];

/**
 * Get avatar source by ID from fallback catalog.
 * Used when server avatar is not available.
 */
export const getFallbackAvatarSource = (avatarId) => {
    const avatar = AVATARS.find((a) => a.id === avatarId);
    return avatar?.source ?? AVATARS[0].source;
};

/**
 * Get all fallback avatars.
 */
export const getFallbackAvatars = () => {
    return [...AVATARS];
};
