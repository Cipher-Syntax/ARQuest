import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    MapPin,
    Navigation,
    Trash2,
    X,
    Check,
    Route,
    Circle,
    ChevronDown,
    ChevronUp,
    DoorOpen,
    GitBranch,
    Compass,
    Footprints,
    Plus,
    Search,
    Eye,
    Layers,
    Activity,
    Info,
    CornerDownRight,
} from "lucide-react";
import Map, { Marker, Source, Layer, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { buildingService } from "../services/buildingService";
import { navigationService } from "../services/navigationService";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const WMSU_CENTER = { lat: 6.9122, lng: 122.0605 };

const NODE_TYPES = {
    entrance: {
        label: "Building Entrance",
        short: "Entrance",
        color: "#B21830", // Brand Crimson
        border: "#ffffff",
        icon: DoorOpen,
        description: "Front doors, lobby entries, or physical building access points",
    },
    junction: {
        label: "Walkway Junction",
        short: "Junction",
        color: "#0ea5e9", // Sky Blue
        border: "#ffffff",
        icon: GitBranch,
        description: "Sidewalk intersections and corners where pathways branch out",
    },
    gate: {
        label: "Campus Gate",
        short: "Gate",
        color: "#f59e0b", // Amber
        border: "#ffffff",
        icon: Compass,
        description: "Perimeter checkpoints and campus road entrances",
    },
    poi: {
        label: "Point of Interest",
        short: "POI",
        color: "#8b5cf6", // Violet
        border: "#ffffff",
        icon: Footprints,
        description: "Open-air spots, monuments, bleachers, gazebos, or fields",
    },
};

// Spatial beacon marker component
function NodeMarkerItem({ node, selected, isDrawingOrigin, onClick }) {
    const config = NODE_TYPES[node.node_type] || NODE_TYPES.junction;
    const isHighlighted = selected || isDrawingOrigin;

    return (
        <div
            onClick={onClick}
            title={`${node.label} (${config.label})`}
            className="group relative cursor-pointer flex items-center justify-center"
            style={{ width: 34, height: 34 }}
        >
            {/* Outer halo when active or drawing */}
            {isHighlighted && (
                <span
                    className="absolute inset-0 rounded-full animate-ping opacity-60"
                    style={{ backgroundColor: config.color }}
                />
            )}

            {/* Subtle glow ring */}
            <div
                className="absolute inset-1 rounded-full transition-transform duration-200 group-hover:scale-125"
                style={{
                    backgroundColor: isHighlighted ? `${config.color}33` : "rgba(0,0,0,0.25)",
                    boxShadow: isHighlighted ? `0 0 12px ${config.color}` : "0 2px 5px rgba(0,0,0,0.35)",
                }}
            />

            {/* Core beacon pin */}
            <div
                className="relative flex items-center justify-center rounded-full transition-all duration-200 group-hover:scale-110"
                style={{
                    width: isHighlighted ? 22 : 18,
                    height: isHighlighted ? 22 : 18,
                    backgroundColor: config.color,
                    border: `2.5px solid ${isHighlighted ? "#ffffff" : "rgba(255, 255, 255, 0.9)"}`,
                    boxShadow: isHighlighted
                        ? `0 0 0 3px ${config.color}, 0 4px 10px rgba(0,0,0,0.5)`
                        : "0 2px 6px rgba(0,0,0,0.4)",
                }}
            >
                <div
                    className="rounded-full bg-white transition-opacity"
                    style={{
                        width: isHighlighted ? 7 : 5,
                        height: isHighlighted ? 7 : 5,
                        opacity: isHighlighted ? 1 : 0.85,
                    }}
                />
            </div>

            {/* Hover tooltip */}
            <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap"
            >
                <div className="px-2.5 py-1 rounded-[6px] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white text-[11px] font-semibold shadow-xl flex items-center gap-1.5">
                    <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: config.color }}
                    />
                    <span>{node.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">· {config.short}</span>
                </div>
                <div className="w-1.5 h-1.5 bg-slate-900 border-r border-b border-slate-700/80 rotate-45 -mt-1" />
            </div>
        </div>
    );
}

// Institutional Building Marker with radius-sm (6px)
function BuildingMarkerItem({ building }) {
    const lat = parseFloat(building.latitude);
    const lng = parseFloat(building.longitude);
    if (isNaN(lat) || isNaN(lng)) return null;

    return (
        <Marker longitude={lng} latitude={lat} anchor="bottom">
            <div className="flex flex-col items-center pointer-events-none select-none group">
                {/* Modern institutional pill badge (uses radius-sm: 6px per design system) */}
                <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-white/95 backdrop-blur-md border border-slate-200 text-slate-900 font-bold text-[10.5px] shadow-lg tracking-tight mb-1"
                    style={{
                        boxShadow: "0 3px 10px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1)",
                    }}
                >
                    <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                            backgroundColor: building.primary_department?.color_hex || "#B21830",
                        }}
                    />
                    <span className="truncate max-w-[130px]">{building.name}</span>
                </div>

                {/* Ground anchor pin */}
                <div className="relative flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-brand border-2 border-white shadow-md" />
                    <div className="w-1 h-1 rounded-full bg-white" />
                </div>
            </div>
        </Marker>
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

    // Map viewport
    const [viewState, setViewState] = useState({
        longitude: WMSU_CENTER.lng,
        latitude: WMSU_CENTER.lat,
        zoom: 17,
        pitch: 35,
        bearing: 0,
    });

    // Interaction mode: "view" | "add_node" | "draw_path"
    const [mode, setMode] = useState("view");
    const [mapCursor, setMapCursor] = useState("grab");
    const [drawingFrom, setDrawingFrom] = useState(null);
    const [drawPreview, setDrawPreview] = useState([]);
    const drawCoordsRef = useRef([]);

    // Forms and inspect states
    const [nodeForm, setNodeForm] = useState(null);
    const [nodeFormData, setNodeFormData] = useState({
        label: "",
        node_type: "junction",
        building: "",
    });
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedPath, setSelectedPath] = useState(null);

    // UI filters & collapsible tabs
    const [nodesExpanded, setNodesExpanded] = useState(true);
    const [pathsExpanded, setPathsExpanded] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all"); // "all" | "entrance" | "junction" | "gate" | "poi"
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Fetch initial network
    const loadData = useCallback(async () => {
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
            setError("Failed to load campus navigation network.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const flashSuccess = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 3200);
    };

    const resetMode = useCallback((newMode = "view") => {
        setMode(newMode);
        setDrawingFrom(null);
        setDrawPreview([]);
        drawCoordsRef.current = [];
        setNodeForm(null);
        setSelectedNode(null);
        setSelectedPath(null);
    }, []);

    // Start drawing a path from an already inspected node
    const startDrawingFromNode = (node) => {
        resetMode("draw_path");
        setDrawingFrom(node);
        drawCoordsRef.current = [[node.longitude, node.latitude]];
        setDrawPreview([[node.longitude, node.latitude]]);
    };

    // Ensure that only paths whose both start and end nodes currently exist in the active network are rendered or counted
    const validNodeIds = useMemo(() => new Set(nodes.map((n) => String(n.id))), [nodes]);
    const validPaths = useMemo(() => {
        return paths.filter((p) => validNodeIds.has(String(p.start_node)) && validNodeIds.has(String(p.end_node)));
    }, [paths, validNodeIds]);

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
            return;
        }
        if (mode === "view") {
            // Check if user clicked on a pathway line feature on the map
            if (e.features && e.features.length > 0) {
                const feat = e.features[0];
                const clickedPathId = feat.properties?.id;
                if (clickedPathId) {
                    const match = validPaths.find((p) => String(p.id) === String(clickedPathId));
                    if (match) {
                        setSelectedPath(match);
                        setSelectedNode(null);
                        return;
                    }
                }
            }
            setSelectedNode(null);
            setSelectedPath(null);
        }
    }, [mode, drawingFrom, validPaths]);

    const handleNodeClick = useCallback((node) => (e) => {
        if (e.originalEvent) e.originalEvent.stopPropagation();

        if (mode === "draw_path") {
            if (!drawingFrom) {
                // Pick origin
                setDrawingFrom(node);
                drawCoordsRef.current = [[node.longitude, node.latitude]];
                setDrawPreview([[node.longitude, node.latitude]]);
                return;
            }

            // Clicked same node
            if (node.id === drawingFrom.id) return;

            // Finish path: origin -> intermediate points -> destination
            const geometry = [
                [drawingFrom.longitude, drawingFrom.latitude],
                ...drawCoordsRef.current.slice(1),
                [node.longitude, node.latitude],
            ];
            savePath(drawingFrom.id, node.id, geometry);
            return;
        }

        if (mode === "view") {
            setSelectedNode(node);
            setSelectedPath(null);
        }
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
            flashSuccess(`Node "${created.label}" added.`);
        } catch {
            setError("Failed to save navigation node.");
        } finally {
            setSaving(false);
        }
    };

    const savePath = async (startId, endId, geometry) => {
        setSaving(true);
        try {
            const created = await navigationService.createPath({
                start_node: startId,
                end_node: endId,
                geometry,
            });
            setPaths((prev) => [...prev, created]);
            setDrawingFrom(null);
            setDrawPreview([]);
            drawCoordsRef.current = [];
            flashSuccess(`Path (${created.distance_meters}m) connected!`);
        } catch {
            setError("Failed to connect pathway segment.");
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
                const targetIdStr = String(deleteTarget.id);
                // Immediately remove the node and prune any attached ways from state
                setNodes((prev) => prev.filter((n) => String(n.id) !== targetIdStr));
                setPaths((prev) => prev.filter((p) => String(p.start_node) !== targetIdStr && String(p.end_node) !== targetIdStr));
                setSelectedNode(null);
                setSelectedPath((prev) => {
                    if (prev && (String(prev.start_node) === targetIdStr || String(prev.end_node) === targetIdStr)) {
                        return null;
                    }
                    return prev;
                });
                flashSuccess("Waypoint and connected walkways removed.");
            } else {
                await navigationService.deletePath(deleteTarget.id);
                const targetIdStr = String(deleteTarget.id);
                setPaths((prev) => prev.filter((p) => String(p.id) !== targetIdStr));
                setSelectedPath(null);
                flashSuccess("Pathway removed.");
            }
        } catch {
            setError("Failed to delete item.");
        } finally {
            setSaving(false);
            setDeleteTarget(null);
        }
    };

    // GeoJSON for paths layer (only valid connected paths)
    const pathsGeojson = useMemo(() => ({
        type: "FeatureCollection",
        features: validPaths.map((p) => ({
            type: "Feature",
            properties: {
                id: p.id,
                selected: selectedPath?.id === p.id,
                distance: p.distance_meters,
            },
            geometry: { type: "LineString", coordinates: p.geometry },
        })),
    }), [validPaths, selectedPath]);

    // GeoJSON for active drawing preview
    const previewGeojson = useMemo(() => ({
        type: "FeatureCollection",
        features:
            drawPreview.length >= 2
                ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: drawPreview } }]
                : [],
    }), [drawPreview]);

    // Network metrics (based on valid pathways)
    const totalDistance = useMemo(() => {
        return Math.round(validPaths.reduce((acc, p) => acc + (p.distance_meters || 0), 0));
    }, [validPaths]);

    // Filtered lists
    const filteredNodes = useMemo(() => {
        return nodes.filter((n) => {
            const matchesQuery = n.label.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = typeFilter === "all" || n.node_type === typeFilter;
            return matchesQuery && matchesType;
        });
    }, [nodes, searchQuery, typeFilter]);

    const filteredPaths = useMemo(() => {
        return validPaths.filter((p) => {
            return (
                p.start_node_label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.end_node_label?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        });
    }, [validPaths, searchQuery]);

    const instructionContent = {
        view: {
            title: "Inspect Network",
            desc: "Click any waypoint or pathway to inspect its details and connections.",
            icon: Eye,
            badgeClass: "bg-slate-900/90 text-slate-200 border-slate-700/60",
        },
        add_node: {
            title: "Drop Waypoint Mode",
            desc: "Click anywhere on the satellite map to position a new navigation node.",
            icon: MapPin,
            badgeClass: "bg-brand text-white border-white/25 ring-4 ring-brand/20",
        },
        draw_path: {
            title: "Draw Walkway Path",
            desc: drawingFrom
                ? `Tracing from "${drawingFrom.label}" (${Math.max(0, drawPreview.length - 1)} bends). Click next waypoint to link.`
                : "Click any starting waypoint on the map to begin tracing the walkway.",
            icon: Navigation,
            badgeClass: "bg-sky-600 text-white border-white/25 ring-4 ring-sky-500/20",
        },
    };

    const currentInstruction = instructionContent[mode];
    const InstrIcon = currentInstruction.icon;

    return (
        <div className="flex h-[calc(100vh-8.5rem)] min-h-[540px] rounded-2xl border border-slate-200/80 shadow-md overflow-hidden bg-white">
            {/* Left Control & Directory Sidebar */}
            <aside className="w-80 flex-shrink-0 bg-slate-50/70 border-r border-slate-200 flex flex-col overflow-hidden">
                {/* Header with network metrics */}
                <div className="px-4 py-3.5 bg-white border-b border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <Route size={16} className="text-brand" /> Campus Walking Network
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            WMSU
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-2">
                        <div className="flex items-center gap-1">
                            <Circle size={11} className="text-brand fill-brand" />
                            <span>{nodes.length} nodes</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Route size={11} className="text-sky-600" />
                            <span>{validPaths.length} paths</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-700 font-semibold ml-auto">
                            <Footprints size={12} className="text-slate-500" />
                            <span>{totalDistance}m total</span>
                        </div>
                    </div>
                </div>

                {/* Primary Mode Switcher (Uses radius-sm: 6px) */}
                <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => resetMode(mode === "add_node" ? "view" : "add_node")}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-[6px] text-xs font-bold transition-all shadow-sm ${
                                mode === "add_node"
                                    ? "bg-brand text-white shadow-brand/30 shadow-md ring-2 ring-brand/40"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60"
                            }`}
                        >
                            <MapPin size={14} className={mode === "add_node" ? "text-white" : "text-brand"} />
                            <span>{mode === "add_node" ? "Exit Add Node" : "Add Node"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => resetMode(mode === "draw_path" ? "view" : "draw_path")}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-[6px] text-xs font-bold transition-all shadow-sm ${
                                mode === "draw_path"
                                    ? "bg-sky-600 text-white shadow-sky-600/30 shadow-md ring-2 ring-sky-500/40"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60"
                            }`}
                        >
                            <Navigation size={14} className={mode === "draw_path" ? "text-white" : "text-sky-600"} />
                            <span>{mode === "draw_path" ? "Exit Draw Path" : "Draw Path"}</span>
                        </button>
                    </div>

                    {/* Active Mode Banner in Sidebar */}
                    {mode !== "view" && (
                        <div
                            className={`p-2.5 rounded-[6px] text-xs flex items-start gap-2 border animate-in fade-in duration-200 ${
                                mode === "draw_path"
                                    ? "bg-sky-50 border-sky-200 text-sky-900"
                                    : "bg-red-50 border-brand/20 text-brand"
                            }`}
                        >
                            <InstrIcon size={14} className={`shrink-0 mt-0.5 ${mode === "draw_path" ? "text-sky-600" : "text-brand"}`} />
                            <div className="leading-tight">
                                <strong className="block font-bold mb-0.5">{currentInstruction.title}</strong>
                                <span className="text-[11px] opacity-90">{currentInstruction.desc}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Directory Search & Filters */}
                <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-col gap-2">
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter waypoints & paths..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-[6px] bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Type Filter Chips (uses radius-sm: 6px) */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
                        {["all", "entrance", "junction", "gate", "poi"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                className={`px-2 py-0.5 rounded-[6px] font-semibold uppercase tracking-wider text-[10px] transition-colors whitespace-nowrap ${
                                    typeFilter === t
                                        ? "bg-slate-800 text-white"
                                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-200/50"
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Collapsible Directory Lists */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
                    {/* Nodes Section */}
                    <div>
                        <button
                            onClick={() => setNodesExpanded((v) => !v)}
                            className="w-full flex items-center justify-between px-4 py-2 bg-slate-100/90 hover:bg-slate-200/70 transition-colors text-xs font-bold text-slate-700"
                        >
                            <div className="flex items-center gap-1.5">
                                <Circle size={12} className="text-slate-500" />
                                <span>Waypoints</span>
                                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-extrabold text-[10px]">
                                    {filteredNodes.length}
                                </span>
                            </div>
                            {nodesExpanded ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
                        </button>

                        {nodesExpanded && (
                            <ul className="divide-y divide-slate-100 bg-white">
                                {filteredNodes.length === 0 && (
                                    <li className="px-4 py-4 text-center text-xs text-slate-400 italic">
                                        No matching nodes found.
                                    </li>
                                )}
                                {filteredNodes.map((n) => {
                                    const cfg = NODE_TYPES[n.node_type] || NODE_TYPES.junction;
                                    const isSelected = selectedNode?.id === n.id;
                                    return (
                                        <li
                                            key={n.id}
                                            onClick={() => {
                                                setSelectedNode(n);
                                                setSelectedPath(null);
                                            }}
                                            className={`px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 border-l-2 ${
                                                isSelected ? "bg-red-50/70 border-brand" : "border-transparent"
                                            }`}
                                        >
                                            <div className="min-w-0 flex items-center gap-2">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: cfg.color }}
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-slate-800 truncate">{n.label}</p>
                                                    <p className="text-[10.5px] text-slate-400 truncate">
                                                        {cfg.short} {n.building_name ? `· ${n.building_name}` : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                {mode === "view" && (
                                                    <button
                                                        type="button"
                                                        title="Start path from this node"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startDrawingFromNode(n);
                                                        }}
                                                        className="p-1 rounded-[6px] text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                                                    >
                                                        <CornerDownRight size={12} />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteTarget({ type: "node", id: n.id, label: n.label });
                                                    }}
                                                    className="p-1 rounded-[6px] text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Paths Section */}
                    <div>
                        <button
                            onClick={() => setPathsExpanded((v) => !v)}
                            className="w-full flex items-center justify-between px-4 py-2 bg-slate-100/90 hover:bg-slate-200/70 transition-colors text-xs font-bold text-slate-700"
                        >
                            <div className="flex items-center gap-1.5">
                                <Route size={12} className="text-slate-500" />
                                <span>Connected Paths</span>
                                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-extrabold text-[10px]">
                                    {filteredPaths.length}
                                </span>
                            </div>
                            {pathsExpanded ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
                        </button>

                        {pathsExpanded && (
                            <ul className="divide-y divide-slate-100 bg-white">
                                {filteredPaths.length === 0 && (
                                    <li className="px-4 py-4 text-center text-xs text-slate-400 italic">
                                        No matching paths found.
                                    </li>
                                )}
                                {filteredPaths.map((p) => {
                                    const isSelected = selectedPath?.id === p.id;
                                    return (
                                        <li
                                            key={p.id}
                                            onClick={() => {
                                                setSelectedPath(p);
                                                setSelectedNode(null);
                                            }}
                                            className={`px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 border-l-2 ${
                                                isSelected ? "bg-sky-50/70 border-sky-500" : "border-transparent"
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-800 truncate">
                                                    {p.start_node_label} <span className="text-slate-400">↔</span> {p.end_node_label}
                                                </p>
                                                <p className="text-[10.5px] text-slate-400">
                                                    {p.distance_meters}m · ~{Math.max(1, Math.round(p.distance_meters / 80))} min walk
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteTarget({
                                                        type: "path",
                                                        id: p.id,
                                                        label: `${p.start_node_label} ↔ ${p.end_node_label}`,
                                                    });
                                                }}
                                                className="p-1 rounded-[6px] text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </aside>

            {/* Right Interactive Satellite Map Panel */}
            <div className="flex-1 relative overflow-hidden bg-slate-900">
                {/* High-Tech Floating Instruction HUD Bar */}
                <div className={`absolute top-5 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 border transition-all duration-300 ${currentInstruction.badgeClass}`}>
                    <InstrIcon size={14} className={mode === "draw_path" ? "text-sky-200 animate-pulse" : "text-white"} />
                    <span className="tracking-tight">{currentInstruction.desc}</span>
                    {mode !== "view" && (
                        <button
                            type="button"
                            onClick={() => resetMode("view")}
                            className="ml-2 pl-2 border-l border-white/30 text-[11px] font-bold underline opacity-80 hover:opacity-100"
                        >
                            Cancel
                        </button>
                    )}
                </div>

                {/* Save Feedback Toast (Adheres strictly to Brand Red, no green) */}
                {successMsg && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl bg-brand text-white border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <Check size={14} className="text-white" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Error Banner Toast */}
                {error && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-[12px] text-xs font-bold shadow-2xl bg-red-600 text-white border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="ml-1 text-white/80 hover:text-white">
                            <X size={13} />
                        </button>
                    </div>
                )}

                {/* Mapbox Map */}
                <Map
                    {...viewState}
                    onMove={(e) => setViewState(e.viewState)}
                    onClick={handleMapClick}
                    style={{ width: "100%", height: "100%" }}
                    mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    cursor={mode === "add_node" ? "crosshair" : mode === "draw_path" ? "cell" : mapCursor}
                    interactiveLayerIds={mode === "view" ? ["nav-paths-line", "nav-paths-casing"] : []}
                    onMouseMove={(e) => {
                        if (mode === "view") {
                            setMapCursor(e.features && e.features.length > 0 ? "pointer" : "grab");
                        }
                    }}
                >
                    <NavigationControl position="top-right" />

                    {/* Drawn Walkway Paths (Electric AR Cyan with White Casing) */}
                    <Source id="nav-paths" type="geojson" data={pathsGeojson}>
                        <Layer
                            id="nav-paths-casing"
                            type="line"
                            paint={{
                                "line-color": "#ffffff",
                                "line-width": 5.5,
                                "line-opacity": 0.9,
                            }}
                            layout={{ "line-join": "round", "line-cap": "round" }}
                        />
                        <Layer
                            id="nav-paths-line"
                            type="line"
                            paint={{
                                "line-color": [
                                    "case",
                                    ["==", ["get", "selected"], true],
                                    "#f59e0b", // Selected path in amber
                                    "#00E5FF", // Electric AR cyan for all active walkways
                                ],
                                "line-width": 3,
                            }}
                            layout={{ "line-join": "round", "line-cap": "round" }}
                        />
                    </Source>

                    {/* Active In-Progress Pathway Draw Preview */}
                    <Source id="draw-preview" type="geojson" data={previewGeojson}>
                        <Layer
                            id="draw-preview-casing"
                            type="line"
                            paint={{
                                "line-color": "#ffffff",
                                "line-width": 4,
                            }}
                            layout={{ "line-join": "round", "line-cap": "round" }}
                        />
                        <Layer
                            id="draw-preview-line"
                            type="line"
                            paint={{
                                "line-color": "#f59e0b",
                                "line-width": 2.5,
                                "line-dasharray": [3, 2],
                            }}
                            layout={{ "line-join": "round", "line-cap": "round" }}
                        />
                    </Source>

                    {/* Buildings as institutional landmark tags (radius-sm: 6px) */}
                    {buildings.map((b) => (
                        <BuildingMarkerItem key={`bld-${b.id}`} building={b} />
                    ))}

                    {/* Waypoint Nodes on map */}
                    {nodes.map((n) => (
                        <Marker
                            key={`nd-${n.id}`}
                            longitude={n.longitude}
                            latitude={n.latitude}
                            anchor="center"
                        >
                            <NodeMarkerItem
                                node={n}
                                selected={selectedNode?.id === n.id}
                                isDrawingOrigin={drawingFrom?.id === n.id}
                                onClick={handleNodeClick(n)}
                            />
                        </Marker>
                    ))}
                </Map>

                {/* Modern Node Creation Sheet (Uses radius-md: 12px & radius-sm: 6px) */}
                {nodeForm && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md rounded-[12px] shadow-2xl border border-slate-200/90 p-4 w-84 max-w-[90vw] animate-in fade-in slide-in-from-bottom-3 duration-200">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <MapPin size={15} className="text-brand" /> New Waypoint Node
                            </h3>
                            <button
                                onClick={() => setNodeForm(null)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Label *
                                </label>
                                <input
                                    autoFocus
                                    value={nodeFormData.label}
                                    onChange={(e) => setNodeFormData((p) => ({ ...p, label: e.target.value }))}
                                    placeholder="e.g. Main Gate, CICS Entrance"
                                    className="w-full border border-slate-200 rounded-[6px] px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-medium"
                                />
                            </div>

                            {/* Segmented Type Chips */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Waypoint Role
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {Object.entries(NODE_TYPES).map(([typeKey, cfg]) => {
                                        const ChipIcon = cfg.icon;
                                        const isSelected = nodeFormData.node_type === typeKey;
                                        return (
                                            <button
                                                key={typeKey}
                                                type="button"
                                                onClick={() => setNodeFormData((p) => ({ ...p, node_type: typeKey }))}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-left text-xs font-semibold border transition-all ${
                                                    isSelected
                                                        ? "border-slate-800 bg-slate-900 text-white shadow-sm"
                                                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                                }`}
                                            >
                                                <span
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: cfg.color }}
                                                />
                                                <span className="truncate">{cfg.short}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Optional Building Link */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Link to Campus Building (Optional)
                                </label>
                                <select
                                    value={nodeFormData.building}
                                    onChange={(e) => setNodeFormData((p) => ({ ...p, building: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-[6px] px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white font-medium"
                                >
                                    <option value="">— No Building Link —</option>
                                    {buildings.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                                <span>GPS Coordinates:</span>
                                <span>{nodeForm.lat.toFixed(6)}, {nodeForm.lng.toFixed(6)}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setNodeForm(null)}
                                className="flex-1 px-3 py-1.5 rounded-[6px] border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveNode}
                                disabled={saving || !nodeFormData.label.trim()}
                                className="flex-1 px-3 py-1.5 rounded-[6px] bg-brand text-white text-xs font-bold shadow hover:bg-brand-dark transition-colors disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save Waypoint"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Inspected Node Card (Bottom-Right) */}
                {selectedNode && mode === "view" && (
                    <div className="absolute bottom-6 right-6 z-30 bg-white/95 backdrop-blur-md rounded-[12px] shadow-2xl border border-slate-200 p-4 w-72 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-extrabold uppercase tracking-wider bg-red-100 text-brand">
                                Waypoint Info
                            </span>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <X size={13} />
                            </button>
                        </div>

                        <p className="font-bold text-slate-900 text-sm">{selectedNode.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {NODE_TYPES[selectedNode.node_type]?.label || selectedNode.node_type}
                        </p>

                        {selectedNode.building_name && (
                            <div className="mt-2 p-2 rounded-[6px] bg-slate-50 border border-slate-200 text-xs text-slate-700">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                                    Linked Building
                                </span>
                                <span className="font-semibold text-slate-900">{selectedNode.building_name}</span>
                            </div>
                        )}

                        {/* Connected walkways count */}
                        <div className="mt-2 px-2.5 py-1.5 rounded-[6px] bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                            <span className="text-[10.5px] font-semibold text-slate-500">Connected Ways</span>
                            <span className="font-bold text-slate-800 text-xs">
                                {validPaths.filter((p) => String(p.start_node) === String(selectedNode.id) || String(p.end_node) === String(selectedNode.id)).length} pathways
                            </span>
                        </div>

                        <p className="text-[10.5px] text-slate-400 font-mono mt-2">
                            {selectedNode.latitude.toFixed(6)}, {selectedNode.longitude.toFixed(6)}
                        </p>

                        <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => startDrawingFromNode(selectedNode)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold hover:bg-sky-100 transition-colors"
                            >
                                <Navigation size={12} /> Draw Path
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteTarget({ type: "node", id: selectedNode.id, label: selectedNode.label })}
                                className="p-1.5 rounded-[6px] border border-red-200 text-red-600 hover:bg-red-50 transition-colors shrink-0"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Inspected Path Card (Bottom-Right) */}
                {selectedPath && mode === "view" && (
                    <div className="absolute bottom-6 right-6 z-30 bg-white/95 backdrop-blur-md rounded-[12px] shadow-2xl border border-slate-200 p-4 w-72 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-extrabold uppercase tracking-wider bg-sky-100 text-sky-800">
                                Pathway Segment
                            </span>
                            <button
                                onClick={() => setSelectedPath(null)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <X size={13} />
                            </button>
                        </div>

                        <p className="font-bold text-slate-900 text-sm">
                            {selectedPath.start_node_label} <span className="text-slate-400 font-normal">↔</span> {selectedPath.end_node_label}
                        </p>

                        <div className="grid grid-cols-2 gap-2 mt-2.5">
                            <div className="p-2 rounded-[6px] bg-slate-50 border border-slate-200 text-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Distance</span>
                                <span className="font-extrabold text-slate-900 text-sm">{selectedPath.distance_meters}m</span>
                            </div>
                            <div className="p-2 rounded-[6px] bg-slate-50 border border-slate-200 text-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Est. Pace</span>
                                <span className="font-extrabold text-slate-900 text-sm">
                                    ~{Math.max(1, Math.round(selectedPath.distance_meters / 80))} min
                                </span>
                            </div>
                        </div>

                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                            <Footprints size={12} className="text-slate-400" />
                            <span>Two-way pedestrian accessible</span>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setDeleteTarget({
                                    type: "path",
                                    id: selectedPath.id,
                                    label: `${selectedPath.start_node_label} ↔ ${selectedPath.end_node_label}`,
                                })
                            }
                            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
                        >
                            <Trash2 size={12} /> Remove Pathway
                        </button>
                    </div>
                )}

                {/* Loading indicator overlay */}
                {loading && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="px-5 py-3 rounded-[12px] bg-white text-slate-800 text-xs font-bold shadow-2xl flex items-center gap-2.5">
                            <Activity size={15} className="text-brand animate-spin" />
                            <span>Loading campus navigation network...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Modern Delete Confirmation Dialog */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-[12px] shadow-2xl border border-slate-200 p-6 w-88 max-w-full">
                        <h3 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2">
                            <Trash2 size={16} className="text-red-600" />
                            Delete {deleteTarget.type === "node" ? "Waypoint Node" : "Pathway"}?
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed mb-4">
                            Are you sure you want to remove{" "}
                            <strong className="text-slate-900 font-bold">"{deleteTarget.label}"</strong>?
                            {deleteTarget.type === "node"
                                ? " All connected walkway paths and ways attached to this point will also be removed immediately."
                                : " This pathway will be permanently unlinked from pedestrian routes."}
                        </p>
                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 px-3 py-2 rounded-[6px] border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={saving}
                                className="flex-1 px-3 py-2 rounded-[6px] bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-md transition-colors disabled:opacity-50"
                            >
                                {saving ? "Deleting..." : "Confirm Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
