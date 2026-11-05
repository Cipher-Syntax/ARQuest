import { useEffect, useState } from "react";
import { Box, Crosshair, MapPin, MonitorPlay, X } from "lucide-react";

import { theme } from "../../theme";
import AnchorWorkspace from "./AnchorWorkspace";

const TABS = [
    {
        id: "hotspots",
        label: "360° Hotspot Placer",
        icon: MonitorPlay,
    },
    {
        id: "anchors",
        label: "3D Anchor Map",
        icon: Box,
    },
];

const PanoramaWorkspace = ({
    tab,
    onTabChange,
    selectedScene,
    building,
    inlineViewerRef,
    anchorIframeRef,
    onViewerLoad,
    onAnchorFrameLoad,
    placeMode,
    placeTargetLabel,
    onCancelPlace,
    draftAnchor,
    savingAnchor,
    onSaveAnchor,
}) => {
    // The 3D workspace is mounted lazily so the (potentially 200MB+) model only
    // starts downloading once an admin opens that tab. Once mounted it stays
    // alive, so switching tabs never reloads the GLB again.
    const [anchorsMounted, setAnchorsMounted] = useState(tab === "anchors");

    useEffect(() => {
        if (tab === "anchors") setAnchorsMounted(true);
    }, [tab]);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
                backgroundColor: "#fff",
                borderRadius: theme.radius.md,
                border: "1px solid #e5e7eb",
                overflow: "hidden",
            }}
        >
            {/* Tab bar */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "7px 10px",
                    borderBottom: "1.5px solid #f0f0f0",
                    backgroundColor: "#fff",
                    flexShrink: 0,
                }}
            >
                {TABS.map(({ id, label, icon: Icon }) => {
                    const active = tab === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onTabChange(id)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "7px 13px",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: active ? "700" : "600",
                                color: active
                                    ? theme.colors.primary
                                    : "#6b7280",
                                backgroundColor: active
                                    ? "rgba(138,21,56,0.08)"
                                    : "transparent",
                                transition: "all 0.15s",
                            }}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    );
                })}
                <div style={{ flex: 1 }} />
                <span
                    style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#9ca3af",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "180px",
                    }}
                    title={selectedScene?.title}
                >
                    {selectedScene?.title || "No scene selected"}
                </span>
            </div>

            <div
                style={{
                    position: "relative",
                    flex: 1,
                    minHeight: 0,
                }}
            >
                {/* ---- 360 viewer (kept alive for click-to-place) ---- */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        visibility: tab === "hotspots" ? "visible" : "hidden",
                        zIndex: tab === "hotspots" ? 2 : 1,
                    }}
                >
                    {selectedScene ? (
                        <iframe
                            ref={inlineViewerRef}
                            src="/panorama-viewer.html"
                            title="360 Panorama Hotspot Placer"
                            onLoad={onViewerLoad}
                            style={{
                                flex: 1,
                                minHeight: 0,
                                width: "100%",
                                border: "none",
                                display: "block",
                                background: "#09090b",
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                color: "#94a3b8",
                                textAlign: "center",
                                padding: "24px",
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
                                Upload or select a scene to start placing
                                hotspots
                            </div>
                        </div>
                    )}

                    {/* Placement status bar */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 12px",
                            flexShrink: 0,
                            background: placeMode
                                ? "rgba(16, 185, 129, 0.12)"
                                : "#f9fafb",
                            borderTop: placeMode
                                ? "1px solid rgba(16, 185, 129, 0.35)"
                                : "1px solid #f0f0f0",
                        }}
                    >
                        <Crosshair
                            size={14}
                            color={placeMode ? "#047857" : "#9ca3af"}
                            style={{ flexShrink: 0 }}
                        />
                        <div
                            style={{
                                flex: 1,
                                fontSize: "11.5px",
                                lineHeight: "1.35",
                                color: placeMode ? "#065f46" : "#6b7280",
                                fontWeight: placeMode ? "600" : "500",
                                minWidth: 0,
                            }}
                        >
                            {placeMode
                                ? `Click the doorway or destination for “${placeTargetLabel || "this hotspot"}”. Drag to look around first.`
                                : "Tip: use “Place on panorama” beside Yaw / Pitch, then click the destination directly in the photo."}
                        </div>
                        {placeMode && (
                            <button
                                type="button"
                                onClick={onCancelPlace}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "5px 10px",
                                    borderRadius: "5px",
                                    border: "1px solid rgba(4, 120, 87, 0.35)",
                                    background: "#fff",
                                    color: "#047857",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                }}
                            >
                                <X size={12} />
                                Cancel
                            </button>
                        )}
                    </div>
                </div>

                {/* ---- Persistent 3D anchor workspace ---- */}
                {anchorsMounted && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            padding: "10px",
                            visibility:
                                tab === "anchors" ? "visible" : "hidden",
                            zIndex: tab === "anchors" ? 2 : 1,
                        }}
                    >
                        <AnchorWorkspace
                            selectedScene={selectedScene}
                            building={building}
                            anchorIframeRef={anchorIframeRef}
                            onFrameLoad={onAnchorFrameLoad}
                            draftAnchor={draftAnchor}
                            onSaveAnchor={onSaveAnchor}
                            savingAnchor={savingAnchor}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PanoramaWorkspace;
