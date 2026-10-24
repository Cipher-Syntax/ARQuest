import { useState } from "react";
import { Plus, Trash2, Play, ChevronDown, ChevronUp } from "lucide-react";

import DragDropFileUpload from "../../components/common/DragDropFileUpload";
import { theme } from "../../theme";

const ScenesList = ({
    scenes,
    selectedScene,
    setSelectedScene,
    onDeleteScene,
    newScene,
    setNewScene,
    onCreateScene,
    saving,
    errors,
    setErrors,
    hasStartScene,
    startScene,
    onSetStartScene,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [showNewSceneForm, setShowNewSceneForm] = useState(true);

    const filteredScenes = scenes
        .filter((scene) =>
            scene.title.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .sort((a, b) => {
            if (a.is_start_scene && !b.is_start_scene) return -1;
            if (!a.is_start_scene && b.is_start_scene) return 1;
            return 0;
        });

    return (
        <div
            style={{
                backgroundColor: "#fff",
                borderRadius: theme.radius.md,
                border: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
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
                    SCENES
                </span>
                {scenes.length > 0 && (
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
                        {scenes.length}
                    </span>
                )}
            </div>

            {/* New Scene accordion */}
            <div>
                {/* Accordion header */}
                <div
                    onClick={() => setShowNewSceneForm(!showNewSceneForm)}
                    style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        backgroundColor: showNewSceneForm ? "rgba(138,21,56,0.03)" : "#f9fafb",
                        borderBottom: showNewSceneForm ? "1px solid rgba(138,21,56,0.08)" : "1px solid #f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Plus size={13} color={theme.colors.primary} />
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#374151" }}>
                            New Scene
                        </span>
                    </div>
                    {showNewSceneForm ? (
                        <ChevronUp size={14} color="#9ca3af" />
                    ) : (
                        <ChevronDown size={14} color="#9ca3af" />
                    )}
                </div>

                {/* Form body */}
                {showNewSceneForm && (
                    <div style={{ padding: "14px 16px" }}>
                        <form onSubmit={onCreateScene}>
                            <div style={{ marginBottom: "8px" }}>
                                <label
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: theme.colors.text.primary,
                                        display: "block",
                                        marginBottom: "4px",
                                    }}
                                >
                                    Scene Title <span style={{ color: theme.colors.error }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Main Entrance"
                                    value={newScene.title}
                                    onChange={(e) => {
                                        setNewScene({ ...newScene, title: e.target.value });
                                        if (errors.title)
                                            setErrors({ ...errors, title: null });
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "7px 10px",
                                        borderRadius: "4px",
                                        border: `1px solid ${errors.title ? theme.colors.error : "#ccc"}`,
                                        fontSize: "13px",
                                        boxSizing: "border-box",
                                    }}
                                />
                                {errors.title && (
                                    <div
                                        style={{
                                            color: theme.colors.error,
                                            fontSize: "12px",
                                            marginTop: "4px",
                                        }}
                                    >
                                        {errors.title}
                                    </div>
                                )}
                            </div>
                            <div style={{ marginBottom: "8px" }}>
                                <label
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: theme.colors.text.primary,
                                        display: "block",
                                        marginBottom: "4px",
                                    }}
                                >
                                    360° Panoramic Photo <span style={{ color: theme.colors.error }}>*</span>
                                </label>
                                <div
                                    style={{
                                        border: errors.image
                                            ? `1px solid ${theme.colors.error}`
                                            : "none",
                                        borderRadius: "4px",
                                    }}
                                >
                                    <DragDropFileUpload
                                        accept="image/jpeg,image/png,image/jpg"
                                        value={newScene.image}
                                        onChange={(file) => {
                                            setNewScene({ ...newScene, image: file });
                                            if (errors.image)
                                                setErrors({ ...errors, image: null });
                                        }}
                                        placeholder="Drag &amp; drop 360° image here or click to browse"
                                    />
                                </div>
                                {errors.image && (
                                    <div
                                        style={{
                                            color: theme.colors.error,
                                            fontSize: "12px",
                                            marginTop: "4px",
                                        }}
                                    >
                                        {errors.image}
                                    </div>
                                )}
                            </div>

                            {/* Start Scene Requirement / Status Badge */}
                            {!hasStartScene ? (
                                <div
                                    style={{
                                        padding: "8px 10px",
                                        backgroundColor: "rgba(46, 204, 113, 0.1)",
                                        border: "1px solid rgba(46, 204, 113, 0.4)",
                                        borderRadius: "4px",
                                        marginBottom: "10px",
                                        fontSize: "12px",
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "8px",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={true}
                                        disabled={true}
                                        style={{
                                            marginTop: "2px",
                                            accentColor: theme.colors.primary,
                                            cursor: "not-allowed",
                                        }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: "700", color: "#166534" }}>
                                            Start Scene (Required Entrance)
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                color: "#15803d",
                                                marginTop: "2px",
                                                lineHeight: "1.3",
                                            }}
                                        >
                                            This building has no entrance yet. This scene will automatically be designated as the Start Scene.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        padding: "8px 10px",
                                        backgroundColor: "#f9fafb",
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: "4px",
                                        marginBottom: "10px",
                                        fontSize: "11px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: "6px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Play
                                            size={11}
                                            fill={theme.colors.primary}
                                            color={theme.colors.primary}
                                            style={{ flexShrink: 0 }}
                                        />
                                        <span
                                            style={{
                                                color: "#4b5563",
                                                textOverflow: "ellipsis",
                                                overflow: "hidden",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            Entrance: <strong style={{ color: "#111827" }}>{startScene?.title}</strong>
                                        </span>
                                    </div>
                                    <span
                                        style={{
                                            fontSize: "10px",
                                            fontWeight: "700",
                                            textTransform: "uppercase",
                                            background: "#e5e7eb",
                                            color: "#4b5563",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            whiteSpace: "nowrap",
                                            flexShrink: 0,
                                        }}
                                    >
                                        1 Active
                                    </span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    background: theme.colors.primary,
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: saving ? "not-allowed" : "pointer",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                }}
                            >
                                {saving ? "Uploading..." : "Create Scene"}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Scenes list section */}
            <div
                style={{
                    padding: "12px 16px",
                    flex: 1,
                }}
            >
                <input
                    type="text"
                    placeholder="Search scenes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "7px 10px",
                        marginBottom: theme.spacing.md,
                        borderRadius: theme.radius.sm,
                        border: "1px solid #e5e7eb",
                        fontSize: "14px",
                        boxSizing: "border-box",
                    }}
                />

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: theme.spacing.xs,
                        marginBottom: theme.spacing.md,
                    }}
                >
                    {filteredScenes.length === 0 && (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "10px",
                                color: "#666",
                                fontSize: "14px",
                            }}
                        >
                            No scenes found
                        </div>
                    )}
                    {filteredScenes.map((scene) => (
                        <div
                            key={scene.id}
                            onClick={() => setSelectedScene(scene)}
                            style={{
                                padding: theme.spacing.sm,
                                border: selectedScene?.id === scene.id
                                    ? `1px solid ${theme.colors.primary}`
                                    : `1px solid ${theme.colors.border}`,
                                borderLeft: selectedScene?.id === scene.id
                                    ? `3px solid ${theme.colors.primary}`
                                    : `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radius.sm,
                                cursor: "pointer",
                                backgroundColor:
                                    selectedScene?.id === scene.id
                                        ? "rgba(138, 21, 56, 0.05)"
                                        : "#fff",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "8px",
                                transition: "all 0.15s",
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {scene.title}
                                </div>
                                {scene.is_start_scene ? (
                                    <span
                                        style={{
                                            fontSize: "10px",
                                            fontWeight: "700",
                                            color: theme.colors.primary,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            marginTop: "3px",
                                            background: "rgba(127, 3, 3, 0.08)",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        <Play
                                            size={10}
                                            fill={theme.colors.primary}
                                        />{" "}
                                        Start Scene (Entrance)
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSetStartScene(scene.id);
                                        }}
                                        style={{
                                            fontSize: "11px",
                                            color: "#6b7280",
                                            background: "none",
                                            border: `1px dashed ${theme.colors.border}`,
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            marginTop: "3px",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                        }}
                                        title="Make this scene the entrance point for this building"
                                    >
                                        <Play size={9} /> Set as Start
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteScene(scene.id);
                                }}
                                style={{
                                    color: theme.colors.error,
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                title="Delete scene"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ScenesList;
