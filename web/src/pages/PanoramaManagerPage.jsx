import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Edit2,
    X,
    Play,
    Eye,
    Info,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    ArrowUpRight,
} from "lucide-react";

import { buildingService } from "../services/buildingService";
import { panoramaService } from "../services/panoramaService";
import DragDropFileUpload from "../components/common/DragDropFileUpload";
import { theme } from "../theme";
import {
    validateForm,
    validateString,
    validateRequired,
    validateNumber,
} from "../utils/validation";

const PanoramaManagerPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [building, setBuilding] = useState(null);
    const [scenes, setScenes] = useState([]);
    const [selectedScene, setSelectedScene] = useState(null);
    const [hotspots, setHotspots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errors, setErrors] = useState({});
    const [hotspotErrors, setHotspotErrors] = useState({});
    const [sceneToDelete, setSceneToDelete] = useState(null);
    const [hotspotToDelete, setHotspotToDelete] = useState(null);
    const [show3DPicker, setShow3DPicker] = useState(false);
    const [showPreviewer, setShowPreviewer] = useState(false);
    const previewIframeRef = useRef(null);
    const pickerIframeRef = useRef(null);

    const sendInitTo3DPicker = useCallback(() => {
        if (!pickerIframeRef.current?.contentWindow) return;
        const validAnchors = scenes
            .filter(
                (s) =>
                    s.anchor_x !== null &&
                    s.anchor_x !== undefined &&
                    s.anchor_x !== "" &&
                    !isNaN(Number(s.anchor_x)) &&
                    s.anchor_z !== null &&
                    s.anchor_z !== undefined &&
                    s.anchor_z !== "" &&
                    !isNaN(Number(s.anchor_z)),
            )
            .map((s) => ({
                id: s.id,
                title: s.title,
                x: Number(s.anchor_x),
                y: Number(s.anchor_y ?? 1.6),
                z: Number(s.anchor_z),
                radius: Number(s.anchor_radius ?? 5.0),
                isCurrent: selectedScene?.id === s.id,
                isStart: Boolean(s.is_start_scene),
            }));

        pickerIframeRef.current.contentWindow.postMessage(
            {
                type: "INIT_EDITOR",
                mode: "PICK_ANCHOR",
                modelUrl: building?.model_url,
                anchors: validAnchors,
                currentScene: selectedScene
                    ? {
                          id: selectedScene.id,
                          title: selectedScene.title,
                          is_start_scene: Boolean(selectedScene.is_start_scene),
                          anchor_x: selectedScene.anchor_x,
                          anchor_y: selectedScene.anchor_y,
                          anchor_z: selectedScene.anchor_z,
                          anchor_radius: selectedScene.anchor_radius,
                      }
                    : null,
            },
            "*",
        );
    }, [scenes, selectedScene, building?.model_url]);

    useEffect(() => {
        if (show3DPicker) {
            sendInitTo3DPicker();
        }
    }, [show3DPicker, sendInitTo3DPicker]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.type === "ANCHOR_PICKED") {
                const { x, y, z } = event.data;
                setShow3DPicker(false);
                showSuccess(`Captured from 3D Model: (${x}, ${y}, ${z})`);
                if (window.__setAnchorCoordinates) {
                    window.__setAnchorCoordinates(x, y, z);
                }
            } else if (event.data && event.data.type === "EDITOR_READY") {
                if (show3DPicker) {
                    sendInitTo3DPicker();
                }
            } else if (event.data && event.data.type === "hotspot_clicked") {
                const rawTargetId = event.data.target_scene_id;
                const targetId = typeof rawTargetId === "object" && rawTargetId ? rawTargetId.id : rawTargetId;
                const target = scenes.find(
                    (s) => s.id === targetId || String(s.id) === String(targetId)
                );
                if (target) {
                    if (selectedScene?.id === target.id) {
                        previewIframeRef.current?.contentWindow?.postMessage(
                            {
                                type: "init",
                                imageUrl: target.image_url,
                                hotspots: hotspots || target.hotspots || [],
                                title: target.title,
                                buildingName: building?.name || "Campus Walkthrough",
                                allScenes: scenes.map((s) => ({
                                    id: s.id,
                                    title: s.title,
                                    image_url: s.image_url,
                                    is_start_scene: Boolean(s.is_start_scene),
                                })),
                            },
                            "*",
                        );
                    } else {
                        setSelectedScene(target);
                        if (target.hotspots) {
                            setHotspots(target.hotspots);
                        } else {
                            setHotspots([]);
                        }
                    }
                } else {
                    console.warn("Target scene not found:", targetId);
                }
            } else if (event.data && event.data.type === "reset_to_start") {
                const start = scenes.find((s) => s.is_start_scene) || (scenes.length > 0 ? scenes[0] : null);
                if (start) {
                    if (selectedScene?.id === start.id) {
                        previewIframeRef.current?.contentWindow?.postMessage(
                            {
                                type: "init",
                                imageUrl: start.image_url,
                                hotspots: hotspots || start.hotspots || [],
                                title: start.title,
                                buildingName: building?.name || "Campus Walkthrough",
                                allScenes: scenes.map((s) => ({
                                    id: s.id,
                                    title: s.title,
                                    image_url: s.image_url,
                                    is_start_scene: Boolean(s.is_start_scene),
                                })),
                            },
                            "*",
                        );
                    } else {
                        setSelectedScene(start);
                        if (start.hotspots) {
                            setHotspots(start.hotspots);
                        } else {
                            setHotspots([]);
                        }
                    }
                }
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [scenes, selectedScene, hotspots, building, show3DPicker, sendInitTo3DPicker]);

    // Send updated scene & hotspots to 360 previewer iframe
    useEffect(() => {
        if (showPreviewer && selectedScene && previewIframeRef.current) {
            previewIframeRef.current.contentWindow?.postMessage(
                {
                    type: "init",
                    imageUrl: selectedScene.image_url,
                    hotspots: hotspots || [],
                    title: selectedScene.title,
                    buildingName: building?.name || "Campus Walkthrough",
                    allScenes: scenes.map((s) => ({
                        id: s.id,
                        title: s.title,
                        image_url: s.image_url,
                        is_start_scene: Boolean(s.is_start_scene),
                    })),
                },
                "*",
            );
        }
    }, [selectedScene, hotspots, showPreviewer, scenes, building]);


    const [showGuidelines, setShowGuidelines] = useState(true);

    const startScene = scenes.find((s) => s.is_start_scene);
    const hasStartScene = Boolean(startScene);

    const [newScene, setNewScene] = useState({
        title: "",
        image: null,
        is_start_scene: true,
        sort_order: 1,
        is_active: true,
        anchor_x: "",
        anchor_y: "1.6",
        anchor_z: "",
        anchor_radius: "5.0",
    });

    const [editingHotspot, setEditingHotspot] = useState(null);
    const [newHotspot, setNewHotspot] = useState({
        target_scene: "",
        label: "",
        yaw: 0,
        pitch: 0,
        is_active: true,
    });

    useEffect(() => {
        setNewScene((prev) => ({
            ...prev,
            is_start_scene: !hasStartScene,
        }));
    }, [hasStartScene]);

    useEffect(() => {
        loadData();
    }, [id]);

    useEffect(() => {
        if (selectedScene) {
            setEditingHotspot(null);
            setHotspotErrors({});
            loadHotspots(selectedScene.id);
        }
    }, [selectedScene]);

    const loadData = async () => {
        try {
            const buildingData = await buildingService.getBuilding(id);
            setBuilding(buildingData);

            const scenesData = await panoramaService.getBuildingScenes(id);
            setScenes(scenesData || []);
            if (scenesData && scenesData.length > 0) {
                setSelectedScene(scenesData[0]);
            }
        } catch (error) {
            console.error("Failed to load panorama data", error);
            navigate(id ? `/buildings/${id}` : "/buildings");
        } finally {
            setLoading(false);
        }
    };

    const loadHotspots = async (sceneId) => {
        try {
            const hotspotsData =
                await panoramaService.getSceneHotspots(sceneId);
            setHotspots(hotspotsData || []);
        } catch (error) {
            console.error("Failed to load hotspots:", error);
            setHotspots([]);
        }
    };

    const showSuccess = (message) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(""), 3000);
    };

    const handleCreateScene = async (e) => {
        e.preventDefault();
        setErrors({});

        const schema = {
            title: (val) => validateString(val, 1),
            image: (val) => validateRequired(val),
        };

        const validationErrors = validateForm(newScene, schema);
        if (Object.keys(validationErrors).length > 0) {
            return setErrors(validationErrors);
        }

        setSaving(true);
        try {
            const isStart = !hasStartScene;
            const formData = new FormData();
            formData.append("title", newScene.title);
            formData.append("image", newScene.image);
            formData.append("is_start_scene", isStart);
            formData.append("sort_order", newScene.sort_order);
            formData.append("is_active", newScene.is_active);
            if (newScene.anchor_x !== "") formData.append("anchor_x", parseFloat(newScene.anchor_x));
            if (newScene.anchor_y !== "") formData.append("anchor_y", parseFloat(newScene.anchor_y));
            if (newScene.anchor_z !== "") formData.append("anchor_z", parseFloat(newScene.anchor_z));
            formData.append("anchor_radius", parseFloat(newScene.anchor_radius) || 5.0);

            await panoramaService.createScene(id, formData);
            showSuccess(isStart ? "Entrance scene created successfully!" : "Scene created successfully!");
            setNewScene({
                title: "",
                image: null,
                is_start_scene: false,
                sort_order: scenes.length + 2,
                is_active: true,
                anchor_x: "",
                anchor_y: "1.6",
                anchor_z: "",
                anchor_radius: "5.0",
            });

            loadData();
        } catch (error) {
            setErrors(
                error.response?.data?.errors || {
                    form: "Failed to create scene",
                },
            );
        } finally {
            setSaving(false);
        }
    };

    const handleSetStartScene = async (sceneId) => {
        try {
            await panoramaService.updateScene(sceneId, { is_start_scene: true });
            showSuccess("Entrance / Start Scene updated!");
            loadData();
        } catch (error) {
            console.error("Failed to update start scene", error);
        }
    };

    const requestDeleteScene = (sceneId) => {
        setSceneToDelete(sceneId);
    };

    const confirmDeleteScene = async () => {
        if (!sceneToDelete) return;
        try {
            await panoramaService.deleteScene(sceneToDelete);
            showSuccess("Scene deleted");
            loadData();
        } catch (error) {
            console.error("Failed to delete scene", error);
        } finally {
            setSceneToDelete(null);
        }
    };

    const handleCreateHotspot = async (e) => {
        e.preventDefault();
        if (!selectedScene) return;

        setHotspotErrors({});

        const schema = {
            label: (val) => validateString(val, 1),
            target_scene: (val) => validateRequired(val),
            yaw: (val) => validateNumber(val),
            pitch: (val) => validateNumber(val),
        };

        const validationErrors = validateForm(newHotspot, schema);
        if (Object.keys(validationErrors).length > 0) {
            return setHotspotErrors(validationErrors);
        }

        try {
            const yawVal = parseFloat(newHotspot.yaw);
            const pitchVal = parseFloat(newHotspot.pitch);

            const hotspotData = {
                ...newHotspot,
                target_scene: newHotspot.target_scene,
                yaw: isNaN(yawVal) ? 0 : yawVal,
                pitch: isNaN(pitchVal) ? 0 : pitchVal,
            };
            await panoramaService.createHotspot(selectedScene.id, hotspotData);
            showSuccess("Hotspot created!");
            setNewHotspot({
                target_scene: "",
                label: "",
                yaw: 0,
                pitch: 0,
                is_active: true,
            });
            setHotspotErrors({});
            loadHotspots(selectedScene.id);
        } catch (error) {
            console.error("Failed to create hotspot", error);
            setHotspotErrors(
                error.response?.data || { form: "Failed to create hotspot" },
            );
        }
    };

    const handleStartEditHotspot = (hotspot) => {
        setHotspotErrors({});
        if (editingHotspot?.id === hotspot.id) {
            setEditingHotspot(null);
        } else {
            setEditingHotspot({
                id: hotspot.id,
                label: hotspot.label || "",
                target_scene: hotspot.target_scene_id || hotspot.target_scene || "",
                yaw: hotspot.yaw != null ? hotspot.yaw : 0,
                pitch: hotspot.pitch != null ? hotspot.pitch : 0,
            });
        }
    };

    const handleCancelEditHotspot = () => {
        setEditingHotspot(null);
        setHotspotErrors({});
    };

    const handleUpdateHotspot = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!selectedScene || !editingHotspot) return;

        setHotspotErrors({});

        const schema = {
            label: (val) => validateString(val, 1),
            target_scene: (val) => validateRequired(val),
            yaw: (val) => validateNumber(val),
            pitch: (val) => validateNumber(val),
        };

        const validationErrors = validateForm(editingHotspot, schema);
        if (Object.keys(validationErrors).length > 0) {
            return setHotspotErrors(validationErrors);
        }

        try {
            const yawVal = parseFloat(editingHotspot.yaw);
            const pitchVal = parseFloat(editingHotspot.pitch);

            const hotspotData = {
                label: editingHotspot.label,
                target_scene: editingHotspot.target_scene,
                yaw: isNaN(yawVal) ? 0 : yawVal,
                pitch: isNaN(pitchVal) ? 0 : pitchVal,
            };
            await panoramaService.updateHotspot(editingHotspot.id, hotspotData);
            showSuccess("Hotspot updated successfully!");
            setEditingHotspot(null);
            setHotspotErrors({});
            loadHotspots(selectedScene.id);
        } catch (error) {
            console.error("Failed to update hotspot", error);
            setHotspotErrors(
                error.response?.data?.errors || error.response?.data || { form: "Failed to update hotspot" },
            );
        }
    };

    const requestDeleteHotspot = (hotspotId) => {
        setHotspotToDelete(hotspotId);
    };

    const confirmDeleteHotspot = async () => {
        if (!hotspotToDelete) return;
        try {
            await panoramaService.deleteHotspot(hotspotToDelete);
            showSuccess("Hotspot deleted");
            if (editingHotspot?.id === hotspotToDelete) {
                setEditingHotspot(null);
            }
            loadHotspots(selectedScene.id);
        } catch (error) {
            console.error("Failed to delete hotspot", error);
        } finally {
            setHotspotToDelete(null);
        }
    };


    const handleUpdateSceneAnchors = async (sceneId, anchorData) => {
        try {
            await panoramaService.updateScene(sceneId, anchorData);
            showSuccess("3D anchor coordinates saved!");
            // Refresh scenes list so selectedScene reflects new anchor values
            const scenesData = await panoramaService.getBuildingScenes(id);
            setScenes(scenesData || []);
            const updated = scenesData.find((s) => s.id === sceneId);
            if (updated) setSelectedScene(updated);
        } catch (error) {
            console.error("Failed to update anchor coordinates", error);
        }
    };

    if (loading) return <div style={{ padding: "24px" }}>Loading...</div>;


    return (
        <div>
            {successMessage && (
                <div
                    style={{
                        position: "fixed",
                        top: "24px",
                        right: "24px",
                        backgroundColor: theme.colors.primary,
                        color: "#fff",
                        padding: "14px 22px",
                        borderRadius: theme.radius.md,
                        zIndex: 9999,
                        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
                        fontWeight: "600",
                        fontSize: "14px",
                        letterSpacing: "0.3px",
                    }}
                >
                    {successMessage}
                </div>
            )}

            {/* Page Header — tinted bar */}
            <div
                style={{
                    backgroundColor: "rgba(138,21,56,0.04)",
                    borderBottom: "1px solid rgba(138,21,56,0.12)",
                    borderRadius: theme.radius.md,
                    padding: "14px 20px",
                    marginBottom: theme.spacing.lg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                {/* Left group: back button + building info */}
                <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.md }}>
                    <button
                        onClick={() => navigate(id ? `/buildings/${id}` : "/buildings")}
                        className="px-4 py-2.5 bg-brand hover:bg-brand/90 text-white rounded-md flex items-center gap-2 text-xs font-bold transition-colors shadow-xs"
                        title="Return to Building Editor"
                    >
                        <ArrowLeft size={16} />
                        <span>Back</span>
                    </button>
                    <div>
                        <div style={{ fontSize: "17px", fontWeight: "700", color: "#111827" }}>
                            {building?.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            Panorama Studio • {scenes.length} scene{scenes.length !== 1 ? "s" : ""} uploaded
                        </div>
                    </div>
                </div>

                {/* Right group: Preview button */}
                <button
                    onClick={() => setShowPreviewer(true)}
                    disabled={!selectedScene}
                    className="px-4 py-2.5 rounded-md flex items-center gap-2 text-xs font-bold transition-colors shadow-xs"
                    style={{
                        background: selectedScene ? theme.colors.primary : "#e5e7eb",
                        color: selectedScene ? "#fff" : "#9ca3af",
                        cursor: selectedScene ? "pointer" : "not-allowed",
                        border: "none",
                    }}
                >
                    <Eye size={16} />
                    <span>Preview Scene</span>
                </button>
            </div>

            {/* 360 Walkthrough & Spatial Tour Guidelines Banner */}
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
                    onClick={() => setShowGuidelines(!showGuidelines)}
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
                        <span>{showGuidelines ? "Hide Guidelines" : "Show Guidelines"}</span>
                        {showGuidelines ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {showGuidelines && (
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

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "300px 1fr 400px",
                    gap: theme.spacing.lg,
                    minHeight: "680px",
                    height: showGuidelines ? "calc(100vh - 350px)" : "calc(100vh - 200px)",
                }}
            >
                {/* Scenes List */}
                <ScenesList
                    scenes={scenes}
                    selectedScene={selectedScene}
                    setSelectedScene={setSelectedScene}
                    onDeleteScene={requestDeleteScene}
                    newScene={newScene}
                    setNewScene={setNewScene}
                    onCreateScene={handleCreateScene}
                    saving={saving}
                    errors={errors}
                    hasStartScene={hasStartScene}
                    startScene={startScene}
                    onSetStartScene={handleSetStartScene}
                />

                {}
                <ScenePreview
                    selectedScene={selectedScene}
                    building={building}
                    onUpdateSceneAnchors={handleUpdateSceneAnchors}
                    onOpen3DPicker={() => setShow3DPicker(true)}
                />



                {}
                <HotspotsPanel
                    hotspots={hotspots}
                    scenes={scenes}
                    selectedScene={selectedScene}
                    newHotspot={newHotspot}
                    setNewHotspot={setNewHotspot}
                    editingHotspot={editingHotspot}
                    setEditingHotspot={setEditingHotspot}
                    onStartEditHotspot={handleStartEditHotspot}
                    onCancelEditHotspot={handleCancelEditHotspot}
                    onCreateHotspot={handleCreateHotspot}
                    onUpdateHotspot={handleUpdateHotspot}
                    onDeleteHotspot={requestDeleteHotspot}
                    errors={hotspotErrors}
                    setErrors={setHotspotErrors}
                />
            </div>

            {/* Delete Scene Modal */}
            {sceneToDelete && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#fff",
                            padding: "28px 28px 24px",
                            borderRadius: theme.radius.md,
                            maxWidth: "400px",
                            width: "100%",
                            boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                        }}
                    >
                        {/* Icon row */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "20px" }}>
                            <div
                                style={{
                                    width: "42px",
                                    height: "42px",
                                    borderRadius: "50%",
                                    backgroundColor: "rgba(211,47,47,0.10)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <Trash2 size={20} color="#d32f2f" />
                            </div>
                            <div>
                                <h3
                                    style={{
                                        fontSize: "17px",
                                        fontWeight: "700",
                                        margin: "0 0 6px 0",
                                        color: "#111827",
                                    }}
                                >
                                    Delete Scene
                                </h3>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: "13px",
                                        color: "#6b7280",
                                        lineHeight: "1.5",
                                    }}
                                >
                                    Are you sure you want to delete this scene? All
                                    hotspots associated with it will also be removed.
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: theme.spacing.sm,
                            }}
                        >
                            <button
                                onClick={() => setSceneToDelete(null)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: theme.radius.sm,
                                    border: "1px solid #e5e7eb",
                                    background: "#fff",
                                    color: "#374151",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteScene}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: theme.radius.sm,
                                    border: "none",
                                    background: theme.colors.error,
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    fontSize: "13px",
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Hotspot Modal */}
            {hotspotToDelete && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#fff",
                            padding: "28px 28px 24px",
                            borderRadius: theme.radius.md,
                            maxWidth: "400px",
                            width: "100%",
                            boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                        }}
                    >
                        {/* Icon row */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "20px" }}>
                            <div
                                style={{
                                    width: "42px",
                                    height: "42px",
                                    borderRadius: "50%",
                                    backgroundColor: "rgba(211,47,47,0.10)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <Trash2 size={20} color="#d32f2f" />
                            </div>
                            <div>
                                <h3
                                    style={{
                                        fontSize: "17px",
                                        fontWeight: "700",
                                        margin: "0 0 6px 0",
                                        color: "#111827",
                                    }}
                                >
                                    Delete Hotspot
                                </h3>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: "13px",
                                        color: "#6b7280",
                                        lineHeight: "1.5",
                                    }}
                                >
                                    Are you sure you want to delete this hotspot? This
                                    action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: theme.spacing.sm,
                            }}
                        >
                            <button
                                onClick={() => setHotspotToDelete(null)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: theme.radius.sm,
                                    border: "1px solid #e5e7eb",
                                    background: "#fff",
                                    color: "#374151",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteHotspot}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: theme.radius.sm,
                                    border: "none",
                                    background: theme.colors.error,
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    fontSize: "13px",
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen 3D Anchor Picker Modal */}
            {show3DPicker && (

                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "#f8fafc",
                        zIndex: 99999,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <div
                        style={{
                            padding: "14px 24px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: theme.colors.primary,
                            borderBottom: "1px solid rgba(255,255,255,0.15)",
                        }}
                    >
                        <div>
                            <h2
                                style={{
                                    color: "#ffffff",
                                    margin: 0,
                                    fontSize: "18px",
                                    fontWeight: "700",
                                    letterSpacing: "0.5px",
                                }}
                            >
                                PICK 3D ANCHOR: {selectedScene?.title}
                            </h2>

                            <p
                                style={{
                                    color: "rgba(255,255,255,0.85)",
                                    margin: "4px 0 0 0",
                                    fontSize: "12px",
                                }}
                            >
                                Rotate / zoom around the 3D building. <b>Double-click</b> on the doorway, entrance, or floor where this panorama photo was taken.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShow3DPicker(false)}
                            style={{
                                background: theme.colors.error,
                                color: "white",
                                border: "none",
                                padding: "8px 18px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "12px",
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                    <iframe
                        ref={pickerIframeRef}
                        src="/admin-hotspot-editor.html"
                        style={{ width: "100%", flex: 1, border: "none" }}
                        onLoad={sendInitTo3DPicker}
                    />
                </div>
            )}

            {/* 360 Previewer Modal */}
            {showPreviewer && selectedScene && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "#000",
                        zIndex: 99999,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <div
                        style={{
                            padding: "14px 24px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "rgba(0,0,0,0.8)",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                    >
                        <h2
                            style={{
                                color: "#ffffff",
                                margin: 0,
                                fontSize: "18px",
                                fontWeight: "700",
                                letterSpacing: "0.5px",
                            }}
                        >
                            360 PREVIEW: {selectedScene.title}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShowPreviewer(false)}
                            style={{
                                background: theme.colors.error,
                                color: "white",
                                border: "none",
                                padding: "8px 18px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "12px",
                            }}
                        >
                            Close Preview
                        </button>
                    </div>
                    <div style={{ flex: 1, position: "relative", background: "#000" }}>
                        <iframe
                            ref={previewIframeRef}
                            src="/panorama-viewer.html"
                            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                            onLoad={(e) => {
                                e.target.contentWindow.postMessage(
                                    {
                                        type: "init",
                                        imageUrl: selectedScene.image_url,
                                        hotspots: hotspots || [],
                                        title: selectedScene.title,
                                        buildingName: building?.name || "Campus Walkthrough",
                                        allScenes: scenes.map((s) => ({
                                            id: s.id,
                                            title: s.title,
                                            image_url: s.image_url,
                                            is_start_scene: Boolean(s.is_start_scene),
                                        })),
                                    },
                                    "*",
                                );
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};


export default PanoramaManagerPage;

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
