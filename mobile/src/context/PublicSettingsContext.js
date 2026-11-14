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

const DEFAULT_SETTINGS = {
    app_name: "ARQuest",
    brand_color: "#8A1538",
    logo_url: null,
    maintenance_mode: false,
    demo_mode: false,
    enable_gps: true,
    enable_qr: true,
    enable_ar_selfie: true,
    enable_trivia: true,
    enable_accreditation: false,
    enable_leaderboard: true,
};

const PublicSettingsContext = createContext(null);

/**
 * Global copy of the administrator's public settings.
 *
 * App Features toggles are enforced by the backend, but the mobile UI needs
 * the flags to hide the surfaces they control (QR button, selfie capture,
 * quizzes, leaderboard). Re-read on foreground so web changes propagate.
 */
export const PublicSettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const appState = useRef(AppState.currentState);

    const refresh = useCallback(async () => {
        try {
            const response = await api.get("/api/settings/public/");
            const data = response.data?.data;
            if (data) {
                setSettings((previous) => ({ ...previous, ...data }));
            }
        } catch (error) {
            // Keep the last known values; a transient failure should not
            // silently re-enable features the admin switched off.
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
        () => ({
            ...settings,
            demoMode: settings.demo_mode,
            isLoading,
            refresh,
        }),
        [settings, isLoading, refresh],
    );

    return (
        <PublicSettingsContext.Provider value={value}>
            {children}
        </PublicSettingsContext.Provider>
    );
};

export const usePublicSettings = () => {
    const context = useContext(PublicSettingsContext);
    if (!context) {
        throw new Error(
            "usePublicSettings must be used within a PublicSettingsProvider",
        );
    }
    return context;
};

export default PublicSettingsContext;
