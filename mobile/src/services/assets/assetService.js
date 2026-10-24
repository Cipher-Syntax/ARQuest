import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api";

// Models are stored in the document directory, NOT the cache directory: the OS
// is free to purge cacheDirectory whenever storage runs low, which silently
// undoes every download. evictIfCacheFull() owns the lifecycle instead.
const ROOT_DIR =
    FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
const CACHE_DIR = `${ROOT_DIR}arquest_assets/`;

const ACCESS_TIMES_KEY = "@arquest_asset_lru_index";
const LEGACY_PURGE_KEY = "@arquest_asset_legacy_purge_done";

// The budget is derived from free space instead of a fixed 150MB ceiling: the
// campus models total well past that, so a fixed cap guaranteed thrashing.
const MIN_BUDGET_BYTES = 50 * 1024 * 1024;
const MAX_BUDGET_BYTES = 800 * 1024 * 1024;
const FREE_SPACE_SHARE = 0.25;
const EVICTION_TARGET_RATIO = 0.8;

// 510 KiB per read. Must be a multiple of 3 so each slice encodes to valid,
// pad-free base64 that concatenates into a well-formed stream.
const STREAM_CHUNK_BYTES = 510 * 1024;

// Above this, the WebView's own base64 join would need more heap than a phone
// can spare. Compressed campus models top out well below it.
const MAX_INLINE_MODEL_BYTES = 48 * 1024 * 1024;

// Panorama textures are only inlined as data URIs; past this size the remote
// URL is cheaper than the in-memory copy.
const MAX_INLINE_IMAGE_BYTES = 8 * 1024 * 1024;

const ensureCacheDir = async () => {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
};

const getAccessTimes = async () => {
    try {
        const raw = await AsyncStorage.getItem(ACCESS_TIMES_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const recordAssetAccess = async (filename) => {
    try {
        const times = await getAccessTimes();
        times[filename] = Date.now();
        await AsyncStorage.setItem(ACCESS_TIMES_KEY, JSON.stringify(times));
    } catch (e) {
        console.warn("Failed to record asset access time:", e);
    }
};

/**
 * Stable, short fingerprint of a file URL. Used as part of the cache filename
 * so a re-uploaded model (which gets a new stored filename) can never be
 * confused with the copy already on disk, while an unchanged URL keeps hitting
 * the same file forever.
 */
const hashUrl = (url) => {
    const clean = String(url || "").split("?")[0];
    if (!clean) return "00000000";
    let hash = 0x811c9dc5;
    for (let i = 0; i < clean.length; i++) {
        hash ^= clean.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
};

const sanitizeSegment = (value) =>
    String(value ?? "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 80) || "asset";

const extensionFor = (fileUrl) => {
    if (fileUrl) {
        const clean = fileUrl.split("?")[0];
        const match = clean.match(/\.([a-zA-Z0-9]+)$/);
        if (match) return `.${match[1].toLowerCase()}`;
    }
    return ".glb";
};

export const assetService = {
    getBuildingAssets: async (buildingId) => {
        const response = await api.get(`/api/buildings/${buildingId}/assets/`);
        return response.data.data;
    },

    getAssetMetadata: async (assetId) => {
        const response = await api.get(`/api/assets/${assetId}/metadata/`);
        return response.data.data;
    },

    /**
     * Canonical cache identity for a building's 3D model.
     *
     * Production stores the model on Building.model_file, not BuildingAsset, so
     * the URL is the only reliable identity: its filename changes on re-upload.
     * model_version is used when present to catch same-filename replacements.
     *
     * Every surface (AR, Explore prefetch, 3D viewer, virtual tour) must call
     * this so they all read and write the same cache entry.
     */
    getModelKey: (building) => {
        if (!building) return null;
        const url = building.model_url || building.modelUrl || null;
        if (!url) return null;
        const rawVersion =
            building.model_version ?? building.modelVersion ?? 1;
        const version = String(rawVersion).replace(/\D/g, "") || "1";
        const id = building.id || building.buildingId;
        if (!id) return null;
        return { url, assetId: id, version };
    },

    getLocalPath: (assetId, version, fileUrl = "") => {
        const id = sanitizeSegment(assetId);
        const ver = sanitizeSegment(version);
        return `${CACHE_DIR}asset_${id}_v${ver}_${hashUrl(fileUrl)}${extensionFor(
            fileUrl,
        )}`;
    },

    isCached: async (assetId, version, fileUrl = "") => {
        const path = assetService.getLocalPath(assetId, version, fileUrl);
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists && info.size > 0) {
            const filename = path.replace(CACHE_DIR, "");
            // Awaited so a concurrent eviction pass sees this access and
            // cannot delete a file that is about to be read.
            await recordAssetAccess(filename);
            return true;
        }
        return false;
    },

    /** Budget in bytes, derived from the device's actual free space. */
    getCacheBudget: async () => {
        try {
            const free = await FileSystem.getFreeDiskStorageAsync();
            if (!free || free <= 0) return MIN_BUDGET_BYTES;
            return Math.max(
                MIN_BUDGET_BYTES,
                Math.min(MAX_BUDGET_BYTES, Math.floor(free * FREE_SPACE_SHARE)),
            );
        } catch {
            return MIN_BUDGET_BYTES;
        }
    },

    downloadAsset: async (url, assetId, version, onProgress) => {
        await ensureCacheDir();
        await assetService.purgeLegacyCacheKeys();

        const localUri = assetService.getLocalPath(assetId, version, url);
        const filename = localUri.replace(CACHE_DIR, "");
        const idPrefix = `asset_${sanitizeSegment(assetId)}_v`;

        // Drop any other copy of this asset (older version, or the same model
        // under a previous file hash) so replacements never leave orphans.
        try {
            const dirContent = await FileSystem.readDirectoryAsync(CACHE_DIR);
            const staleFiles = dirContent.filter(
                (f) => f.startsWith(idPrefix) && f !== filename,
            );
            for (const staleFile of staleFiles) {
                await FileSystem.deleteAsync(`${CACHE_DIR}${staleFile}`, {
                    idempotent: true,
                });
            }
        } catch (e) {
            console.warn("Failed to cleanup old asset versions:", e);
        }

        // Never evict the file we are about to write.
        await assetService.evictIfCacheFull([filename]);

        const downloadResumable = FileSystem.createDownloadResumable(
            url,
            localUri,
            {},
            (downloadProgress) => {
                if (
                    onProgress &&
                    downloadProgress.totalBytesExpectedToWrite > 0
                ) {
                    const progress =
                        downloadProgress.totalBytesWritten /
                        downloadProgress.totalBytesExpectedToWrite;
                    onProgress(progress);
                }
            },
        );

        const result = await downloadResumable.downloadAsync();
        if (!result) {
            throw new Error("Download failed");
        }

        await recordAssetAccess(filename);
        // Enforce the budget again now that the real file size is known.
        await assetService.evictIfCacheFull([filename]);
        return result.uri;
    },

    /**
     * Stream a cached model to the WebView as base64 chunks, reading from disk
     * one slice at a time so peak memory stays bounded regardless of file size.
     *
     * Contract: this method delivers exactly one load sequence. If it returns
     * false it has already posted the `init` fallback (when provided), so the
     * caller must NOT post another `init` or the model gets fetched twice.
     */
    streamModelToWebView: async (
        localUri,
        webViewRef,
        fallbackUrl = null,
        extraData = {},
    ) => {
        const postFallback = () => {
            if (fallbackUrl && webViewRef?.current) {
                webViewRef.current.postMessage(
                    JSON.stringify({
                        type: "init",
                        modelUrl: fallbackUrl,
                        ...extraData,
                    }),
                );
                return true;
            }
            return false;
        };

        try {
            if (!webViewRef?.current) return false;

            const info = await FileSystem.getInfoAsync(localUri);
            if (!info.exists || info.size === 0) {
                postFallback();
                return false;
            }

            if (info.size > MAX_INLINE_MODEL_BYTES) {
                console.warn(
                    `[assetService] Model ${(info.size / 1048576).toFixed(
                        1,
                    )}MB exceeds the inline limit; streaming from network.`,
                );
                postFallback();
                return false;
            }

            const totalChunks = Math.ceil(info.size / STREAM_CHUNK_BYTES);

            webViewRef.current.postMessage(
                JSON.stringify({
                    type: "model_chunk_start",
                    totalChunks: totalChunks,
                    totalBytes: info.size,
                    fallbackUrl: fallbackUrl,
                    ...extraData,
                }),
            );

            for (let index = 0; index < totalChunks; index++) {
                if (!webViewRef.current) return false;

                const position = index * STREAM_CHUNK_BYTES;
                const length = Math.min(
                    STREAM_CHUNK_BYTES,
                    info.size - position,
                );

                const chunk = await FileSystem.readAsStringAsync(localUri, {
                    encoding: FileSystem.EncodingType.Base64,
                    position,
                    length,
                });

                webViewRef.current.postMessage(
                    JSON.stringify({
                        type: "model_chunk",
                        index,
                        chunk,
                    }),
                );

                // Let the bridge drain so a fast disk does not flood the queue.
                await new Promise((resolve) => setTimeout(resolve, 0));
            }

            return true;
        } catch (e) {
            console.error("Failed to stream cached model to WebView:", e);
            postFallback();
            return false;
        }
    },

    /**
     * Read a small cached asset as a data URI so a WebView can display it
     * without a network request (file:// is blocked from an https-baseUrl
     * WebView). Returns null when the file is missing or too large.
     */
    getAssetDataUri: async (localUri, mimeType = "image/jpeg") => {
        try {
            const info = await FileSystem.getInfoAsync(localUri);
            if (!info.exists || info.size === 0) return null;
            if (info.size > MAX_INLINE_IMAGE_BYTES) return null;

            const base64 = await FileSystem.readAsStringAsync(localUri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            return `data:${mimeType};base64,${base64}`;
        } catch (e) {
            console.warn("Failed to read asset as data URI:", e);
            return null;
        }
    },

    clearCache: async () => {
        await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
        await AsyncStorage.removeItem(ACCESS_TIMES_KEY);
        await ensureCacheDir();
    },

    getCacheSize: async () => {
        try {
            await ensureCacheDir();
            const dirContent = await FileSystem.readDirectoryAsync(CACHE_DIR);
            let totalSize = 0;
            for (const file of dirContent) {
                const info = await FileSystem.getInfoAsync(`${CACHE_DIR}${file}`);
                if (info.exists && !info.isDirectory) {
                    totalSize += info.size;
                }
            }
            return totalSize;
        } catch (e) {
            console.error("Failed to get cache size", e);
            return 0;
        }
    },

    /**
     * One-time cleanup of files written by the old key scheme, which stored the
     * same model twice per surface (`asset_building_<id>_model_v<timestamp>`).
     */
    purgeLegacyCacheKeys: async () => {
        try {
            const done = await AsyncStorage.getItem(LEGACY_PURGE_KEY);
            if (done === "1") return;

            await ensureCacheDir();
            const dirContent = await FileSystem.readDirectoryAsync(CACHE_DIR);
            const legacy = dirContent.filter((f) =>
                f.startsWith("asset_building_"),
            );
            for (const file of legacy) {
                await FileSystem.deleteAsync(`${CACHE_DIR}${file}`, {
                    idempotent: true,
                });
            }
            await AsyncStorage.setItem(LEGACY_PURGE_KEY, "1");
        } catch (e) {
            console.warn("Failed to purge legacy cache keys:", e);
        }
    },

    /**
     * Evict least-recently-used files until the cache fits its budget.
     * Files in `protect` are never deleted (e.g. the model being opened).
     */
    evictIfCacheFull: async (protect = []) => {
        try {
            await ensureCacheDir();
            const dirContent = await FileSystem.readDirectoryAsync(CACHE_DIR);
            if (dirContent.length === 0) return;

            const budget = await assetService.getCacheBudget();
            const accessTimes = await getAccessTimes();
            const protectSet = new Set(protect);
            const fileEntries = [];
            let totalSize = 0;

            for (const file of dirContent) {
                const info = await FileSystem.getInfoAsync(`${CACHE_DIR}${file}`);
                if (info.exists && !info.isDirectory) {
                    totalSize += info.size;
                    fileEntries.push({
                        name: file,
                        path: `${CACHE_DIR}${file}`,
                        size: info.size,
                        lastAccessed:
                            accessTimes[file] ||
                            (info.modificationTime
                                ? info.modificationTime * 1000
                                : 0),
                    });
                }
            }

            if (totalSize <= budget) {
                return;
            }

            const targetSize = Math.floor(budget * EVICTION_TARGET_RATIO);
            console.log(
                `Cache size (${(totalSize / 1048576).toFixed(
                    1,
                )}MB) exceeds budget (${(budget / 1048576).toFixed(
                    1,
                )}MB). Evicting down to ${(targetSize / 1048576).toFixed(1)}MB...`,
            );

            fileEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);

            let currentSize = totalSize;
            for (const file of fileEntries) {
                if (currentSize <= targetSize) break;
                if (protectSet.has(file.name)) continue;
                try {
                    await FileSystem.deleteAsync(file.path, {
                        idempotent: true,
                    });
                    currentSize -= file.size;
                    delete accessTimes[file.name];
                } catch (delErr) {
                    console.warn(`Failed to evict file ${file.name}:`, delErr);
                }
            }

            await AsyncStorage.setItem(
                ACCESS_TIMES_KEY,
                JSON.stringify(accessTimes),
            );
        } catch (e) {
            console.warn("Failed to run LRU cache eviction", e);
        }
    },
};
