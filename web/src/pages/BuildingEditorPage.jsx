import React, { useState, useEffect, useRef, useMemo } from "react";
import "@google/model-viewer";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle,
    Image as ImageIcon,
    ChevronDown,
} from "lucide-react";
import { buildingService } from "../services/buildingService";
import { departmentService } from "../services/departmentService";
import GeofenceEditor from "../components/GeofenceEditor";
import DragDropFileUpload from "../components/common/DragDropFileUpload";
import { theme } from "../theme";
import { validateForm, validateString } from "../utils/validation";

const BuildingEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === "new";
    const [existingBuildings, setExistingBuildings] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [building, setBuilding] = useState({
        name: "",
        description: "",
        latitude: "",
        longitude: "",
        status: "DRAFT",
        is_active: true,
        model_file: null,
        model_version: "",
        model_active: false,
        hotspots: [],
        primary_department_id: null,
        department_ids: [],
    });

    const [geofence, setGeofence] = useState({
        latitude: "",
        longitude: "",
        radius_meters: 20,
        is_active: true,
    });

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [geofenceErrors, setGeofenceErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState("");

    const [deptSearch, setDeptSearch] = useState("");
    const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
    const [showHotspotEditor, setShowHotspotEditor] = useState(false);
    const deptDropdownRef = useRef(null);
    const modelViewerRef = useRef(null);

    // Listen for messages from the iframe Hotspot Editor
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.type === "SAVE_HOTSPOTS") {
                setBuilding((prev) => ({
                    ...prev,
                    hotspots: event.data.hotspots,
                }));
                setShowHotspotEditor(false);
                setSuccessMessage(
                    'Hotspots saved locally! Click "Save All Changes" below to save to the database.',
                );
                setTimeout(() => setSuccessMessage(""), 5000);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                deptDropdownRef.current &&
                !deptDropdownRef.current.contains(e.target)
            ) {
                setDeptDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isNew) {
            loadBuilding();
        }
        loadExistingBuildings();
        loadDepartments();
    }, [id]);

    const loadExistingBuildings = async () => {
        try {
            const data = await buildingService.getBuildings();
            setExistingBuildings(data);
        } catch (error) {
            console.error("Failed to load existing buildings", error);
        }
    };

    const loadDepartments = async () => {
        try {
            const data = await departmentService.getDepartments();
            setDepartments(data);
        } catch (error) {
            console.error("Failed to load departments", error);
        }
    };

    const loadBuilding = async () => {
        try {
            const data = await buildingService.getBuilding(id);
            setBuilding({
                ...data,
                primary_department_id: data.primary_department?.id ?? null,
                department_ids: data.departments?.map((d) => d.id) ?? [],
            });
            try {
                const geofenceData = await buildingService.getGeofence(id);
                if (geofenceData) {
                    setGeofence(geofenceData);
                }
            } catch (error) {
                console.log("No geofence found");
            }
        } catch (error) {
            setErrors({ submit: "Failed to load building" });
            navigate("/buildings");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        let finalValue = value;
        if (type === "checkbox") finalValue = checked;
        if (type === "file") finalValue = files[0];

        setBuilding((prev) => ({
            ...prev,
            [name]: finalValue,
        }));

        if (name === "latitude" || name === "longitude") {
            setGeofence((prev) => ({
                ...prev,
                [name]: finalValue,
            }));
        }

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const modelPreviewUrl = useMemo(() => {
        if (building.model_file instanceof File) {
            return URL.createObjectURL(building.model_file);
        }
        return building.model_url || null;
    }, [building.model_file, building.model_url]);

    const runValidation = () => {
        const schema = {
            name: (val) => validateString(val, 1),
            latitude: (val) => {
                if (building.status !== "DRAFT" && !val)
                    return "Latitude is required to publish";
                if (val) {
                    const num = Number(val);
                    if (isNaN(num) || num < -90 || num > 90)
                        return "Latitude must be between -90 and 90";
                }
                return null;
            },
            longitude: (val) => {
                if (building.status !== "DRAFT" && !val)
                    return "Longitude is required to publish";
                if (val) {
                    const num = Number(val);
                    if (isNaN(num) || num < -180 || num > 180)
                        return "Longitude must be between -180 and 180";
                }
                return null;
            },
        };

        const validationErrors = validateForm(building, schema);
        const newGeofenceErrors = {};

        if (building.status !== "DRAFT") {
            if (!geofence.latitude || !geofence.longitude) {
                newGeofenceErrors.center =
                    "Click on map to set geofence center to publish";
            }
            if (!geofence.radius_meters || geofence.radius_meters <= 0) {
                newGeofenceErrors.radius =
                    "Radius must be greater than 0 to publish";
            }
        }

        setErrors(validationErrors);
        setGeofenceErrors(newGeofenceErrors);

        return (
            Object.keys(validationErrors).length === 0 &&
            Object.keys(newGeofenceErrors).length === 0
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!runValidation()) return;

        setSaving(true);
        try {
            const generatedSlug = building.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, "");

            const formData = new FormData();
            formData.append("name", building.name);
            formData.append("slug", generatedSlug);
            formData.append("description", building.description || "");
            if (building.latitude)
                formData.append("latitude", building.latitude);
            if (building.longitude)
                formData.append("longitude", building.longitude);
            formData.append("status", building.status);
            formData.append("is_active", building.is_active);
            formData.append("model_version", building.model_version || "");
            formData.append("model_active", building.model_active);

            if (building.hotspots) {
                formData.append("hotspots", JSON.stringify(building.hotspots));
            }

            if (building.primary_department_id) {
                formData.append(
                    "primary_department_id",
                    building.primary_department_id,
                );
            } else {
                formData.append("primary_department_id", "");
            }

            if (building.department_ids && building.department_ids.length > 0) {
                building.department_ids.forEach((id) => {
                    formData.append("department_ids", id);
                });
            }

            if (building.model_file instanceof File) {
                formData.append("model_file", building.model_file);

                // Auto-generate 2D thumbnail from the 3D model viewer
                if (modelViewerRef.current) {
                    try {
                        const blob = await modelViewerRef.current.toBlob({
                            idealAspect: true,
                        });
                        if (blob) {
                            formData.append(
                                "image",
                                blob,
                                `${generatedSlug || "building"}_thumbnail.png`,
                            );
                        }
                    } catch (e) {
                        console.error("Failed to generate model thumbnail", e);
                    }
                }
            }

            let formattedGeofenceData = null;
            if (geofence.latitude && geofence.longitude) {
                formattedGeofenceData = {
                    latitude: parseFloat(geofence.latitude),
                    longitude: parseFloat(geofence.longitude),
                    radius_meters: parseFloat(geofence.radius_meters || 20),
                    is_active: geofence.is_active,
                };
            }

            if (isNew) {
                const savedBuilding =
                    await buildingService.createBuilding(formData);
                if (formattedGeofenceData) {
                    await buildingService.createGeofence(
                        savedBuilding.id,
                        formattedGeofenceData,
                    );
                }

                setSuccessMessage("Building created successfully!");
                setTimeout(
                    () => navigate(`/buildings/${savedBuilding.id}`),
                    1500,
                );
            } else {
                const savedBuilding = await buildingService.updateBuilding(
                    id,
                    formData,
                );
                setBuilding({
                    ...savedBuilding,
                    primary_department_id:
                        savedBuilding.primary_department?.id ?? null,
                    department_ids:
                        savedBuilding.departments?.map((d) => d.id) ?? [],
                });

                if (formattedGeofenceData) {
                    if (geofence.id) {
                        await buildingService.updateGeofence(
                            geofence.id,
                            formattedGeofenceData,
                        );
                    } else {
                        await buildingService.createGeofence(
                            id,
                            formattedGeofenceData,
                        );
                    }
                }

                setSuccessMessage("Building updated successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
            }
        } catch (error) {
            const apiErrors = error.response?.data?.errors || {};
            setErrors(apiErrors);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            {successMessage && (
                <div
                    style={{
                        position: "fixed",
                        top: "24px",
                        right: "24px",
                        backgroundColor: "#10b981",
                        color: "#ffffff",
                        padding: "16px 24px",
                        borderRadius: theme.radius.md,
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        gap: theme.spacing.sm,
                        fontSize: "15px",
                        fontWeight: "500",
                        animation: "slideIn 0.3s ease-out",
                    }}
                >
                    <CheckCircle size={20} />
                    {successMessage}
                </div>
            )}

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.md,
                    marginBottom: theme.spacing.lg,
                }}
            >
                <button
                    onClick={() => navigate("/buildings")}
                    style={{
                        padding: theme.spacing.sm,
                        backgroundColor: theme.colors.surface,
                        border: "1px solid crimson",
                        borderRadius: theme.radius.sm,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: theme.spacing.xs,
                    }}
                >
                    <ArrowLeft size={20} />
                    Back
                </button>
                <h1
                    style={{
                        fontSize: "28px",
                        fontWeight: "bold",
                        color: theme.colors.text.primary,
                        margin: 0,
                        flex: 1,
                    }}
                >
                    {isNew ? "New Building" : `Edit: ${building.name}`}
                </h1>

                {}
                {!isNew ? (
                    <button
                        type="button"
                        onClick={() => navigate(`/panoramas/${id}`)}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: theme.colors.primary,
                            color: theme.colors.text.inverse,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        <ImageIcon size={18} />
                        Manage Panoramas
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled
                        title="Save the building first to enable panorama management"
                        style={{
                            padding: "8px 16px",
                            backgroundColor: theme.colors.surface,
                            color: theme.colors.text.muted,
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: theme.radius.sm,
                            cursor: "not-allowed",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            opacity: 0.6,
                        }}
                    >
                        <ImageIcon size={18} />
                        Save to Add Panoramas
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: theme.spacing.lg,
                        marginBottom: theme.spacing.lg,
                    }}
                >
                    <div
                        className="flex flex-col gap-6"
                        style={{
                            backgroundColor: theme.colors.surface,
                            padding: theme.spacing.lg,
                            borderRadius: theme.radius.md,
                        }}
                    >
                        <div className="border-b border-gray-100 pb-4">
                            <h2 className="text-xl font-bold text-gray-800">
                                Building Information
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Update the core details and metadata for this
                                building.
                            </p>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={building.name}
                                onChange={handleChange}
                                style={{ borderRadius: theme.radius.sm }}
                                className={`w-full px-4 py-2 bg-gray-50 border ${errors.name ? "border-red-500" : "border-gray-200"} focus:bg-white focus:ring-2 focus:ring-[#8a1538] focus:border-[#8a1538] transition-all outline-none text-sm`}
                                placeholder="e.g. College of Nursing"
                            />
                            {errors.name && (
                                <div className="text-red-500 text-xs mt-1.5 font-medium">
                                    {errors.name}
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={building.description || ""}
                                onChange={handleChange}
                                rows={5}
                                style={{ borderRadius: theme.radius.sm }}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-[#8a1538] focus:border-[#8a1538] transition-all outline-none resize-y text-sm"
                                placeholder="Brief description about this building..."
                            />
                        </div>

                        {/* Coordinates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Latitude{" "}
                                    {building.status !== "DRAFT" && (
                                        <span className="text-red-500">*</span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    name="latitude"
                                    value={building.latitude}
                                    onChange={handleChange}
                                    step="any"
                                    style={{ borderRadius: theme.radius.sm }}
                                    className={`w-full px-4 py-2 bg-gray-50 border ${errors.latitude ? "border-red-500" : "border-gray-200"} focus:bg-white focus:ring-2 focus:ring-[#8a1538] focus:border-[#8a1538] transition-all outline-none text-sm`}
                                    placeholder="e.g. 6.9045"
                                />
                                {errors.latitude && (
                                    <div className="text-red-500 text-xs mt-1.5 font-medium">
                                        {errors.latitude}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Longitude{" "}
                                    {building.status !== "DRAFT" && (
                                        <span className="text-red-500">*</span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    name="longitude"
                                    value={building.longitude}
                                    onChange={handleChange}
                                    step="any"
                                    style={{ borderRadius: theme.radius.sm }}
                                    className={`w-full px-4 py-2 bg-gray-50 border ${errors.longitude ? "border-red-500" : "border-gray-200"} focus:bg-white focus:ring-2 focus:ring-[#8a1538] focus:border-[#8a1538] transition-all outline-none text-sm`}
                                    placeholder="e.g. 122.074"
                                />
                                {errors.longitude && (
                                    <div className="text-red-500 text-xs mt-1.5 font-medium">
                                        {errors.longitude}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status & Active */}
                        <div
                            className="flex flex-wrap items-center gap-8 bg-gray-50 p-4 border border-gray-100"
                            style={{ borderRadius: theme.radius.sm }}
                        >
                            <div className="flex flex-col gap-1.5 w-full sm:w-auto flex-1">
                                <label className="text-sm font-semibold text-gray-700">
                                    Publishing Status
                                </label>
                                <select
                                    name="status"
                                    value={building.status}
                                    onChange={handleChange}
                                    style={{ borderRadius: theme.radius.sm }}
                                    className="px-4 py-2 border border-gray-200 bg-white focus:ring-2 focus:ring-[#8a1538] focus:border-[#8a1538] outline-none transition-all cursor-pointer shadow-sm text-sm"
                                >
                                    <option value="DRAFT">
                                        Draft (Unpublished)
                                    </option>
                                    <option value="HIDDEN">
                                        Published (Hidden)
                                    </option>
                                    <option value="VISIBLE">
                                        Published (Visible)
                                    </option>
                                    <option value="MAINTENANCE">
                                        Under Construction / Maintenance
                                    </option>
                                </select>
                            </div>

                            <label
                                className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer mt-1 sm:mt-5 bg-white px-4 py-2 border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
                                style={{ borderRadius: theme.radius.sm }}
                            >
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={building.is_active}
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded text-[#8a1538] focus:ring-[#8a1538] cursor-pointer"
                                />
                                <span>Active / Open</span>
                            </label>
                        </div>

                        {/* Colleges and Department section */}
                        <div className="space-y-5 pt-2">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Primary College (Map Pin Color)
                                </label>
                                <div className="relative" ref={deptDropdownRef}>
                                    <div
                                        onClick={() =>
                                            setDeptDropdownOpen(
                                                !deptDropdownOpen,
                                            )
                                        }
                                        style={{
                                            borderRadius: theme.radius.sm,
                                        }}
                                        className="w-full px-4 py-2 bg-white border border-gray-200 cursor-pointer flex justify-between items-center shadow-sm hover:border-[#8a1538] transition-all text-sm"
                                    >
                                        <span className="text-gray-700">
                                            {building.primary_department_id
                                                ? departments.find(
                                                      (d) =>
                                                          d.id ===
                                                          building.primary_department_id,
                                                  )?.name || "Unknown"
                                                : "— Default WMSU Red Pin —"}
                                        </span>
                                        <ChevronDown
                                            size={18}
                                            className="text-gray-400"
                                        />
                                    </div>

                                    {deptDropdownOpen && (
                                        <div
                                            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-lg z-50 max-h-64 flex flex-col overflow-hidden"
                                            style={{
                                                borderRadius: theme.radius.sm,
                                            }}
                                        >
                                            <div className="p-2 border-b border-gray-100 bg-gray-50">
                                                <input
                                                    type="text"
                                                    placeholder="Search colleges..."
                                                    value={deptSearch}
                                                    onChange={(e) =>
                                                        setDeptSearch(
                                                            e.target.value,
                                                        )
                                                    }
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    style={{
                                                        borderRadius:
                                                            theme.radius.sm,
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#8a1538] bg-white"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="overflow-y-auto">
                                                <div
                                                    onClick={() => {
                                                        setBuilding((prev) => ({
                                                            ...prev,
                                                            primary_department_id:
                                                                null,
                                                        }));
                                                        setDeptDropdownOpen(
                                                            false,
                                                        );
                                                        setDeptSearch("");
                                                    }}
                                                    className={`px-4 py-3 cursor-pointer text-sm transition-colors ${building.primary_department_id === null ? "bg-[#8a1538]/10 text-[#8a1538] font-semibold" : "hover:bg-gray-50 text-gray-700"}`}
                                                >
                                                    — Default WMSU Red Pin —
                                                </div>
                                                {departments
                                                    .filter(
                                                        (d) =>
                                                            d.name
                                                                .toLowerCase()
                                                                .includes(
                                                                    deptSearch.toLowerCase(),
                                                                ) ||
                                                            d.code
                                                                .toLowerCase()
                                                                .includes(
                                                                    deptSearch.toLowerCase(),
                                                                ),
                                                    )
                                                    .map((dept) => (
                                                        <div
                                                            key={dept.id}
                                                            onClick={() => {
                                                                setBuilding(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        primary_department_id:
                                                                            dept.id,
                                                                        department_ids:
                                                                            prev.department_ids.includes(
                                                                                dept.id,
                                                                            )
                                                                                ? prev.department_ids
                                                                                : [
                                                                                      ...prev.department_ids,
                                                                                      dept.id,
                                                                                  ],
                                                                    }),
                                                                );
                                                                setDeptDropdownOpen(
                                                                    false,
                                                                );
                                                                setDeptSearch(
                                                                    "",
                                                                );
                                                            }}
                                                            className={`px-4 py-3 cursor-pointer text-sm transition-colors border-t border-gray-50 ${building.primary_department_id === dept.id ? "bg-[#8a1538]/10 text-[#8a1538]" : "hover:bg-gray-50 text-gray-700"}`}
                                                        >
                                                            <div
                                                                className={
                                                                    building.primary_department_id ===
                                                                    dept.id
                                                                        ? "font-semibold"
                                                                        : "font-medium"
                                                                }
                                                            >
                                                                {dept.name}
                                                            </div>
                                                            <div
                                                                className={`text-xs mt-0.5 ${building.primary_department_id === dept.id ? "text-[#8a1538]/80" : "text-gray-400"}`}
                                                            >
                                                                Code:{" "}
                                                                {dept.code}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Associated Colleges (Search Results &
                                    Grouping)
                                </label>
                                <div
                                    className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 border border-gray-200 shadow-inner"
                                    style={{ borderRadius: theme.radius.sm }}
                                >
                                    {departments.map((dept) => (
                                        <label
                                            key={dept.id}
                                            className="flex items-start gap-2.5 text-sm cursor-pointer p-2 hover:bg-white rounded transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={building.department_ids.includes(
                                                    dept.id,
                                                )}
                                                onChange={(e) => {
                                                    const checked =
                                                        e.target.checked;
                                                    setBuilding((prev) => {
                                                        let newIds =
                                                            prev.department_ids.filter(
                                                                (id) =>
                                                                    id !==
                                                                    dept.id,
                                                            );
                                                        if (checked)
                                                            newIds.push(
                                                                dept.id,
                                                            );

                                                        let newPrimary =
                                                            prev.primary_department_id;
                                                        if (
                                                            !checked &&
                                                            newPrimary ===
                                                                dept.id
                                                        ) {
                                                            newPrimary = null;
                                                        }

                                                        return {
                                                            ...prev,
                                                            department_ids:
                                                                newIds,
                                                            primary_department_id:
                                                                newPrimary,
                                                        };
                                                    });
                                                }}
                                                className="mt-0.5 w-4 h-4 rounded text-[#8a1538] focus:ring-[#8a1538] cursor-pointer"
                                            />
                                            <span className="text-gray-700 leading-tight">
                                                {dept.name}
                                            </span>
                                        </label>
                                    ))}
                                    {departments.length === 0 && (
                                        <span className="text-sm text-gray-400 p-2">
                                            No colleges found
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex flex-col gap-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">
                                        3D Model Configuration
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Upload a GLTF/GLB file to enable the 3D
                                        Viewer.
                                    </p>
                                </div>
                                <label
                                    className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer bg-gray-50 px-3 py-1.5 border border-gray-200 shadow-sm hover:bg-gray-100 transition-colors"
                                    style={{ borderRadius: theme.radius.sm }}
                                >
                                    <input
                                        type="checkbox"
                                        name="model_active"
                                        checked={building.model_active}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded text-[#8a1538] focus:ring-[#8a1538] cursor-pointer"
                                    />
                                    <span>Model Active</span>
                                </label>
                            </div>

                            <div className="flex flex-col gap-4">
                                <DragDropFileUpload
                                    accept=".glb,.gltf"
                                    value={
                                        building.model_file instanceof File
                                            ? building.model_file
                                            : null
                                    }
                                    onChange={(file) =>
                                        setBuilding((prev) => ({
                                            ...prev,
                                            model_file: file,
                                        }))
                                    }
                                    placeholder="Drag & drop 3D model here or click to browse"
                                    previewNode={
                                        modelPreviewUrl ? (
                                            <model-viewer
                                                ref={modelViewerRef}
                                                src={modelPreviewUrl}
                                                auto-rotate
                                                style={{
                                                    width: "100%",
                                                    height: "250px",
                                                    backgroundColor:
                                                        "transparent",
                                                    borderRadius:
                                                        theme.radius.md,
                                                }}
                                            ></model-viewer>
                                        ) : null
                                    }
                                />

                                {building.model_url &&
                                    !(building.model_file instanceof File) && (
                                        <div className="flex flex-col gap-3 mt-1 px-1">
                                            <span className="text-xs font-semibold text-gray-600">
                                                Current model uploaded. Drop a
                                                new file above to replace it.
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowHotspotEditor(true)
                                                }
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#8a1538] hover:bg-[#70102b] text-white font-bold transition-colors shadow-sm w-fit"
                                                style={{
                                                    borderRadius:
                                                        theme.radius.sm,
                                                }}
                                            >
                                                <ImageIcon size={16} />
                                                Edit 3D Hotspots
                                            </button>
                                        </div>
                                    )}

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        3D Model Version
                                    </label>
                                    <input
                                        type="text"
                                        name="model_version"
                                        value={building.model_version || ""}
                                        onChange={handleChange}
                                        placeholder="e.g. v1.0"
                                        style={{
                                            borderRadius: theme.radius.sm,
                                        }}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-[#8a1538] focus:border-[#8a1538] transition-all outline-none text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            backgroundColor: theme.colors.surface,
                            padding: theme.spacing.lg,
                            borderRadius: theme.radius.md,
                        }}
                    >
                        <h2
                            style={{
                                fontSize: "18px",
                                fontWeight: "600",
                                marginBottom: theme.spacing.md,
                            }}
                        >
                            Geofence Configuration
                        </h2>
                        <GeofenceEditor
                            value={geofence}
                            onChange={(newValue) => {
                                setGeofence(newValue);

                                if (
                                    newValue.latitude !== geofence.latitude ||
                                    newValue.longitude !== geofence.longitude
                                ) {
                                    setBuilding((prev) => ({
                                        ...prev,
                                        latitude: newValue.latitude,
                                        longitude: newValue.longitude,
                                    }));
                                    setErrors((prev) => ({
                                        ...prev,
                                        latitude: null,
                                        longitude: null,
                                    }));
                                }

                                if (geofenceErrors.center)
                                    setGeofenceErrors((prev) => ({
                                        ...prev,
                                        center: null,
                                    }));
                            }}
                            errors={geofenceErrors}
                            existingBuildings={existingBuildings}
                            currentBuildingId={id !== "new" ? id : null}
                            buildingName={building.name}
                            buildingStatus={building.status}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    style={{
                        width: "100%",
                        padding: theme.spacing.md,
                        backgroundColor: theme.colors.primary,
                        color: theme.colors.text.inverse,
                        border: "none",
                        borderRadius: theme.radius.sm,
                        cursor: saving ? "not-allowed" : "pointer",
                        fontSize: "16px",
                        fontWeight: "600",
                        opacity: saving ? 0.6 : 1,
                    }}
                >
                    {saving ? "Saving..." : "Save All Changes"}
                </button>
            </form>

            {/* Fullscreen Hotspot Editor Modal */}
            {showHotspotEditor && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "rgba(0,0,0,0.95)",
                        zIndex: 9999,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <div
                        style={{
                            padding: "15px 25px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "#111",
                            borderBottom: `1px solid ${theme.colors.border}`,
                        }}
                    >
                        <div>
                            <h2
                                style={{
                                    color: "white",
                                    margin: 0,
                                    fontSize: "20px",
                                }}
                            >
                                Interactive 3D Hotspot Editor
                            </h2>
                            <p
                                style={{
                                    color: "#aaa",
                                    margin: "5px 0 0 0",
                                    fontSize: "13px",
                                }}
                            >
                                Double-click anywhere on the model to place a
                                hotspot.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowHotspotEditor(false)}
                            style={{
                                background: theme.colors.error,
                                color: "white",
                                border: "none",
                                padding: "8px 20px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: "bold",
                            }}
                        >
                            Close Editor (Without Saving)
                        </button>
                    </div>
                    <iframe
                        src="/admin-hotspot-editor.html"
                        style={{ width: "100%", flex: 1, border: "none" }}
                        onLoad={(e) => {
                            e.target.contentWindow.postMessage(
                                {
                                    type: "INIT_EDITOR",
                                    modelUrl: building.model_url,
                                    hotspots: building.hotspots || [],
                                },
                                "*",
                            );
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default BuildingEditorPage;
