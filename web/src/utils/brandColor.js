export const DEFAULT_BRAND_COLOR = "#8A1538";

const HEX_SHORT = /^#([0-9a-f]{3})$/i;
const HEX_LONG = /^#[0-9a-f]{6}$/i;

/**
 * Coerce arbitrary input into an uppercase #RRGGBB string, or the fallback.
 */
export function normalizeHexColor(value, fallback = DEFAULT_BRAND_COLOR) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    const short = HEX_SHORT.exec(trimmed);
    if (short) {
        const expanded = short[1]
            .split("")
            .map((char) => char + char)
            .join("");
        return `#${expanded}`.toUpperCase();
    }
    return HEX_LONG.test(trimmed) ? trimmed.toUpperCase() : fallback;
}

export function hexToRgb(hex) {
    const color = normalizeHexColor(hex);
    return {
        r: parseInt(color.slice(1, 3), 16),
        g: parseInt(color.slice(3, 5), 16),
        b: parseInt(color.slice(5, 7), 16),
    };
}

export function rgbToHex({ r, g, b }) {
    const channel = (value) =>
        Math.max(0, Math.min(255, Math.round(value)))
            .toString(16)
            .padStart(2, "0");
    return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

/**
 * Blend a color toward white. `weight` is the share of white (0 - 1).
 */
export function mixWithWhite(hex, weight) {
    const { r, g, b } = hexToRgb(hex);
    const ratio = Math.max(0, Math.min(1, weight));
    return rgbToHex({
        r: r + (255 - r) * ratio,
        g: g + (255 - g) * ratio,
        b: b + (255 - b) * ratio,
    });
}

/**
 * Brand color plus the tinted surface and border derived from it, mirroring
 * the values the Tailwind theme ships with.
 */
export function brandPalette(hex) {
    const brand = normalizeHexColor(hex);
    return {
        brand,
        light: mixWithWhite(brand, 0.96),
        border: mixWithWhite(brand, 0.78),
    };
}

export function isDarkColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.6;
}

/**
 * Write the active brand palette to the document root so every Tailwind
 * `bg-brand` / `text-brand` / `border-brand` utility follows it.
 */
export function applyBrandPalette(hex) {
    const palette = brandPalette(hex);
    const root = document.documentElement;
    root.style.setProperty("--color-brand", palette.brand);
    root.style.setProperty("--color-brand-light", palette.light);
    root.style.setProperty("--color-brand-border", palette.border);
    return palette;
}
