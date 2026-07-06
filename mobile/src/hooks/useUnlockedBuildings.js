import { useState, useEffect } from "react";
import { unlockService } from "../services/unlockService";

export const useUnlockedBuildings = () => {
    const [unlockedBuildings, setUnlockedBuildings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchUnlocked = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const buildings = await unlockService.getUnlockedBuildings();
            setUnlockedBuildings(buildings);
        } catch (err) {
            setError(err.message || "Failed to fetch unlocked buildings");
        } finally {
            setIsLoading(false);
        }
    };

    const attemptUnlock = async (latitude, longitude, accuracy) => {
        try {
            const result = await unlockService.unlockBuilding(
                latitude,
                longitude,
                accuracy,
            );
            await fetchUnlocked();
            return result;
        } catch (err) {
            throw err;
        }
    };

    useEffect(() => {
        fetchUnlocked();
    }, []);

    return {
        unlockedBuildings,
        isLoading,
        error,
        refresh: fetchUnlocked,
        attemptUnlock,
    };
};
