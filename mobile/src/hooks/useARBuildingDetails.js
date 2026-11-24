// src/hooks/useARBuildingDetails.js
import { useState, useEffect, useCallback } from "react";
import { api } from "../services";

/**
 * Custom hook for fetching building details and campus perimeter:
 * - Fetches full building details when nearby building changes
 * - Fetches campus perimeter for route map masking
 * - Handles unlocked buildings list changes to refetch model_url
 */
export function useARBuildingDetails({
    nearbyBuildingId,
    unlockedIdsKey,
    activeTargetId,
    setNavTargetFull,
}) {
    const [nearbyBuildingFull, setNearbyBuildingFull] = useState(null);
    const [campusPerimeter, setCampusPerimeter] = useState(null);

    // Fetch full building details when nearby building changes
    const fetchFullBuildingDetails = useCallback(async (buildingId) => {
        try {
            const response = await api.get(`/api/buildings/${buildingId}/`);
            if (response.data.success) {
                setNearbyBuildingFull(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching full building details:", error);
        }
    }, []);

    useEffect(() => {
        if (nearbyBuildingId) {
            fetchFullBuildingDetails(nearbyBuildingId);
        } else {
            setNearbyBuildingFull(null);
        }
    }, [nearbyBuildingId, unlockedIdsKey, fetchFullBuildingDetails]);

    // Fetch navigation target when activeTargetId changes
    useEffect(() => {
        if (!activeTargetId) {
            setNavTargetFull(null);
            return undefined;
        }

        let cancelled = false;
        api.get(`/api/buildings/${activeTargetId}/`)
            .then((res) => {
                if (!cancelled && res.data.success) {
                    setNavTargetFull(res.data.data);
                }
            })
            .catch((err) => console.error("Error fetching nav target", err));

        return () => {
            cancelled = true;
        };
    }, [activeTargetId, unlockedIdsKey, setNavTargetFull]);

    // Fetch campus perimeter once
    useEffect(() => {
        let cancelled = false;
        api.get("/api/navigation/perimeter/")
            .then((res) => {
                if (!cancelled && res.data?.success && res.data?.data) {
                    setCampusPerimeter(res.data.data);
                }
            })
            .catch((error) => {
                console.log("[ARScreen] Campus perimeter unavailable:", error?.message);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return {
        nearbyBuildingFull,
        setNearbyBuildingFull,
        campusPerimeter,
        fetchFullBuildingDetails,
    };
}