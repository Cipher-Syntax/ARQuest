import { useMemo } from "react";
import { useLocationState, useLocationActions } from "../context/LocationContext";

export const useLocationTracking = () => {
    const state = useLocationState();
    const actions = useLocationActions();
    
    // Merge them together to maintain backwards compatibility
    // with existing components that expect a single object
    return useMemo(() => ({
        ...state,
        ...actions
    }), [state, actions]);
};

