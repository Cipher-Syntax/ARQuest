export const colors = {
    bgPrimary: "#1a040b", // Deep dark red/black
    bgSecondary: "#2a0a14",
    surface: "rgba(255, 255, 255, 0.05)", // Glassmorphism base
    surfaceSoft: "rgba(255, 255, 255, 0.02)",
    primary: "#8A1538", // WMSU Red
    primaryDark: "#6B0F2A",
    accent: "#EAB308", // Gold/Yellow accent
    accentSoft: "#FEF08A",
    textPrimary: "#FFFFFF",
    textSecondary: "#E5E7EB",
    textMuted: "#9CA3AF",
    border: "rgba(255, 255, 255, 0.15)", // Glowing border
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
    arHighlight: "#00E5FF", // Cyan for active HUD
    geofenceActive: "#10B981",
    geofenceInactive: "#EF4444",
};

export const typography = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const radius = {
    sm: 4,
    md: 6, // Match web rounded-md
    lg: 8,
    xl: 12,
    full: 999,
};

export const theme = {
    colors,
    typography,
    spacing,
    radius,
};

export default theme;
