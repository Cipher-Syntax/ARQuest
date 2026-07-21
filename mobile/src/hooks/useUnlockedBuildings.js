import { useMemo } from "react";
import { useUnlockedBuildingsState, useUnlockedBuildingsActions } from "../context/UnlockedBuildingsContext";

export const useUnlockedBuildings = () => {
    const state = useUnlockedBuildingsState();
    const actions = useUnlockedBuildingsActions();
    
    // Merge them together to maintain backwards compatibility
    return useMemo(() => ({
        ...state,
        ...actions
    }), [state, actions]);
};

