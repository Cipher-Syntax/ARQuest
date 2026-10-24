import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { buildingService } from "../services/buildingService";
import { panoramaService } from "../services/panoramaService";
import { theme } from "../theme";
import {
    validateForm,
    validateString,
    validateRequired,
    validateNumber,
} from "../utils/validation";

import ScenesList from "./panorama/ScenesList";
import ScenePreview from "./panorama/ScenePreview";
import HotspotsPanel from "./panorama/HotspotsPanel";
import DeleteConfirmModal from "./panorama/DeleteConfirmModal";
import AnchorPickerModal from "./panorama/AnchorPickerModal";
import PreviewModal from "./panorama/PreviewModal";
import PanoramaHeader from "./panorama/PanoramaHeader";
import WalkthroughGuidelines from "./panorama/WalkthroughGuidelines";

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

            <PanoramaHeader
                buildingName={building?.name}
                sceneCount={scenes.length}
                canPreview={Boolean(selectedScene)}
                onBack={() => navigate(id ? `/buildings/${id}` : "/buildings")}
                onPreview={() => setShowPreviewer(true)}
            />

            <WalkthroughGuidelines
                expanded={showGuidelines}
                onToggle={() => setShowGuidelines((prev) => !prev)}
            />

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
                    setErrors={setErrors}
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

            <DeleteConfirmModal
                open={Boolean(sceneToDelete)}
                title="Delete Scene"
                message="Are you sure you want to delete this scene? All hotspots associated with it will also be removed. This action cannot be undone."
                onCancel={() => setSceneToDelete(null)}
                onConfirm={confirmDeleteScene}
            />

            <DeleteConfirmModal
                open={Boolean(hotspotToDelete)}
                title="Delete Hotspot"
                message="Are you sure you want to delete this hotspot? This action cannot be undone."
                onCancel={() => setHotspotToDelete(null)}
                onConfirm={confirmDeleteHotspot}
            />

            <AnchorPickerModal
                open={show3DPicker}
                sceneTitle={selectedScene?.title}
                iframeRef={pickerIframeRef}
                onLoad={sendInitTo3DPicker}
                onClose={() => setShow3DPicker(false)}
            />

            <PreviewModal
                open={showPreviewer}
                scene={selectedScene}
                hotspots={hotspots}
                building={building}
                scenes={scenes}
                iframeRef={previewIframeRef}
                onClose={() => setShowPreviewer(false)}
            />
        </div>
    );
};

export default PanoramaManagerPage;
