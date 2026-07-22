import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { unlockService } from "../services/gamification/unlockService";

const UnlockedBuildingsStateContext = createContext(null);
const UnlockedBuildingsActionsContext = createContext(null);

export const UnlockedBuildingsProvider = ({ children }) => {
    const [unlockedBuildings, setUnlockedBuildings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchUnlocked = useCallback(async () => {
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
    }, []);

    const attemptUnlock = useCallback(async (latitude, longitude, accuracy) => {
        try {
            const result = await unlockService.unlockBuilding(latitude, longitude, accuracy);
            await fetchUnlocked(); // Refresh the list globally
            return result;
        } catch (err) {
            throw err;
        }
    }, [fetchUnlocked]);

    useEffect(() => {
        fetchUnlocked();
    }, [fetchUnlocked]);

    const stateValue = useMemo(() => ({
        unlockedBuildings,
        isLoading,
        error
    }), [unlockedBuildings, isLoading, error]);

    const actionsValue = useMemo(() => ({
        refresh: fetchUnlocked,
        attemptUnlock
    }), [fetchUnlocked, attemptUnlock]);

    return (
        <UnlockedBuildingsStateContext.Provider value={stateValue}>
            <UnlockedBuildingsActionsContext.Provider value={actionsValue}>
                {children}
            </UnlockedBuildingsActionsContext.Provider>
        </UnlockedBuildingsStateContext.Provider>
    );
};

export const useUnlockedBuildingsState = () => {
    const context = useContext(UnlockedBuildingsStateContext);
    if (!context) throw new Error("useUnlockedBuildingsState must be used within an UnlockedBuildingsProvider");
    return context;
};

export const useUnlockedBuildingsActions = () => {
    const context = useContext(UnlockedBuildingsActionsContext);
    if (!context) throw new Error("useUnlockedBuildingsActions must be used within an UnlockedBuildingsProvider");
    return context;
};
