/**
 * Color helpers for live branding.
 *
 * `toRgba` turns the current brand hex (or any hex) into an rgba() string so
 * tinted surfaces keep following the admin's chosen color.
 */
export function toRgba(color, alpha = 1) {
    if (typeof color !== "string") {
        return `rgba(178, 24, 48, ${alpha})`;
    }

    const value = color.trim();
    if (value.startsWith("rgb")) return value;

    let hex = value.replace("#", "");
    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((c) => c + c)
            .join("");
    }
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
        return `rgba(178, 24, 48, ${alpha})`;
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default toRgba;
