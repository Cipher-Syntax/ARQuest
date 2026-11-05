import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    Check,
    FileImage,
    ImageOff,
    Loader2,
    Plus,
    Play,
    RotateCw,
    Trash2,
    X,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

import DragDropFileUpload from "../../components/common/DragDropFileUpload";
import { theme } from "../../theme";

const MIN_RATIO = 1.3;
const MAX_RATIO = 8.0;
// Above this width the admin should know the panorama will be downscaled by
// the server (and mobile clients will thank them).
const HEAVY_WIDTH = 6144;

let queueIdSeed = 0;
const nextQueueId = () => {
    queueIdSeed += 1;
    return `pq-${Date.now()}-${queueIdSeed}`;
};

const titleFromFilename = (name = "") => {
    const base = name
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!base) return "Untitled Scene";
    return base.charAt(0).toUpperCase() + base.slice(1);
};

const readImageDimensions = (file) =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () =>
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight,
                url,
            });
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not read this image"));
        };
        img.src = url;
    });

const extractUploadError = (error) => {
    const message = error?.response?.data?.error?.message;
    if (!message) {
        return (
            error?.message || "Upload failed. Check your connection and retry."
        );
    }
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "object") {
        const first = Object.values(message)[0];
        if (Array.isArray(first)) return first.join(" ");
        if (typeof first === "string") return first;
    }
    return "Upload failed.";
};

const formatBytes = (bytes) => {
    if (!bytes || Number.isNaN(bytes)) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ScenesList = ({
    scenes,
    selectedScene,
    setSelectedScene,
    onDeleteScene,
    onUploadScene,
    onUploadsComplete,
    hasStartScene,
    startScene,
    onSetStartScene,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [showNewSceneForm, setShowNewSceneForm] = useState(true);
    const [queue, setQueue] = useState([]);
    const [uploading, setUploading] = useState(false);
    const queueRef = useRef(queue);
    queueRef.current = queue;

    const filteredScenes = scenes
        .filter((scene) =>
            scene.title.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .sort((a, b) => {
            if (a.is_start_scene && !b.is_start_scene) return -1;
            if (!a.is_start_scene && b.is_start_scene) return 1;
            return 0;
        });

    const updateItem = (id, patch) => {
        setQueue((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, ...patch } : item,
            ),
        );
    };

    const removeItem = (id) => {
        setQueue((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((item) => item.id !== id);
        });
    };

    // Release object URLs when the panel unmounts.
    useEffect(
        () => () => {
            queueRef.current.forEach((item) => {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            });
        },
        [],
    );

    const addFiles = async (files) => {
        const list = Array.isArray(files) ? files : Array.from(files || []);
        if (list.length === 0) return;

        const inspected = await Promise.all(
            list.map(async (file) => {
                const base = {
                    id: nextQueueId(),
                    file,
                    title: titleFromFilename(file.name),
                    status: "ready",
                    progress: 0,
                    error: null,
                    width: null,
                    height: null,
                    previewUrl: null,
                };

                if (!file.type || !file.type.startsWith("image/")) {
                    return {
                        ...base,
                        status: "invalid",
                        error: "Not an image file.",
                    };
                }

                try {
                    const { width, height, url } = await readImageDimensions(
                        file,
                    );
                    const ratio = width / height;
                    if (
                        !Number.isFinite(ratio) ||
                        ratio < MIN_RATIO ||
                        ratio > MAX_RATIO
                    ) {
                        return {
                            ...base,
                            width,
                            height,
                            previewUrl: url,
                            status: "invalid",
                            error: `${width}×${height}px is ${ratio.toFixed(2)}:1 — panoramas must be between 1.3:1 and 8:1.`,
                        };
                    }
                    return { ...base, width, height, previewUrl: url };
                } catch (err) {
                    return {
                        ...base,
                        status: "invalid",
                        error: err.message || "Could not read this image.",
                    };
                }
            }),
        );

        setQueue((prev) => [...prev, ...inspected]);
        setShowNewSceneForm(true);
    };

    const pendingCount = queue.filter(
        (item) => item.status === "ready" || item.status === "error",
    ).length;
    const completedCount = queue.filter(
        (item) => item.status === "done",
    ).length;

    const runQueue = async () => {
        if (uploading) return;
        const snapshot = queueRef.current.filter(
            (item) => item.status === "ready" || item.status === "error",
        );
        if (snapshot.length === 0) return;

        setUploading(true);
        let anySuccess = false;
        const succeededIds = new Set();

        for (const item of snapshot) {
            updateItem(item.id, {
                status: "uploading",
                progress: 0,
                error: null,
            });
            try {
                await onUploadScene({
                    title:
                        item.title.trim() || titleFromFilename(item.file.name),
                    image: item.file,
                    onProgress: (progress) =>
                        updateItem(item.id, { progress }),
                });
                anySuccess = true;
                succeededIds.add(item.id);
                updateItem(item.id, { status: "done", progress: 100 });
            } catch (error) {
                updateItem(item.id, {
                    status: "error",
                    progress: 0,
                    error: extractUploadError(error),
                });
            }
        }

        setUploading(false);
        if (anySuccess) {
            // Briefly pause so user sees the 100% completion before cleanup
            await new Promise((resolve) => setTimeout(resolve, 600));

            // Clean up object URLs for completed items
            queueRef.current.forEach((item) => {
                if (succeededIds.has(item.id) && item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                }
            });

            // Automatically clear completed items from the upload queue
            setQueue((prev) => prev.filter((item) => !succeededIds.has(item.id)));

            // If all items uploaded successfully, collapse the Add Scenes form
            // so the admin is immediately brought to the scenes list
            if (succeededIds.size === snapshot.length) {
                setShowNewSceneForm(false);
            }

            onUploadsComplete?.();
        }
    };

    const clearCompleted = () => {
        setQueue((prev) => {
            prev.filter((item) => item.status === "done").forEach((item) => {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            });
            return prev.filter((item) => item.status !== "done");
        });
    };

    const statusMeta = useMemo(
        () => ({
            ready: { label: "Ready", color: "#047857", bg: "#ecfdf5" },
            invalid: { label: "Invalid", color: "#b91c1c", bg: "#fef2f2" },
            uploading: { label: "Uploading", color: "#1d4ed8", bg: "#eff6ff" },
            done: { label: "Uploaded", color: "#047857", bg: "#ecfdf5" },
            error: { label: "Failed", color: "#b91c1c", bg: "#fef2f2" },
        }),
        [],
    );

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
            <style>{`@keyframes arq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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

            {/* Bulk upload panel */}
            <div>
                <div
                    onClick={() => setShowNewSceneForm(!showNewSceneForm)}
                    style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        backgroundColor: showNewSceneForm
                            ? "rgba(138,21,56,0.03)"
                            : "#f9fafb",
                        borderBottom: showNewSceneForm
                            ? "1px solid rgba(138,21,56,0.08)"
                            : "1px solid #f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        <Plus size={13} color={theme.colors.primary} />
                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: "700",
                                color: "#374151",
                            }}
                        >
                            Add Scenes (Bulk)
                        </span>
                        {queue.length > 0 && (
                            <span
                                style={{
                                    fontSize: "10px",
                                    fontWeight: "700",
                                    color: theme.colors.primary,
                                    background: "rgba(138,21,56,0.08)",
                                    padding: "1px 6px",
                                    borderRadius: "8px",
                                }}
                            >
                                {queue.length}
                            </span>
                        )}
                    </div>
                    {showNewSceneForm ? (
                        <ChevronUp size={14} color="#9ca3af" />
                    ) : (
                        <ChevronDown size={14} color="#9ca3af" />
                    )}
                </div>

                {showNewSceneForm && (
                    <div style={{ padding: "14px 16px" }}>
                        <DragDropFileUpload
                            multiple
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={addFiles}
                            value={null}
                            disabled={uploading}
                            compact
                            placeholder="Drop multiple 360° photos here"
                        />

                        <div
                            style={{
                                fontSize: "10.5px",
                                color: "#6b7280",
                                lineHeight: "1.45",
                                marginTop: "6px",
                                marginBottom: "10px",
                            }}
                        >
                            Each photo can be a <strong>360° equirectangular (2:1)</strong> or a wide <strong>phone camera panorama</strong>. Titles are generated from file names — edit them before uploading.
                        </div>

                        {!hasStartScene && (
                            <div
                                style={{
                                    padding: "7px 9px",
                                    backgroundColor: "rgba(46, 204, 113, 0.1)",
                                    border: "1px solid rgba(46, 204, 113, 0.4)",
                                    borderRadius: "4px",
                                    marginBottom: "10px",
                                    fontSize: "11px",
                                    color: "#15803d",
                                    lineHeight: "1.4",
                                }}
                            >
                                This building has no entrance yet — the{" "}
                                <strong>first</strong> uploaded scene becomes
                                the Start Scene automatically.
                            </div>
                        )}

                        {queue.length > 0 && (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px",
                                    marginBottom: "10px",
                                    maxHeight: "300px",
                                    overflowY: "auto",
                                    paddingRight: "2px",
                                }}
                            >
                                {queue.map((item) => {
                                    const meta =
                                        statusMeta[item.status] ||
                                        statusMeta.ready;
                                    const busy =
                                        item.status === "uploading";
                                    return (
                                        <div
                                            key={item.id}
                                            style={{
                                                border:
                                                    item.status === "invalid" ||
                                                    item.status === "error"
                                                        ? "1px solid #fecaca"
                                                        : "1px solid #e5e7eb",
                                                borderRadius: "5px",
                                                padding: "7px 8px",
                                                background:
                                                    item.status === "done"
                                                        ? "#f6fef9"
                                                        : "#fff",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "7px",
                                                    alignItems: "flex-start",
                                                }}
                                            >
                                                {item.previewUrl ? (
                                                    <img
                                                        src={item.previewUrl}
                                                        alt=""
                                                        style={{
                                                            width: "44px",
                                                            height: "24px",
                                                            objectFit: "cover",
                                                            borderRadius: "3px",
                                                            flexShrink: 0,
                                                            border: "1px solid #e5e7eb",
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            width: "44px",
                                                            height: "24px",
                                                            borderRadius: "3px",
                                                            background:
                                                                "#f1f5f9",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {item.status ===
                                                        "invalid" ? (
                                                            <ImageOff
                                                                size={13}
                                                                color="#ef4444"
                                                            />
                                                        ) : (
                                                            <FileImage
                                                                size={13}
                                                                color="#94a3b8"
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                                <div
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <input
                                                        type="text"
                                                        value={item.title}
                                                        disabled={
                                                            busy ||
                                                            item.status ===
                                                                "done"
                                                        }
                                                        onChange={(e) =>
                                                            updateItem(
                                                                item.id,
                                                                {
                                                                    title: e
                                                                        .target
                                                                        .value,
                                                                },
                                                            )
                                                        }
                                                        style={{
                                                            width: "100%",
                                                            padding: "4px 6px",
                                                            fontSize: "12px",
                                                            borderRadius: "4px",
                                                            border:
                                                                "1px solid #d1d5db",
                                                            boxSizing:
                                                                "border-box",
                                                            background:
                                                                busy ||
                                                                item.status ===
                                                                    "done"
                                                                    ? "#f9fafb"
                                                                    : "#fff",
                                                        }}
                                                    />
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "space-between",
                                                            gap: "6px",
                                                            marginTop: "3px",
                                                            fontSize: "10px",
                                                            color: "#6b7280",
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                overflow:
                                                                    "hidden",
                                                                textOverflow:
                                                                    "ellipsis",
                                                                whiteSpace:
                                                                    "nowrap",
                                                                flex: 1,
                                                            }}
                                                            title={item.file.name}
                                                        >
                                                            {item.width
                                                                ? `${item.width}×${item.height}`
                                                                : item.file
                                                                      .name}
                                                            {item.width &&
                                                            item.width >
                                                                HEAVY_WIDTH
                                                                ? " · heavy"
                                                                : ""}
                                                        </span>
                                                        <span
                                                            style={{
                                                                color: meta.color,
                                                                background:
                                                                    meta.bg,
                                                                padding:
                                                                    "1px 6px",
                                                                borderRadius:
                                                                    "8px",
                                                                fontWeight: "700",
                                                                whiteSpace:
                                                                    "nowrap",
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {item.status ===
                                                            "uploading"
                                                                ? `${meta.label} ${item.progress}%`
                                                                : meta.label}
                                                        </span>
                                                    </div>
                                                </div>
                                                {!busy && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeItem(item.id)
                                                        }
                                                        title="Remove from queue"
                                                        style={{
                                                            background: "none",
                                                            border: "none",
                                                            cursor: "pointer",
                                                            color: "#9ca3af",
                                                            padding: "2px",
                                                            display: "flex",
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                )}
                                            </div>

                                            {busy && (
                                                <div
                                                    style={{
                                                        height: "3px",
                                                        background: "#e5e7eb",
                                                        borderRadius: "2px",
                                                        overflow: "hidden",
                                                        marginTop: "6px",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: `${item.progress}%`,
                                                            height: "100%",
                                                            background:
                                                                theme.colors
                                                                    .primary,
                                                            transition:
                                                                "width 0.2s",
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {item.error &&
                                                item.status !== "uploading" && (
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "flex-start",
                                                            gap: "4px",
                                                            marginTop: "5px",
                                                            fontSize: "10px",
                                                            color: "#b91c1c",
                                                            lineHeight: "1.35",
                                                        }}
                                                    >
                                                        <AlertTriangle
                                                            size={11}
                                                            style={{
                                                                flexShrink: 0,
                                                                marginTop:
                                                                    "1px",
                                                            }}
                                                        />
                                                        <span>
                                                            {item.error}
                                                        </span>
                                                    </div>
                                                )}

                                            {item.status === "done" && (
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                        marginTop: "4px",
                                                        fontSize: "10px",
                                                        color: "#047857",
                                                        fontWeight: "600",
                                                    }}
                                                >
                                                    <Check size={11} />
                                                    Scene created
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div
                            style={{
                                display: "flex",
                                gap: "6px",
                            }}
                        >
                            <button
                                type="button"
                                onClick={runQueue}
                                disabled={uploading || pendingCount === 0}
                                style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    padding: "8px",
                                    background:
                                        uploading || pendingCount === 0
                                            ? "#d1d5db"
                                            : theme.colors.primary,
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor:
                                        uploading || pendingCount === 0
                                            ? "not-allowed"
                                            : "pointer",
                                    fontSize: "12.5px",
                                    fontWeight: "700",
                                }}
                            >
                                {uploading ? (
                                    <Loader2
                                        size={13}
                                        style={{
                                            animation:
                                                "arq-spin 0.9s linear infinite",
                                        }}
                                    />
                                ) : (
                                    <RotateCw size={13} />
                                )}
                                {uploading
                                    ? "Uploading..."
                                    : `Upload ${pendingCount || ""} Scene${
                                          pendingCount === 1 ? "" : "s"
                                      }`}
                            </button>
                            {completedCount > 0 && !uploading && (
                                <button
                                    type="button"
                                    onClick={clearCompleted}
                                    title="Remove uploaded rows from the queue"
                                    style={{
                                        padding: "8px 10px",
                                        background: "#f3f4f6",
                                        color: "#374151",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
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
                {hasStartScene && startScene && (
                    <div
                        style={{
                            padding: "7px 9px",
                            backgroundColor: "#f9fafb",
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: "4px",
                            marginBottom: "10px",
                            fontSize: "11px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
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
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Entrance:{" "}
                            <strong style={{ color: "#111827" }}>
                                {startScene.title}
                            </strong>
                        </span>
                    </div>
                )}

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
                    {filteredScenes.map((scene) => {
                        const dimensions =
                            scene.width && scene.height
                                ? `${scene.width}×${scene.height}`
                                : null;
                        const sizeLabel = formatBytes(scene.file_size);
                        const heavy = scene.width && scene.width > HEAVY_WIDTH;
                        return (
                            <div
                                key={scene.id}
                                onClick={() => setSelectedScene(scene)}
                                style={{
                                    padding: theme.spacing.sm,
                                    border:
                                        selectedScene?.id === scene.id
                                            ? `1px solid ${theme.colors.primary}`
                                            : `1px solid ${theme.colors.border}`,
                                    borderLeft:
                                        selectedScene?.id === scene.id
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
                                    {(dimensions || sizeLabel) && (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                marginTop: "2px",
                                                fontSize: "10px",
                                                color: heavy
                                                    ? "#b45309"
                                                    : "#9ca3af",
                                                fontWeight: "600",
                                            }}
                                        >
                                            {heavy && (
                                                <AlertTriangle size={10} />
                                            )}
                                            {[dimensions, sizeLabel]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </div>
                                    )}
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
                                                background:
                                                    "rgba(127, 3, 3, 0.08)",
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
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ScenesList;
