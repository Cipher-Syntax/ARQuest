import * as Device from "expo-device";

/**
 * Device performance tiers:
 * - 'low':  Budget devices <= 3.5GB RAM, older GPUs (e.g. Mali-G52, Adreno 506).
 * - 'mid':  Mid-range devices <= 6.5GB RAM (e.g. Helio G99, Snapdragon 700 series).
 * - 'high': Flagships > 6.5GB RAM (e.g. Snapdragon 8 Gen, Dimensity 9000, A-series).
 */

let cachedTier = null;

export function getDeviceTier() {
    if (cachedTier) return cachedTier;

    try {
        const totalMem = Device.totalMemory; // in bytes
        if (totalMem && totalMem > 0) {
            const memGB = totalMem / (1024 * 1024 * 1024);
            if (memGB <= 3.5) {
                cachedTier = "low";
            } else if (memGB <= 6.5) {
                cachedTier = "mid";
            } else {
                cachedTier = "high";
            }
        } else {
            // Default to mid if totalMemory is not reported
            cachedTier = "mid";
        }
    } catch {
        cachedTier = "mid";
    }

    return cachedTier;
}

export function getDeviceTierSettings() {
    const tier = getDeviceTier();

    switch (tier) {
        case "low":
            return {
                tier: "low",
                pixelRatio: 1.0,
                maxPanoramaResolution: 2048,
                shadowsEnabled: false,
                antialias: false,
                gyroIntervalMs: 40, // 25 FPS
                arChevronCount: 2,
                maxTextureAnisotropy: 1,
            };
        case "high":
            return {
                tier: "high",
                pixelRatio: 2.0,
                maxPanoramaResolution: 8192,
                shadowsEnabled: true,
                antialias: true,
                gyroIntervalMs: 16, // 60 FPS
                arChevronCount: 5,
                maxTextureAnisotropy: 8,
            };
        case "mid":
        default:
            return {
                tier: "mid",
                pixelRatio: 1.5,
                maxPanoramaResolution: 4096,
                shadowsEnabled: false,
                antialias: true,
                gyroIntervalMs: 33, // 30 FPS
                arChevronCount: 4,
                maxTextureAnisotropy: 4,
            };
    }
}
