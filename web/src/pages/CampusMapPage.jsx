import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import {
    Map,
    Compass,
    GitBranch,
    Route,
    Footprints,
    DoorOpen,
    Plus,
    Search,
    Filter,
    Edit3,
    Trash2,
    X,
    Check,
    Circle,
    ChevronDown,
    ChevronUp,
    Info,
    Eye,
    EyeOff,
    Navigation,
    MapPin,
    Shield,
    Palette,
    Maximize2,
    RotateCcw,
    Sliders,
    Layers,
    Shapes,
} from "lucide-react";
import ReactMap, { Marker, Source, Layer, Popup, NavigationControl } from "react-map-gl/mapbox";
import circle from "@turf/circle";
import "mapbox-gl/dist/mapbox-gl.css";
import "@google/model-viewer";

import {
    Button,
    Input,
    Card,
    Badge,
    Toggle,
    Modal,
    ConfirmDeleteModal,
} from "../components/ui";
import { buildingService } from "../services/buildingService";
import { navigationService } from "../services/navigationService";
import {
    validateForm,
    validateString,
    validateRequired,
    validateNumber,
} from "../utils/validation";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const WMSU_CENTER = { lat: 6.9122, lng: 122.0605 };
const WMSU_BOUNDS = [
    [122.0575, 6.9095],
    [122.064, 6.9155],
];

const DEFAULT_CAMPUS_PERIMETER = [
    [122.0570, 6.9092],
    [122.0570, 6.9162],
    [122.0655, 6.9162],
    [122.0655, 6.9092],
    [122.0570, 6.9092],
];

const PERIMETER_PRESET_COLORS = [
    { label: "Dark Slate", value: "#111827" },
    { label: "Midnight Navy", value: "#0f172a" },
    { label: "Deep Charcoal", value: "#1e293b" },
    { label: "Off-White", value: "#f8fafc" },
];

const PERIMETER_STROKE_COLORS = [
    { label: "Crimson", value: "#B21830" },
    { label: "Amber Gold", value: "#f59e0b" },
    { label: "Sky Blue", value: "#0ea5e9" },
    { label: "Emerald Green", value: "#10b981" },
];

const NODE_TYPES = {
    entrance: {
        label: "Building Entrance",
        short: "Entrance",
        color: "#B21830",
        icon: DoorOpen,
        description: "Front doors, lobby entries, or physical building access points",
    },
    junction: {
        label: "Walkway",
        short: "Walkway",
        color: "#0ea5e9",
        icon: GitBranch,
        description: "Pedestrian pathways, sidewalks, corridors, and walking paths",
    },
    gate: {
        label: "Campus Gate",
        short: "Gate",
        color: "#f59e0b",
        icon: Compass,
        description: "Perimeter checkpoints and campus road entrances",
    },
    poi: {
        label: "Point of Interest",
        short: "POI",
        color: "#8b5cf6",
        icon: Footprints,
        description: "Open-air spots, monuments, bleachers, gazebos, or fields",
    },
};

const parseCoordinate = (coordStr) => {
    if (!coordStr) return 0;
    const match = String(coordStr).match(/([-+]?[0-9]*\.?[0-9]+)/);
    let parsed = match ? parseFloat(match[1]) : 0;
    if (String(coordStr).includes("S") || String(coordStr).includes("W")) {
        parsed = -parsed;
    }
    return parsed;
};

const parseRadius = (radiusStr) => {
    if (!radiusStr) return 50;
    const match = String(radiusStr).match(/([0-9]*\.?[0-9]+)/);
    return match ? parseFloat(match[1]) : 50;
};

const MaintenanceIcon = () => (
    <div
        className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center border-2 border-white shadow-md animate-pulse"
        title="Under Maintenance"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    </div>
);

const DefaultMapPin = ({ color = "#10b981", active = true }) => (
    <div
        className="w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md transition-transform duration-200 hover:scale-125"
        style={{ backgroundColor: active ? color : "#6b7280" }}
    >
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
    </div>
);

// Waypoint Beacon Marker for Pathway Editor
function NodeMarkerItem({ node, selected, isDrawingOrigin, onClick }) {
    const config = NODE_TYPES[node.node_type] || NODE_TYPES.junction;
    const isHighlighted = selected || isDrawingOrigin;

    return (
        <div
            onClick={onClick}
            title={`${node.label} (${config.label})`}
            className="group relative cursor-pointer flex items-center justify-center"
            style={{ width: 32, height: 32 }}
        >
            {isHighlighted && (
                <span
                    className="absolute inset-0 rounded-full animate-ping opacity-60"
                    style={{ backgroundColor: config.color }}
                />
            )}
            <div
                className="absolute inset-1 rounded-full transition-transform duration-200 group-hover:scale-125"
                style={{
                    backgroundColor: isHighlighted ? `${config.color}33` : "rgba(0,0,0,0.2)",
                    boxShadow: isHighlighted ? `0 0 10px ${config.color}` : "0 2px 4px rgba(0,0,0,0.3)",
                }}
            />
            <div
                className="relative flex items-center justify-center rounded-full transition-all duration-200 group-hover:scale-110"
                style={{
                    width: isHighlighted ? 20 : 16,
                    height: isHighlighted ? 20 : 16,
                    backgroundColor: config.color,
                    border: `2px solid ${isHighlighted ? "#ffffff" : "rgba(255, 255, 255, 0.9)"}`,
                    boxShadow: isHighlighted
                        ? `0 0 0 3px ${config.color}, 0 3px 8px rgba(0,0,0,0.4)`
                        : "0 2px 5px rgba(0,0,0,0.35)",
                }}
            >
                <div
                    className="rounded-full bg-white"
                    style={{
                        width: isHighlighted ? 6 : 4,
                        height: isHighlighted ? 6 : 4,
                    }}
                />
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap">
                <div className="px-2.5 py-1 rounded-md bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white text-[11px] font-semibold shadow-xl flex items-center gap-1.5">
                    <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: config.color }}
                    />
                    <span>{node.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">· {config.short}</span>
                </div>
            </div>
        </div>
    );
}

// Building Name Landmark Badge on Map
function BuildingLandmarkTag({ building, onClick, isSelected }) {
    const lat = parseFloat(building.latitude);
    const lng = parseFloat(building.longitude);
    if (isNaN(lat) || isNaN(lng)) return null;

    return (
        <Marker longitude={lng} latitude={lat} anchor="bottom">
            <div
                onClick={onClick}
                className="flex flex-col items-center cursor-pointer select-none group"
            >
                <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-md border text-slate-900 font-bold text-[10.5px] shadow-md tracking-tight mb-1 transition-all ${
                        isSelected
                            ? "border-brand ring-2 ring-brand/30 shadow-lg scale-105"
                            : "border-slate-200 group-hover:border-slate-400"
                    }`}
                >
                    <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                            backgroundColor: building.primary_department?.color_hex || "#B21830",
                        }}
                    />
                    <span className="truncate max-w-[130px]">{building.name}</span>
                </div>
                <div className="relative flex items-center justify-center">
                    <div
                        className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                            isSelected ? "bg-brand scale-125" : "bg-slate-700"
                        }`}
                    />
                </div>
            </div>
        </Marker>
    );
}

export default function CampusMapPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const mapRef = useRef(null);

    // Active Mode Tab: "map" (geofences) | "pathway" (network editor) | "perimeter" (boundary & mask)
    const getInitialTab = () => {
        const tabParam = searchParams.get("tab");
        if (["map", "pathway", "perimeter"].includes(tabParam)) return tabParam;
        if (location.pathname.includes("navigation")) return "pathway";
        if (location.pathname.includes("perimeter")) return "perimeter";
        return "map";
    };
    const [activeTab, setActiveTabState] = useState(getInitialTab);

    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        setSearchParams({ tab });
    };

    // Shared Data State
    const [rawBuildings, setRawBuildings] = useState([]);
    const [geofences, setGeofences] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [paths, setPaths] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Map Viewport
    const [viewState, setViewState] = useState({
        longitude: WMSU_CENTER.lng,
        latitude: WMSU_CENTER.lat,
        zoom: 17,
        pitch: 35,
        bearing: 0,
    });

    // -------------------------------------------------------------
    // Tab 1: Map (Geofences) States
    // -------------------------------------------------------------
    const [selectedGeoId, setSelectedGeoId] = useState(null);
    const [hoveredGeoId, setHoveredGeoId] = useState(null);
    const [isGeoModalOpen, setIsGeoModalOpen] = useState(false);
    const [editingGeo, setEditingGeo] = useState(null);
    const [geoForm, setGeoForm] = useState({
        name: "",
        fullBuilding: "",
        lat: "",
        lng: "",
        radius: "50m",
    });
    const [geoErrors, setGeoErrors] = useState({});

    // -------------------------------------------------------------
    // Tab 2: Pathway Network Editor States
    // -------------------------------------------------------------
    const [pathwayMode, setPathwayMode] = useState("view"); // "view" | "add_node" | "draw_path"
    const [drawingFrom, setDrawingFrom] = useState(null);
    const [drawPreview, setDrawPreview] = useState([]);
    const drawCoordsRef = useRef([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedPath, setSelectedPath] = useState(null);
    const [nodeForm, setNodeForm] = useState(null);
    const [nodeFormData, setNodeFormData] = useState({
        label: "",
        node_type: "junction",
        building: "",
    });
    const [pathwaySearchQuery, setPathwaySearchQuery] = useState("");
    const [pathwayTypeFilter, setPathwayTypeFilter] = useState("all");
    const [nodesExpanded, setNodesExpanded] = useState(true);
    const [pathsExpanded, setPathsExpanded] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // -------------------------------------------------------------
    // Tab 3: Campus Perimeter & Outside Mask Editor States
    // -------------------------------------------------------------
    const [perimeterConfig, setPerimeterConfig] = useState({
        name: "Western Mindanao State University",
        coordinates: DEFAULT_CAMPUS_PERIMETER,
        fill_color: "#111827",
        fill_opacity: 0.65,
        stroke_color: "#B21830",
        stroke_width: 2.5,
        is_active: true,
    });
    const [perimeterCoords, setPerimeterCoords] = useState(DEFAULT_CAMPUS_PERIMETER);
    const [perimeterMode, setPerimeterMode] = useState("view"); // "view" | "draw" | "edit"
    const [showCampusMask, setShowCampusMask] = useState(true);
    const [selectedVertexIdx, setSelectedVertexIdx] = useState(null);
    const [isSavingPerimeter, setIsSavingPerimeter] = useState(false);

    // Flash message banner
    const flashSuccess = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 3200);
    };

    // Load initial network, geofences, and campus perimeter in parallel
    const loadAllData = useCallback(async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const [bList, nList, pList, perimeterRes] = await Promise.all([
                buildingService.getBuildings(),
                navigationService.getNodes(),
                navigationService.getPaths(),
                navigationService.getPerimeter().catch(() => null),
            ]);

            setRawBuildings(bList || []);
            setNodes(nList || []);
            setPaths(pList || []);

            if (perimeterRes && Array.isArray(perimeterRes.coordinates) && perimeterRes.coordinates.length >= 3) {
                setPerimeterConfig(perimeterRes);
                setPerimeterCoords(perimeterRes.coordinates);
            }

            // Build geofences dataset with circular metadata
            const formatted = await Promise.all(
                (bList || []).map(async (b) => {
                    let geoData = null;
                    try {
                        geoData = await buildingService.getGeofence(b.id);
                    } catch (e) {
                        // ignore 404
                    }
                    return {
                        id: b.id,
                        geofence_id: geoData ? geoData.id : null,
                        name:
                            b.slug ||
                            b.code ||
                            (b.name ? b.name.substring(0, 4).toUpperCase() : "BLDG"),
                        building: b.name || "",
                        fullBuilding: b.description || b.name || "",
                        lat: b.latitude ? `${b.latitude}° N` : "0.0000° N",
                        lng: b.longitude ? `${b.longitude}° E` : "0.0000° E",
                        latitude: b.latitude,
                        longitude: b.longitude,
                        radius:
                            geoData && geoData.radius_meters
                                ? `${geoData.radius_meters}m`
                                : "20m",
                        radius_meters:
                            geoData && geoData.radius_meters
                                ? geoData.radius_meters
                                : 20,
                        active: b.is_active !== undefined ? b.is_active : false,
                        status: b.status,
                        image_url: b.image_url || b.image || null,
                        model_url: b.model_url,
                        primary_department: b.primary_department,
                    };
                })
            );
            setGeofences(formatted);
        } catch (err) {
            console.error("Failed to load campus data:", err);
            setErrorMsg("Failed to load campus map and navigation data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // Turf circle polygon generation for Geofences
    const circlesGeojson = useMemo(() => {
        const features = geofences
            .map((geo) => {
                const lat = parseCoordinate(geo.lat);
                const lng = parseCoordinate(geo.lng);
                const radiusMeters = parseRadius(geo.radius);
                if (!lat || !lng) return null;
                try {
                    const poly = circle([lng, lat], radiusMeters, {
                        steps: 64,
                        units: "meters",
                    });
                    poly.properties = {
                        id: geo.id,
                        name: geo.name,
                        active: geo.active,
                        status: geo.status,
                    };
                    return poly;
                } catch {
                    return null;
                }
            })
            .filter(Boolean);
        return { type: "FeatureCollection", features };
    }, [geofences]);

    // Valid paths in pathway network
    const validNodeIds = useMemo(() => new Set(nodes.map((n) => String(n.id))), [nodes]);
    const validPaths = useMemo(() => {
        return paths.filter(
            (p) =>
                validNodeIds.has(String(p.start_node)) &&
                validNodeIds.has(String(p.end_node))
        );
    }, [paths, validNodeIds]);

    // Paths GeoJSON for map display
    const pathsGeojson = useMemo(
        () => ({
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
        }),
        [validPaths, selectedPath]
    );

    // Active pathway drawing preview
    const previewGeojson = useMemo(
        () => ({
            type: "FeatureCollection",
            features:
                drawPreview.length >= 2
                    ? [
                          {
                              type: "Feature",
                              properties: {},
                              geometry: { type: "LineString", coordinates: drawPreview },
                          },
                      ]
                    : [],
        }),
        [drawPreview]
    );


    // Filtered nodes and paths for Tab 2 (Pathway)
    const filteredNodes = useMemo(() => {
        return nodes.filter((n) => {
            const matchesQuery = n.label.toLowerCase().includes(pathwaySearchQuery.toLowerCase());
            const matchesType = pathwayTypeFilter === "all" || n.node_type === pathwayTypeFilter;
            return matchesQuery && matchesType;
        });
    }, [nodes, pathwaySearchQuery, pathwayTypeFilter]);

    const filteredPaths = useMemo(() => {
        return validPaths.filter((p) => {
            return (
                p.start_node_label?.toLowerCase().includes(pathwaySearchQuery.toLowerCase()) ||
                p.end_node_label?.toLowerCase().includes(pathwaySearchQuery.toLowerCase())
            );
        });
    }, [validPaths, pathwaySearchQuery]);

    const totalPathwayDistance = useMemo(() => {
        return Math.round(validPaths.reduce((acc, p) => acc + (p.distance_meters || 0), 0));
    }, [validPaths]);

    // Gate and Entrance nodes for Route Preview start selection
    const gateNodes = useMemo(() => nodes.filter((n) => n.node_type === "gate"), [nodes]);
    const entranceNodes = useMemo(() => nodes.filter((n) => n.node_type === "entrance"), [nodes]);

    // -------------------------------------------------------------
    // Geofences Handlers
    // -------------------------------------------------------------
    const handleToggleGeofenceActive = async (id) => {
        const geo = geofences.find((g) => g.id === id);
        if (!geo) return;
        try {
            await buildingService.updateBuilding(id, {
                is_active: !geo.active,
            });
            setGeofences((prev) =>
                prev.map((g) => (g.id === id ? { ...g, active: !geo.active } : g))
            );
            flashSuccess(
                `Geofence for "${geo.building}" is now ${!geo.active ? "Active" : "Inactive"}.`
            );
        } catch {
            setErrorMsg("Failed to toggle geofence active status.");
        }
    };

    const handleOpenEditGeofence = (geo) => {
        setEditingGeo(geo);
        setGeoForm({
            name: geo.name,
            fullBuilding: geo.fullBuilding,
            lat: geo.lat,
            lng: geo.lng,
            radius: geo.radius,
        });
        setGeoErrors({});
        setIsGeoModalOpen(true);
    };

    const handleSaveGeofence = async () => {
        const schema = {
            name: (val) => validateString(val, 1),
            radius: (val) => {
                const req = validateRequired(val);
                if (req) return req;
                const match = String(val).match(/([0-9]*\.?[0-9]+)/);
                if (!match) return "Must contain a valid number";
                return validateNumber(match[1], 1, 500);
            },
            fullBuilding: (val) => validateString(val, 1),
            lat: (val) => {
                const req = validateRequired(val);
                if (req) return req;
                const match = String(val).match(/([-+]?[0-9]*\.?[0-9]+)/);
                if (!match) return "Must contain a valid coordinate";
                return validateNumber(match[1], -90, 90);
            },
            lng: (val) => {
                const req = validateRequired(val);
                if (req) return req;
                const match = String(val).match(/([-+]?[0-9]*\.?[0-9]+)/);
                if (!match) return "Must contain a valid coordinate";
                return validateNumber(match[1], -180, 180);
            },
        };

        const validationErrors = validateForm(
            {
                name: geoForm.name,
                radius: geoForm.radius,
                fullBuilding: geoForm.fullBuilding,
                lat: geoForm.lat,
                lng: geoForm.lng,
            },
            schema
        );
        setGeoErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setSaving(true);
        try {
            if (editingGeo) {
                const parsedLat = parseCoordinate(geoForm.lat);
                const parsedLng = parseCoordinate(geoForm.lng);
                const parsedRad = parseRadius(geoForm.radius);

                await buildingService.updateBuilding(editingGeo.id, {
                    name: geoForm.name.trim(),
                    description: geoForm.fullBuilding.trim(),
                    latitude: parsedLat,
                    longitude: parsedLng,
                });

                const geoPayload = {
                    latitude: parsedLat,
                    longitude: parsedLng,
                    radius_meters: parsedRad,
                    is_active: editingGeo.active,
                };

                let updatedGeoId = editingGeo.geofence_id;
                if (updatedGeoId) {
                    await buildingService.updateGeofence(updatedGeoId, geoPayload);
                } else {
                    const created = await buildingService.createGeofence(editingGeo.id, geoPayload);
                    updatedGeoId = created.id;
                }

                setGeofences((prev) =>
                    prev.map((g) =>
                        g.id === editingGeo.id
                            ? {
                                  ...g,
                                  geofence_id: updatedGeoId,
                                  name: geoForm.name.trim(),
                                  building: geoForm.name.trim(),
                                  fullBuilding: geoForm.fullBuilding.trim(),
                                  lat: `${parsedLat}° N`,
                                  lng: `${parsedLng}° E`,
                                  latitude: parsedLat,
                                  longitude: parsedLng,
                                  radius: `${parsedRad}m`,
                                  radius_meters: parsedRad,
                              }
                            : g
                    )
                );
                setIsGeoModalOpen(false);
                flashSuccess(`Geofence for "${geoForm.name}" updated successfully.`);
            }
        } catch {
            setErrorMsg("Failed to save geofence changes.");
        } finally {
            setSaving(false);
        }
    };

    // -------------------------------------------------------------
    // Pathway Editor Handlers
    // -------------------------------------------------------------
    const resetPathwayMode = useCallback((newMode = "view") => {
        setPathwayMode(newMode);
        setDrawingFrom(null);
        setDrawPreview([]);
        drawCoordsRef.current = [];
        setNodeForm(null);
        setSelectedNode(null);
        setSelectedPath(null);
    }, []);

    const startDrawingFromNode = (node) => {
        resetPathwayMode("draw_path");
        setDrawingFrom(node);
        drawCoordsRef.current = [[node.longitude, node.latitude]];
        setDrawPreview([[node.longitude, node.latitude]]);
    };

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
            flashSuccess(`Waypoint "${created.label}" added.`);
        } catch {
            setErrorMsg("Failed to save navigation waypoint.");
        } finally {
            setSaving(false);
        }
    };

    const handleSavePath = async (startId, endId, geometry) => {
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
            flashSuccess(`Walkway pathway (${created.distance_meters}m) connected!`);
        } catch {
            setErrorMsg("Failed to connect pathway segment.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTarget = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            if (deleteTarget.type === "node") {
                await navigationService.deleteNode(deleteTarget.id);
                const targetIdStr = String(deleteTarget.id);
                setNodes((prev) => prev.filter((n) => String(n.id) !== targetIdStr));
                setPaths((prev) =>
                    prev.filter(
                        (p) =>
                            String(p.start_node) !== targetIdStr &&
                            String(p.end_node) !== targetIdStr
                    )
                );
                setSelectedNode(null);
                flashSuccess("Waypoint and connected walkways removed.");
            } else {
                await navigationService.deletePath(deleteTarget.id);
                const targetIdStr = String(deleteTarget.id);
                setPaths((prev) => prev.filter((p) => String(p.id) !== targetIdStr));
                setSelectedPath(null);
                flashSuccess("Pathway removed.");
            }
        } catch {
            setErrorMsg("Failed to delete item.");
        } finally {
            setSaving(false);
            setDeleteTarget(null);
        }
    };

    // -------------------------------------------------------------
    // Unified Map Click Handler
    // -------------------------------------------------------------
    const handleMapClick = useCallback(
        (e) => {
            const { lng, lat } = e.lngLat;

            // Pathway Editor Tab
            if (activeTab === "pathway") {
                if (pathwayMode === "add_node") {
                    setNodeForm({ lat, lng });
                    setNodeFormData({ label: "", node_type: "junction", building: "" });
                    return;
                }
                if (pathwayMode === "draw_path" && drawingFrom) {
                    drawCoordsRef.current.push([lng, lat]);
                    setDrawPreview([...drawCoordsRef.current]);
                    return;
                }
                if (pathwayMode === "view") {
                    if (e.features && e.features.length > 0) {
                        const clickedPathId = e.features[0].properties?.id;
                        if (clickedPathId) {
                            const match = validPaths.find(
                                (p) => String(p.id) === String(clickedPathId)
                            );
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
            }

            // Geofences Map Tab
            if (activeTab === "map") {
                setSelectedGeoId(null);
            }

            // Perimeter Drawing Tab
            if (activeTab === "perimeter" && perimeterMode === "draw") {
                const newCoords = [...perimeterCoords];
                // Insert before the closing point
                newCoords.splice(newCoords.length - 1, 0, [lng, lat]);
                setPerimeterCoords(newCoords);
            }
        },
        [activeTab, pathwayMode, drawingFrom, validPaths, perimeterMode, perimeterCoords]
    );

    // Handle dragging a perimeter vertex
    const handleVertexDrag = useCallback((idx, e) => {
        const { lng, lat } = e.lngLat;
        setPerimeterCoords((prev) => {
            const next = [...prev];
            next[idx] = [lng, lat];
            // Keep polygon closed: sync last point with first
            if (idx === 0) next[next.length - 1] = [lng, lat];
            if (idx === next.length - 1) next[0] = [lng, lat];
            return next;
        });
    }, []);

    // Remove a perimeter vertex
    const handleRemoveVertex = useCallback((idx) => {
        setPerimeterCoords((prev) => {
            if (prev.length <= 4) return prev; // keep minimum polygon
            const next = prev.filter((_, i) => i !== idx);
            // Re-close polygon
            next[next.length - 1] = next[0];
            return next;
        });
        setSelectedVertexIdx(null);
    }, []);

    // Reset to default perimeter
    const handleResetPerimeter = useCallback(() => {
        setPerimeterCoords(DEFAULT_CAMPUS_PERIMETER);
        setSelectedVertexIdx(null);
        setPerimeterMode("view");
    }, []);

    // Save perimeter to backend
    const handleSavePerimeter = useCallback(async () => {
        setIsSavingPerimeter(true);
        try {
            const payload = {
                ...perimeterConfig,
                coordinates: perimeterCoords,
            };
            const saved = await navigationService.savePerimeter(payload);
            if (saved) {
                setPerimeterConfig(saved);
                setPerimeterCoords(saved.coordinates);
            }
            setPerimeterMode("view");
            flashSuccess("Campus boundary saved and will sync to mobile maps.");
        } catch {
            setErrorMsg("Failed to save campus perimeter. Check your connection.");
        } finally {
            setIsSavingPerimeter(false);
        }
    }, [perimeterConfig, perimeterCoords]);

    // Build inverted GeoJSON mask (world – campus hole)
    const perimeterMaskGeojson = useMemo(() => ({
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            properties: {},
            geometry: {
                type: "Polygon",
                coordinates: [
                    // Outer ring: entire globe
                    [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]],
                    // Inner hole: campus boundary
                    perimeterCoords,
                ],
            },
        }],
    }), [perimeterCoords]);

    const perimeterStrokeGeojson = useMemo(() => ({
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            properties: {},
            geometry: {
                type: "LineString",
                coordinates: perimeterCoords,
            },
        }],
    }), [perimeterCoords]);

    // Active selected geofence entity
    const selectedGeo = useMemo(() => {
        return geofences.find((g) => g.id === selectedGeoId) || null;
    }, [geofences, selectedGeoId]);


    return (
        <div className="flex flex-col h-[calc(100vh-5.5rem)] min-h-[580px] gap-2.5 overflow-hidden">
            {/* Top Bar Header & Unified 3-Way Segmented Control */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-brand-border rounded-md px-4 py-2.5 shadow-xs shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-brand-light text-brand flex items-center justify-center shrink-0">
                        <Map size={18} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2 leading-tight">
                            Campus Map
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-brand-light text-brand border border-brand/20">
                                WMSU
                            </span>
                        </h1>
                        <p className="text-[11px] text-gray-500 leading-tight">
                            Arrival geofences, pedestrian walkways &amp; campus boundary mask editor
                        </p>
                    </div>
                </div>

                {/* 3-Way Mode Switcher (Strict 6px: rounded-md) */}
                <div className="inline-flex p-1 bg-gray-100 border border-gray-200 rounded-md shadow-xs self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab("map")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            activeTab === "map"
                                ? "bg-brand text-white shadow-sm"
                                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                        }`}
                    >
                        <Compass
                            size={14}
                            className={activeTab === "map" ? "text-white" : "text-gray-500"}
                        />
                        <span>Map</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("pathway")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            activeTab === "pathway"
                                ? "bg-brand text-white shadow-sm"
                                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                        }`}
                    >
                        <GitBranch
                            size={14}
                            className={activeTab === "pathway" ? "text-white" : "text-gray-500"}
                        />
                        <span>Pathway</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("perimeter")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            activeTab === "perimeter"
                                ? "bg-brand text-white shadow-sm"
                                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                        }`}
                    >
                        <Shapes
                            size={14}
                            className={activeTab === "perimeter" ? "text-white" : "text-gray-500"}
                        />
                        <span>Boundary</span>
                    </button>
                </div>
            </header>

            {/* Notification Toasts */}
            {successMsg && (
                <div className="fixed top-6 right-6 z-[70] bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-md shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
                    <Check size={16} />
                    <span>{successMsg}</span>
                </div>
            )}
            {errorMsg && (
                <div className="fixed top-6 right-6 z-[70] bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-md shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
                    <Info size={16} />
                    <span>{errorMsg}</span>
                    <button onClick={() => setErrorMsg(null)} className="ml-2 hover:opacity-80">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Main Interactive Stage */}
            <div className="flex-1 flex overflow-hidden border border-brand-border rounded-md shadow-sm bg-white relative">



                {/* ========================================================= */}
                {/* TAB 3: CAMPUS BOUNDARY / PERIMETER EDITOR SIDEBAR        */}
                {/* ========================================================= */}
                {activeTab === "perimeter" && (
                    <aside className="w-80 flex-shrink-0 bg-slate-50/80 border-r border-brand-border flex flex-col overflow-hidden z-10">
                        {/* Header */}
                        <div className="px-4 py-3 bg-white border-b border-brand-border">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="font-bold text-gray-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                                    <Shield size={14} className="text-brand" /> Campus Boundary
                                </h2>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                                    {perimeterCoords.length - 1} Vertices
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-500">
                                Draw or adjust the campus perimeter. The area outside the boundary will be masked on the mobile map.
                            </p>
                        </div>

                        {/* Mode Action Bar */}
                        <div className="px-4 py-3 bg-white border-b border-brand-border space-y-2">
                            <div className="flex items-center gap-2">
                                {perimeterMode === "view" ? (
                                    <button
                                        type="button"
                                        onClick={() => setPerimeterMode("draw")}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-brand hover:bg-brand/90 rounded-md transition-all shadow-xs"
                                    >
                                        <Plus size={13} /> Add Vertex
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setPerimeterMode("view")}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand bg-brand-light border border-brand/30 hover:bg-brand/10 rounded-md transition-all"
                                    >
                                        <Check size={13} /> Done Adding
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleResetPerimeter}
                                    title="Reset to default rectangle"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-all shadow-2xs"
                                >
                                    <RotateCcw size={12} />
                                </button>
                            </div>
                            {perimeterMode === "draw" && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800 font-medium">
                                    <MapPin size={12} className="shrink-0 text-amber-600" />
                                    Click on the map to place a vertex. Drag existing vertex handles to reposition them.
                                </div>
                            )}
                        </div>

                        {/* Appearance Controls */}
                        <div className="px-4 py-3 bg-white border-b border-brand-border space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Palette size={11} /> Mask Appearance
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowCampusMask((v) => !v)}
                                    className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-brand font-medium transition-colors"
                                >
                                    {showCampusMask ? <EyeOff size={12} /> : <Eye size={12} />}
                                    {showCampusMask ? "Hide Mask" : "Show Mask"}
                                </button>
                            </div>

                            {/* Fill color presets */}
                            <div>
                                <p className="text-[10px] text-gray-500 font-semibold mb-1.5">Outside Color</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {PERIMETER_PRESET_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setPerimeterConfig((prev) => ({ ...prev, fill_color: c.value }))}
                                            title={c.label}
                                            className={`w-6 h-6 rounded-md border-2 transition-all ${perimeterConfig.fill_color === c.value ? "border-brand scale-110 shadow-sm" : "border-transparent hover:border-gray-300"}`}
                                            style={{ backgroundColor: c.value }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Opacity slider */}
                            <div>
                                <p className="text-[10px] text-gray-500 font-semibold mb-1.5">
                                    Mask Opacity — {Math.round(perimeterConfig.fill_opacity * 100)}%
                                </p>
                                <input
                                    type="range" min="0.1" max="0.95" step="0.05"
                                    value={perimeterConfig.fill_opacity}
                                    onChange={(e) => setPerimeterConfig((prev) => ({ ...prev, fill_opacity: parseFloat(e.target.value) }))}
                                    className="w-full h-1.5 rounded accent-brand"
                                />
                            </div>

                            {/* Stroke color presets */}
                            <div>
                                <p className="text-[10px] text-gray-500 font-semibold mb-1.5">Boundary Stroke</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {PERIMETER_STROKE_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setPerimeterConfig((prev) => ({ ...prev, stroke_color: c.value }))}
                                            title={c.label}
                                            className={`w-6 h-6 rounded-md border-2 transition-all ${perimeterConfig.stroke_color === c.value ? "border-brand scale-110 shadow-sm" : "border-transparent hover:border-gray-300"}`}
                                            style={{ backgroundColor: c.value }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Vertex List */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="px-4 py-2 bg-gray-50/80 border-b border-brand-border">
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                    Vertex Coordinates
                                </span>
                            </div>
                            <ul className="divide-y divide-gray-50">
                                {perimeterCoords.slice(0, -1).map((coord, idx) => (
                                    <li
                                        key={idx}
                                        onClick={() => setSelectedVertexIdx(idx === selectedVertexIdx ? null : idx)}
                                        className={`px-4 py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-gray-50 transition-colors ${selectedVertexIdx === idx ? "bg-brand-light border-l-2 border-brand" : "border-l-2 border-transparent"}`}
                                    >
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-700 font-mono">
                                                V{idx + 1}
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-mono">
                                                {coord[0].toFixed(5)}, {coord[1].toFixed(5)}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveVertex(idx); }}
                                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Remove vertex"
                                        >
                                            <X size={11} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Save Footer */}
                        <div className="p-4 bg-white border-t border-brand-border">
                            <button
                                type="button"
                                onClick={handleSavePerimeter}
                                disabled={isSavingPerimeter}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-brand/90 rounded-md transition-all shadow-xs disabled:opacity-60"
                            >
                                {isSavingPerimeter ? (
                                    <><RotateCcw size={13} className="animate-spin" /> Saving…</>
                                ) : (
                                    <><Check size={13} /> Save Campus Boundary</>
                                )}
                            </button>
                            <p className="text-[10px] text-gray-400 text-center mt-2">
                                Changes sync to mobile map on next app load.
                            </p>
                        </div>
                    </aside>
                )}

                {/* ========================================================= */}
                {/* TAB 2: PATHWAY NETWORK EDITOR SIDEBAR                   */}
                {/* ========================================================= */}
                {activeTab === "pathway" && (
                    <aside className="w-80 flex-shrink-0 bg-slate-50/80 border-r border-brand-border flex flex-col overflow-hidden z-10">

                        {/* Header Stats */}
                        <div className="px-4 py-3 bg-white border-b border-brand-border">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="font-bold text-gray-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                                    <Route size={14} className="text-brand" /> Walkway Network
                                </h2>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                                    {totalPathwayDistance}m Total
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mt-2">
                                <div className="flex items-center gap-1">
                                    <Circle size={10} className="text-brand fill-brand" />
                                    <span>{nodes.length} nodes</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <GitBranch size={11} className="text-sky-600" />
                                    <span>{validPaths.length} paths</span>
                                </div>
                            </div>
                        </div>

                        {/* Mode Action Buttons */}
                        <div className="px-4 py-2.5 bg-white border-b border-brand-border flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        resetPathwayMode(
                                            pathwayMode === "add_node" ? "view" : "add_node"
                                        )
                                    }
                                    className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-bold transition-all shadow-xs ${
                                        pathwayMode === "add_node"
                                            ? "bg-brand text-white shadow-brand/30 shadow-md ring-2 ring-brand/40"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                                    }`}
                                >
                                    <MapPin
                                        size={13}
                                        className={
                                            pathwayMode === "add_node" ? "text-white" : "text-brand"
                                        }
                                    />
                                    <span>
                                        {pathwayMode === "add_node" ? "Cancel Add" : "Add Node"}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        resetPathwayMode(
                                            pathwayMode === "draw_path" ? "view" : "draw_path"
                                        )
                                    }
                                    className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-bold transition-all shadow-xs ${
                                        pathwayMode === "draw_path"
                                            ? "bg-sky-600 text-white shadow-sky-600/30 shadow-md ring-2 ring-sky-500/40"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                                    }`}
                                >
                                    <Navigation
                                        size={13}
                                        className={
                                            pathwayMode === "draw_path"
                                                ? "text-white"
                                                : "text-sky-600"
                                        }
                                    />
                                    <span>
                                        {pathwayMode === "draw_path" ? "Cancel Draw" : "Draw Path"}
                                    </span>
                                </button>
                            </div>

                            {/* Active Action Helper Banner */}
                            {pathwayMode === "add_node" && (
                                <div className="p-2 rounded-md text-xs bg-red-50 border border-brand/20 text-brand flex items-start gap-1.5">
                                    <MapPin size={13} className="shrink-0 mt-0.5" />
                                    <span>Click anywhere on the map to position a new waypoint.</span>
                                </div>
                            )}
                            {pathwayMode === "draw_path" && (
                                <div className="p-2 rounded-md text-xs bg-sky-50 border border-sky-200 text-sky-900 flex items-start gap-1.5">
                                    <Navigation size={13} className="shrink-0 mt-0.5 text-sky-600" />
                                    <span>
                                        {drawingFrom
                                            ? `Tracing from "${drawingFrom.label}". Click next node to finish.`
                                            : "Click any starting waypoint to begin connecting pathways."}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Search & Type Filters */}
                        <div className="px-4 py-2 bg-gray-50 border-b border-brand-border flex flex-col gap-1.5">
                            <div className="relative">
                                <Search
                                    size={12}
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    type="text"
                                    value={pathwaySearchQuery}
                                    onChange={(e) => setPathwaySearchQuery(e.target.value)}
                                    placeholder="Filter waypoints & pathways..."
                                    className="w-full pl-7 pr-2.5 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand font-medium bg-white"
                                />
                            </div>

                            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
                                {[
                                    { key: "all", label: "all" },
                                    { key: "entrance", label: "entrance" },
                                    { key: "junction", label: "walkway" },
                                    { key: "gate", label: "gate" },
                                    { key: "poi", label: "poi" },
                                ].map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setPathwayTypeFilter(key)}
                                        className={`px-2 py-0.5 rounded-md font-bold uppercase transition-colors whitespace-nowrap ${
                                            pathwayTypeFilter === key
                                                ? "bg-slate-900 text-white"
                                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Collapsible Directory of Waypoints & Paths */}
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                            {/* Waypoints Section */}
                            <div>
                                <button
                                    onClick={() => setNodesExpanded((v) => !v)}
                                    className="w-full flex items-center justify-between px-4 py-1.5 bg-gray-100/70 hover:bg-gray-200/50 text-xs font-bold text-gray-700"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Circle size={10} className="text-gray-500" />
                                        <span>Waypoints</span>
                                        <span className="ml-1 px-1.5 py-0.2 rounded-md bg-gray-200 text-gray-800 text-[10px]">
                                            {filteredNodes.length}
                                        </span>
                                    </div>
                                    {nodesExpanded ? (
                                        <ChevronUp size={12} />
                                    ) : (
                                        <ChevronDown size={12} />
                                    )}
                                </button>

                                {nodesExpanded && (
                                    <ul className="divide-y divide-gray-50 bg-white">
                                        {filteredNodes.length === 0 && (
                                            <li className="px-4 py-3 text-center text-xs text-gray-400 italic">
                                                No matching waypoints found.
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
                                                    className={`px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 border-l-2 ${
                                                        isSelected
                                                            ? "bg-red-50/70 border-brand"
                                                            : "border-transparent"
                                                    }`}
                                                >
                                                    <div className="min-w-0 flex items-center gap-2">
                                                        <span
                                                            className="w-2 h-2 rounded-full shrink-0"
                                                            style={{ backgroundColor: cfg.color }}
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-gray-800 truncate">
                                                                {n.label}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 truncate">
                                                                {cfg.short}{" "}
                                                                {n.building_name
                                                                    ? `· ${n.building_name}`
                                                                    : ""}
                                                            </p>
                                                        </div>
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
                                    className="w-full flex items-center justify-between px-4 py-1.5 bg-gray-100/70 hover:bg-gray-200/50 text-xs font-bold text-gray-700"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <GitBranch size={11} className="text-gray-500" />
                                        <span>Pathways</span>
                                        <span className="ml-1 px-1.5 py-0.2 rounded-md bg-gray-200 text-gray-800 text-[10px]">
                                            {filteredPaths.length}
                                        </span>
                                    </div>
                                    {pathsExpanded ? (
                                        <ChevronUp size={12} />
                                    ) : (
                                        <ChevronDown size={12} />
                                    )}
                                </button>

                                {pathsExpanded && (
                                    <ul className="divide-y divide-gray-50 bg-white">
                                        {filteredPaths.length === 0 && (
                                            <li className="px-4 py-3 text-center text-xs text-gray-400 italic">
                                                No matching pathways found.
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
                                                    className={`px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 border-l-2 ${
                                                        isSelected
                                                            ? "bg-sky-50 border-sky-600"
                                                            : "border-transparent"
                                                    }`}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-gray-800 truncate">
                                                            {p.start_node_label} ↔ {p.end_node_label}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">
                                                            {p.distance_meters}m walkway
                                                        </p>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </aside>
                )}

                {/* ========================================================= */}
                {/* UNIFIED INTERACTIVE MAPBOX CANVAS                        */}
                {/* ========================================================= */}
                <div className="flex-1 h-full relative">
                    {/* TAB 1: Selected Geofence Inspector Panel (Slide-out) */}
                    {activeTab === "map" && selectedGeo && (
                        <div className="absolute top-4 right-4 z-20 w-80 bg-white/95 backdrop-blur-md rounded-md border border-brand-border shadow-2xl p-4 animate-in fade-in slide-in-from-right-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <Badge
                                    variant={selectedGeo.active ? "success" : "gray"}
                                    className="rounded-md"
                                >
                                    {selectedGeo.active ? "Active Arrival Geofence" : "Inactive"}
                                </Badge>
                                <button
                                    onClick={() => setSelectedGeoId(null)}
                                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="mt-3 space-y-3">
                                {selectedGeo.image_url ? (
                                    <img
                                        src={selectedGeo.image_url}
                                        alt={selectedGeo.building}
                                        className="w-full h-32 object-cover rounded-md border border-gray-200"
                                    />
                                ) : (
                                    <div className="w-full h-24 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-400">
                                        No Building Thumbnail
                                    </div>
                                )}

                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">
                                        {selectedGeo.building}
                                    </h3>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                        {selectedGeo.fullBuilding}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 p-2 rounded-md bg-gray-50 border border-gray-100 text-xs">
                                    <div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase block">
                                            Arrival Radius
                                        </span>
                                        <span className="font-bold text-brand text-sm">
                                            {selectedGeo.radius}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase block">
                                            Status
                                        </span>
                                        <span className="font-bold text-gray-800">
                                            {selectedGeo.status || "PUBLISHED"}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-[10.5px] font-mono text-gray-500">
                                    GPS: {selectedGeo.lat}, {selectedGeo.lng}
                                </div>

                                <div className="flex gap-2 pt-2 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleGeofenceActive(selectedGeo.id)}
                                        className="flex-1 py-1.5 px-3 rounded-md border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        {selectedGeo.active ? "Deactivate" : "Activate"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEditGeofence(selectedGeo)}
                                        className="flex-1 py-1.5 px-3 rounded-md bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-colors shadow-xs"
                                    >
                                        Edit Geofence
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <ReactMap
                        ref={mapRef}
                        {...viewState}
                        onMove={(evt) => setViewState(evt.viewState)}
                        style={{ width: "100%", height: "100%" }}
                        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                        mapboxAccessToken={MAPBOX_TOKEN}
                        onClick={handleMapClick}
                        interactiveLayerIds={
                            activeTab === "pathway" && pathwayMode === "view"
                                ? ["nav-paths-casing"]
                                : []
                        }
                    >
                        <NavigationControl position="top-right" />

                        {/* CAMPUS BOUNDARY: Inverted Mask + Stroke (Always visible on all tabs when showCampusMask is on) */}
                        {showCampusMask && (
                            <>
                                <Source id="campus-perimeter-mask" type="geojson" data={perimeterMaskGeojson}>
                                    <Layer
                                        id="campus-mask-fill"
                                        type="fill"
                                        paint={{
                                            "fill-color": perimeterConfig.fill_color,
                                            "fill-opacity": perimeterConfig.fill_opacity,
                                        }}
                                    />
                                </Source>
                                <Source id="campus-perimeter-stroke" type="geojson" data={perimeterStrokeGeojson}>
                                    <Layer
                                        id="campus-boundary-line"
                                        type="line"
                                        paint={{
                                            "line-color": perimeterConfig.stroke_color,
                                            "line-width": perimeterConfig.stroke_width,
                                            "line-dasharray": [3, 2],
                                        }}
                                    />
                                </Source>
                            </>
                        )}

                        {/* TAB 1: GEOFENCE CIRCLES LAYER */}
                        {activeTab === "map" && (
                            <Source id="geofences" type="geojson" data={circlesGeojson}>


                                <Layer
                                    id="geofences-fill"
                                    type="fill"
                                    paint={{
                                        "fill-color": [
                                            "case",
                                            ["==", ["get", "active"], true],
                                            "#10b981",
                                            "#6b7280",
                                        ],
                                        "fill-opacity": 0.22,
                                    }}
                                />
                                <Layer
                                    id="geofences-line"
                                    type="line"
                                    paint={{
                                        "line-color": [
                                            "case",
                                            ["==", ["get", "active"], true],
                                            "#10b981",
                                            "#6b7280",
                                        ],
                                        "line-width": 2,
                                    }}
                                />
                            </Source>
                        )}

                        {/* TAB 2: BASE PATHWAYS NETWORK */}
                        {activeTab === "pathway" && (
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
                                            "#f59e0b",
                                            "#00E5FF",
                                        ],
                                        "line-width": 3,
                                    }}
                                    layout={{ "line-join": "round", "line-cap": "round" }}
                                />
                            </Source>
                        )}

                        {/* TAB 2: ACTIVE DRAWING PREVIEW */}
                        {activeTab === "pathway" && pathwayMode === "draw_path" && (
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
                        )}

                        {/* MARKERS: Tab 1 Map Mode (Geofence Pins with status & arrival radius) */}
                        {activeTab === "map" &&
                            geofences.map((geo) => {
                                const lat = parseCoordinate(geo.lat);
                                const lng = parseCoordinate(geo.lng);
                                if (!lat || !lng) return null;
                                const isSelected = selectedGeoId === geo.id;

                                return (
                                    <Marker
                                        key={`geo-pin-${geo.id}`}
                                        longitude={lng}
                                        latitude={lat}
                                        anchor="bottom"
                                    >
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedGeoId(geo.id);
                                                if (mapRef.current) {
                                                    mapRef.current.flyTo({
                                                        center: [lng, lat],
                                                        zoom: 18,
                                                        duration: 800,
                                                    });
                                                }
                                            }}
                                            className="flex flex-col items-center cursor-pointer select-none group"
                                        >
                                            <div
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-bold shadow-md tracking-tight mb-1 transition-all ${
                                                    isSelected
                                                        ? "bg-brand text-white ring-2 ring-brand/30 shadow-lg scale-105"
                                                        : "bg-white/95 text-slate-900 border border-slate-200 group-hover:border-slate-400"
                                                }`}
                                            >
                                                <span
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{
                                                        backgroundColor: geo.active
                                                            ? "#10b981"
                                                            : "#94a3b8",
                                                    }}
                                                />
                                                <span className="truncate max-w-[130px]">
                                                    {geo.building}
                                                </span>
                                                <span className="text-[9px] opacity-75">
                                                    ({geo.radius})
                                                </span>
                                            </div>

                                            <div className="relative flex items-center justify-center">
                                                {geo.status === "MAINTENANCE" ? (
                                                    <MaintenanceIcon />
                                                ) : (
                                                    <DefaultMapPin
                                                        color={
                                                            geo.active ? "#10b981" : "#6b7280"
                                                        }
                                                        active={geo.active}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </Marker>
                                );
                            })}

                        {/* MARKERS: Tab 2 (Buildings Landmark Tags) */}
                        {activeTab === "pathway" &&
                            rawBuildings.map((b) => (
                                <BuildingLandmarkTag
                                    key={`bld-${b.id}`}
                                    building={b}
                                />
                            ))}

                        {/* MARKERS: Perimeter Vertex Handles (Tab 3: Boundary Editor) */}
                        {activeTab === "perimeter" &&
                            perimeterCoords.slice(0, -1).map((coord, idx) => (
                                <Marker
                                    key={`pv-${idx}`}
                                    longitude={coord[0]}
                                    latitude={coord[1]}
                                    anchor="center"
                                    draggable
                                    onDrag={(e) => handleVertexDrag(idx, e)}
                                    onClick={(e) => {
                                        e.originalEvent.stopPropagation();
                                        setSelectedVertexIdx(idx === selectedVertexIdx ? null : idx);
                                    }}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full border-2 cursor-grab active:cursor-grabbing shadow-md flex items-center justify-center transition-all ${
                                            selectedVertexIdx === idx
                                                ? "bg-brand border-white ring-2 ring-brand scale-125"
                                                : "bg-white border-brand hover:scale-110"
                                        }`}
                                        title={`Vertex ${idx + 1}: ${coord[0].toFixed(5)}, ${coord[1].toFixed(5)}`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${selectedVertexIdx === idx ? "bg-white" : "bg-brand"}`} />
                                    </div>
                                </Marker>
                            ))}

                        {/* MARKERS: Waypoint Nodes (Tab 2: Pathway) */}
                        {activeTab === "pathway" &&

                            nodes.map((n) => (
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
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (pathwayMode === "draw_path") {
                                                if (!drawingFrom) {
                                                    setDrawingFrom(n);
                                                    drawCoordsRef.current = [
                                                        [n.longitude, n.latitude],
                                                    ];
                                                    setDrawPreview([[n.longitude, n.latitude]]);
                                                    return;
                                                }
                                                if (n.id === drawingFrom.id) return;
                                                const geometry = [
                                                    [drawingFrom.longitude, drawingFrom.latitude],
                                                    ...drawCoordsRef.current.slice(1),
                                                    [n.longitude, n.latitude],
                                                ];
                                                handleSavePath(drawingFrom.id, n.id, geometry);
                                                return;
                                            }
                                            if (pathwayMode === "view") {
                                                setSelectedNode(n);
                                                setSelectedPath(null);
                                            }
                                        }}
                                    />
                                </Marker>
                            ))}
                    </ReactMap>

                    {/* Floating Pathway Add Node Sheet (Tab 2) */}
                    {activeTab === "pathway" && nodeForm && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md rounded-md shadow-2xl border border-slate-200 p-4 w-84 max-w-[90vw] animate-in fade-in slide-in-from-bottom-3 duration-200">
                            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                                <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <MapPin size={14} className="text-brand" /> New Waypoint Node
                                </h3>
                                <button
                                    onClick={() => setNodeForm(null)}
                                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Waypoint Label *
                                    </label>
                                    <input
                                        autoFocus
                                        value={nodeFormData.label}
                                        onChange={(e) =>
                                            setNodeFormData((p) => ({
                                                ...p,
                                                label: e.target.value,
                                            }))
                                        }
                                        placeholder="e.g. Main Gate, CICS Entrance"
                                        className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Waypoint Role
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {Object.entries(NODE_TYPES).map(([typeKey, cfg]) => {
                                            const isSelected = nodeFormData.node_type === typeKey;
                                            return (
                                                <button
                                                    key={typeKey}
                                                    type="button"
                                                    onClick={() =>
                                                        setNodeFormData((p) => ({
                                                            ...p,
                                                            node_type: typeKey,
                                                        }))
                                                    }
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-left text-xs font-semibold border transition-all ${
                                                        isSelected
                                                            ? "border-slate-800 bg-slate-900 text-white shadow-xs"
                                                            : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
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

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Link to Campus Building (Optional)
                                    </label>
                                    <select
                                        value={nodeFormData.building}
                                        onChange={(e) =>
                                            setNodeFormData((p) => ({
                                                ...p,
                                                building: e.target.value,
                                            }))
                                        }
                                        className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand bg-white font-medium"
                                    >
                                        <option value="">— No Building Link —</option>
                                        {rawBuildings.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setNodeForm(null)}
                                    className="flex-1 px-3 py-1.5 rounded-md border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveNode}
                                    disabled={saving || !nodeFormData.label.trim()}
                                    className="flex-1 px-3 py-1.5 rounded-md bg-brand text-white text-xs font-bold shadow hover:bg-brand/90 transition-colors disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save Waypoint"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Inspected Node Card (Tab 2) */}
                    {activeTab === "pathway" && selectedNode && pathwayMode === "view" && (
                        <div className="absolute bottom-6 right-6 z-30 bg-white/95 backdrop-blur-md rounded-md shadow-2xl border border-slate-200 p-4 w-72 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-red-100 text-brand">
                                    Waypoint Info
                                </span>
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                >
                                    <X size={13} />
                                </button>
                            </div>

                            <p className="font-bold text-gray-900 text-sm">{selectedNode.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {NODE_TYPES[selectedNode.node_type]?.label || selectedNode.node_type}
                            </p>

                            {selectedNode.building_name && (
                                <div className="mt-2 p-2 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-700">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">
                                        Linked Building
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                        {selectedNode.building_name}
                                    </span>
                                </div>
                            )}

                            <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => startDrawingFromNode(selectedNode)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold hover:bg-sky-100 transition-colors"
                                >
                                    <Navigation size={12} /> Draw Path
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDeleteTarget({
                                            type: "node",
                                            id: selectedNode.id,
                                            label: selectedNode.label,
                                        })
                                    }
                                    className="p-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Inspected Pathway Card (Tab 2) */}
                    {activeTab === "pathway" && selectedPath && pathwayMode === "view" && (
                        <div className="absolute bottom-6 right-6 z-30 bg-white/95 backdrop-blur-md rounded-md shadow-2xl border border-slate-200 p-4 w-72 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-sky-100 text-sky-800">
                                    Pathway Segment
                                </span>
                                <button
                                    onClick={() => setSelectedPath(null)}
                                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                >
                                    <X size={13} />
                                </button>
                            </div>

                            <p className="font-bold text-gray-900 text-sm">
                                {selectedPath.start_node_label}{" "}
                                <span className="text-gray-400 font-normal">↔</span>{" "}
                                {selectedPath.end_node_label}
                            </p>

                            <div className="grid grid-cols-2 gap-2 mt-2.5">
                                <div className="p-2 rounded-md bg-gray-50 border border-gray-200 text-center">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">
                                        Distance
                                    </span>
                                    <span className="font-extrabold text-gray-900 text-sm">
                                        {selectedPath.distance_meters}m
                                    </span>
                                </div>
                                <div className="p-2 rounded-md bg-gray-50 border border-gray-200 text-center">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">
                                        Est. Pace
                                    </span>
                                    <span className="font-extrabold text-gray-900 text-sm">
                                        ~{Math.max(1, Math.round(selectedPath.distance_meters / 80))} min
                                    </span>
                                </div>
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
                                className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
                            >
                                <Trash2 size={12} /> Remove Pathway
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Geofence Modal (Strict 6px: rounded-md) */}
            <Modal
                isOpen={isGeoModalOpen}
                onClose={() => setIsGeoModalOpen(false)}
                title={editingGeo ? `Edit Geofence: ${editingGeo.building}` : "Edit Geofence"}
                maxWidth="max-w-md w-full"
            >
                <div className="space-y-3.5 p-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Building Name *
                        </label>
                        <input
                            type="text"
                            value={geoForm.name}
                            onChange={(e) =>
                                setGeoForm((p) => ({ ...p, name: e.target.value }))
                            }
                            className="w-full border border-brand-border rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand font-medium"
                        />
                        {geoErrors.name && (
                            <p className="text-[10px] text-red-500 font-medium mt-1">
                                {geoErrors.name}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Arrival Radius (meters) *
                        </label>
                        <input
                            type="text"
                            value={geoForm.radius}
                            onChange={(e) =>
                                setGeoForm((p) => ({ ...p, radius: e.target.value }))
                            }
                            placeholder="e.g. 25m"
                            className="w-full border border-brand-border rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand font-medium"
                        />
                        {geoErrors.radius && (
                            <p className="text-[10px] text-red-500 font-medium mt-1">
                                {geoErrors.radius}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Latitude *
                            </label>
                            <input
                                type="text"
                                value={geoForm.lat}
                                onChange={(e) =>
                                    setGeoForm((p) => ({ ...p, lat: e.target.value }))
                                }
                                className="w-full border border-brand-border rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand font-mono"
                            />
                            {geoErrors.lat && (
                                <p className="text-[10px] text-red-500 font-medium mt-1">
                                    {geoErrors.lat}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Longitude *
                            </label>
                            <input
                                type="text"
                                value={geoForm.lng}
                                onChange={(e) =>
                                    setGeoForm((p) => ({ ...p, lng: e.target.value }))
                                }
                                className="w-full border border-brand-border rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand font-mono"
                            />
                            {geoErrors.lng && (
                                <p className="text-[10px] text-red-500 font-medium mt-1">
                                    {geoErrors.lng}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Description / Building Details
                        </label>
                        <textarea
                            rows={3}
                            value={geoForm.fullBuilding}
                            onChange={(e) =>
                                setGeoForm((p) => ({
                                    ...p,
                                    fullBuilding: e.target.value,
                                }))
                            }
                            className="w-full border border-brand-border rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand font-medium"
                        />
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsGeoModalOpen(false)}
                            className="flex-1 px-4 py-2 rounded-md border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveGeofence}
                            disabled={saving}
                            className="flex-1 px-4 py-2 rounded-md bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-colors shadow-xs disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save Geofence"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirm Delete Dialog (Tab 2) */}
            <ConfirmDeleteModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteTarget}
                title={`Delete ${deleteTarget?.type === "node" ? "Waypoint Node" : "Pathway"}?`}
                message={`Are you sure you want to remove "${deleteTarget?.label}"? All connected pathways will be updated accordingly.`}
                loading={saving}
            />
        </div>
    );
}
