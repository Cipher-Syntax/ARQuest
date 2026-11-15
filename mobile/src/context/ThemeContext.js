import React, {
    createContext,
    useContext,
    useMemo,
} from "react";
import { usePublicSettings } from "./PublicSettingsContext";
import { baseTheme } from "../theme/tokens";

const DEFAULT_BRAND = "#8A1538";

const ThemeContext = createContext(null);

/**
 * ThemeProvider — wraps the app and exposes a live theme that merges
 * the static token palette with the admin's branding settings.
 *
 * Any component can call `useTheme()` to get the live theme object,
 * `useThemeColors()` for just the color map, or `useThemeValue(key)`
 * for a single token (which re-renders only when that token changes).
 */
export function ThemeProvider({ children }) {
    const { brand_color, logo_url, app_name } = usePublicSettings();

    const contextValue = useMemo(() => {
        const isValidHex =
            typeof brand_color === "string" && /^#[0-9a-fA-F]{6}$/.test(brand_color);
        const primary = isValidHex ? brand_color : DEFAULT_BRAND;

        const hexToRgb = (hex) => {
            const clean = hex.replace("#", "");
            const bigint = parseInt(clean, 16);
            return {
                r: (bigint >> 16) & 255,
                g: (bigint >> 8) & 255,
                b: bigint & 255,
            };
        };

        const mixWithWhite = (hex, weight) => {
            const { r, g, b } = hexToRgb(hex);
            const ratio = Math.max(0, Math.min(1, weight));
            const channel = (v) =>
                Math.round(v + (255 - v) * ratio)
                    .toString(16)
                    .padStart(2, "0");
            return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
        };

        const light = mixWithWhite(primary, 0.96);
        const border = mixWithWhite(primary, 0.78);

        // Multiplicative darkening keeps the hue recognizable. 0.75 turns the
        // default #B21830 into roughly the token #850F22.
        const darken = (hex, amount) => {
            const { r, g, b } = hexToRgb(hex);
            const factor = Math.max(0, Math.min(1, 1 - amount));
            const channel = (v) =>
                Math.round(v * factor)
                    .toString(16)
                    .padStart(2, "0")
                    .toUpperCase();
            return `#${channel(r)}${channel(g)}${channel(b)}`;
        };

        const theme = {
            ...baseTheme,
            colors: {
                ...baseTheme.colors,
                primary,
                primaryDark: darken(primary, 0.25),
                arHighlight: primary,
                brand: primary,
                brandLight: light,
                brandBorder: border,
            },
        };

        const logoSource = logo_url &&
            typeof logo_url === "string" &&
            logo_url.startsWith("http")
            ? { uri: logo_url }
            : require("../../assets/images/logo.png");

        const appName = (app_name && app_name.trim()) || "ARQuest";

        return {
            theme,
            colors: theme.colors,
            logoSource,
            appName,
            primaryColor: theme.colors.primary,
        };
    }, [brand_color, logo_url, app_name]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return ctx;
}

export function useThemeColors() {
    const { colors } = useTheme();
    return colors;
}

export function useThemeValue(key) {
    const { theme } = useTheme();
    return theme[key];
}

export default ThemeContext;