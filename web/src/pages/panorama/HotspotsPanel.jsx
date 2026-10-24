import { useState } from "react";
import {
    Trash2,
    Edit2,
    X,
    Info,
    ChevronDown,
    ChevronUp,
    ArrowUpRight,
} from "lucide-react";

import { theme } from "../../theme";

const HotspotsPanel = ({
    hotspots,
    scenes,
    selectedScene,
    newHotspot,
    setNewHotspot,
    editingHotspot,
    setEditingHotspot,
    onStartEditHotspot,
    onCancelEditHotspot,
    onCreateHotspot,
    onUpdateHotspot,
    onDeleteHotspot,
    errors,
    setErrors,
}) => {
    const isEditing = Boolean(editingHotspot);
    const [showHotspotGuide, setShowHotspotGuide] = useState(false);

    return (
        <div
            style={{
                backgroundColor: "#fff",
                borderRadius: theme.radius.md,
                border: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
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
                    HOTSPOTS
                </span>
                {hotspots.length > 0 && (
                    <span
                        style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            color: theme.colors.primary,
                            background: "rgba(138,21,56,0.08)",
                            padding: "2px 7px",
                            borderRadius: "10px",
                        }}
                    >
                        {hotspots.length}
                    </span>
                )}
            </div>

            {/* Scrollable content */}
            <div style={{ padding: theme.spacing.md, overflowY: "auto", flex: 1 }}>
            {!selectedScene ? (
                <p style={{ fontSize: "14px", color: theme.colors.text.secondary }}>
                    Select a scene to manage hotspots
                </p>
            ) : (
                <>
                    <div style={{ marginBottom: theme.spacing.md }}>
                        {hotspots.length === 0 ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: "20px 12px",
                                    color: theme.colors.text.muted,
                                    fontSize: "13px",
                                    border: `1px dashed ${theme.colors.border}`,
                                    borderRadius: theme.radius.sm,
                                }}
                            >
                                No hotspots in this scene. Use the form below to create a waypoint link.
                            </div>
                        ) : (
                            hotspots.map((hotspot) => {
                                const isCurrentEditing = editingHotspot?.id === hotspot.id;
                                return (
                                    <div
                                        key={hotspot.id}
                                        onClick={() => onStartEditHotspot(hotspot)}
                                        style={{
                                            padding: theme.spacing.sm,
                                            border: isCurrentEditing
                                                ? `2px solid ${theme.colors.primary}`
                                                : `1px solid ${theme.colors.border}`,
                                            borderRadius: theme.radius.sm,
                                            marginBottom: theme.spacing.xs,
                                            backgroundColor: isCurrentEditing
                                                ? "rgba(127, 3, 3, 0.05)"
                                                : "#fff",
                                            cursor: "pointer",
                                            transition: "all 0.15s",
                                        }}
                                        title={
                                            isCurrentEditing
                                                ? "Currently editing this hotspot"
                                                : "Click to edit this hotspot"
                                        }
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                gap: "8px",
                                            }}
                                        >
                                            {/* ArrowUpRight icon */}
                                            <div style={{ paddingTop: "2px", flexShrink: 0 }}>
                                                <ArrowUpRight
                                                    size={14}
                                                    color={isCurrentEditing ? theme.colors.primary : "#9ca3af"}
                                                />
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "6px",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: "14px",
                                                            fontWeight: "600",
                                                            color: isCurrentEditing
                                                                ? theme.colors.primary
                                                                : "#111827",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {hotspot.label}
                                                    </span>
                                                    {isCurrentEditing && (
                                                        <span
                                                            style={{
                                                                fontSize: "10px",
                                                                fontWeight: "700",
                                                                textTransform: "uppercase",
                                                                background: theme.colors.primary,
                                                                color: "#fff",
                                                                padding: "2px 6px",
                                                                borderRadius: "4px",
                                                                letterSpacing: "0.5px",
                                                            }}
                                                        >
                                                            Editing
                                                        </span>
                                                    )}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "12px",
                                                        color: theme.colors.text.secondary,
                                                        marginTop: "2px",
                                                    }}
                                                >
                                                    → {hotspot.target_scene_title}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "11px",
                                                        color: theme.colors.text.muted,
                                                        marginTop: "2px",
                                                    }}
                                                >
                                                    Yaw: {hotspot.yaw}°, Pitch: {hotspot.pitch}°
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onStartEditHotspot(hotspot);
                                                    }}
                                                    style={{
                                                        color: isCurrentEditing
                                                            ? theme.colors.primary
                                                            : "#6b7280",
                                                        background: isCurrentEditing
                                                            ? "rgba(127, 3, 3, 0.12)"
                                                            : "none",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        cursor: "pointer",
                                                        padding: "4px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                    title={
                                                        isCurrentEditing
                                                            ? "Cancel editing"
                                                            : "Edit hotspot"
                                                    }
                                                >
                                                    {isCurrentEditing ? (
                                                        <X size={15} />
                                                    ) : (
                                                        <Edit2 size={15} />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteHotspot(hotspot.id);
                                                    }}
                                                    style={{
                                                        color: theme.colors.error,
                                                        background: "none",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        cursor: "pointer",
                                                        padding: "4px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                    title="Delete hotspot"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div
                        style={{
                            borderTop: `1px solid ${theme.colors.border}`,
                            paddingTop: theme.spacing.md,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: theme.spacing.sm,
                            }}
                        >
                            <h3
                                style={{
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    margin: 0,
                                    color: isEditing ? theme.colors.primary : "#111827",
                                }}
                            >
                                {isEditing ? "Edit Hotspot" : "New Hotspot"}
                            </h3>
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={onCancelEditHotspot}
                                    style={{
                                        fontSize: "12px",
                                        color: "#6b7280",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "2px 6px",
                                        fontWeight: "500",
                                    }}
                                >
                                    <X size={14} />
                                    <span>Cancel</span>
                                </button>
                            )}
                        </div>

                        <form onSubmit={isEditing ? onUpdateHotspot : onCreateHotspot}>
                            {errors?.form && (
                                <div
                                    style={{
                                        color: theme.colors.error,
                                        fontSize: "12px",
                                        marginBottom: "8px",
                                    }}
                                >
                                    {typeof errors.form === "string"
                                        ? errors.form
                                        : JSON.stringify(errors.form)}
                                </div>
                            )}
                            {/* Collapsible Hotspot Direction & Angle Guide Callout */}
                            <button
                                type="button"
                                onClick={() => setShowHotspotGuide(!showHotspotGuide)}
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
                                    <span>Hotspot Orientation Guide (Yaw &amp; Pitch)</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10.5px" }}>
                                    <span>{showHotspotGuide ? "Hide" : "Show Guide"}</span>
                                    {showHotspotGuide ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </div>
                            </button>

                            {showHotspotGuide && (
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
                                    <p style={{ margin: "0 0 4px 0", fontSize: "10.5px" }}>
                                        Hotspots are clickable door or pathway pins inside the 360° photo to jump between rooms.
                                    </p>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "10.5px" }}>
                                        <div>• <strong>Yaw (°):</strong> Horizontal rotation (0° front, 90° right, 180° back, 270° left)</div>
                                        <div>• <strong>Pitch (°):</strong> Vertical look (-90° floor, 0° horizon, +90° ceiling)</div>
                                    </div>
                                    <div style={{ marginTop: "4px", fontSize: "10px", color: theme.colors.primary }}>
                                        🎯 <em>Tip: Click anywhere directly on the 360° preview to auto-fill exact Yaw and Pitch coordinates!</em>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: "8px" }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        marginBottom: "4px",
                                        color: theme.colors.text.primary,
                                    }}
                                >
                                    Hotspot Label <span style={{ color: theme.colors.error }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Go to Hallway"
                                    value={isEditing ? editingHotspot.label : newHotspot.label}
                                    onChange={(e) => {
                                        if (isEditing) {
                                            setEditingHotspot({
                                                ...editingHotspot,
                                                label: e.target.value,
                                            });
                                        } else {
                                            setNewHotspot({
                                                ...newHotspot,
                                                label: e.target.value,
                                            });
                                        }
                                        if (errors?.label && setErrors) {
                                            const newErrs = { ...errors };
                                            delete newErrs.label;
                                            setErrors(newErrs);
                                        }
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "7px 10px",
                                        borderRadius: "4px",
                                        border: `1px solid ${errors?.label ? theme.colors.error : "#ccc"}`,
                                        fontSize: "13px",
                                        boxSizing: "border-box",
                                    }}
                                />
                                {errors?.label && (
                                    <div
                                        style={{
                                            color: theme.colors.error,
                                            fontSize: "12px",
                                            marginTop: "4px",
                                        }}
                                    >
                                        {errors.label}
                                    </div>
                                )}
                            </div>
                            <div style={{ marginBottom: "8px" }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        marginBottom: "4px",
                                        color: theme.colors.text.primary,
                                    }}
                                >
                                    Target Scene (Destination) <span style={{ color: theme.colors.error }}>*</span>
                                </label>
                                <select
                                    value={isEditing ? editingHotspot.target_scene : newHotspot.target_scene}
                                    onChange={(e) => {
                                        if (isEditing) {
                                            setEditingHotspot({
                                                ...editingHotspot,
                                                target_scene: e.target.value,
                                            });
                                        } else {
                                            setNewHotspot({
                                                ...newHotspot,
                                                target_scene: e.target.value,
                                            });
                                        }
                                        if (errors?.target_scene && setErrors) {
                                            const newErrs = { ...errors };
                                            delete newErrs.target_scene;
                                            setErrors(newErrs);
                                        }
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "7px 10px",
                                        borderRadius: "4px",
                                        border: `1px solid ${errors?.target_scene ? theme.colors.error : "#ccc"}`,
                                        fontSize: "13px",
                                        boxSizing: "border-box",
                                    }}
                                >
                                    <option value="">Select Target Scene</option>
                                    {scenes
                                        .filter((s) => s.id !== selectedScene?.id)
                                        .map((scene) => (
                                            <option key={scene.id} value={scene.id}>
                                                {scene.title}
                                            </option>
                                        ))}
                                </select>
                                {errors?.target_scene && (
                                    <div
                                        style={{
                                            color: theme.colors.error,
                                            fontSize: "12px",
                                            marginTop: "4px",
                                        }}
                                    >
                                        {errors.target_scene}
                                    </div>
                                )}
                            </div>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "8px",
                                    marginBottom: "12px",
                                }}
                            >
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            marginBottom: "4px",
                                            color: theme.colors.text.primary,
                                        }}
                                    >
                                        Yaw (°) <span style={{ color: theme.colors.error }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={isEditing ? editingHotspot.yaw : newHotspot.yaw}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                setEditingHotspot({
                                                    ...editingHotspot,
                                                    yaw: e.target.value,
                                                });
                                            } else {
                                                setNewHotspot({
                                                    ...newHotspot,
                                                    yaw: e.target.value,
                                                });
                                            }
                                            if (errors?.yaw && setErrors) {
                                                const newErrs = { ...errors };
                                                delete newErrs.yaw;
                                                setErrors(newErrs);
                                            }
                                        }}
                                        style={{
                                            width: "100%",
                                            padding: "7px 10px",
                                            borderRadius: "4px",
                                            border: `1px solid ${errors?.yaw ? theme.colors.error : "#ccc"}`,
                                            fontSize: "13px",
                                            boxSizing: "border-box",
                                        }}
                                    />
                                    {errors?.yaw && (
                                        <div
                                            style={{
                                                color: theme.colors.error,
                                                fontSize: "12px",
                                                marginTop: "4px",
                                            }}
                                        >
                                            {errors.yaw}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            marginBottom: "4px",
                                            color: theme.colors.text.primary,
                                        }}
                                    >
                                        Pitch (°) <span style={{ color: theme.colors.error }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={isEditing ? editingHotspot.pitch : newHotspot.pitch}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                setEditingHotspot({
                                                    ...editingHotspot,
                                                    pitch: e.target.value,
                                                });
                                            } else {
                                                setNewHotspot({
                                                    ...newHotspot,
                                                    pitch: e.target.value,
                                                });
                                            }
                                            if (errors?.pitch && setErrors) {
                                                const newErrs = { ...errors };
                                                delete newErrs.pitch;
                                                setErrors(newErrs);
                                            }
                                        }}
                                        style={{
                                            width: "100%",
                                            padding: "7px 10px",
                                            borderRadius: "4px",
                                            border: `1px solid ${errors?.pitch ? theme.colors.error : "#ccc"}`,
                                            fontSize: "13px",
                                            boxSizing: "border-box",
                                        }}
                                    />
                                    {errors?.pitch && (
                                        <div
                                            style={{
                                                color: theme.colors.error,
                                                fontSize: "12px",
                                                marginTop: "4px",
                                            }}
                                        >
                                            {errors.pitch}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isEditing ? (
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                        type="button"
                                        onClick={onCancelEditHotspot}
                                        style={{
                                            flex: 1,
                                            padding: "8px",
                                            background: "#f3f4f6",
                                            color: "#374151",
                                            border: `1px solid ${theme.colors.border}`,
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            flex: 2,
                                            padding: "8px",
                                            background: theme.colors.primary,
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                        }}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="submit"
                                    style={{
                                        width: "100%",
                                        padding: "8px",
                                        background: theme.colors.primary,
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                    }}
                                >
                                    Create Hotspot
                                </button>
                            )}
                        </form>
                    </div>
                </>
            )}
            </div>
        </div>
    );
};

export default HotspotsPanel;
