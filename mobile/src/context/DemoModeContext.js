import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { AppState } from "react-native";
import { api } from "../services/api";

const DemoModeContext = createContext(null);

/**
 * Global Demo Mode flag for exhibits.
 *
 * The admin flips this on the web, so the mobile app re-reads the public
 * settings whenever it comes back to the foreground. While the flag is on,
 * QR unlocks skip the building location check and are stored separately.
 */
export const DemoModeProvider = ({ children }) => {
    const [demoMode, setDemoMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const appState = useRef(AppState.currentState);

    const refresh = useCallback(async () => {
        try {
            const response = await api.get("/api/settings/public/");
            const data = response.data?.data;
            if (data && typeof data.demo_mode === "boolean") {
                setDemoMode(data.demo_mode);
            }
        } catch (error) {
            // Keep the last known value; a transient network failure should
            // not silently switch the exhibit back to normal mode.
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();

        const subscription = AppState.addEventListener("change", (nextState) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextState === "active"
            ) {
                refresh();
            }
            appState.current = nextState;
        });

        return () => subscription?.remove();
    }, [refresh]);

    const value = useMemo(
        () => ({ demoMode, isLoading, refresh }),
        [demoMode, isLoading, refresh],
    );

    return (
        <DemoModeContext.Provider value={value}>
            {children}
        </DemoModeContext.Provider>
    );
};

export const useDemoMode = () => {
    const context = useContext(DemoModeContext);
    if (!context) {
        throw new Error("useDemoMode must be used within a DemoModeProvider");
    }
    return context;
};

export default DemoModeContext;
