import { useMemo } from "react";
import { useThemeColors, useThemeValue } from "../context/ThemeContext";

/**
 * Build a themed StyleSheet from a factory.
 *
 * Usage:
 *   const styles = useThemedStyles(createStyles);
 *
 * where `createStyles` is a module-level function:
 *   const createStyles = (colors, spacing, radius, typography) =>
 *       StyleSheet.create({ ... });
 */
export function useThemedStyles(factory) {
    const colors = useThemeColors();
    const spacing = useThemeValue("spacing");
    const radius = useThemeValue("radius");
    const typography = useThemeValue("typography");

    return useMemo(
        () => factory(colors, spacing, radius, typography),
        [factory, colors, spacing, radius, typography]
    );
}

export default useThemedStyles;