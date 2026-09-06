import { useState, useEffect, useRef, useCallback } from "react";
import {
    MapPin, Navigation, Trash2, X, Check, Route, Circle, ChevronDown, ChevronUp,
} from "lucide-react";
import Map, { Marker, Source, Layer, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { buildingService } from "../services/buildingService";
import { navigationService } from "../services/navigationService";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const WMSU_CENTER = { lat: 6.9122, lng: 122.0605 };
const NODE_TYPE_LABELS = {
    entrance: "Building Entrance",
    junction: "Walkway Junction",
    gate: "Campus Gate",
    poi: "Point of Interest",
};
const NODE_TYPE_COLORS = {
    entrance: "#B21830",
    junction: "#0ea5e9",
    gate: "#f59e0b",
    poi: "#8b5cf6",
};

function NodeDot({ node, selected, isDrawingOrigin }) {
    const color = NODE_TYPE_COLORS[node.node_type] || "#0ea5e9";
    const highlighted = selected || isDrawingOrigin;
    return (
        <div
            title={node.label}
            style={{
                width: 18, height: 18, borderRadius: "50%",
                backgroundColor: color,
                border: `3px solid ${highlighted ? "#fff" : "rgba(255,255,255,0.7)"}`,
                boxShadow: highlighted
                    ? `0 0 0 3px ${color}, 0 2px 8px rgba(0,0,0,0.4)`
                    : "0 2px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
                transition: "box-shadow 0.2s",
            }}
        />
    );
}

export default function NavigationPage() {
    const [buildings, setBuildings] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [paths, setPaths] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [saving, setSaving] = useState(false);
    const [viewState, setViewState] = useState({
        longitude: WMSU_CENTER.lng, latitude: WMSU_CENTER.lat,
        zoom: 17, pitch: 30, bearing: 0,
    });
    const [mode, setMode] = useState("view");
    const [drawingFrom, setDrawingFrom] = useState(null);
    const [drawPreview, setDrawPreview] = useState([]);
    const drawCoordsRef = useRef([]);
    const [nodeForm, setNodeForm] = useState(null);
    const [nodeFormData, setNodeFormData] = useState({ label: "", node_type: "junction", building: "" });
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedPath, setSelectedPath] = useState(null);
    const [nodesExpanded, setNodesExpanded] = useState(true);
    const [pathsExpanded, setPathsExpanded] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [b, n, p] = await Promise.all([
                buildingService.getBuildings(),
                navigationService.getNodes(),
                navigationService.getPaths(),
            ]);
            setBuildings(b || []);
            setNodes(n || []);
            setPaths(p || []);
        } catch {
            setError("Failed to load data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const flashSuccess = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    const resetMode = useCallback((m = "view") => {
        setMode(m);
        setDrawingFrom(null);
        setDrawPreview([]);
        drawCoordsRef.current = [];
        setNodeForm(null);
        setSelectedNode(null);
        setSelectedPath(null);
    }, []);

    const handleMapClick = useCallback((e) => {
        const { lng, lat } = e.lngLat;
        if (mode === "add_node") {
            setNodeForm({ lat, lng });
            setNodeFormData({ label: "", node_type: "junction", building: "" });
            return;
        }
        if (mode === "draw_path" && drawingFrom) {
            drawCoordsRef.current.push([lng, lat]);
            setDrawPreview([...drawCoordsRef.current]);
        }
    }, [mode, drawingFrom]);

    const handleNodeMarkerClick = useCallback((node) => (e) => {
        if (e.originalEvent) e.originalEvent.stopPropagation();
        if (mode === "draw_path") {
            if (!drawingFrom) {
                setDrawingFrom(node);
                drawCoordsRef.current = [[node.longitude, node.latitude]];
                setDrawPreview([[node.longitude, node.latitude]]);
                return;
            }
            if (node.id === drawingFrom.id) return;
            const geometry = [
                [drawingFrom.longitude, drawingFrom.latitude],
                ...drawCoordsRef.current.slice(1),
                [node.longitude, node.latitude],
            ];
            savePath(drawingFrom.id, node.id, geometry);
            return;
        }
        if (mode === "view") { setSelectedNode(node); setSelectedPath(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, drawingFrom]);

    const handleSaveNode = async () => {
        if (!nodeForm || !nodeFormData.label.trim()) return;
        setSaving(true);
        try {
            const created = await navigationService.createNode({
                label: nodeFormData.label.trim(),
                latitude: nodeForm.lat,
                longitude: nodeForm.lng,
                node_type: nodeFormData.node_type,
                building: nodeFormData.building || null,
            });
            setNodes((prev) => [...prev, created]);
            setNodeForm(null);
            flashSuccess("Node saved.");
        } catch {
            setError("Failed to save node.");
        } finally {
            setSaving(false);
        }
    };

    const savePath = async (startId, endId, geometry) => {
        setSaving(true);
        try {
            const created = await navigationService.createPath({
                start_node: startId, end_node: endId, geometry,
            });
            setPaths((prev) => [...prev, created]);
            setDrawingFrom(null);
            setDrawPreview([]);
            drawCoordsRef.current = [];
            flashSuccess("Path saved.");
        } catch {
            setError("Failed to save path.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            if (deleteTarget.type === "node") {
                await navigationService.deleteNode(deleteTarget.id);
                setNodes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
                setSelectedNode(null);
            } else {
                await navigationService.deletePath(deleteTarget.id);
                setPaths((prev) => prev.filter((p) => p.id !== deleteTarget.id));
                setSelectedPath(null);
            }
            flashSuccess("Deleted.");
        } catch {
            setError("Failed to delete.");
        } finally {
            setSaving(false);
            setDeleteTarget(null);
        }
    };

    const pathsGeojson = {
        type: "FeatureCollection",
        features: paths.map((p) => ({
            type: "Feature",
            properties: { id: p.id },
            geometry: { type: "LineString", coordinates: p.geometry },
        })),
    };
    const previewGeojson = {
        type: "FeatureCollection",
        features:
            drawPreview.length >= 2
                ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: drawPreview } }]
                : [],
    };

    const instrText = {
        view: "Select a node or path to inspect. Switch to a mode above to add data.",
        add_node: "Click anywhere on the satellite map to drop a navigation node.",
        draw_path: drawingFrom
            ? `Started from "${drawingFrom.label}". Click walkway points, then click another node to finish.`
            : "Click a node to start drawing a path from it.",
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-100">
            {/* Left panel */}
            <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                <div className="px-4 py-4 border-b border-gray-200">
                    <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                        <Route size={16} className="text-brand" /> Walking Paths
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">WMSU pedestrian navigation network</p>
                </div>
                <div className="px-4 py-3 border-b border-gray-200 flex flex-col gap-2">
                    <button
                        onClick={() => resetMode(mode === "add_node" ? "view" : "add_node")}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === "add_node" ? "bg-brand text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                        <MapPin size={14} />
                        {mode === "add_node" ? "Cancel Add Node" : "Add Node"}
                    </button>
                    <button
                        onClick={() => resetMode(mode === "draw_path" ? "view" : "draw_path")}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === "draw_path" ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                        <Navigation size={14} />
                        {mode === "draw_path" ? "Cancel Draw Path" : "Draw Path"}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {/* Nodes */}
                    <button
                        onClick={() => setNodesExpanded((v) => !v)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Circle size={14} /> Nodes
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand text-white text-xs font-bold">{nodes.length}</span>
                        </div>
                        {nodesExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </button>
                    {nodesExpanded && (
                        <ul className="divide-y divide-gray-100">
                            {nodes.length === 0 && (
                                <li className="px-4 py-3 text-xs text-gray-400 italic">No nodes yet. Add one on the map.</li>
                            )}
                            {nodes.map((n) => (
                                <li
                                    key={n.id}
                                    onClick={() => { setSelectedNode(n); setSelectedPath(null); }}
                                    className={`px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${selectedNode?.id === n.id ? "bg-red-50 border-l-2 border-brand" : ""}`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{n.label}</p>
                                            <p className="text-xs text-gray-400">{NODE_TYPE_LABELS[n.node_type]}</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "node", id: n.id }); }}
                                            className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {/* Paths */}
                    <button
                        onClick={() => setPathsExpanded((v) => !v)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Route size={14} /> Paths
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand text-white text-xs font-bold">{paths.length}</span>
                        </div>
                        {pathsExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </button>
                    {pathsExpanded && (
                        <ul className="divide-y divide-gray-100">
                            {paths.length === 0 && (
                                <li className="px-4 py-3 text-xs text-gray-400 italic">No paths yet. Draw one between nodes.</li>
                            )}
                            {paths.map((p) => (
                                <li
                                    key={p.id}
                                    onClick={() => { setSelectedPath(p); setSelectedNode(null); }}
                                    className={`px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${selectedPath?.id === p.id ? "bg-sky-50 border-l-2 border-sky-500" : ""}`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{p.start_node_label} → {p.end_node_label}</p>
                                            <p className="text-xs text-gray-400">{p.distance_meters}m · {p.is_accessible ? "♿ accessible" : "steps"}</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "path", id: p.id }); }}
                                            className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>

            {/* Right map panel */}
            <div className="flex-1 relative">
                <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full text-xs font-medium shadow-md text-white pointer-events-none ${mode === "add_node" ? "bg-brand" : mode === "draw_path" ? "bg-sky-600" : "bg-gray-700/80"}`}>
                    {instrText[mode]}
                </div>
                {successMsg && (
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full text-xs font-semibold shadow bg-green-600 text-white flex items-center gap-1.5">
                        <Check size={12} /> {successMsg}
                    </div>
                )}
                {error && (
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg text-xs font-semibold shadow bg-red-600 text-white flex items-center gap-2">
                        {error}
                        <button onClick={() => setError(null)}><X size={12} /></button>
                    </div>
                )}
                <Map
                    {...viewState}
                    onMove={(e) => setViewState(e.viewState)}
                    onClick={handleMapClick}
                    style={{ width: "100%", height: "100%" }}
                    mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    cursor={mode === "add_node" ? "crosshair" : mode === "draw_path" ? "cell" : "grab"}
                >
                    <NavigationControl position="top-right" />
                    <Source id="nav-paths" type="geojson" data={pathsGeojson}>
                        <Layer id="nav-paths-casing" type="line" paint={{ "line-color": "#ffffff", "line-width": 5 }} layout={{ "line-join": "round", "line-cap": "round" }} />
                        <Layer id="nav-paths-line" type="line" paint={{ "line-color": "#00E5FF", "line-width": 3 }} layout={{ "line-join": "round", "line-cap": "round" }} />
                    </Source>
                    <Source id="draw-preview" type="geojson" data={previewGeojson}>
                        <Layer id="draw-preview-line" type="line" paint={{ "line-color": "#f59e0b", "line-width": 2, "line-dasharray": [2, 2] }} layout={{ "line-join": "round", "line-cap": "round" }} />
                    </Source>
                    {buildings.map((b) => {
                        const lat = parseFloat(b.latitude);
                        const lng = parseFloat(b.longitude);
                        if (isNaN(lat) || isNaN(lng)) return null;
                        return (
                            <Marker key={`bld-${b.id}`} longitude={lng} latitude={lat} anchor="bottom">
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
                                    <div style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(0,0,0,0.08)", color: "#111827", fontWeight: 700, fontSize: 10, padding: "2px 6px", borderRadius: 4, marginBottom: 2, whiteSpace: "nowrap" }}>
                                        {b.name}
                                    </div>
                                    <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#B21830", border: "2px solid white", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
                                </div>
                            </Marker>
                        );
                    })}
                    {nodes.map((n) => (
                        <Marker key={`nd-${n.id}`} longitude={n.longitude} latitude={n.latitude} anchor="center" onClick={handleNodeMarkerClick(n)}>
                            <NodeDot node={n} selected={selectedNode?.id === n.id} isDrawingOrigin={drawingFrom?.id === n.id} />
                        </Marker>
                    ))}
                </Map>

                {/* Node creation form */}
                {nodeForm && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-80">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                                <MapPin size={14} className="text-brand" /> New Navigation Node
                            </h3>
                            <button onClick={() => setNodeForm(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                        </div>
                        <div className="space-y-2.5">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Label *</label>
                                <input
                                    autoFocus
                                    value={nodeFormData.label}
                                    onChange={(e) => setNodeFormData((p) => ({ ...p, label: e.target.value }))}
                                    placeholder="e.g. Main Gate, CICS Entrance"
                                    className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                                <select
                                    value={nodeFormData.node_type}
                                    onChange={(e) => setNodeFormData((p) => ({ ...p, node_type: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                                >
                                    {Object.entries(NODE_TYPE_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Link to Building (optional)</label>
                                <select
                                    value={nodeFormData.building}
                                    onChange={(e) => setNodeFormData((p) => ({ ...p, building: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                                >
                                    <option value="">— None —</option>
                                    {buildings.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-xs text-gray-400">Position: {nodeForm.lat.toFixed(6)}, {nodeForm.lng.toFixed(6)}</p>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setNodeForm(null)} className="flex-1 px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveNode}
                                disabled={saving || !nodeFormData.label.trim()}
                                className="flex-1 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save Node"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Selected node info */}
                {selectedNode && mode === "view" && (
                    <div className="absolute bottom-6 right-6 z-20 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-64">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-brand uppercase tracking-wide">Node</span>
                            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm">{selectedNode.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{NODE_TYPE_LABELS[selectedNode.node_type]}</p>
                        {selectedNode.building_name && (
                            <p className="text-xs text-sky-600 mt-0.5">Building: {selectedNode.building_name}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1 font-mono">
                            {selectedNode.latitude.toFixed(6)}, {selectedNode.longitude.toFixed(6)}
                        </p>
                        <button
                            onClick={() => setDeleteTarget({ type: "node", id: selectedNode.id })}
                            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-xs hover:bg-red-50 transition-colors"
                        >
                            <Trash2 size={11} /> Delete Node
                        </button>
                    </div>
                )}

                {/* Selected path info */}
                {selectedPath && mode === "view" && (
                    <div className="absolute bottom-6 right-6 z-20 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-64">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-sky-600 uppercase tracking-wide">Path</span>
                            <button onClick={() => setSelectedPath(null)} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm">{selectedPath.start_node_label} → {selectedPath.end_node_label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{selectedPath.distance_meters}m · ~{Math.ceil(selectedPath.distance_meters / 80)} min walk</p>
                        <p className="text-xs text-gray-400 mt-0.5">{selectedPath.is_accessible ? "Wheelchair accessible" : "Steps / elevated walkway"}</p>
                        <button
                            onClick={() => setDeleteTarget({ type: "path", id: selectedPath.id })}
                            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-xs hover:bg-red-50 transition-colors"
                        >
                            <Trash2 size={11} /> Delete Path
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-30">
                        <div className="text-sm text-gray-500 font-medium animate-pulse">Loading map data...</div>
                    </div>
                )}
            </div>

            {/* Delete confirm modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-80">
                        <h3 className="font-bold text-gray-900 text-base mb-2">
                            Delete {deleteTarget.type === "node" ? "Node" : "Path"}?
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            {deleteTarget.type === "node"
                                ? "All paths connected to this node will be orphaned."
                                : "This path will be permanently removed from the network."}{" "}
                            This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={saving} className="flex-1 px-3 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                                {saving ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
