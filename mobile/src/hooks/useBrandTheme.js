import { useTheme } from "../context/ThemeContext";

/**
 * Backwards-compatible wrapper around the live ThemeContext.
 *
 * New code should use `useThemeColors` / `useThemedStyles` directly. This
 * hook remains for components that also need the branding helpers.
 */
export function useBrandTheme() {
    const { theme, logoSource, appName, primaryColor } = useTheme();

    return {
        theme,
        logoSource,
        appName,
        primaryColor,
    };
}

export default useBrandTheme;
