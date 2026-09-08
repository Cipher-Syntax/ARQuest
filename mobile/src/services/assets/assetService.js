import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api";

const CACHE_DIR = `${FileSystem.cacheDirectory}arquest_assets/`;
const ACCESS_TIMES_KEY = "@arquest_asset_lru_index";
const MAX_CACHE_SIZE_BYTES = 150 * 1024 * 1024; // Strict 150MB ceiling
const TARGET_CLEAN_SIZE_BYTES = 110 * 1024 * 1024; // Evict down to 110MB for headroom

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

export const assetService = {
    getBuildingAssets: async (buildingId) => {
        const response = await api.get(`/api/buildings/${buildingId}/assets/`);
        return response.data.data;
    },

    getAssetMetadata: async (assetId) => {
        const response = await api.get(`/api/assets/${assetId}/metadata/`);
        return response.data.data;
    },

    getLocalPath: (assetId, version, fileUrl = "") => {
        let ext = ".glb";
        if (fileUrl) {
            const clean = fileUrl.split("?")[0];
            const match = clean.match(/\.([a-zA-Z0-9]+)$/);
            if (match) ext = `.${match[1]}`;
        }
        return `${CACHE_DIR}asset_${assetId}_v${version}${ext}`;
    },

    isCached: async (assetId, version, fileUrl = "") => {
        const path = assetService.getLocalPath(assetId, version, fileUrl);
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists && info.size > 0) {
            const filename = path.replace(CACHE_DIR, "");
            recordAssetAccess(filename);
            return true;
        }
        return false;
    },

    downloadAsset: async (url, assetId, version, onProgress) => {
        await ensureCacheDir();
        await assetService.evictIfCacheFull(MAX_CACHE_SIZE_BYTES);

        const localUri = assetService.getLocalPath(assetId, version, url);
        const filename = localUri.replace(CACHE_DIR, "");

        // Cleanup older versions of the same asset
        try {
            const dirContent = await FileSystem.readDirectoryAsync(CACHE_DIR);
            const oldFiles = dirContent.filter(
                (f) =>
                    f.startsWith(`asset_${assetId}_`) &&
                    !f.includes(`_v${version}`),
            );
            for (const oldFile of oldFiles) {
                await FileSystem.deleteAsync(`${CACHE_DIR}${oldFile}`, {
                    idempotent: true,
                });
            }
        } catch (e) {
            console.warn("Failed to cleanup old asset versions:", e);
        }

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
        return result.uri;
    },

    streamModelToWebView: async (localUri, webViewRef, fallbackUrl = null, extraData = {}) => {
        try {
            if (!webViewRef?.current) return false;

            const info = await FileSystem.getInfoAsync(localUri);
            if (!info.exists || info.size === 0) {
                if (fallbackUrl && webViewRef.current) {
                    webViewRef.current.postMessage(
                        JSON.stringify({ type: "init", modelUrl: fallbackUrl, ...extraData }),
                    );
                }
                return false;
            }

            // Stream cached binary as 512KB base64 chunks
            if (info.size <= 25 * 1024 * 1024) {
                const base64 = await FileSystem.readAsStringAsync(localUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                const CHUNK_SIZE = 512 * 1024;
                const totalChunks = Math.ceil(base64.length / CHUNK_SIZE);

                webViewRef.current.postMessage(
                    JSON.stringify({
                        type: "model_chunk_start",
                        totalChunks: totalChunks,
                        totalBytes: base64.length,
                        fallbackUrl: fallbackUrl,
                        ...extraData,
                    }),
                );

                for (let i = 0; i < totalChunks; i++) {
                    const chunk = base64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                    webViewRef.current.postMessage(
                        JSON.stringify({
                            type: "model_chunk",
                            index: i,
                            chunk: chunk,
                        }),
                    );
                }
                return true;
            } else {
                if (fallbackUrl && webViewRef.current) {
                    webViewRef.current.postMessage(
                        JSON.stringify({ type: "init", modelUrl: fallbackUrl, ...extraData }),
                    );
                }
                return false;
            }
        } catch (e) {
            console.error("Failed to stream cached model to WebView:", e);
            if (fallbackUrl && webViewRef?.current) {
                webViewRef.current.postMessage(
                    JSON.stringify({ type: "init", modelUrl: fallbackUrl, ...extraData }),
                );
            }
            return false;
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

    evictIfCacheFull: async (maxSizeBytes = MAX_CACHE_SIZE_BYTES) => {
        try {
            await ensureCacheDir();
            const dirContent = await FileSystem.readDirectoryAsync(CACHE_DIR);
            if (dirContent.length === 0) return;

            const accessTimes = await getAccessTimes();
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
                        lastAccessed: accessTimes[file] || (info.modificationTime ? info.modificationTime * 1000 : 0),
                    });
                }
            }

            if (totalSize <= maxSizeBytes) {
                return;
            }

            console.log(
                `Cache size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds ${maxSizeBytes / 1024 / 1024}MB limit. Performing LRU eviction...`,
            );

            // Sort files by last accessed ascending (oldest first)
            fileEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);

            let currentSize = totalSize;
            for (const file of fileEntries) {
                if (currentSize <= TARGET_CLEAN_SIZE_BYTES) {
                    break;
                }
                try {
                    await FileSystem.deleteAsync(file.path, { idempotent: true });
                    currentSize -= file.size;
                    delete accessTimes[file.name];
                    console.log(`LRU evicted: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
                } catch (delErr) {
                    console.warn(`Failed to evict file ${file.name}:`, delErr);
                }
            }

            await AsyncStorage.setItem(ACCESS_TIMES_KEY, JSON.stringify(accessTimes));
            console.log(`Cache size reduced to ${(currentSize / 1024 / 1024).toFixed(2)}MB.`);
        } catch (e) {
            console.warn("Failed to run LRU cache eviction", e);
        }
    },
};
