import { useState, useEffect } from "react";
import { Eye, Info, ChevronDown, ChevronUp } from "lucide-react";

import { theme } from "../../theme";

const ScenePreview = ({ selectedScene, building, onUpdateSceneAnchors, onOpen3DPicker }) => {
    const [anchorX, setAnchorX] = useState("");
    const [anchorY, setAnchorY] = useState("1.6");
    const [anchorZ, setAnchorZ] = useState("");
    const [anchorRadius, setAnchorRadius] = useState("5.0");
    const [savingAnchor, setSavingAnchor] = useState(false);
    const [showAxesGuide, setShowAxesGuide] = useState(false);

    // Register callback so 3D picker message can set state directly
    useEffect(() => {
        window.__setAnchorCoordinates = (x, y, z) => {
            setAnchorX(String(x));
            setAnchorY(String(y));
            setAnchorZ(String(z));
        };
        return () => {
            window.__setAnchorCoordinates = null;
        };
    }, []);

    // Sync anchor form when selected scene changes
    useEffect(() => {
        if (selectedScene) {
            setAnchorX(selectedScene.anchor_x != null ? String(selectedScene.anchor_x) : "");
            setAnchorY(selectedScene.anchor_y != null ? String(selectedScene.anchor_y) : "1.6");
            setAnchorZ(selectedScene.anchor_z != null ? String(selectedScene.anchor_z) : "");
            setAnchorRadius(selectedScene.anchor_radius != null ? String(selectedScene.anchor_radius) : "5.0");
        }
    }, [selectedScene?.id]);

    const handleSaveAnchors = async () => {
        if (!selectedScene || !onUpdateSceneAnchors) return;
        setSavingAnchor(true);
        await onUpdateSceneAnchors(selectedScene.id, {
            anchor_x: anchorX !== "" ? parseFloat(anchorX) : null,
            anchor_y: anchorY !== "" ? parseFloat(anchorY) : 1.6,
            anchor_z: anchorZ !== "" ? parseFloat(anchorZ) : null,
            anchor_radius: parseFloat(anchorRadius) || 5.0,
        });
        setSavingAnchor(false);
    };

    return (
    <div
        style={{
            backgroundColor: "#fff",
            borderRadius: theme.radius.md,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
        }}
    >
        {/* Sticky panel header */}
        <div
            style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                backgroundColor: "#fff",
                borderBottom: "1.5px solid #f0f0f0",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
            }}
        >
            <div
                style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: theme.colors.primary,
                    flexShrink: 0,
                }}
            />
            <span
                style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    letterSpacing: "1.2px",
                    textTransform: "uppercase",
                    color: "#374151",
                    flex: 1,
                }}
            >
                PREVIEW STUDIO
            </span>
            {selectedScene && (
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>
                    {selectedScene.title}
                </span>
            )}
        </div>

        {/* Scrollable content */}
        <div style={{ padding: theme.spacing.md, overflowY: "auto", flex: 1 }}>
        {selectedScene ? (
            <>
                {/* Scene image in card */}
                <div
                    style={{
                        borderRadius: theme.radius.sm,
                        border: "1px solid #e5e7eb",
                        overflow: "hidden",
                        marginBottom: theme.spacing.md,
                    }}
                >
                    <img
                        src={selectedScene.image_url}
                        alt={selectedScene.title}
                        style={{
                            width: "100%",
                            maxHeight: "220px",
                            objectFit: "cover",
                            display: "block",
                        }}
                    />
                </div>

                {/* 3D Anchor Coordinate Editor */}
                {/* Section label */}
                <div
                    style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        letterSpacing: "1.2px",
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        marginBottom: "10px",
                        paddingTop: "4px",
                        borderTop: "1px solid #f3f4f6",
                    }}
                >
                    3D Anchor Coordinates
                </div>

                <div
                    style={{
                        width: "100%",
                        background: "#f9fafb",
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radius.sm,
                        padding: theme.spacing.sm,
                    }}
                >
                    <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "1px", color: theme.colors.primary, marginBottom: "8px" }}>
                        3D VIRTUAL TOUR ANCHOR
                    </p>
                    <p style={{ fontSize: "11px", color: theme.colors.text.secondary, marginBottom: "10px", lineHeight: "1.5" }}>
                        Set where this panorama was taken inside the building model. You can either type the numbers or click the 3D button below to pick it visually!
                    </p>

                    {/* Interactive 3D Model Picker Button */}
                    <button
                        type="button"
                        onClick={onOpen3DPicker}
                        disabled={!building?.model_url}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            padding: "9px 14px",
                            marginBottom: "10px",
                            background: building?.model_url ? theme.colors.primary : "#e5e7eb",
                            color: building?.model_url ? "#ffffff" : "#9ca3af",
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: building?.model_url ? "pointer" : "not-allowed",
                            fontSize: "12px",
                            fontWeight: "700",
                            letterSpacing: "0.5px",
                        }}
                    >
                        {building?.model_url ? "Pick Location from 3D Model" : "No 3D Model Uploaded for Building"}
                    </button>

                    {/* Collapsible 3D Coordinate Axes Guideline Callout */}
                    <button
                        type="button"
                        onClick={() => setShowAxesGuide(!showAxesGuide)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            padding: "6px 10px",
                            marginBottom: "10px",
                            background: "rgba(138,21,56,0.05)",
                            border: "1px solid rgba(138,21,56,0.15)",
                            borderRadius: theme.radius.sm,
                            fontSize: "11px",
                            fontWeight: "600",
                            color: theme.colors.primary,
                            cursor: "pointer",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Info size={13} style={{ color: theme.colors.primary, flexShrink: 0 }} />
                            <span>3D Coordinate Axes Guide (X, Y, Z, Radius)</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10.5px" }}>
                            <span>{showAxesGuide ? "Hide" : "Show Guide"}</span>
                            {showAxesGuide ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </div>
                    </button>

                    {showAxesGuide && (
                        <div
                            style={{
                                padding: "8px 10px",
                                background: "rgba(138,21,56,0.05)",
                                border: "1px solid rgba(138,21,56,0.15)",
                                borderRadius: theme.radius.sm,
                                fontSize: "11px",
                                color: "#6b0f24",
                                marginBottom: "10px",
                                lineHeight: "1.4",
                            }}
                        >
                            <p style={{ margin: "0 0 6px 0", fontSize: "10.5px", color: "#6b0f24" }}>
                                Anchors tie this 360° photo to the 3D model coordinate space so AR visitors can step directly into this room.
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "10.5px" }}>
                                <div>• <strong>X Axis:</strong> East / West (side-to-side position in 3D model)</div>
                                <div>• <strong>Y Axis:</strong> Eye-level height from ground (standard: 1.6m)</div>
                                <div>• <strong>Z Axis:</strong> North / South (forward / back depth in 3D model)</div>
                                <div>• <strong>Radius:</strong> Walking proximity (meters) to trigger tour</div>
                            </div>
                        </div>
                    )}

                    {/* 3D Coordinate Inputs (X, Y, Z, Radius) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                        <div>
                            <label
                                style={{
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    display: "block",
                                    marginBottom: "4px",
                                    color: theme.colors.text.primary,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                                title="Anchor X (East / West)"
                            >
                                Anchor X (East/West)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                placeholder="e.g. 12.5"
                                value={anchorX}
                                onChange={(e) => setAnchorX(e.target.value)}
                                style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }}
                            />
                        </div>
                        <div>
                            <label
                                style={{
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    display: "block",
                                    marginBottom: "4px",
                                    color: theme.colors.text.primary,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                                title="Anchor Y (Eye Level Height)"
                            >
                                Anchor Y (Eye Level)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                placeholder="1.6"
                                value={anchorY}
                                onChange={(e) => setAnchorY(e.target.value)}
                                style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }}
                            />
                        </div>
                        <div>
                            <label
                                style={{
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    display: "block",
                                    marginBottom: "4px",
                                    color: theme.colors.text.primary,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                                title="Anchor Z (North / South)"
                            >
                                Anchor Z (North/South)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                placeholder="e.g. -8.0"
                                value={anchorZ}
                                onChange={(e) => setAnchorZ(e.target.value)}
                                style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }}
                            />
                        </div>
                        <div>
                            <label
                                style={{
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    display: "block",
                                    marginBottom: "4px",
                                    color: theme.colors.text.primary,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                                title="Catchment Radius (Meters)"
                            >
                                Radius (Meters)
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                min="1"
                                placeholder="5.0"
                                value={anchorRadius}
                                onChange={(e) => setAnchorRadius(e.target.value)}
                                style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }}
                            />
                        </div>
                    </div>

                    {(selectedScene.anchor_x != null && selectedScene.anchor_z != null) && (
                        <div style={{ fontSize: "11px", color: theme.colors.primary, fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                            Anchor saved: ({selectedScene.anchor_x}, {selectedScene.anchor_y}, {selectedScene.anchor_z}) — radius {selectedScene.anchor_radius}m
                        </div>
                    )}

                    <button
                        onClick={handleSaveAnchors}
                        disabled={savingAnchor}
                        style={{
                            width: "100%",
                            padding: "7px",
                            background: theme.colors.primary,
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: savingAnchor ? "not-allowed" : "pointer",
                            fontSize: "12px",
                            fontWeight: "700",
                            letterSpacing: "0.5px",
                        }}
                    >
                        {savingAnchor ? "Saving..." : "Save 3D Anchor Coordinates"}
                    </button>
                </div>
            </>
        ) : (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
                <Eye size={40} color="#d1d5db" style={{ margin: "0 auto 12px", display: "block" }} />
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280", marginBottom: "6px" }}>No scene selected</div>
                <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: "1.5" }}>Select a scene from the left panel to preview it and configure its 3D anchor.</div>
            </div>
        )}
        </div>
    </div>
    );
};

export default ScenePreview;
