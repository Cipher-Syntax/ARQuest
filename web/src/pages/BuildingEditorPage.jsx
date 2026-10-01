import React, { useState, useEffect, useRef, useMemo } from "react";
import "@google/model-viewer";
import { useParams, useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle,
    CheckCircle2,
    Image as ImageIcon,
    Target,
    Zap,
    Eye,
    EyeOff,
    FileText,
    AlertTriangle,
    Building2,
    MapPin,
    Info,
    Sparkles,
    Camera,
    Box,
    MonitorPlay,
    ChevronRight,
} from "lucide-react";
import { buildingService } from "../services/buildingService";
import { departmentService } from "../services/departmentService";
import GeofenceEditor from "../components/map/GeofenceEditor";
import DragDropFileUpload from "../components/common/DragDropFileUpload";
import { Modal, Button } from "../components/ui";

const STATUS_OPTIONS = [
    {
        value: "DRAFT",
        title: "Draft",
        subtitle: "Unpublished",
        icon: FileText,
        color: "hover:border-gray-400",
        selectedBg: "bg-gray-50 border-gray-600 text-gray-900 ring-2 ring-gray-300",
        iconBg: "bg-gray-200 text-gray-700",
        description: "Draft mode only visible to administrators. Coordinates optional while editing.",
    },
    {
        value: "VISIBLE",
        title: "Visible",
        subtitle: "Public / Live",
        icon: Eye,
        color: "hover:border-brand",
        selectedBg: "bg-brand/5 border-brand text-brand ring-2 ring-brand/30",
        iconBg: "bg-brand/10 text-brand",
        description: "Publicly visible on campus map & mobile AR landmark discovery. Coordinates required.",
    },
    {
        value: "MAINTENANCE",
        title: "Maintenance",
        subtitle: "Notice / Repairs",
        icon: AlertTriangle,
        color: "hover:border-amber-500",
        selectedBg: "bg-amber-50/60 border-amber-500 text-amber-900 ring-2 ring-amber-300",
        iconBg: "bg-amber-100 text-amber-700",
        description: "Flagged under construction or repair with a maintenance marker. Coordinates required.",
    },
    {
        value: "HIDDEN",
        title: "Hidden",
        subtitle: "Unlisted",
        icon: EyeOff,
        color: "hover:border-red-500",
        selectedBg: "bg-red-50/60 border-red-500 text-red-900 ring-2 ring-red-300",
        iconBg: "bg-red-100 text-red-700",
        description: "Active in database, but hidden from general map discovery. Coordinates required.",
    },
];

const BuildingEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const preloadedModelFile = location.state?.preloadedModelFile;
    const isNew = id === "new";
    const [existingBuildings, setExistingBuildings] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [searchParams, setSearchParams] = useSearchParams();
    const [isDirty, setIsDirty] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [showHubModal, setShowHubModal] = useState(false);

    useEffect(() => {
        if (searchParams.get("openHub") === "true") {
            const timer = setTimeout(() => {
                setShowHubModal(true);
            }, 1300);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("openHub");
            setSearchParams(newParams, { replace: true });
            return () => clearTimeout(timer);
        }
    }, [searchParams, setSearchParams]);

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
        radius_meters: 50,
        is_active: true,
    });

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [geofenceErrors, setGeofenceErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const [showHotspotEditor, setShowHotspotEditor] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [thumbnailBlob, setThumbnailBlob] = useState(null);
    const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(null);
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    
    const modelViewerRef = useRef(null);
    const progressTextRef = useRef(null);
    const progressBarRef = useRef(null);

    const modelPreviewUrl = useMemo(() => {
        if (building.model_file instanceof File) {
            return URL.createObjectURL(building.model_file);
        }
        return building.model_url || null;
    }, [building.model_file, building.model_url]);

    // Warn before closing browser window/tab if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty && !saving) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty, saving]);

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
                        setIsDirty(true);
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
                setIsDirty(true);
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
                    setIsDirty(true);
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
        } else if (location.state?.buildingDraft) {
            setBuilding((prev) => ({
                ...prev,
                ...location.state.buildingDraft,
                model_file: prev.model_file instanceof File ? prev.model_file : null,
                model_active: Boolean(prev.model_file instanceof File || location.state.buildingDraft?.model_file),
            }));
            if (location.state?.geofenceDraft) {
                setGeofence(location.state.geofenceDraft);
            }
            setIsDirty(true);
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
            const draft = location.state?.buildingDraft;
            const geofenceDraft = location.state?.geofenceDraft;

            setBuilding((prev) => ({
                ...data,
                primary_department_id: data.primary_department?.id ?? null,
                department_ids: data.departments?.map((d) => d.id) ?? [],
                ...(draft || {}),
                model_file: prev.model_file instanceof File ? prev.model_file : null,
                model_active: Boolean(prev.model_file instanceof File || draft?.model_file || data.model_file || data.model_url),
            }));
            try {
                const geofenceData = await buildingService.getGeofence(id);
                if (geofenceDraft) {
                    setGeofence(geofenceDraft);
                } else if (geofenceData) {
                    setGeofence(geofenceData);
                }
            } catch (error) {
                if (geofenceDraft) {
                    setGeofence(geofenceDraft);
                } else {
                    console.log("No geofence found");
                }
            }
            setIsDirty(Boolean(draft || location.state?.fromCompressor));
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

        setIsDirty(true);
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

    // Unified Form Validation
    const validateForm = () => {
        const newErrors = {};
        const newGeofenceErrors = {};

        const trimmedName = (building.name || "").trim();
        if (!trimmedName) {
            newErrors.name = "Building name is required.";
        } else if (trimmedName.length < 3) {
            newErrors.name = "Building name must be at least 3 characters.";
        } else if (trimmedName.length > 255) {
            newErrors.name = "Building name cannot exceed 255 characters.";
        } else {
            const nameExists = existingBuildings.some(
                (b) =>
                    b.id !== (id !== "new" ? id : null) &&
                    b.name?.toLowerCase().trim() === trimmedName.toLowerCase()
            );
            if (nameExists) {
                newErrors.name = "A building with this name already exists.";
            }
        }

        if (building.description && building.description.length > 2000) {
            newErrors.description = "Description cannot exceed 2,000 characters.";
        }

        if (!building.status) {
            newErrors.status = "Please select a publishing status.";
        }

        if (!building.latitude && building.latitude !== 0) {
            newErrors.latitude = "Latitude is required.";
        } else {
            const lat = Number(building.latitude);
            if (isNaN(lat) || lat < -90 || lat > 90) {
                newErrors.latitude = "Latitude must be between -90 and 90.";
            }
        }

        if (!building.longitude && building.longitude !== 0) {
            newErrors.longitude = "Longitude is required.";
        } else {
            const lng = Number(building.longitude);
            if (isNaN(lng) || lng < -180 || lng > 180) {
                newErrors.longitude = "Longitude must be between -180 and 180.";
            }
        }

        if (!geofence.radius_meters || Number(geofence.radius_meters) <= 0) {
            newGeofenceErrors.radius = "Geofence radius must be greater than 0 meters.";
        } else if (Number(geofence.radius_meters) > 500) {
            newGeofenceErrors.radius = "Geofence radius cannot exceed 500 meters.";
        }

        setErrors(newErrors);
        setGeofenceErrors(newGeofenceErrors);

        const isValid =
            Object.keys(newErrors).length === 0 &&
            Object.keys(newGeofenceErrors).length === 0;

        if (!isValid) {
            setErrorMessage("Please review and fix the highlighted fields.");
            setTimeout(() => setErrorMessage(""), 4000);
        }

        return isValid;
    };

    const handleBackClick = () => {
        if (saving) return;
        if (isDirty) {
            setShowUnsavedModal(true);
        } else {
            navigate("/buildings");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

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
            // Facility Operations removed: automatically active when not in DRAFT mode
            formData.append("is_active", building.status !== "DRAFT");
            formData.append("model_version", building.model_version || "");
            formData.append(
                "model_active",
                Boolean(building.model_file || building.model_url),
            );

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
                    radius_meters: parseFloat(geofence.radius_meters || 50),
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

                setIsDirty(false);
                setHasSaved(true);
                setSuccessMessage("Building created successfully!");
                setTimeout(
                    () => navigate(`/buildings/${savedBuilding.id}?openHub=true`),
                    1000,
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

                setIsDirty(false);
                setHasSaved(true);
                setSuccessMessage("Building updated successfully!");
                setTimeout(() => {
                    setShowHubModal(true);
                }, 1300);
                setTimeout(() => setSuccessMessage(""), 4500);
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

    if (loading) return (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-500">Loading building data...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {errorMessage && (
                <div className="fixed top-20 right-6 bg-red-600 text-white px-5 py-3 rounded-md shadow-xl z-[70] flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2">
                    <AlertTriangle size={18} />
                    <span>{errorMessage}</span>
                </div>
            )}
            {successMessage && (
                <div className="fixed top-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-md shadow-xl z-[70] flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2">
                    <CheckCircle size={18} />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Top Bar */}
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleBackClick}
                        disabled={saving}
                        className="px-4 py-2.5 bg-brand hover:bg-brand/90 text-white rounded-md flex items-center gap-2 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                        title={saving ? "Saving in progress..." : "Go back to buildings list"}
                    >
                        <ArrowLeft size={16} />
                        <span>Buildings</span>
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 m-0">
                            {isNew ? "Create New Building" : `Edit Building: ${building.name || "Untitled"}`}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Manage building profile, publishing status, 3D model, and campus coordinates.
                        </p>
                    </div>
                </div>

                {/* Right side: More Features Button - Only appears after we clicked Save All Changes and building is saved */}
                {(!isNew || hasSaved) && (
                    <button
                        type="button"
                        onClick={() => setShowHubModal(true)}
                        className="px-4 py-2.5 bg-brand hover:bg-brand/90 text-white rounded-md flex items-center gap-2 text-xs font-bold transition-colors shadow-xs shrink-0 animate-in fade-in duration-300"
                        title="Open More Features (Panoramas, 3D Hotspots, Quests)"
                    >
                        <Sparkles size={16} />
                        <span>More Features</span>
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* TOP ROW: Left Side (Building Info) & Right Side (3D Model Config) - Equal 50/50 Width & Same Height */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    {/* LEFT COLUMN: Building Information (50% width, equal height) */}
                    <div className="flex flex-col">
                        <div className="bg-white border border-brand-border rounded-md shadow-xs p-6 space-y-4 flex-1 flex flex-col">
                                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-md bg-brand text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                                            1
                                        </span>
                                        <div>
                                            <h2 className="text-base font-bold text-gray-900 leading-tight">
                                                Step 1: Building Information
                                            </h2>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Configure primary identity details and campus map visibility.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Name Input */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Building Name <span className="text-red-500">*</span>
                                        </label>
                                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                                            3–255 chars • Unique
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        name="name"
                                        value={building.name}
                                        onChange={handleChange}
                                        className={`w-full px-3.5 py-2.5 bg-gray-50/70 border ${
                                            errors.name ? "border-red-500 ring-1 ring-red-200" : "border-gray-200"
                                        } rounded-md focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none text-sm font-medium text-gray-900`}
                                        placeholder="e.g. College of Nursing"
                                    />
                                    {errors.name && (
                                        <p className="text-red-500 text-xs mt-1.5 font-medium">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                {/* Description Textarea */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Description <span className="text-gray-400 font-normal lowercase">(optional)</span>
                                        </label>
                                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                                            Max 2,000 chars
                                        </span>
                                    </div>
                                    <textarea
                                        name="description"
                                        value={building.description || ""}
                                        onChange={handleChange}
                                        rows={4}
                                        className={`w-full px-3.5 py-2.5 bg-gray-50/70 border ${
                                            errors.description ? "border-red-500 ring-1 ring-red-200" : "border-gray-200"
                                        } rounded-md focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none resize-y text-sm text-gray-800`}
                                        placeholder="Brief history, key departments housed, or landmark overview..."
                                    />
                                    {errors.description && (
                                        <p className="text-red-500 text-xs mt-1.5 font-medium">
                                            {errors.description}
                                        </p>
                                    )}
                                </div>

                                {/* Publishing Status */}
                                <div className="pt-2 border-t border-gray-100 space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Publishing Status <span className="text-red-500">*</span>
                                        </label>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Select how this building appears to campus visitors and students.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {STATUS_OPTIONS.map((opt) => {
                                            const isSelected = building.status === opt.value;
                                            const Icon = opt.icon;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setIsDirty(true);
                                                        setBuilding((prev) => ({
                                                            ...prev,
                                                            status: opt.value,
                                                        }));
                                                        if (errors.status) {
                                                            setErrors((prev) => ({
                                                                ...prev,
                                                                status: null,
                                                            }));
                                                        }
                                                    }}
                                                    className={`flex flex-col text-left p-3.5 rounded-md border-2 transition-all relative ${
                                                        isSelected
                                                            ? opt.selectedBg
                                                            : `border-gray-200 bg-white hover:bg-gray-50 ${opt.color}`
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between w-full mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                                                    isSelected
                                                                        ? opt.iconBg
                                                                        : "bg-gray-100 text-gray-500"
                                                                }`}
                                                            >
                                                                <Icon size={14} />
                                                            </div>
                                                            <span className="font-bold text-sm text-gray-900">
                                                                {opt.title}
                                                            </span>
                                                        </div>
                                                        {isSelected ? (
                                                            <CheckCircle2
                                                                size={16}
                                                                className="text-brand shrink-0"
                                                            />
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                                {opt.subtitle}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 leading-relaxed mt-1">
                                                        {opt.description}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors.status && (
                                        <p className="text-red-500 text-xs font-medium">
                                            {errors.status}
                                        </p>
                                    )}
                                    <div className="p-3 bg-brand/5 border border-brand/15 rounded-md text-[11px] text-gray-600 flex items-start gap-2 mt-4">
                                        <Info size={14} className="text-brand shrink-0 mt-0.5" />
                                        <span>
                                            {building.status === "DRAFT"
                                                ? "Draft mode is only visible to admins. Campus coordinates below are required for all buildings."
                                                : "Coordinates and perimeter below define this building's live campus location for navigation."}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: 3D Model Configuration (50% width, equal height) */}
                        <div className="flex flex-col">
                            {/* Card: 3D Model Configuration */}
                            <div className="bg-white border border-brand-border rounded-md shadow-xs p-6 space-y-4 flex-1 flex flex-col">
                                    <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-6 h-6 rounded-md bg-brand text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                                                2
                                            </span>
                                            <div>
                                                <h2 className="text-base font-bold text-gray-900 leading-tight">
                                                    Step 2: 3D Model Configuration
                                                </h2>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Interactive 3D model for campus viewer and AR overlays.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Instructions & 3D Compressor Guide */}
                                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-md p-3.5 text-xs text-amber-900 space-y-2">
                                        <div className="flex items-center gap-2 font-bold text-amber-950">
                                            <Info size={14} className="text-amber-700" />
                                            <span>3D Model Guidelines & Compressor Workflow</span>
                                        </div>
                                        <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed text-[11px] text-amber-900">
                                            <li>
                                                <strong>Accepted Formats:</strong> Strictly <code>.glb</code> (recommended binary) or <code>.gltf</code> files up to <strong>500 MB</strong>.
                                            </li>
                                            <li>
                                                <strong>Mobile Optimization Warning:</strong> Heavy models over <strong>25 MB</strong> can cause frame drops, stutter, or crashes during mobile AR.
                                            </li>
                                            <li>
                                                <strong>Using 3D Compressor:</strong> Click <strong>"Open 3D Compressor"</strong> below. Compress geometry (Draco) and resize textures to shrink file size by <strong>up to 90%</strong> without visible quality loss. Download and drop it here.
                                            </li>
                                            <li>
                                                <strong>Generate 2D Thumbnail:</strong> Click <strong>"Generate Thumbnail"</strong> after upload. This creates an instant image preview so mobile lists load without waiting for the full 3D asset.
                                            </li>
                                        </ol>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigate("/compressor", {
                                                    state: {
                                                        fromBuildingId: isNew ? "new" : id,
                                                        fromBuildingName: building.name || (isNew ? "New Facility" : "Building"),
                                                        returnTo: location.pathname,
                                                        buildingDraft: {
                                                            name: building.name,
                                                            description: building.description,
                                                            latitude: building.latitude,
                                                            longitude: building.longitude,
                                                            status: building.status,
                                                            is_active: building.is_active,
                                                            model_version: building.model_version,
                                                            hotspots: building.hotspots,
                                                            primary_department_id: building.primary_department_id,
                                                            department_ids: building.department_ids,
                                                        },
                                                        geofenceDraft: geofence,
                                                    },
                                                });
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand text-xs font-bold rounded-md transition-colors border border-brand/20 cursor-pointer"
                                            title="Open 3D model compression tool for this facility"
                                        >
                                            <Zap size={13} /> Open 3D Compressor
                                        </button>
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
                                                        setErrorMessage(
                                                            "The 3D model exceeds the maximum file size limit of 500 MB."
                                                        );
                                                        setTimeout(
                                                            () => setErrorMessage(""),
                                                            5000
                                                        );
                                                        return;
                                                    }
                                                }
                                                setIsDirty(true);
                                                setBuilding((prev) => ({
                                                    ...prev,
                                                    model_file: file,
                                                    model_active: Boolean(file || prev.model_url),
                                                }));
                                                setThumbnailBlob(null);
                                                setThumbnailPreviewUrl(null);
                                                setIsGeneratingThumbnail(false);
                                            }}
                                            previewNode={
                                                (thumbnailPreviewUrl ||
                                                    building.image_url) &&
                                                !isGeneratingThumbnail ? (
                                                    <div
                                                        style={{
                                                            position: "relative",
                                                            width: "100%",
                                                            height: "200px",
                                                        }}
                                                    >
                                                        <img
                                                            src={
                                                                thumbnailPreviewUrl ||
                                                                building.image_url
                                                            }
                                                            alt="Model Thumbnail"
                                                            className="w-full h-full object-cover rounded-md"
                                                        />
                                                    </div>
                                                ) : modelPreviewUrl &&
                                                  isGeneratingThumbnail ? (
                                                    <div
                                                        style={{
                                                            position: "relative",
                                                            width: "100%",
                                                            height: "200px",
                                                        }}
                                                    >
                                                        <model-viewer
                                                            ref={modelViewerRef}
                                                            src={modelPreviewUrl}
                                                            {...(!modelPreviewUrl.startsWith(
                                                                "blob:"
                                                            ) &&
                                                            !modelPreviewUrl.startsWith(
                                                                "http://localhost"
                                                            )
                                                                ? {
                                                                      crossorigin:
                                                                          "anonymous",
                                                                  }
                                                                : {})}
                                                            auto-rotate
                                                            style={{
                                                                width: "100%",
                                                                height: "100%",
                                                                backgroundColor:
                                                                    "#111827",
                                                                borderRadius: "6px",
                                                            }}
                                                        ></model-viewer>
                                                        {isModelLoading && (
                                                            <div className="absolute inset-0 bg-gray-900/85 flex flex-col items-center justify-center rounded-md z-20">
                                                                <div className="w-[70%] h-1.5 bg-gray-700 rounded-md overflow-hidden">
                                                                    <div
                                                                        ref={progressBarRef}
                                                                        className="h-full bg-brand transition-all duration-200"
                                                                        style={{ width: "0%" }}
                                                                    />
                                                                </div>
                                                                <span
                                                                    ref={progressTextRef}
                                                                    className="mt-2 text-xs font-semibold text-gray-100"
                                                                >
                                                                    Capturing 2D Thumbnail...
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null
                                            }
                                        />

                                        {(building.model_file instanceof File ||
                                            building.model_url) &&
                                            !isGeneratingThumbnail && (
                                                <div className="flex flex-col gap-2.5 mt-1">
                                                    <div className="flex flex-wrap gap-2.5">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleCaptureThumbnail();
                                                            }}
                                                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand/90 text-white font-bold transition-colors shadow-xs rounded-md text-xs"
                                                        >
                                                            <ImageIcon size={15} />
                                                            {thumbnailBlob ||
                                                            building.image_url
                                                                ? "Regenerate Thumbnail"
                                                                : "Generate Thumbnail"}
                                                        </button>

                                                        {building.model_url &&
                                                            !(
                                                                building.model_file instanceof
                                                                File
                                                            ) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setShowHotspotEditor(
                                                                            true
                                                                        )
                                                                    }
                                                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand/90 text-white font-bold transition-colors shadow-xs rounded-md text-xs"
                                                                >
                                                                    <Target size={15} />
                                                                    Edit 3D Hotspots
                                                                </button>
                                                            )}
                                                    </div>
                                                </div>
                                            )}

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                    3D Model Version
                                                </label>
                                                <span className="text-[10px] text-gray-400">
                                                    Optional • e.g. v1.0
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                name="model_version"
                                                value={building.model_version || ""}
                                                onChange={handleChange}
                                                placeholder="e.g. v1.0"
                                                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                        </div>
                </div>

                {/* ROW 2: Campus Geofence & Location (at the bottom of these two, full width) */}
                <div className="bg-white border border-brand-border rounded-md shadow-xs p-6 space-y-4">
                                    <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-6 h-6 rounded-md bg-brand text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                                                3
                                            </span>
                                            <div>
                                                <h2 className="text-base font-bold text-gray-900 leading-tight">
                                                    Step 3: Campus Geofence & Location
                                                </h2>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Exact coordinates and perimeter for navigation and arrival detection.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Instruction Callout for Auto Latitude & Longitude via Map Click */}
                                    <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-md text-xs text-blue-950 flex items-start gap-2.5">
                                        <MapPin size={16} className="text-blue-600 shrink-0 mt-0.5" />
                                        <div className="leading-relaxed">
                                            <p className="font-bold text-blue-950 mb-0.5">
                                                Auto-Fill Coordinates via Interactive Map:
                                            </p>
                                            <p className="text-blue-900 text-[11px]">
                                                Click anywhere on the campus map below to <strong>automatically populate the exact Latitude and Longitude</strong> and position the arrival geofence pin. You can also manually fine-tune the coordinates in the fields below.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Latitude & Longitude (Top of map) */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                    Latitude <span className="text-red-500">*</span>
                                                </label>
                                                <span className="text-[9px] text-gray-400">
                                                    ~6.9122
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                name="latitude"
                                                value={building.latitude}
                                                onChange={handleChange}
                                                step="any"
                                                className={`w-full px-3 py-2 bg-gray-50 border ${
                                                    errors.latitude ? "border-red-500" : "border-gray-200"
                                                } rounded-md focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none text-xs font-mono`}
                                                placeholder="e.g. 6.9045"
                                            />
                                            {errors.latitude && (
                                                <p className="text-red-500 text-[11px] mt-1 font-medium">
                                                    {errors.latitude}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                    Longitude <span className="text-red-500">*</span>
                                                </label>
                                                <span className="text-[9px] text-gray-400">
                                                    ~122.0605
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                name="longitude"
                                                value={building.longitude}
                                                onChange={handleChange}
                                                step="any"
                                                className={`w-full px-3 py-2 bg-gray-50 border ${
                                                    errors.longitude ? "border-red-500" : "border-gray-200"
                                                } rounded-md focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none text-xs font-mono`}
                                                placeholder="e.g. 122.074"
                                            />
                                            {errors.longitude && (
                                                <p className="text-red-500 text-[11px] mt-1 font-medium">
                                                    {errors.longitude}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <GeofenceEditor
                                        value={geofence}
                                        onChange={(newValue) => {
                                            setIsDirty(true);
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

                                {/* Bottom Action */}
                                <div className="flex justify-end pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-3.5 bg-brand hover:bg-brand/90 text-white rounded-md text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={15} />
                                                <span>Save All Changes</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>

            {/* More Features Modal */}
            <Modal
                isOpen={showHubModal}
                onClose={() => setShowHubModal(false)}
                title={`More Features: ${building.name || "Building"}`}
                maxWidth="max-w-4xl w-full"
                footer={
                    <Button
                        variant="secondary"
                        onClick={() => setShowHubModal(false)}
                    >
                        Close
                    </Button>
                }
            >
                <div className="space-y-4">
                    {/* Informational Note Banner */}
                    <div className="p-3.5 bg-brand-light/40 border border-brand/20 rounded-md flex items-start gap-3 text-xs leading-relaxed text-gray-800">
                        <div className="w-6 h-6 rounded-md bg-brand text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <Sparkles size={14} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 mb-0.5">
                                ✓ Building details saved successfully!
                            </p>
                            <p className="text-gray-600 text-xs">
                                This <strong>"More Features"</strong> menu appears after saving so you can immediately configure additional landmark features — including 360° virtual tours, 3D AR hotspots, and gamification quests. You can close this modal at any time and reopen it whenever needed using the <strong>"More Features"</strong> button in the top-right header.
                            </p>
                        </div>
                    </div>

                    {/* Side-by-Side 3-Card Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                        {/* Card 1: 360° Panoramas */}
                        <div className="bg-gray-50/80 hover:bg-white border border-gray-200 hover:border-brand/40 rounded-md p-4 flex flex-col justify-between transition-all shadow-2xs hover:shadow-xs group">
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                                        <Camera size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md uppercase tracking-wider">
                                        Virtual Tour
                                    </span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900 mt-3 group-hover:text-brand transition-colors">
                                    360° Virtual Tour
                                </h4>
                                <p className="text-xs text-gray-500 leading-relaxed mt-1.5">
                                    Upload and link 360° equirectangular panoramas to create an immersive indoor walkthrough of classrooms, labs, and corridors.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowHubModal(false);
                                    navigate(`/panoramas/${id}`);
                                }}
                                className="mt-4 w-full py-2.5 px-3 bg-brand hover:bg-brand/90 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                            >
                                <span>Manage Panoramas</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        {/* Card 2: 3D Model Hotspots */}
                        <div className="bg-gray-50/80 hover:bg-white border border-gray-200 hover:border-brand/40 rounded-md p-4 flex flex-col justify-between transition-all shadow-2xs hover:shadow-xs group">
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                        <Box size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md uppercase tracking-wider">
                                        AR Discovery
                                    </span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900 mt-3 group-hover:text-brand transition-colors">
                                    3D Model Hotspots
                                </h4>
                                <p className="text-xs text-gray-500 leading-relaxed mt-1.5">
                                    Pin informational markers and POIs directly onto the 3D building model. Visitors scanning in AR tap hotspots to reveal history and details.
                                </p>
                            </div>
                            {building.model_url || building.model_file ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowHubModal(false);
                                        setShowHotspotEditor(true);
                                    }}
                                    className="mt-4 w-full py-2.5 px-3 bg-brand hover:bg-brand/90 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                                >
                                    <span>Edit 3D Hotspots</span>
                                    <ChevronRight size={14} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled
                                    className="mt-4 w-full py-2.5 px-3 bg-gray-200 text-gray-400 rounded-md text-xs font-semibold cursor-not-allowed"
                                    title="Upload a 3D model in the editor first"
                                >
                                    <span>Upload 3D File First</span>
                                </button>
                            )}
                        </div>

                        {/* Card 3: Quests, Trivias & Quizzes */}
                        <div className="bg-gray-50/80 hover:bg-white border border-gray-200 hover:border-brand/40 rounded-md p-4 flex flex-col justify-between transition-all shadow-2xs hover:shadow-xs group">
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                        <MonitorPlay size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md uppercase tracking-wider">
                                        Gamification
                                    </span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900 mt-3 group-hover:text-brand transition-colors">
                                    Quests & Trivias
                                </h4>
                                <p className="text-xs text-gray-500 leading-relaxed mt-1.5">
                                    Create scavenger challenges, landmark trivia questions, and multiple-choice quizzes that reward students when arriving at this building.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowHubModal(false);
                                    navigate(`/cms?buildingId=${id}`);
                                }}
                                className="mt-4 w-full py-2.5 px-3 bg-brand hover:bg-brand/90 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                            >
                                <span>Manage Quests & Trivias</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Unsaved Changes Confirmation Modal */}
            <Modal
                isOpen={showUnsavedModal}
                onClose={() => setShowUnsavedModal(false)}
                title="Unsaved Changes Warning"
                variant="danger"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setShowUnsavedModal(false)}
                        >
                            Stay & Keep Editing
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                setIsDirty(false);
                                setShowUnsavedModal(false);
                                navigate("/buildings");
                            }}
                        >
                            Discard & Leave
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <p className="text-sm text-gray-700 leading-relaxed font-medium">
                        You have unsaved changes on this building record.
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        If you go back now, your entered details, coordinates, and uploads will be discarded. Please save your changes before leaving if you want to keep them.
                    </p>
                </div>
            </Modal>

            {/* Fullscreen Hotspot Editor Modal */}
            {showHotspotEditor && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "#f8fafc",
                        zIndex: 9999,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <div className="px-6 py-3.5 flex justify-between items-center bg-brand border-b border-white/15">
                        <div>
                            <h2 className="text-white m-0 text-base font-bold tracking-wide">
                                Interactive 3D Hotspot Editor: {building.name}
                            </h2>
                            <p className="text-white/80 m-0 mt-0.5 text-xs">
                                Double-click anywhere on the model to place or edit an information hotspot.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowHotspotEditor(false)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-bold text-xs transition-colors"
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
