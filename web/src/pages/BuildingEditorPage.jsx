import React, { useState, useEffect, useRef, useMemo } from "react";
import "@google/model-viewer";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle,
    Image as ImageIcon,
    ChevronDown,
    Target,
    Zap,
} from "lucide-react";
import { buildingService } from "../services/buildingService";
import { departmentService } from "../services/departmentService";
import GeofenceEditor from "../components/map/GeofenceEditor";
import DragDropFileUpload from "../components/common/DragDropFileUpload";
import { theme } from "../theme";
import { validateForm, validateString } from "../utils/validation";

const BuildingEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const preloadedModelFile = location.state?.preloadedModelFile;
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
        model_file: preloadedModelFile || null,
        model_version: "",
        model_active: !!preloadedModelFile,
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
    const [errorMessage, setErrorMessage] = useState("");

    const [deptSearch, setDeptSearch] = useState("");
    const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
    const [showHotspotEditor, setShowHotspotEditor] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [thumbnailBlob, setThumbnailBlob] = useState(null);
    const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(null);
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    
    const deptDropdownRef = useRef(null);
    const modelViewerRef = useRef(null);
    const progressTextRef = useRef(null);
    const progressBarRef = useRef(null);

    const modelPreviewUrl = useMemo(() => {
        if (building.model_file instanceof File) {
            return URL.createObjectURL(building.model_file);
        }
        return building.model_url || null;
    }, [building.model_file, building.model_url]);

    useEffect(() => {
        const viewer = modelViewerRef.current;
        if (viewer && isGeneratingThumbnail) {
            setIsModelLoading(true);

            const updateProgressUI = (progress) => {
                if (progressBarRef.current) {
                    progressBarRef.current.style.width = `${progress}%`;
                }
                if (progressTextRef.current) {
                    progressTextRef.current.innerText = `Capturing Thumbnail... ${progress}%`;
                }
            };

            const handleProgress = (event) => {
                const progress = Math.round(event.detail.totalProgress * 100);
                updateProgressUI(progress);
            };

            const handleLoad = () => {
                updateProgressUI(100);
                setIsModelLoading(false);
            };

            const handleError = (event) => {
                console.error("Model viewer load error:", event.detail);
                setIsModelLoading(false);
            };

            viewer.addEventListener("progress", handleProgress);
            viewer.addEventListener("load", handleLoad);
            viewer.addEventListener("error", handleError);

            return () => {
                viewer.removeEventListener("progress", handleProgress);
                viewer.removeEventListener("load", handleLoad);
                viewer.removeEventListener("error", handleError);
            };
        }
    }, [modelPreviewUrl, isGeneratingThumbnail]);

    const handleCaptureThumbnail = async () => {
        setIsGeneratingThumbnail(true);
        setIsModelLoading(true);
        setErrorMessage("");

        // Allow React to mount <model-viewer>
        await new Promise((r) => setTimeout(r, 150));

        const viewer = modelViewerRef.current;
        if (!viewer) {
            setIsGeneratingThumbnail(false);
            setIsModelLoading(false);
            setErrorMessage("Could not initialize 3D viewer for thumbnail capture.");
            return;
        }

        try {
            if (!viewer.loaded) {
                await new Promise((resolve, reject) => {
                    const onLoad = () => {
                        viewer.removeEventListener("load", onLoad);
                        viewer.removeEventListener("error", onError);
                        resolve();
                    };
                    const onError = (e) => {
                        viewer.removeEventListener("load", onLoad);
                        viewer.removeEventListener("error", onError);
                        reject(new Error("Failed to load 3D model."));
                    };
                    viewer.addEventListener("load", onLoad);
                    viewer.addEventListener("error", onError);
                    setTimeout(() => resolve(), 12000);
                });
            }

            // Brief delay for the WebGL render buffer to paint
            await new Promise((resolve) => setTimeout(resolve, 300));

            const blob = await viewer.toBlob({ idealAspect: true });
            if (!blob) {
                throw new Error("Canvas snapshot returned empty.");
            }

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 1280;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (compressedBlob) => {
                        setThumbnailBlob(compressedBlob);
                        setThumbnailPreviewUrl(URL.createObjectURL(compressedBlob));
                        setIsGeneratingThumbnail(false);
                        setIsModelLoading(false);
                        setSuccessMessage("✓ 2D Thumbnail generated successfully!");
                        setTimeout(() => setSuccessMessage(""), 4000);
                    },
                    "image/jpeg",
                    0.85
                );
            };
            img.onerror = () => {
                setIsGeneratingThumbnail(false);
                setIsModelLoading(false);
                setErrorMessage("Failed to process thumbnail canvas image.");
            };
            img.src = URL.createObjectURL(blob);
        } catch (e) {
            console.error("Failed to capture thumbnail", e);
            setIsGeneratingThumbnail(false);
            setIsModelLoading(false);
            setErrorMessage("Failed to generate thumbnail: " + (e.message || "Please check 3D model"));
            setTimeout(() => setErrorMessage(""), 6000);
        }
    };

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
        const fetchCompressedModel = async () => {
            const url = location.state?.compressedModelUrl;
            const filename = location.state?.compressedModelFilename;
            if (url && filename) {
                try {
                    setIsModelLoading(true);
                    const res = await fetch(url);
                    if (!res.ok) throw new Error("Could not retrieve model from server");
                    const blob = await res.blob();
                    const fileObj = new File([blob], filename, { type: "model/gltf-binary" });
                    setBuilding((prev) => ({
                        ...prev,
                        model_file: fileObj,
                        model_active: true,
                    }));
                    setSuccessMessage("⚡ Optimized 3D model loaded from compressor! Click 'Generate Thumbnail' to capture the preview.");
                } catch (e) {
                    console.error("Failed to load preloaded model:", e);
                    setErrorMessage("Failed to stage model from compressor: " + e.message);
                } finally {
                    setIsModelLoading(false);
                }
            }
        };
        fetchCompressedModel();
    }, [location.state?.compressedModelUrl, location.state?.compressedModelFilename]);

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
            setBuilding((prev) => ({
                ...data,
                primary_department_id: data.primary_department?.id ?? null,
                department_ids: data.departments?.map((d) => d.id) ?? [],
                model_file: prev.model_file instanceof File ? prev.model_file : null,
                model_active: prev.model_file instanceof File ? true : (data.model_active ?? false),
            }));
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
            }

            if (building.department_ids && building.department_ids.length > 0) {
                building.department_ids.forEach((id) => {
                    formData.append("department_ids", id);
                });
            }

            if (building.model_file instanceof File) {
                formData.append("model_file", building.model_file);
            }

            // Use the manually generated thumbnail blob if it exists
            if (thumbnailBlob) {
                formData.append(
                    "image",
                    thumbnailBlob,
                    `${generatedSlug || "building"}_thumbnail.jpg`,
                );
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
            const apiErrors = error.response?.data?.error?.details || {};
            setErrors(apiErrors);
            
            const genericMessage = error.response?.data?.error?.message;
            if (Object.keys(apiErrors).length > 0) {
                const detailedErrors = Object.entries(apiErrors).map(([key, msgs]) => `${key}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`).join(' | ');
                setErrorMessage(`${genericMessage || 'Error'} - ${detailedErrors}`);
                setTimeout(() => setErrorMessage(""), 7000);
            } else if (genericMessage) {
                setErrorMessage(genericMessage);
                setTimeout(() => setErrorMessage(""), 5000);
            } else {
                setErrorMessage("An unexpected server error occurred. The file might be too large.");
                setTimeout(() => setErrorMessage(""), 5000);
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            {errorMessage && (
                <div
                    style={{
                        position: "fixed",
                        top: "80px",
                        right: "24px",
                        backgroundColor: "#ef4444",
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
                    {errorMessage}
                </div>
            )}
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
                                    <p className="text-xs font-semibold text-[#8a1538] mt-1">
                                        Max File Size Limit: 500 MB
                                    </p>
                                    <div className="mt-2">
                                        <Link
                                            to="/compressor"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand text-xs font-bold rounded-md transition-colors border border-brand/20"
                                        >
                                            <Zap size={13} /> Large 3D Model (up to 2 GB+)? Open 3D Compressor →
                                        </Link>
                                    </div>
                                    {(() => {
                                        let sizeInBytes = 0;
                                        if (building.model_file instanceof File) {
                                            sizeInBytes = building.model_file.size;
                                        } else if (building.model_file_size) {
                                            sizeInBytes = building.model_file_size;
                                        } else if (building.model_size) {
                                            sizeInBytes = building.model_size;
                                        }
                                        return sizeInBytes > 0 ? (
                                            <p className="text-xs font-medium text-gray-600 mt-1">
                                                Current File: {(sizeInBytes / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                        ) : null;
                                    })()}
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

                                    onChange={(file) => {
                                        if (file) {
                                            if (file.size > 500 * 1024 * 1024) {
                                                setErrorMessage("The 3D model exceeds the maximum file size limit of 500 MB.");
                                                setTimeout(() => setErrorMessage(""), 5000);
                                                return;
                                            }
                                        }
                                        setBuilding((prev) => ({
                                            ...prev,
                                            model_file: file,
                                        }));
                                        // Reset thumbnail when a new file is uploaded
                                        setThumbnailBlob(null);
                                        setThumbnailPreviewUrl(null);
                                        setIsGeneratingThumbnail(false);
                                    }}
                                    previewNode={
                                        ((thumbnailPreviewUrl || building.image_url) && !isGeneratingThumbnail) ? (
                                            <div style={{ position: "relative", width: "100%", height: "250px" }}>
                                                <img 
                                                    src={thumbnailPreviewUrl || building.image_url} 
                                                    alt="Model Thumbnail" 
                                                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: theme.radius.md }} 
                                                />
                                            </div>
                                        ) : (modelPreviewUrl && isGeneratingThumbnail) ? (
                                            <div style={{ position: "relative", width: "100%", height: "250px" }}>
                                                <model-viewer
                                                    ref={modelViewerRef}
                                                    src={modelPreviewUrl}
                                                    {...(!modelPreviewUrl.startsWith("blob:") && !modelPreviewUrl.startsWith("http://localhost") ? { crossorigin: "anonymous" } : {})}
                                                    auto-rotate
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        backgroundColor: "#111827",
                                                        borderRadius: theme.radius.md,
                                                    }}
                                                ></model-viewer>
                                                {isModelLoading && (
                                                    <div style={{
                                                        position: "absolute",
                                                        top: 0,
                                                        left: 0,
                                                        width: "100%",
                                                        height: "100%",
                                                        backgroundColor: "rgba(17, 24, 39, 0.85)",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        borderRadius: theme.radius.md,
                                                        zIndex: 20,
                                                    }}>
                                                        <div style={{ width: "70%", height: "6px", backgroundColor: "#374151", borderRadius: "3px", overflow: "hidden" }}>
                                                            <div ref={progressBarRef} style={{ width: "0%", height: "100%", backgroundColor: "#8a1538", transition: "width 0.2s ease-out" }} />
                                                        </div>
                                                        <span ref={progressTextRef} style={{ marginTop: "10px", fontSize: "12px", fontWeight: "600", color: "#f3f4f6" }}>
                                                            Capturing 2D Thumbnail...
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null
                                    }
                                />

                                {(building.model_file instanceof File || building.model_url) && !isGeneratingThumbnail && (
                                    <div className="flex flex-col gap-3 mt-1 px-1">
                                        {(building.model_file instanceof File) ? (
                                            <span className="text-xs font-semibold text-gray-500">
                                                Required: Click to generate a 2D thumbnail for the mobile app to prevent lag.
                                            </span>
                                        ) : (
                                            <span className="text-xs font-semibold text-gray-600">
                                                Current model uploaded. Drop a new file above to replace it.
                                            </span>
                                        )}
                                        
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleCaptureThumbnail();
                                                }}
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#8a1538] hover:bg-[#70102b] text-white font-bold transition-colors shadow-sm w-fit"
                                                style={{ borderRadius: theme.radius.sm }}
                                            >
                                                <ImageIcon size={16} />
                                                {(thumbnailBlob || building.image_url) ? "Regenerate Thumbnail" : "Generate Thumbnail"}
                                            </button>

                                            {building.model_url && !(building.model_file instanceof File) && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowHotspotEditor(true)}
                                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#8a1538] hover:bg-[#70102b] text-white font-bold transition-colors shadow-sm w-fit"
                                                    style={{ borderRadius: theme.radius.sm }}
                                                >
                                                    <Target size={16} />
                                                    Edit 3D Hotspots
                                                </button>
                                            )}
                                        </div>
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
                    className="relative overflow-hidden"
                    style={{
                        width: "100%",
                        padding: theme.spacing.md,
                        backgroundColor: saving ? "#660e28" : theme.colors.primary,
                        color: theme.colors.text.inverse,
                        border: "none",
                        borderRadius: theme.radius.sm,
                        cursor: saving ? "not-allowed" : "pointer",
                        fontSize: "16px",
                        fontWeight: "600",
                    }}
                >
                    {saving && (
                        <div 
                            className="absolute top-0 left-0 h-full bg-white opacity-20" 
                            style={{ animation: 'fakeProgress 15s cubic-bezier(0.1, 0.7, 0.1, 1) forwards' }} 
                        />
                    )}
                    <style>{`
                        @keyframes fakeProgress {
                            0% { width: 0%; }
                            50% { width: 70%; }
                            80% { width: 90%; }
                            100% { width: 95%; }
                        }
                    `}</style>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {saving && (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {saving 
                            ? (building.model_file instanceof File 
                                ? "Optimizing & Compressing 3D Model... (This takes a moment)" 
                                : "Saving Changes...") 
                            : "Save All Changes"}
                    </span>
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
