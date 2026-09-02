import React, { useState, useEffect, useRef } from "react";
import { Box, Image as ImageIcon, X } from "lucide-react";
import { Card } from "../components/ui";
import { buildingService } from "../services/buildingService";
import { panoramaService } from "../services/panoramaService";
import "@google/model-viewer";
import { ReactPhotoSphereViewer } from "react-photo-sphere-viewer";
import { VirtualTourPlugin } from "@photo-sphere-viewer/virtual-tour-plugin";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const getFullUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
};

export default function Media() {
    const [buildings, setBuildings] = useState([]);
    const [viewTab, setViewTab] = useState("3d");
    const [loading, setLoading] = useState(true);

    const [activeModel, setActiveModel] = useState(null);
    const [isModelLoading, setIsModelLoading] = useState(true);
    const [modelProgress, setModelProgress] = useState(0);
    const [modelError, setModelError] = useState(null);
    const modelViewerRef = useRef(null);

    const [activePanorama, setActivePanorama] = useState(null);
    const [panoScenes, setPanoScenes] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const viewer = modelViewerRef.current;
        if (!viewer || !activeModel) return;

        const handleProgress = (event) => {
            const p = Math.round((event.detail.totalProgress || 0) * 100);
            setModelProgress(p);
        };

        const handleLoad = () => {
            setIsModelLoading(false);
            setModelError(null);
        };

        const handleError = (error) => {
            console.error("3D Model load error:", error);
            setIsModelLoading(false);
            setModelError("Failed to render 3D model. The file may be corrupt or inaccessible.");
        };

        viewer.addEventListener("progress", handleProgress);
        viewer.addEventListener("load", handleLoad);
        viewer.addEventListener("error", handleError);

        return () => {
            viewer.removeEventListener("progress", handleProgress);
            viewer.removeEventListener("load", handleLoad);
            viewer.removeEventListener("error", handleError);
        };
    }, [activeModel]);

    const loadData = async () => {
        try {
            const data = await buildingService.getBuildings();
            const buildingsWithScenes = await Promise.all(
                data.map(async (b) => {
                    try {
                        const scenes = await panoramaService.getBuildingScenes(
                            b.id,
                        );
                        return { ...b, scenes: scenes || [] };
                    } catch (e) {
                        return { ...b, scenes: [] };
                    }
                }),
            );
            setBuildings(buildingsWithScenes);
        } catch (error) {
            console.error("Error loading buildings:", error);
        } finally {
            setLoading(false);
        }
    };

    const open3DViewer = (building) => {
        setIsModelLoading(true);
        setModelProgress(0);
        setModelError(null);
        setActiveModel(building);
    };

    const openPanoramaViewer = (building) => {
        if (building.scenes && building.scenes.length > 0) {
            setPanoScenes(building.scenes);
            setActivePanorama(building);
        }
    };

    const closeViewer = () => {
        setActiveModel(null);
        setActivePanorama(null);
        setPanoScenes([]);
        setIsModelLoading(true);
        setModelProgress(0);
        setModelError(null);
    };

    const has3DModel = (b) => !!b.model_url;

    const handlePanoReady = (instance) => {
        const vtPlugin = instance.getPlugin(VirtualTourPlugin);
        if (!vtPlugin || panoScenes.length === 0) return;

        const startScene =
            panoScenes.find((s) => s.is_start_scene) || panoScenes[0];

        const nodes = panoScenes.map((scene) => ({
            id: scene.id.toString(),
            panorama: getFullUrl(scene.image_url),
            name: scene.title,
            links: (scene.hotspots || []).map((h) => ({
                nodeId: h.target_scene_id.toString(),
                position: {
                    pitch: (h.pitch * Math.PI) / 180,
                    yaw: (h.yaw * Math.PI) / 180,
                },
                name: h.label || h.target_scene_title,
            })),
        }));

        vtPlugin.setNodes(nodes, startScene.id.toString());
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">
                        Content & Media Viewer
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Interact with 3D models and panorama walkthroughs.
                    </p>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-brand-border shadow-sm">
                    <button
                        onClick={() => setViewTab("3d")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${
                            viewTab === "3d"
                                ? "bg-brand text-white shadow-md"
                                : "text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                        <Box size={16} /> 3D Models
                    </button>
                    <button
                        onClick={() => setViewTab("panorama")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${
                            viewTab === "panorama"
                                ? "bg-brand text-white shadow-md"
                                : "text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                        <ImageIcon size={16} /> Panorama Walkthroughs
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {buildings.map((b) => {
                        const is3D = viewTab === "3d";
                        const hasModel = has3DModel(b);
                        const hasPanoramas = b.scenes && b.scenes.length > 0;
                        const hasContent = is3D ? hasModel : hasPanoramas;

                        return (
                            <Card
                                key={b.id}
                                className={`group transition-all duration-300 ${hasContent ? "cursor-pointer hover:border-brand hover:shadow-xl" : "opacity-70"}`}
                                onClick={() => {
                                    if (is3D && hasModel) open3DViewer(b);
                                    if (!is3D && hasPanoramas)
                                        openPanoramaViewer(b);
                                }}
                            >
                                <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                                    {is3D ? (
                                        hasModel ? (
                                            <div className="w-full h-full relative pointer-events-none">
                                                {b.image_url ? (
                                                    <img
                                                        src={getFullUrl(b.image_url)}
                                                        alt={b.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-200">
                                                        <Box size={32} className="mb-2 opacity-50" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">
                                                            Model Ready
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-gray-400 flex flex-col items-center">
                                                <Box
                                                    size={32}
                                                    className="mb-2 opacity-50"
                                                />
                                                <span className="text-xs font-bold uppercase tracking-wider">
                                                    No 3D Model
                                                </span>
                                            </div>
                                        )
                                    ) : hasPanoramas ? (
                                        <div className="w-full h-full">
                                            <img
                                                src={getFullUrl(
                                                    b.scenes[0].image_url,
                                                )}
                                                alt={b.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-gray-400 flex flex-col items-center">
                                            <ImageIcon
                                                size={32}
                                                className="mb-2 opacity-50"
                                            />
                                            <span className="text-xs font-bold uppercase tracking-wider">
                                                No Panoramas
                                            </span>
                                        </div>
                                    )}

                                    {hasContent && (
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                                            <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm text-brand font-bold text-sm px-4 py-2 rounded-full transition-all transform translate-y-4 group-hover:translate-y-0 shadow-lg">
                                                {is3D
                                                    ? "Interact in 3D"
                                                    : "View Panoramas"}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 truncate">
                                        {b.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                        {b.description ||
                                            "No description available"}
                                    </p>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {}
            {(activeModel || activePanorama) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/90 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="relative w-full max-w-6xl h-[85vh] bg-black rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col">
                        <div className="absolute top-4 right-4 z-50 flex gap-2">
                            <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white font-bold text-sm flex items-center gap-2">
                                {activeModel ? (
                                    <Box size={16} />
                                ) : (
                                    <ImageIcon size={16} />
                                )}
                                {(activeModel || activePanorama).name}
                            </div>
                            <button
                                onClick={closeViewer}
                                className="bg-black/50 backdrop-blur-md p-2 rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 w-full h-full relative">
                            {activeModel && (
                                <div className="w-full h-full relative flex items-center justify-center">
                                    <model-viewer
                                        ref={modelViewerRef}
                                        src={getFullUrl(activeModel.model_url)}
                                        alt={activeModel.name || "3D Building Model"}
                                        crossorigin="anonymous"
                                        camera-controls
                                        auto-rotate
                                        shadow-intensity="1"
                                        exposure="1"
                                        bounds="tight"
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            backgroundColor: "#0B132B",
                                        }}
                                    ></model-viewer>

                                    {isModelLoading && (
                                        <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20">
                                            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4" />
                                            <p className="text-white font-bold text-sm">
                                                Loading 3D Model... {modelProgress > 0 ? `${modelProgress}%` : ''}
                                            </p>
                                            <div className="w-48 h-1.5 bg-gray-800 rounded-full mt-3 overflow-hidden">
                                                <div
                                                    className="h-full bg-brand transition-all duration-200"
                                                    style={{ width: `${modelProgress}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-400 mt-2">
                                                {activeModel.name}
                                            </span>
                                        </div>
                                    )}

                                    {modelError && (
                                        <div className="absolute inset-0 bg-gray-950/90 flex flex-col items-center justify-center z-20 p-6 text-center">
                                            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
                                                <Box size={24} />
                                            </div>
                                            <h4 className="text-white font-bold text-base mb-1">Unable to Load 3D Model</h4>
                                            <p className="text-xs text-gray-400 max-w-sm mb-4">{modelError}</p>
                                            <button
                                                onClick={() => {
                                                    setIsModelLoading(true);
                                                    setModelError(null);
                                                    if (modelViewerRef.current) {
                                                        modelViewerRef.current.src = getFullUrl(activeModel.model_url);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand-dark transition-colors"
                                            >
                                                Retry Loading
                                            </button>
                                        </div>
                                    )}

                                    {/* 3D Interaction Control Hint */}
                                    {!isModelLoading && !modelError && (
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white/90 text-xs px-4 py-1.5 rounded-full border border-white/10 pointer-events-none flex items-center gap-2">
                                            <span>🖱️ Drag to rotate</span>
                                            <span>•</span>
                                            <span>🔍 Scroll to zoom</span>
                                            <span>•</span>
                                            <span>✋ Right-click to pan</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activePanorama && panoScenes.length > 0 && (
                                <ReactPhotoSphereViewer
                                    src={getFullUrl(
                                        (
                                            panoScenes.find(
                                                (s) => s.is_start_scene,
                                            ) || panoScenes[0]
                                        ).image_url,
                                    )}
                                    height={"100%"}
                                    width={"100%"}
                                    littlePlanet={true}
                                    plugins={[
                                        [MarkersPlugin, {}],
                                        [
                                            VirtualTourPlugin,
                                            {
                                                positionMode: "manual",
                                                renderMode: "3d",
                                            },
                                        ],
                                    ]}
                                    onReady={handlePanoReady}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
