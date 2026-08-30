import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "@google/model-viewer";
import {
    Box,
    UploadCloud,
    Sliders,
    Zap,
    Sparkles,
    ShieldCheck,
    Download,
    Building2,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
    Layers,
    Image as ImageIcon,
    Cpu,
    ArrowRight,
    Terminal,
    ChevronDown,
    ChevronUp,
    FileCode,
    Check,
} from "lucide-react";
import { Card, Badge, Button } from "../components/ui";
import { compressorService } from "../services/compressorService";

const PRESETS = [
    {
        id: "balanced",
        name: "Mobile AR Balanced",
        icon: Zap,
        badge: "Recommended",
        description: "Optimal balance of visual fidelity and speed for mobile AR & 3D maps.",
        stats: "~90% - 95% reduction",
        settings: { simplify_ratio: 0.5, max_texture_size: 1024, use_draco: true },
    },
    {
        id: "extreme",
        name: "Extreme Compression",
        icon: Sparkles,
        badge: "Under 10MB",
        description: "Aggressive reduction designed for slow mobile network connections.",
        stats: "~95% - 98% reduction",
        settings: { simplify_ratio: 0.25, max_texture_size: 512, use_draco: true },
    },
    {
        id: "high_fidelity",
        name: "High-Fidelity 3D",
        icon: ShieldCheck,
        badge: "Accreditor VR",
        description: "Preserves fine architectural details and 2K textures with clean PBR.",
        stats: "~75% - 85% reduction",
        settings: { simplify_ratio: 0.85, max_texture_size: 2048, use_draco: true },
    },
    {
        id: "custom",
        name: "Custom Tuning",
        icon: Sliders,
        badge: "Advanced",
        description: "Manually adjust triangle decimation, texture limits, and Draco parameters.",
        stats: "User Configured",
        settings: {},
    },
];

export default function ModelCompressorPage() {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [preset, setPreset] = useState("balanced");
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Advanced tuning parameters
    const [simplifyRatio, setSimplifyRatio] = useState(0.5);
    const [maxTextureSize, setMaxTextureSize] = useState(1024);
    const [useDraco, setUseDraco] = useState(true);
    const [forceDoubleSided, setForceDoubleSided] = useState(true);
    const [forceOpaque, setForceOpaque] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Execution state
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingStep, setProcessingStep] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Building Assignment / Navigation
    const [buildings, setBuildings] = useState([]);
    const [selectedBuildingId, setSelectedBuildingId] = useState("");
    const [isAssigning, setIsAssigning] = useState(false);
    const [assignSuccess, setAssignSuccess] = useState(false);

    useEffect(() => {
        compressorService.getBuildings()
            .then((data) => setBuildings(data || []))
            .catch((err) => console.error("Failed to fetch buildings for compressor", err));
    }, []);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    const validateAndSetFile = (file) => {
        setError(null);
        setResult(null);
        setAssignSuccess(false);

        if (!file.name.toLowerCase().endsWith(".glb") && !file.name.toLowerCase().endsWith(".gltf")) {
            setError("Only .GLB and .GLTF 3D files are supported.");
            return;
        }

        setSelectedFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return "0 B";
        if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${bytes} B`;
    };

    const handleCompress = async () => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setUploadProgress(0);
        setError(null);
        setResult(null);
        setAssignSuccess(false);
        setProcessingStep("Uploading 3D Model to Server...");

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("preset", preset);

        if (preset === "custom") {
            formData.append("simplify_ratio", simplifyRatio);
            formData.append("max_texture_size", maxTextureSize || "");
            formData.append("use_draco", useDraco);
            formData.append("force_double_sided", forceDoubleSided);
            formData.append("force_opaque", forceOpaque);
        } else {
            const activePreset = PRESETS.find((p) => p.id === preset);
            if (activePreset && activePreset.settings) {
                formData.append("simplify_ratio", activePreset.settings.simplify_ratio);
                formData.append("max_texture_size", activePreset.settings.max_texture_size);
                formData.append("use_draco", activePreset.settings.use_draco);
                formData.append("force_double_sided", true);
                formData.append("force_opaque", true);
            }
        }

        try {
            const data = await compressorService.compressModel(formData, (percent) => {
                setUploadProgress(percent);
                if (percent >= 100) {
                    setProcessingStep("Processing Geometry & Draco Compression...");
                }
            });

            setResult(data);
        } catch (err) {
            console.error("Compression error:", err);
            setError(err.response?.data?.error?.message || err.message || "Compression failed. Please check server logs.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenInBuildingEditor = () => {
        if (!selectedBuildingId || !result?.download_url) return;

        const targetPath = selectedBuildingId === "new" ? "/buildings/new" : `/buildings/${selectedBuildingId}`;
        navigate(targetPath, {
            state: {
                compressedModelUrl: result.download_url,
                compressedModelFilename: result.output_filename,
                fromCompressor: true,
            }
        });
    };

    const resetForm = () => {
        setSelectedFile(null);
        setResult(null);
        setError(null);
        setAssignSuccess(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200/80 rounded-md p-6 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-brand/10 text-brand">
                            <Box size={22} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-display">
                            3D Model Compressor
                        </h1>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Optimize heavy CAD and SketchUp models (up to 2 GB+) into high-performance, mobile-ready .GLB files for spatial AR.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
                    <span className="px-2.5 py-1 bg-gray-100 rounded-md flex items-center gap-1.5 border border-gray-200">
                        <Cpu size={13} className="text-brand" /> Google Draco
                    </span>
                    <span className="px-2.5 py-1 bg-gray-100 rounded-md flex items-center gap-1.5 border border-gray-200">
                        <ImageIcon size={13} className="text-blue-600" /> Texture Rescaling
                    </span>
                    <span className="px-2.5 py-1 bg-gray-100 rounded-md flex items-center gap-1.5 border border-gray-200">
                        <Layers size={13} className="text-purple-600" /> Mesh Decimation
                    </span>
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3 text-red-700 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold">Compression Error</p>
                        <p className="text-xs mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Main Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Upload & Config Controls (7 Columns) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Drag & Drop Upload Card */}
                    <Card className="rounded-md">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
                            <UploadCloud size={16} className="text-brand" />
                            1. Select or Drop 3D Model
                        </h3>

                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-all ${
                                isDragging
                                    ? "border-brand bg-brand/5 scale-[0.99]"
                                    : selectedFile
                                    ? "border-emerald-400 bg-emerald-50/30"
                                    : "border-gray-300 hover:border-brand/60 bg-gray-50/50"
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".glb,.gltf"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {selectedFile ? (
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                                        <FileCode size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 truncate max-w-md mx-auto">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                                            Original Size: {formatBytes(selectedFile.size)}
                                        </p>
                                    </div>
                                    <p className="text-[11px] text-gray-400">Click or drop another file to replace</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto shadow-sm">
                                        <UploadCloud size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">
                                            Drag & Drop your 3D Model here
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Supports large .GLB and .GLTF files (up to 2 GB+)
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="text-xs font-bold text-brand bg-white border border-brand/30 px-3 py-1.5 rounded-md hover:bg-brand hover:text-white transition-colors"
                                    >
                                        Browse Computer
                                    </button>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Compression Preset Selector */}
                    <Card className="rounded-md">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
                            <Sliders size={16} className="text-brand" />
                            2. Choose Optimization Preset
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {PRESETS.map((p) => {
                                const Icon = p.icon;
                                const isSelected = preset === p.id;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => {
                                            setPreset(p.id);
                                            if (p.id === "custom") setShowAdvanced(true);
                                        }}
                                        className={`p-3.5 rounded-md border text-left cursor-pointer transition-all ${
                                            isSelected
                                                ? "border-brand bg-brand/5 shadow-sm ring-1 ring-brand"
                                                : "border-gray-200 hover:border-gray-300 bg-white"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`p-1.5 rounded-md ${
                                                        isSelected ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
                                                    }`}
                                                >
                                                    <Icon size={14} />
                                                </div>
                                                <span className="text-xs font-bold text-gray-900">{p.name}</span>
                                            </div>
                                            <span
                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                    isSelected ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
                                                }`}
                                            >
                                                {p.badge}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">
                                            {p.description}
                                        </p>
                                        <p className="text-[10px] font-bold text-brand mt-2">{p.stats}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Custom Advanced Settings Toggle */}
                        {preset === "custom" && (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-800">Advanced Parameter Tuning</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="text-xs font-bold text-brand flex items-center gap-1 hover:underline"
                                    >
                                        {showAdvanced ? "Hide Controls" : "Show Controls"}{" "}
                                        {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                </div>

                                {showAdvanced && (
                                    <div className="space-y-4 bg-gray-50/80 p-3.5 rounded-md border border-gray-200/80">
                                        {/* Geometry Quality & Detail Slider */}
                                        <div>
                                            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                                                <span>Geometry Quality:</span>
                                                <span className="font-bold text-brand">
                                                    {Math.round(simplifyRatio * 100)}% Detail Kept {simplifyRatio < 1.0 ? `(${Math.round((1 - simplifyRatio) * 100)}% simplified)` : "(Original)"}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="1.0"
                                                step="0.05"
                                                value={simplifyRatio}
                                                onChange={(e) => setSimplifyRatio(parseFloat(e.target.value))}
                                                className="w-full accent-brand cursor-pointer"
                                            />
                                            <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-0.5">
                                                <span>10% (Max Compression)</span>
                                                <span>100% (Original Fidelity)</span>
                                            </div>
                                        </div>

                                        {/* Max Texture Size Dropdown */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                Max Texture Resolution:
                                            </label>
                                            <select
                                                value={maxTextureSize}
                                                onChange={(e) => setMaxTextureSize(parseInt(e.target.value))}
                                                className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-xs font-medium text-gray-800 outline-none focus:border-brand"
                                            >
                                                <option value="512">512 x 512 px (Ultra-Low Memory)</option>
                                                <option value="1024">1024 x 1024 px (Standard Mobile AR)</option>
                                                <option value="2048">2048 x 2048 px (High Definition)</option>
                                                <option value="4096">4096 x 4096 px (Original 4K)</option>
                                            </select>
                                        </div>

                                        {/* Toggles */}
                                        <div className="space-y-2 pt-2 border-t border-gray-200">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={useDraco}
                                                    onChange={(e) => setUseDraco(e.target.checked)}
                                                    className="accent-brand rounded"
                                                />
                                                <span className="text-xs text-gray-700 font-medium">
                                                    Apply Google Draco Mesh Compression
                                                </span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={forceDoubleSided}
                                                    onChange={(e) => setForceDoubleSided(e.target.checked)}
                                                    className="accent-brand rounded"
                                                />
                                                <span className="text-xs text-gray-700 font-medium">
                                                    Enforce Double-Sided Materials (fixes invisible walls)
                                                </span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={forceOpaque}
                                                    onChange={(e) => setForceOpaque(e.target.checked)}
                                                    className="accent-brand rounded"
                                                />
                                                <span className="text-xs text-gray-700 font-medium">
                                                    Force Solid Opaque Alphas on Non-Glass Surfaces
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Compression Button */}
                        <div className="mt-5">
                            <Button
                                onClick={handleCompress}
                                disabled={!selectedFile || isProcessing}
                                loading={isProcessing}
                                className="w-full py-3 text-sm font-bold shadow-md flex items-center justify-center gap-2"
                            >
                                <Zap size={16} />
                                {isProcessing ? "Optimizing 3D Model..." : "Compress & Optimize 3D Model"}
                            </Button>
                        </div>

                        {/* Progress Bar */}
                        {isProcessing && (
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between text-xs font-semibold text-gray-600">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
                                        {processingStep}
                                    </span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-brand h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column: Live 3D Inspector & Results Analysis (5 Columns) */}
                <div className="lg:col-span-5 space-y-6">
                    {result ? (
                        <Card className="rounded-md space-y-5 border-emerald-200/80 shadow-md">
                            {/* Header Stats */}
                            <div className="flex items-start justify-between gap-3 min-w-0">
                                <div className="min-w-0 flex-1">
                                    <Badge variant="brand" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                        Optimization Complete ✓
                                    </Badge>
                                    <h3
                                        className="text-sm md:text-base font-bold text-gray-900 mt-1.5 break-all leading-snug"
                                        title={result.output_filename}
                                    >
                                        {result.output_filename}
                                    </h3>
                                </div>
                                <span className="text-2xl font-extrabold text-emerald-600 tracking-tight shrink-0">
                                    -{result.reduction_percentage}%
                                </span>
                            </div>

                            {/* Before & After Metrics Grid */}
                            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-md border border-gray-100 text-center">
                                <div className="p-2 bg-white rounded border border-gray-200">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Original Size
                                    </p>
                                    <p className="text-base font-bold text-gray-700 mt-0.5">
                                        {result.original_size_display}
                                    </p>
                                </div>

                                <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                        Optimized Size
                                    </p>
                                    <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                                        {result.compressed_size_display}
                                    </p>
                                </div>
                            </div>

                            {/* Interactive 3D Model Viewer */}
                            <div className="border border-gray-200 rounded-md overflow-hidden bg-gray-900 h-[260px] relative group">
                                <model-viewer
                                    src={result.download_url}
                                    alt="Compressed 3D Model Preview"
                                    camera-controls
                                    auto-rotate
                                    shadow-intensity="1"
                                    exposure="1"
                                    style={{ width: "100%", height: "100%" }}
                                ></model-viewer>
                                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
                                    Interactive 3D Preview
                                </div>
                            </div>

                            {/* Actions Bar */}
                            <div className="space-y-3 pt-2">
                                <a
                                    href={`${result.download_url}${result.download_url?.includes('?') ? '&' : '?'}download=true`}
                                    download={result.output_filename}
                                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-sm transition-all text-xs"
                                >
                                    <Download size={14} /> Download Optimized .GLB
                                </a>

                                {/* Open & Review in Building Editor */}
                                <div className="p-3.5 bg-brand/5 border border-brand/20 rounded-md space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-bold text-brand">
                                            Attach & Review in Building Editor:
                                        </label>
                                        <span className="text-[10px] text-gray-500 font-medium">
                                            Generates 2D thumbnail before saving
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedBuildingId}
                                            onChange={(e) => setSelectedBuildingId(e.target.value)}
                                            className="flex-1 bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-brand"
                                        >
                                            <option value="">Select a campus facility...</option>
                                            <option value="new">+ Create as New Campus Building</option>
                                            {buildings.length > 0 && (
                                                <optgroup label="── Existing Facilities ──">
                                                    {buildings.map((b) => (
                                                        <option key={b.id} value={b.id}>
                                                            {b.name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                        <Button
                                            onClick={handleOpenInBuildingEditor}
                                            disabled={!selectedBuildingId || isAssigning}
                                            loading={isAssigning}
                                            size="sm"
                                            className="shrink-0"
                                        >
                                            Open in Editor →
                                        </Button>
                                    </div>
                                </div>

                                <button
                                    onClick={resetForm}
                                    className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <RotateCcw size={13} /> Compress Another Model
                                </button>
                            </div>

                            {/* Execution Terminal Logs */}
                            {result.logs && result.logs.length > 0 && (
                                <div className="pt-2">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Terminal size={12} /> Optimization Steps Log:
                                    </p>
                                    <div className="bg-gray-900 text-emerald-400 p-2.5 rounded text-[10px] font-mono space-y-1 max-h-32 overflow-y-auto">
                                        {result.logs.map((log, i) => (
                                            <div key={i} className="leading-relaxed">
                                                &gt; {log}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    ) : (
                        <Card className="rounded-md h-full flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-2">
                                    <Sparkles size={16} className="text-brand" />
                                    Optimization Pipeline Highlights
                                </h3>
                                <p className="text-xs text-gray-500 mb-6">
                                    Here is how ARQuest transforms heavy 1GB raw models into instant-loading assets:
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md border border-gray-100">
                                        <div className="p-2 rounded bg-purple-100 text-purple-700 shrink-0">
                                            <Layers size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-900">Mesh Decimation & Indexing</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Reduces polygon count by up to 75% using Meshoptimizer without distorting the architectural silhouette.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md border border-gray-100">
                                        <div className="p-2 rounded bg-blue-100 text-blue-700 shrink-0">
                                            <ImageIcon size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-900">Lanczos3 Texture Downscaling</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Converts heavy 4K/8K uncompressed textures to high-speed 1024px mobile-friendly textures.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md border border-gray-100">
                                        <div className="p-2 rounded bg-brand/10 text-brand shrink-0">
                                            <Cpu size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-900">Google Draco Quantization</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Compresses vertex buffers, normals, and UV coordinates by up to 90% for instant over-the-air streaming.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-brand/5 border border-brand/20 rounded-md text-xs text-gray-700 mt-6">
                                <p className="font-bold text-brand mb-1">💡 Pro Tip for 3D Modelers:</p>
                                <p className="text-[11px] text-gray-600">
                                    You can export directly from SketchUp or Blender without manually decimating in CAD. The compressor handles all material standardization and geometry welding automatically.
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
