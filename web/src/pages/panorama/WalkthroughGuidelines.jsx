import { Info, ChevronDown, ChevronUp } from "lucide-react";

import { theme } from "../../theme";

const WalkthroughGuidelines = ({ expanded, onToggle }) => {
    return (
        <div
            style={{
                backgroundColor: "rgba(127, 3, 3, 0.04)",
                border: "1px solid rgba(127, 3, 3, 0.18)",
                borderRadius: theme.radius.md,
                padding: "14px 18px",
                marginBottom: theme.spacing.lg,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                }}
                onClick={() => onToggle()}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                        style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: theme.radius.sm,
                            backgroundColor: theme.colors.primary,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <Info size={16} />
                    </div>
                    <div>
                        <h2
                            style={{
                                fontSize: "14px",
                                fontWeight: "700",
                                margin: 0,
                                color: "#111827",
                                letterSpacing: "0.2px",
                            }}
                        >
                            360° Virtual Walkthrough &amp; 3D Spatial Tour Guidelines
                        </h2>
                        <p
                            style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                margin: "2px 0 0 0",
                            }}
                        >
                            Follow this 3-step pipeline to build indoor walkthroughs and link 3D building models to real 360° photos.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    style={{
                        background: "none",
                        border: "none",
                        color: theme.colors.primary,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                    }}
                >
                    <span>{expanded ? "Hide Guidelines" : "Show Guidelines"}</span>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {expanded && (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: "14px",
                        marginTop: "14px",
                        paddingTop: "14px",
                        borderTop: "1px solid rgba(127, 3, 3, 0.1)",
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: theme.radius.sm,
                            padding: "12px 14px",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                            <span
                                style={{
                                    fontSize: "10px",
                                    fontWeight: "800",
                                    background: theme.colors.primary,
                                    color: "#fff",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Step 1 • Left
                            </span>
                            <h3 style={{ fontSize: "13px", fontWeight: "700", margin: 0, color: "#111827" }}>
                                Scenes &amp; Entrance
                            </h3>
                        </div>
                        <p style={{ fontSize: "11px", color: "#4b5563", lineHeight: "1.5", margin: 0 }}>
                            Upload 360° equirectangular images. Every building must have <strong>exactly 1 Start Scene</strong> serving as the main entrance. The first uploaded scene is automatically designated as the entrance.
                        </p>
                    </div>

                    <div
                        style={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: theme.radius.sm,
                            padding: "12px 14px",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                            <span
                                style={{
                                    fontSize: "10px",
                                    fontWeight: "800",
                                    background: theme.colors.primary,
                                    color: "#fff",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Step 2 • Center
                            </span>
                            <h3 style={{ fontSize: "13px", fontWeight: "700", margin: 0, color: "#111827" }}>
                                3D Model Anchor
                            </h3>
                        </div>
                        <p style={{ fontSize: "11px", color: "#4b5563", lineHeight: "1.5", margin: 0 }}>
                            Set where each photo was taken inside the building's 3D model. Click <strong>"Pick Location from 3D Model"</strong> and double-click the doorway or floor. Enables students in the 3D tour to step directly into the panorama.
                        </p>
                    </div>

                    <div
                        style={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: theme.radius.sm,
                            padding: "12px 14px",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                            <span
                                style={{
                                    fontSize: "10px",
                                    fontWeight: "800",
                                    background: theme.colors.primary,
                                    color: "#fff",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Step 3 • Right
                            </span>
                            <h3 style={{ fontSize: "13px", fontWeight: "700", margin: 0, color: "#111827" }}>
                                Room Hotspots
                            </h3>
                        </div>
                        <p style={{ fontSize: "11px", color: "#4b5563", lineHeight: "1.5", margin: 0 }}>
                            Connect adjacent corridors and rooms. Place doorway waypoints with yaw/pitch angles so visitors can walk between rooms. Click any hotspot card on the right to edit its target or rotation.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalkthroughGuidelines;
