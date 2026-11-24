/**
 * Hardcoded fallback avatar catalog.
 * Used when server catalog is unavailable or during initial load.
 * Empty — server catalog is the single source of truth.
 */
export const FALLBACK_AVATARS = [];

// In-memory cache for server avatar catalog
let avatarCatalogCache = null;
let avatarCatalogPromise = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch avatar catalog from server API.
 * Returns all avatars (newest first).
 * Memoizes result in memory for the session.
 */
export const fetchAvatarCatalog = async (options = {}) => {
    const { forceRefresh = false } = options;

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && avatarCatalogCache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
        return avatarCatalogCache;
    }

    // Return existing promise if fetch is in progress
    if (avatarCatalogPromise && !forceRefresh) {
        return avatarCatalogPromise;
    }

    // Create new fetch promise
    avatarCatalogPromise = (async () => {
        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
            const response = await fetch(`${apiBase}/api/auth/avatars/`, {
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const avatars = data?.data || [];

            // Transform to match expected format
            const catalog = avatars.map((avatar) => ({
                id: avatar.id,
                image_url: avatar.image_url,
                uri: avatar.image_url, // For compatibility
                created_at: avatar.created_at,
            }));

            avatarCatalogCache = catalog;
            cacheTimestamp = Date.now();
            return catalog;
        } catch (error) {
            console.warn("Failed to fetch avatar catalog from server:", error.message);
            throw error;
        } finally {
            avatarCatalogPromise = null;
        }
    })();

    return avatarCatalogPromise;
};

/**
 * Get avatar catalog with fallback support.
 * Priority: 1) Server catalog (memoized), 2) Hardcoded fallback.
 */
export const getAvatarCatalog = async () => {
    try {
        return await fetchAvatarCatalog();
    } catch (error) {
        // Return fallback catalog on any error
        return FALLBACK_AVATARS.map((a) => ({
            ...a,
            fallback: true,
        }));
    }
};

/**
 * Get avatar URI by ID.
 * Checks server catalog first (memoized), then falls back to hardcoded map.
 * This is a synchronous function for immediate rendering - use getAvatarUriAsync for async.
 */
export const getAvatarUri = (avatarId) => {
    if (!avatarId) return null;

    // First check memoized server catalog
    if (avatarCatalogCache) {
        const avatar = avatarCatalogCache.find((a) => a.id === avatarId);
        if (avatar?.image_url) return avatar.image_url;
        if (avatar?.uri) return avatar.uri;
    }

    // Fall back to hardcoded catalog
    const fallback = FALLBACK_AVATARS.find((a) => a.id === avatarId);
    return fallback ? fallback.uri : null;
};

/**
 * Async version of getAvatarUri that ensures catalog is loaded.
 * Use this when you can await (e.g., in useEffect or event handlers).
 */
export const getAvatarUriAsync = async (avatarId) => {
    if (!avatarId) return null;

    try {
        const catalog = await getAvatarCatalog();
        const avatar = catalog.find((a) => a.id === avatarId);
        if (avatar?.image_url) return avatar.image_url;
        if (avatar?.uri) return avatar.uri;
    } catch (error) {
        console.warn("Error getting avatar URI:", error.message);
    }

    // Final fallback
    const fallback = FALLBACK_AVATARS.find((a) => a.id === avatarId);
    return fallback ? fallback.uri : null;
};

/**
 * Preload avatar catalog on app startup.
 * Call this during app initialization.
 */
export const preloadAvatarCatalog = async () => {
    try {
        await fetchAvatarCatalog({ forceRefresh: true });
    } catch (error) {
        console.warn("Avatar catalog preload failed:", error.message);
    }
};

/**
 * Clear the avatar catalog cache (useful for testing or after admin updates).
 */
export const clearAvatarCatalogCache = () => {
    avatarCatalogCache = null;
    avatarCatalogPromise = null;
    cacheTimestamp = 0;
};

export const getProfileImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (
        imageUrl.startsWith("http://") ||
        imageUrl.startsWith("https://") ||
        imageUrl.startsWith("blob:") ||
        imageUrl.startsWith("data:")
    ) {
        return imageUrl;
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    return `${apiBase.replace(/\/$/, "")}/${imageUrl.replace(/^\//, "")}`;
};

