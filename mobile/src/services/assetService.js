import * as FileSystem from 'expo-file-system/legacy';
import api from './api';

const CACHE_DIR = `${FileSystem.cacheDirectory}arquest_assets/`;

const ensureCacheDir = async () => {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
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

    getLocalPath: (assetId, version) => {
        return `${CACHE_DIR}asset_${assetId}_v${version}`;
    },

    isCached: async (assetId, version) => {
        const path = assetService.getLocalPath(assetId, version);
        const info = await FileSystem.getInfoAsync(path);
        return info.exists;
    },

    downloadAsset: async (url, assetId, version, onProgress) => {
        await ensureCacheDir();
        const localUri = assetService.getLocalPath(assetId, version);
        
        // Cleanup old versions
        try {
            const dirContent = await FileSystem.readDirectoryAsync(CACHE_DIR);
            const oldFiles = dirContent.filter(f => f.startsWith(`asset_${assetId}_`) && !f.includes(`_v${version}`));
            for (const oldFile of oldFiles) {
                await FileSystem.deleteAsync(`${CACHE_DIR}${oldFile}`, { idempotent: true });
            }
        } catch (e) {
            console.warn('Failed to cleanup old assets:', e);
        }

        const downloadResumable = FileSystem.createDownloadResumable(
            url,
            localUri,
            {},
            (downloadProgress) => {
                if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
                    const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                    onProgress(progress);
                }
            }
        );

        const result = await downloadResumable.downloadAsync();
        if (!result) {
            throw new Error("Download failed");
        }
        return result.uri;
    },

    clearCache: async () => {
        await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
        await ensureCacheDir();
    }
};
