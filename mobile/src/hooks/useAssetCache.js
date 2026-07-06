import { useState, useCallback } from "react";
import { assetService } from "../services/assetService";

export function useAssetCache() {
    const [state, setState] = useState({
        isLoading: false,
        progress: 0,
        error: null,
        localUri: null,
    });

    const loadAsset = useCallback(async (asset) => {
        setState((prev) => ({
            ...prev,
            isLoading: true,
            error: null,
            progress: 0,
        }));
        try {
            const cached = await assetService.isCached(asset.id, asset.version);
            if (cached) {
                const uri = assetService.getLocalPath(asset.id, asset.version);
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    localUri: uri,
                    progress: 1,
                }));
                return uri;
            }

            if (!asset.file_url) {
                throw new Error("Asset URL is missing");
            }

            const uri = await assetService.downloadAsset(
                asset.file_url,
                asset.id,
                asset.version,
                (progress) => {
                    setState((prev) => ({ ...prev, progress }));
                },
            );

            setState((prev) => ({
                ...prev,
                isLoading: false,
                localUri: uri,
                progress: 1,
            }));
            return uri;
        } catch (err) {
            console.error("Error loading asset:", err);
            const fallbackUrl = asset.file_url;
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: err.message || "Failed to download asset",
                localUri: fallbackUrl,
            }));
            return fallbackUrl;
        }
    }, []);

    return { ...state, loadAsset };
}
