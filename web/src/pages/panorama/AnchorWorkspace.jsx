import { useEffect, useState } from "react";
import {
    ChevronDown,
    ChevronUp,
    Crosshair,
    Info,
    Loader2,
    MapPin,
    Save,
    Trash2,
} from "lucide-react";

import { theme } from "../../theme";

const numberOrNull = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const AnchorWorkspace = ({
    selectedScene,
    building,
    anchorIframeRef,
    onFrameLoad,
    draftAnchor,
    onSaveAnchor,
    savingAnchor,
}) => {
    const [anchorX, setAnchorX] = useState("");
    const [anchorY, setAnchorY] = useState("1.6");
    const [anchorZ, setAnchorZ] = useState("");
    const [anchorRadius, setAnchorRadius] = useState("5.0");
    const [showAxesGuide, setShowAxesGuide] = useState(false);

    // Sync the form whenever the selected scene (or its saved anchor) changes.
    useEffect(() => {
        setAnchorX(
            selectedScene?.anchor_x !== null &&
                selectedScene?.anchor_x !== undefined
                ? String(selectedScene.anchor_x)
                : "",
        );
        setAnchorY(
            selectedScene?.anchor_y !== null &&
                selectedScene?.anchor_y !== undefined
                ? String(selectedScene.anchor_y)
                : "1.6",
        );
        setAnchorZ(
            selectedScene?.anchor_z !== null &&
                selectedScene?.anchor_z !== undefined
                ? String(selectedScene.anchor_z)
                : "",
        );
        setAnchorRadius(
            selectedScene?.anchor_radius !== null &&
                selectedScene?.anchor_radius !== undefined
                ? String(selectedScene.anchor_radius)
                : "5.0",
        );
    }, [
        selectedScene?.id,
        selectedScene?.anchor_x,
        selectedScene?.anchor_y,
        selectedScene?.anchor_z,
        selectedScene?.anchor_radius,
    ]);

    // Apply coordinates captured by double-clicking the 3D model.
    useEffect(() => {
        if (!draftAnchor) return;
        setAnchorX(String(draftAnchor.x));
        setAnchorY(String(draftAnchor.y));
        setAnchorZ(String(draftAnchor.z));
    }, [draftAnchor]);

    const hasSavedAnchor =
        selectedScene?.anchor_x !== null &&
        selectedScene?.anchor_x !== undefined &&
        selectedScene?.anchor_z !== null &&
        selectedScene?.anchor_z !== undefined;

    const handleSave = () => {
        onSaveAnchor({
            anchor_x: numberOrNull(anchorX),
            anchor_y: numberOrNull(anchorY) ?? 1.6,
            anchor_z: numberOrNull(anchorZ),
            anchor_radius: numberOrNull(anchorRadius) ?? 5.0,
        });
    };

    const handleClear = () => {
        setAnchorX("");
        setAnchorZ("");
        setAnchorRadius("5.0");
        setAnchorY("1.6");
        onSaveAnchor({
            anchor_x: null,
            anchor_y: 1.6,
            anchor_z: null,
            anchor_radius: 5.0,
        });
    };

    const inputStyle = {
        width: "100%",
        padding: "7px 9px",
        fontSize: "12px",
        borderRadius: "5px",
        border: `1px solid ${theme.colors.border}`,
        boxSizing: "border-box",
        background: "#fff",
    };

    const labelStyle = {
        fontSize: "10px",
        fontWeight: "700",
        letterSpacing: "0.6px",
        textTransform: "uppercase",
        display: "block",
        marginBottom: "4px",
        color: theme.colors.text.secondary,
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
                gap: "10px",
            }}
        >
            <style>{`@keyframes arq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            {/* 3D model workspace — stays mounted while editing this building */}
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    position: "relative",
                    borderRadius: theme.radius.sm,
                    overflow: "visible",
                    border: "1px solid #dbe1ea",
                    background: "#f8fafc",
                }}
            >
                {building?.model_url ? (
                    <iframe
                        ref={anchorIframeRef}
                        src="/admin-hotspot-editor.html"
                        title="3D Anchor Workspace"
                        onLoad={onFrameLoad}
                        style={{
                            width: "100%",
                            height: "100%",
                            border: "none",
                            display: "block",
                        }}
                    />
                ) : (
                    <div
                        style={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            color: "#94a3b8",
                            padding: "24px",
                            textAlign: "center",
                        }}
                    >
                        <MapPin size={34} />
                        <div
                            style={{
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#64748b",
                            }}
                        >
                            No 3D model uploaded for this building
                        </div>
                        <div style={{ fontSize: "12px", maxWidth: "320px" }}>
                            Upload a .glb model in the Building Editor, then
                            place this scene's anchor by double-clicking the
                            floor.
                        </div>
                    </div>
                )}

                {building?.model_url && (
                    <div
                        style={{
                            position: "absolute",
                            top: "10px",
                            left: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            borderRadius: theme.radius.sm || "6px",
                            background: "rgba(255, 255, 255, 0.95)",
                            color: "#1e293b",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                            fontSize: "11px",
                            fontWeight: "600",
                            letterSpacing: "0.2px",
                            pointerEvents: "none",
                            backdropFilter: "blur(6px)",
                            zIndex: 10,
                        }}
                    >
                        <Crosshair size={12} color={theme.colors.primary} />
                        Click a pin to select · double-click the floor to place
                    </div>
                )}
            </div>

            {/* Anchor coordinate form */}
            <div
                style={{
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radius.sm,
                    padding: "12px 14px",
                    background: "#f9fafb",
                    flexShrink: 0,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        marginBottom: "8px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "7px",
                            minWidth: 0,
                        }}
                    >
                        <MapPin
                            size={14}
                            color={theme.colors.primary}
                            style={{ flexShrink: 0 }}
                        />
                        <span
                            style={{
                                fontSize: "11px",
                                fontWeight: "800",
                                letterSpacing: "0.9px",
                                textTransform: "uppercase",
                                color: "#374151",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            Anchor — {selectedScene?.title || "No scene selected"}
                        </span>
                    </div>
                    {hasSavedAnchor ? (
                        <span
                            style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                color: "#047857",
                                background: "rgba(16, 185, 129, 0.12)",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                whiteSpace: "nowrap",
                            }}
                        >
                            SAVED
                        </span>
                    ) : (
                        <span
                            style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                color: "#b45309",
                                background: "rgba(245, 158, 11, 0.14)",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                whiteSpace: "nowrap",
                            }}
                        >
                            NOT PLACED
                        </span>
                    )}
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "8px",
                        marginBottom: "9px",
                    }}
                >
                    <div>
                        <label style={labelStyle} title="East / West position">
                            X
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={anchorX}
                            onChange={(e) => setAnchorX(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle} title="Eye-level height">
                            Y
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            placeholder="1.6"
                            value={anchorY}
                            onChange={(e) => setAnchorY(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle} title="North / South position">
                            Z
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={anchorZ}
                            onChange={(e) => setAnchorZ(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle} title="Walking proximity radius">
                            Radius
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            min="1"
                            placeholder="5.0"
                            value={anchorRadius}
                            onChange={(e) => setAnchorRadius(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={savingAnchor || !selectedScene}
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            padding: "8px 12px",
                            background: theme.colors.primary,
                            color: "#fff",
                            border: "none",
                            borderRadius: "5px",
                            cursor:
                                savingAnchor || !selectedScene
                                    ? "not-allowed"
                                    : "pointer",
                            fontSize: "12px",
                            fontWeight: "700",
                            letterSpacing: "0.4px",
                            opacity: savingAnchor || !selectedScene ? 0.65 : 1,
                        }}
                    >
                        {savingAnchor ? (
                            <Loader2
                                size={14}
                                style={{ animation: "arq-spin 0.9s linear infinite" }}
                            />
                        ) : (
                            <Save size={14} />
                        )}
                        {savingAnchor ? "Saving..." : "Save 3D Anchor"}
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={savingAnchor || !selectedScene}
                        title="Remove this scene's anchor"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "8px 11px",
                            background: "#fff",
                            color: "#b91c1c",
                            border: "1px solid #fecaca",
                            borderRadius: "5px",
                            cursor: savingAnchor ? "not-allowed" : "pointer",
                            fontSize: "12px",
                            fontWeight: "600",
                        }}
                    >
                        <Trash2 size={13} />
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowAxesGuide((prev) => !prev)}
                        title="Coordinate axes guide"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "8px 10px",
                            background: "#fff",
                            color: "#4b5563",
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "600",
                        }}
                    >
                        <Info size={13} />
                        Guide
                        {showAxesGuide ? (
                            <ChevronUp size={12} />
                        ) : (
                            <ChevronDown size={12} />
                        )}
                    </button>
                </div>

                {showAxesGuide && (
                    <div
                        style={{
                            marginTop: "9px",
                            padding: "8px 10px",
                            background: "rgba(138,21,56,0.05)",
                            border: "1px solid rgba(138,21,56,0.15)",
                            borderRadius: "5px",
                            fontSize: "11px",
                            color: "#6b0f24",
                            lineHeight: "1.45",
                        }}
                    >
                        <div>
                            • <strong>X</strong> — east / west
                        </div>
                        <div>
                            • <strong>Y</strong> — eye-level height (1.6m
                            default)
                        </div>
                        <div>
                            • <strong>Z</strong> — north / south depth
                        </div>
                        <div>
                            • <strong>Radius</strong> — walking proximity that
                            triggers the tour
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnchorWorkspace;
