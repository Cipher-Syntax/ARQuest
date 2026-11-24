// src/hooks/useARModelCache.js
import { useState, useEffect, useRef, useCallback } from "react";
import { assetService } from "../services";

/**
 * Custom hook for AR model caching and loading:
 * - Downloads and caches 3D models (GLB) for offline use
 * - Tracks download progress with percentage
 * - Provides stable model URL references to prevent flicker
 * - Handles fallback to network streaming when cache unavailable
 */
export function useARModelCache({
    activeTarget,
    isTargetMode,
    navTargetFull,
    nearbyBuildingFull,
}) {
    const [cachedModel, setCachedModel] = useState(null);
    const [modelDownloadProgress, setModelDownloadProgress] = useState(null);
    const prefetchedModelKeysRef = useRef(new Set());

    // Stable references to prevent background geofence re-fetches from wiping model/name mid-session
    const stableModelUrlRef = useRef(null);
    const candidateModelUrl = activeTarget?.model_url;
    if (candidateModelUrl) {
        stableModelUrlRef.current = candidateModelUrl;
    }
    const effectiveModelUrl = candidateModelUrl || (isTargetMode ? null : stableModelUrlRef.current);

    // Model caching effect
    useEffect(() => {
        const targetBldg = navTargetFull || (!isTargetMode ? nearbyBuildingFull : null);
        const key = assetService.getModelKey(targetBldg);

        // No model for this target
        if (!key) return;

        let cancelled = false;
        const targetId = targetBldg.id;

        const resolveModel = async () => {
            const localPath = assetService.getLocalPath(
                key.assetId,
                key.version,
                key.url,
            );
            setModelDownloadProgress({ id: targetId, progress: null, status: "checking" });

            try {
                if (
                    await assetService.isCached(
                        key.assetId,
                        key.version,
                        key.url,
                    )
                ) {
                    if (!cancelled) {
                        setCachedModel({ id: targetId, uri: localPath });
                        setModelDownloadProgress({ id: targetId, progress: 1, status: "ready" });
                    }
                    return;
                }

                const prefetchKey = `${key.assetId}_v${key.version}_${key.url}`;
                if (prefetchedModelKeysRef.current.has(prefetchKey)) {
                    if (!cancelled) {
                        setCachedModel({ id: targetId, uri: key.url });
                        setModelDownloadProgress({ id: targetId, progress: null, status: "fallback" });
                    }
                    return;
                }
                prefetchedModelKeysRef.current.add(prefetchKey);
                if (!cancelled) {
                    setModelDownloadProgress({ id: targetId, progress: null, status: "downloading" });
                }

                try {
                    const downloadedUri = await assetService.downloadAsset(
                        key.url,
                        key.assetId,
                        key.version,
                        (progress) => {
                            if (!cancelled) {
                                setModelDownloadProgress({ id: targetId, progress, status: "downloading" });
                            }
                        },
                        targetBldg.model_file_size,
                    );
                    if (!cancelled) {
                        setCachedModel({ id: targetId, uri: downloadedUri });
                        setModelDownloadProgress({ id: targetId, progress: 1, status: "ready" });
                    }
                } finally {
                    prefetchedModelKeysRef.current.delete(prefetchKey);
                }
            } catch (e) {
                console.warn(
                    "AR model cache unavailable, streaming from network:",
                    e,
                );
                if (!cancelled) {
                    setCachedModel({ id: targetId, uri: key.url });
                    setModelDownloadProgress({ id: targetId, progress: null, status: "fallback" });
                }
            }
        };

        resolveModel();

        return () => {
            cancelled = true;
        };
    }, [
        navTargetFull?.id,
        isTargetMode ? null : nearbyBuildingFull?.id,
        navTargetFull?.model_url,
        isTargetMode ? null : nearbyBuildingFull?.model_url,
        navTargetFull?.model_version,
        isTargetMode ? null : nearbyBuildingFull?.model_version,
    ]);

    // Only trust a cached URI that belongs to the building currently targeted
    const matchingCachedModel = Boolean(
        cachedModel && activeTarget?.id != null && cachedModel.id === activeTarget.id
    );
    const matchingModelProgress = Boolean(
        modelDownloadProgress && activeTarget?.id != null && modelDownloadProgress.id === activeTarget.id
    );
    const activeModelUri = matchingCachedModel
        ? cachedModel.uri
        : matchingModelProgress && modelDownloadProgress.status === "fallback"
          ? effectiveModelUrl
          : null;

    const modelProgressPercent =
        matchingModelProgress && Number.isFinite(modelDownloadProgress.progress)
            ? Math.max(0, Math.min(100, Math.round(modelDownloadProgress.progress * 100)))
            : null;

    return {
        cachedModel,
        modelDownloadProgress,
        activeModelUri,
        effectiveModelUrl,
        modelProgressPercent,
        matchingCachedModel,
        matchingModelProgress,
        setModelDownloadProgress,
    };
}