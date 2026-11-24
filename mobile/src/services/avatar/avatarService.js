import * as AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api";
import { getFallbackAvatars, getFallbackAvatarSource } from "../../constants/Avatars";

const AVATAR_CACHE_KEY = "arquest_avatar_catalog";
const AVATAR_CACHE_TIMESTAMP_KEY = "arquest_avatar_catalog_timestamp";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Mobile Avatar Service
 * Fetches avatar catalog from server, caches in AsyncStorage for offline support,
 * and falls back to hardcoded catalog when needed.
 */
export const avatarService = {
    /**
     * Fetch avatar catalog from server API.
     * Returns all avatars (newest first).
     */
    fetchCatalog: async () => {
        try {
            const response = await api.get("/api/auth/avatars/");
            const avatars = response.data?.data || [];
            return avatars;
        } catch (error) {
            console.warn("Failed to fetch avatar catalog from server:", error.message);
            throw error;
        }
    },

    /**
     * Get cached avatar catalog from AsyncStorage.
     * Returns null if cache is missing or expired.
     */
    getCachedCatalog: async () => {
        try {
            const [cachedData, timestamp] = await Promise.all([
                AsyncStorage.getItem(AVATAR_CACHE_KEY),
                AsyncStorage.getItem(AVATAR_CACHE_TIMESTAMP_KEY),
            ]);

            if (!cachedData || !timestamp) return null;

            const cacheAge = Date.now() - parseInt(timestamp, 10);
            if (cacheAge > CACHE_TTL_MS) {
                // Cache expired
                await avatarService.clearCache();
                return null;
            }

            return JSON.parse(cachedData);
        } catch (error) {
            console.warn("Failed to read avatar cache:", error.message);
            return null;
        }
    },

    /**
     * Save avatar catalog to AsyncStorage cache.
     */
    setCachedCatalog: async (avatars) => {
        try {
            await Promise.all([
                AsyncStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(avatars)),
                AsyncStorage.setItem(AVATAR_CACHE_TIMESTAMP_KEY, Date.now().toString()),
            ]);
        } catch (error) {
            console.warn("Failed to write avatar cache:", error.message);
        }
    },

    /**
     * Clear avatar cache.
     */
    clearCache: async () => {
        try {
            await Promise.all([
                AsyncStorage.removeItem(AVATAR_CACHE_KEY),
                AsyncStorage.removeItem(AVATAR_CACHE_TIMESTAMP_KEY),
            ]);
        } catch (error) {
            console.warn("Failed to clear avatar cache:", error.message);
        }
    },

    /**
     * Get avatar catalog with fallback support.
     * Priority: 1) Server catalog (if online), 2) Cached catalog, 3) Hardcoded fallback.
     */
    getCatalog: async (options = {}) => {
        const { forceRefresh = false } = options;

        // Try server first (unless offline or forceRefresh is false and we have valid cache)
        if (!forceRefresh) {
            const cached = await avatarService.getCachedCatalog();
            if (cached) {
                return { avatars: cached, source: "cache" };
            }
        }

        try {
            const serverAvatars = await avatarService.fetchCatalog();
            await avatarService.setCachedCatalog(serverAvatars);
            return { avatars: serverAvatars, source: "server" };
        } catch (error) {
            // Server failed, try cache
            const cached = await avatarService.getCachedCatalog();
            if (cached) {
                return { avatars: cached, source: "cache" };
            }

            // Fallback to hardcoded avatars
            const fallbackAvatars = getFallbackAvatars().map((a) => ({
                id: a.id,
                image_url: null, // Will use local source
                fallback: true,
                source: a.source,
            }));
            return { avatars: fallbackAvatars, source: "fallback" };
        }
    },

    /**
     * Get avatar image URI for a given avatar ID.
     * Checks server catalog first, then cache, then fallback.
     */
    getAvatarUri: async (avatarId) => {
        if (!avatarId) return getFallbackAvatarSource("explorer_1");

        try {
            const { avatars } = await avatarService.getCatalog();
            const avatar = avatars.find((a) => a.id === avatarId);

            if (avatar) {
                if (avatar.image_url) {
                    return avatar.image_url;
                }
                if (avatar.source) {
                    return avatar.source; // Local fallback source
                }
            }
        } catch (error) {
            console.warn("Error getting avatar URI:", error.message);
        }

        // Final fallback
        return getFallbackAvatarSource(avatarId);
    },

    /**
     * Preload avatar catalog on app startup.
     * Call this during app initialization.
     */
    preloadCatalog: async () => {
        try {
            await avatarService.getCatalog({ forceRefresh: true });
        } catch (error) {
            console.warn("Avatar catalog preload failed:", error.message);
        }
    },
};