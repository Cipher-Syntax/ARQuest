import { useMemo } from "react";
import { usePublicSettings } from "../context/PublicSettingsContext";
import baseTheme from "../theme/tokens";

const DEFAULT_BRAND = "#8A1538";
const FALLBACK_LOGO = require("../../assets/images/logo.png");

/**
 * Merge the static token theme with the live branding settings.
 * Returns a theme object that can be used exactly like the static one,
 * plus helpers for the logo and app name.
 */
export function useBrandTheme() {
    const { brand_color, logo_url, app_name } = usePublicSettings();

    const theme = useMemo(() => {
        const isValidHex = typeof brand_color === "string" && /^#[0-9a-fA-F]{6}$/.test(brand_color);
        const primary = isValidHex ? brand_color : DEFAULT_BRAND;

        // Derive the same tinted surfaces the web palette uses
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

        return {
            ...baseTheme,
            colors: {
                ...baseTheme.colors,
                primary,
                primaryDark: mixWithWhite(primary, 0.35),
                arHighlight: primary,
                brand: primary,
                brandLight: light,
                brandBorder: border,
            },
        };
    }, [brand_color]);

    // Logo: remote URL takes precedence; fall back to bundled asset
    const logoSource = useMemo(() => {
        if (logo_url && typeof logo_url === "string" && logo_url.startsWith("http")) {
            return { uri: logo_url };
        }
        return FALLBACK_LOGO;
    }, [logo_url]);

    return {
        theme,
        logoSource,
        appName: (app_name && app_name.trim()) || "ARQuest",
        primaryColor: theme.colors.primary,
    };
}