import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { buildingService } from "../services/buildingService";
import { panoramaService } from "../services/panoramaService";
import { theme } from "../theme";
import { validateForm, validateString, validateNumber } from "../utils/validation";

import ScenesList from "./panorama/ScenesList";
import HotspotsPanel from "./panorama/HotspotsPanel";
import DeleteConfirmModal from "./panorama/DeleteConfirmModal";
import PreviewModal from "./panorama/PreviewModal";
import PanoramaHeader from "./panorama/PanoramaHeader";
import WalkthroughGuidelines from "./panorama/WalkthroughGuidelines";
import PanoramaWorkspace from "./panorama/PanoramaWorkspace";

const PanoramaManagerPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [building, setBuilding] = useState(null);
    const [scenes, setScenes] = useState([]);
    const [selectedScene, setSelectedScene] = useState(null);
    const [hotspots, setHotspots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState("");
    const [hotspotErrors, setHotspotErrors] = useState({});
    const [sceneToDelete, setSceneToDelete] = useState(null);
    const [hotspotToDelete, setHotspotToDelete] = useState(null);

    // Center workspace: 360 hotspot placer or the persistent 3D anchor map
    const [centerTab, setCenterTab] = useState("hotspots");
    const [placeMode, setPlaceMode] = useState(false);
    const [placeTargetLabel, setPlaceTargetLabel] = useState("");

    // Anchor workspace state
    const [pendingAnchor, setPendingAnchor] = useState(null);
    const [savingAnchor, setSavingAnchor] = useState(false);

    // Fullscreen presentation preview
    const [showPreviewer, setShowPreviewer] = useState(false);
    const modalViewerRef = useRef(null);

    const inlineViewerRef = useRef(null);
    const anchorIframeRef = useRef(null);

    const [showGuidelines, setShowGuidelines] = useState(true);

    const startScene = scenes.find((s) => s.is_start_scene);
    const hasStartScene = Boolean(startScene);

    const [editingHotspot, setEditingHotspot] = useState(null);
    const [newHotspot, setNewHotspot] = useState({
        target_scene: "",
        label: "",
        yaw: 0,
        pitch: 0,
        is_active: true,
    });

    const showSuccess = useCallback((message) => {
        setSuccessMessage(message);
        window.clearTimeout(showSuccess._timer);
        showSuccess._timer = window.setTimeout(
            () => setSuccessMessage(""),
            3500,
        );
    }, []);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (selectedScene) {
            setEditingHotspot(null);
            setHotspotErrors({});
            loadHotspots(selectedScene.id);
        }
    }, [selectedScene]);

    const loadData = async ({ silent = false } = {}) => {
        try {
            if (!silent) setLoading(true);
            const [buildingData, scenesData] = await Promise.all([
                buildingService.getBuilding(id),
                panoramaService.getBuildingScenes(id),
            ]);
            setBuilding(buildingData);
            const list = scenesData || [];
            setScenes(list);
            setSelectedScene((prev) => {
                if (prev) {
                    const stillThere = list.find((s) => s.id === prev.id);
                    if (stillThere) return stillThere;
                }
                return list[0] || null;
            });
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

    // --- Messaging helpers -------------------------------------------------

    const buildSceneMessage = useCallback(
        (scene, sceneHotspots) => ({
            type: "init",
            imageUrl: scene.image_url,
            hotspots: sceneHotspots || [],
            title: scene.title,
            buildingName: building?.name || "Campus Walkthrough",
            allScenes: scenes.map((s) => ({
                id: s.id,
                title: s.title,
                image_url: s.image_url,
                is_start_scene: Boolean(s.is_start_scene),
            })),
        }),
        [building, scenes],
    );

    const sendSceneToViewer = useCallback(
        (ref, scene, sceneHotspots) => {
            const win = ref?.current?.contentWindow;
            if (!win || !scene) return;
            win.postMessage(
                buildSceneMessage(scene, sceneHotspots),
                "*",
            );
        },
        [buildSceneMessage],
    );

    const sendPlaceMode = useCallback((enabled) => {
        inlineViewerRef.current?.contentWindow?.postMessage(
            {
                type: "SET_PLACE_MODE",
                enabled,
                targetLabel: placeTargetLabel,
            },
            "*",
        );
    }, [placeTargetLabel]);

    const sendInitToAnchorWorkspace = useCallback(() => {
        const win = anchorIframeRef.current?.contentWindow;
        if (!win) return;

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

        win.postMessage(
            {
                type: "INIT_EDITOR",
                mode: "PICK_ANCHOR",
                modelUrl: building?.model_url,
                anchors: validAnchors,
                currentScene: selectedScene
                    ? {
                          id: selectedScene.id,
                          title: selectedScene.title,
                          is_start_scene: Boolean(
                              selectedScene.is_start_scene,
                          ),
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

    // --- Push current scene/hotspots into the inline viewer ---------------
    useEffect(() => {
        if (!selectedScene) return;
        sendSceneToViewer(inlineViewerRef, selectedScene, hotspots);
    }, [selectedScene, hotspots, sendSceneToViewer]);

    // Keep the 3D workspace pins in sync (cheap no-op if the model is already
    // loaded — the editor just re-renders the anchor pins).
    useEffect(() => {
        sendInitToAnchorWorkspace();
    }, [sendInitToAnchorWorkspace]);

    // Reflect placement mode into the viewer.
    useEffect(() => {
        sendPlaceMode(placeMode);
    }, [placeMode, sendPlaceMode]);

    // --- Message bridge ---------------------------------------------------
    useEffect(() => {
        const handleMessage = (event) => {
            const data = event.data;
            if (!data || !data.type) return;

            switch (data.type) {
                case "HOTSPOT_PICKED": {
                    const yaw = Number(data.yaw) || 0;
                    const pitch = Number(data.pitch) || 0;
                    setPlaceMode(false);
                    setEditingHotspot((prev) =>
                        prev ? { ...prev, yaw, pitch } : prev,
                    );
                    setNewHotspot((prev) => ({ ...prev, yaw, pitch }));
                    showSuccess(
                        `Position captured — yaw ${yaw.toFixed(
                            1,
                        )}°, pitch ${pitch.toFixed(
                            1,
                        )}°. Choose a target scene, then save.`,
                    );
                    break;
                }

                case "PLACE_MODE_CLOSED":
                    setPlaceMode(false);
                    break;

                case "ANCHOR_PICKED": {
                    const x = Number(data.x);
                    const y = Number(data.y);
                    const z = Number(data.z);
                    setPendingAnchor({ x, y, z, at: Date.now() });
                    setCenterTab("anchors");
                    showSuccess(
                        `Coordinates captured (${x}, ${y}, ${z}). Review and save the anchor.`,
                    );
                    break;
                }

                case "ANCHOR_SELECTED": {
                    const target = scenes.find(
                        (s) => String(s.id) === String(data.id),
                    );
                    if (target) setSelectedScene(target);
                    break;
                }

                case "EDITOR_READY":
                    sendInitToAnchorWorkspace();
                    break;

                case "hotspot_clicked": {
                    const rawTargetId = data.target_scene_id;
                    const targetId =
                        typeof rawTargetId === "object" && rawTargetId
                            ? rawTargetId.id
                            : rawTargetId;
                    const target = scenes.find(
                        (s) =>
                            s.id === targetId ||
                            String(s.id) === String(targetId),
                    );
                    if (target) {
                        setSelectedScene(target);
                    }
                    break;
                }

                case "reset_to_start": {
                    const start =
                        scenes.find((s) => s.is_start_scene) ||
                        scenes[0] ||
                        null;
                    if (start) setSelectedScene(start);
                    break;
                }

                default:
                    break;
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [scenes, sendInitToAnchorWorkspace, showSuccess]);

    // --- Scene + hotspot CRUD ---------------------------------------------

    const handleUploadScene = async ({ title, image, onProgress }) => {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("image", image);
        formData.append("is_active", true);
        // sort_order + start-scene flags are assigned server-side so bulk
        // uploads stay consistent even after scenes are deleted.

        return panoramaService.createScene(id, formData, {
            onUploadProgress: (event) => {
                if (event.total && onProgress) {
                    onProgress(
                        Math.min(
                            99,
                            Math.round((event.loaded / event.total) * 100),
                        ),
                    );
                }
            },
        });
    };

    const handleUploadsComplete = async () => {
        await loadData({ silent: true });
        showSuccess("Scenes uploaded and refreshed.");
    };

    const handleSetStartScene = async (sceneId) => {
        try {
            await panoramaService.updateScene(sceneId, {
                is_start_scene: true,
            });
            showSuccess("Entrance / Start Scene updated!");
            loadData({ silent: true });
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
            loadData({ silent: true });
        } catch (error) {
            console.error("Failed to delete scene", error);
        } finally {
            setSceneToDelete(null);
        }
    };

    const handlePlaceOnPanorama = (label) => {
        if (!selectedScene) return;
        setPlaceTargetLabel((label || "").trim());
        setPlaceMode(true);
        setCenterTab("hotspots");
    };

    const handleCancelPlace = () => {
        setPlaceMode(false);
        sendPlaceMode(false);
    };

    const handleSaveAnchor = async (anchorData) => {
        if (!selectedScene) return;
        setSavingAnchor(true);
        try {
            await panoramaService.updateScene(
                selectedScene.id,
                anchorData,
            );
            setPendingAnchor(null);
            await loadData({ silent: true });
            showSuccess("3D anchor saved!");
        } catch (error) {
            console.error("Failed to update anchor coordinates", error);
            showSuccess("Could not save the anchor. Please try again.");
        } finally {
            setSavingAnchor(false);
        }
    };

    const handleCreateHotspot = async (e) => {
        e.preventDefault();
        if (!selectedScene) return;

        setHotspotErrors({});

        const schema = {
            label: (val) => validateString(val, 1),
            target_scene: (val) => validateString(val, 1),
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

            await panoramaService.createHotspot(selectedScene.id, {
                ...newHotspot,
                target_scene: newHotspot.target_scene,
                yaw: isNaN(yawVal) ? 0 : yawVal,
                pitch: isNaN(pitchVal) ? 0 : pitchVal,
            });
            showSuccess("Hotspot created!");
            setNewHotspot({
                target_scene: "",
                label: "",
                yaw: 0,
                pitch: 0,
                is_active: true,
            });
            setHotspotErrors({});
            setPlaceMode(false);
            inlineViewerRef.current?.contentWindow?.postMessage(
                { type: "CLEAR_MARKER" },
                "*",
            );
            loadHotspots(selectedScene.id);
        } catch (error) {
            console.error("Failed to create hotspot", error);
            setHotspotErrors(
                error.response?.data?.error?.message ||
                    error.response?.data ||
                    { form: "Failed to create hotspot" },
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
                target_scene:
                    hotspot.target_scene_id ||
                    hotspot.target_scene ||
                    "",
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
            target_scene: (val) => validateString(val, 1),
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

            await panoramaService.updateHotspot(editingHotspot.id, {
                label: editingHotspot.label,
                target_scene: editingHotspot.target_scene,
                yaw: isNaN(yawVal) ? 0 : yawVal,
                pitch: isNaN(pitchVal) ? 0 : pitchVal,
            });
            showSuccess("Hotspot updated successfully!");
            setEditingHotspot(null);
            setHotspotErrors({});
            setPlaceMode(false);
            inlineViewerRef.current?.contentWindow?.postMessage(
                { type: "CLEAR_MARKER" },
                "*",
            );
            loadHotspots(selectedScene.id);
        } catch (error) {
            console.error("Failed to update hotspot", error);
            setHotspotErrors(
                error.response?.data?.error?.message ||
                    error.response?.data ||
                    { form: "Failed to update hotspot" },
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
                        maxWidth: "420px",
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
                    gridTemplateColumns: "280px 1fr 360px",
                    gap: theme.spacing.lg,
                    minHeight: "680px",
                    height: showGuidelines
                        ? "calc(100vh - 350px)"
                        : "calc(100vh - 200px)",
                }}
            >
                {/* Scenes List + bulk upload queue */}
                <ScenesList
                    scenes={scenes}
                    selectedScene={selectedScene}
                    setSelectedScene={setSelectedScene}
                    onDeleteScene={requestDeleteScene}
                    onUploadScene={handleUploadScene}
                    onUploadsComplete={handleUploadsComplete}
                    hasStartScene={hasStartScene}
                    startScene={startScene}
                    onSetStartScene={handleSetStartScene}
                />

                {/* Center workspace: click-to-place hotspots + 3D anchor map */}
                <div style={{ minHeight: 0, height: "100%" }}>
                    <PanoramaWorkspace
                        tab={centerTab}
                        onTabChange={setCenterTab}
                        selectedScene={selectedScene}
                        building={building}
                        inlineViewerRef={inlineViewerRef}
                        anchorIframeRef={anchorIframeRef}
                        onViewerLoad={() =>
                            sendSceneToViewer(
                                inlineViewerRef,
                                selectedScene,
                                hotspots,
                            )
                        }
                        onAnchorFrameLoad={sendInitToAnchorWorkspace}
                        placeMode={placeMode}
                        placeTargetLabel={placeTargetLabel}
                        onCancelPlace={handleCancelPlace}
                        draftAnchor={pendingAnchor}
                        savingAnchor={savingAnchor}
                        onSaveAnchor={handleSaveAnchor}
                    />
                </div>

                {/* Hotspots */}
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
                    onPlaceOnPanorama={handlePlaceOnPanorama}
                    placeMode={placeMode}
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

            <PreviewModal
                open={showPreviewer}
                scene={selectedScene}
                hotspots={hotspots}
                building={building}
                scenes={scenes}
                iframeRef={modalViewerRef}
                onClose={() => setShowPreviewer(false)}
            />
        </div>
    );
};

export default PanoramaManagerPage;
