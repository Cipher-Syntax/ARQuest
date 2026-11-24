/**
 * Fallback avatar catalog (used when server catalog is unavailable).
 * Server catalog from /api/auth/avatars/ takes precedence when available.
 * Empty — server catalog is the single source of truth.
 */
export const AVATARS = [];

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
