import {
    Search,
    Filter,
    Plus,
    Building2,
    Edit3,
    Trash2,
    QrCode,
    X,
    Download,
    Box,
    MapPin,
    RotateCcw,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Card,
    Badge,
    Button,
    ConfirmDeleteModal,
    Pagination,
} from "../components/ui";
import { buildingService } from "../services/buildingService";
import { QRCodeCanvas } from "qrcode.react";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const getFullUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
};

function QRCodeModal({ isOpen, onClose, building }) {
    if (!isOpen || !building) return null;

    const handleDownload = () => {
        const canvas = document.getElementById("building-qr-code");
        if (!canvas) return;
        const pngUrl = canvas
            .toDataURL("image/png")
            .replace("image/png", "image/octet-stream");
        let downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${building.name}-QR.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-md shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-brand-border bg-gray-50/50">
                    <h3 className="font-bold text-lg text-gray-900">
                        Building QR Code
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-8 flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-md border border-gray-100 shadow-sm inline-block">
                        <QRCodeCanvas
                            id="building-qr-code"
                            value={building.qr_code_secret || "missing-secret"}
                            size={200}
                            level="H"
                            includeMargin={true}
                        />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="font-bold text-gray-900">
                            {building.name}
                        </p>
                        <p className="text-xs text-gray-500">
                            Scan to instantly unlock via ARQuest
                        </p>
                    </div>
                    <Button
                        onClick={handleDownload}
                        className="w-full mt-2 flex items-center justify-center gap-2"
                    >
                        <Download size={16} />
                        Download QR Code
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function BuildingsPage() {
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [buildingToDelete, setBuildingToDelete] = useState(null);
    const [selectedBuildingForQr, setSelectedBuildingForQr] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [visibilityFilter, setVisibilityFilter] = useState("all");
    const [searchParams, setSearchParams] = useSearchParams();

    const getInitialPage = () => {
        const urlPage = searchParams.get("page");
        if (urlPage) {
            const parsed = parseInt(urlPage, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        const savedPage = sessionStorage.getItem("buildings_page");
        if (savedPage) {
            const parsed = parseInt(savedPage, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return 1;
    };

    const [currentPage, setCurrentPage] = useState(getInitialPage);
    const itemsPerPage = 8;
    const isFirstRender = useRef(true);
    const prevFiltersRef = useRef({ searchTerm, statusFilter, visibilityFilter });
    const navigate = useNavigate();

    const handlePageChange = (page) => {
        setCurrentPage(page);
        sessionStorage.setItem("buildings_page", page.toString());
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                if (page === 1) {
                    next.delete("page");
                } else {
                    next.set("page", page.toString());
                }
                return next;
            },
            { replace: true }
        );
    };

    useEffect(() => {
        loadBuildings();
    }, []);

    const loadBuildings = async () => {
        setLoading(true);
        try {
            const data = await buildingService.getBuildings();

            const mapped = data.map((b) => ({
                id: b.id,
                name: b.name,
                code: b.slug,
                description: b.description || "",
                image_url: b.image_url,
                model_url: b.model_url,
                has_model: !!(b.model_file || b.model_url),
                lat: b.latitude,
                lng: b.longitude,
                status: b.is_active ? "active" : "inactive",
                status_display: b.status,
                qr_code_secret: b.qr_code_secret,
            }));
            setBuildings(mapped);
        } catch (err) {
            console.error("Failed to load buildings", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddClick = () => {
        navigate("/buildings/new");
    };

    const handleEditClick = (building) => {
        navigate(`/buildings/${building.id}`);
    };

    const handleDeleteClick = (id) => {
        setBuildingToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (buildingToDelete) {
            try {
                await buildingService.deleteBuilding(buildingToDelete);
                setIsDeleteModalOpen(false);
                setBuildingToDelete(null);
                await loadBuildings();
            } catch (err) {
                console.error("Failed to delete building", err);
            }
        }
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setVisibilityFilter("all");
    };

    const hasActiveFilters =
        searchTerm !== "" || statusFilter !== "all" || visibilityFilter !== "all";

    const filteredBuildings = buildings.filter((b) => {
        const matchesSearch =
            b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (b.code && b.code.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus =
            statusFilter === "all" || b.status === statusFilter;
        const matchesVisibility =
            visibilityFilter === "all" || b.status_display === visibilityFilter;
        return matchesSearch && matchesStatus && matchesVisibility;
    });

    const totalPages = Math.ceil(filteredBuildings.length / itemsPerPage);
    const paginatedBuildings = filteredBuildings.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const prev = prevFiltersRef.current;
        if (
            prev.searchTerm !== searchTerm ||
            prev.statusFilter !== statusFilter ||
            prev.visibilityFilter !== visibilityFilter
        ) {
            prevFiltersRef.current = { searchTerm, statusFilter, visibilityFilter };
            handlePageChange(1);
        }
    }, [searchTerm, statusFilter, visibilityFilter]);

    useEffect(() => {
        if (!loading && totalPages > 0 && currentPage > totalPages) {
            handlePageChange(totalPages);
        }
    }, [loading, totalPages, currentPage]);

    useEffect(() => {
        const urlPage = searchParams.get("page");
        if (urlPage) {
            const parsed = parseInt(urlPage, 10);
            if (!isNaN(parsed) && parsed > 0 && parsed !== currentPage) {
                setCurrentPage(parsed);
                sessionStorage.setItem("buildings_page", parsed.toString());
            }
        }
    }, [searchParams]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Buildings
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Manage campus buildings, coordinates, and content.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <Button
                        onClick={handleAddClick}
                        className="gap-2 justify-center shadow-sm"
                    >
                        <Plus size={18} />
                        Add Building
                    </Button>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <Card noPadding className="p-4 bg-white">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search buildings by name or code..."
                            className="w-full pl-10 pr-4 py-2 bg-brand-light/30 border border-brand-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand transition-all font-medium text-gray-800 placeholder-gray-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative w-full md:w-48">
                        <select
                            value={visibilityFilter}
                            onChange={(e) =>
                                setVisibilityFilter(e.target.value)
                            }
                            className="w-full pl-4 pr-10 py-2 bg-white border border-brand-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand appearance-none font-bold text-gray-700 shadow-sm cursor-pointer"
                        >
                            <option value="all">All Visibility</option>
                            <option value="VISIBLE">Visible</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="HIDDEN">Hidden</option>
                            <option value="DRAFT">Draft</option>
                        </select>
                        <Filter
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand pointer-events-none"
                            size={16}
                        />
                    </div>
                    <div className="relative w-full md:w-48">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 bg-white border border-brand-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand appearance-none font-bold text-gray-700 shadow-sm cursor-pointer"
                        >
                            <option value="all">All Operations</option>
                            <option value="active">Active/Open</option>
                            <option value="inactive">Closed/Inactive</option>
                        </select>
                        <Filter
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand pointer-events-none"
                            size={16}
                        />
                    </div>
                </div>
            </Card>

            {/* Results count & status */}
            {!loading && (
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 px-1">
                    <span>
                        Showing {paginatedBuildings.length} of{" "}
                        {filteredBuildings.length}{" "}
                        {filteredBuildings.length === 1
                            ? "building"
                            : "buildings"}
                    </span>
                    {hasActiveFilters && (
                        <button
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1 text-brand hover:underline font-bold"
                        >
                            <RotateCcw size={12} />
                            Reset Filters
                        </button>
                    )}
                </div>
            )}

            {/* Content / Card Grid */}
            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium text-gray-500">
                        Loading buildings...
                    </p>
                </div>
            ) : filteredBuildings.length === 0 ? (
                <Card className="text-center py-12 px-4 flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-md bg-brand-light flex items-center justify-center text-brand mb-3">
                        <Building2 size={28} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">
                        No buildings found
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-sm">
                        {hasActiveFilters
                            ? "No buildings match your current search and filter criteria. Try adjusting or resetting them."
                            : "You haven't added any buildings yet. Add your first building to get started."}
                    </p>
                    {hasActiveFilters ? (
                        <Button
                            variant="secondary"
                            onClick={handleResetFilters}
                            className="mt-4 gap-2 text-xs"
                        >
                            <RotateCcw size={14} />
                            Reset Filters
                        </Button>
                    ) : (
                        <Button
                            onClick={handleAddClick}
                            className="mt-4 gap-2 text-xs"
                        >
                            <Plus size={14} />
                            Add Building
                        </Button>
                    )}
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginatedBuildings.map((b) => (
                            <Card
                                key={b.id}
                                className="group cursor-pointer hover:border-brand hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden p-4"
                                onClick={() => handleEditClick(b)}
                            >
                                <div>
                                    {/* Media Thumbnail */}
                                    <div className="aspect-video bg-gray-100 rounded-md mb-3.5 flex items-center justify-center relative overflow-hidden">
                                        {b.image_url ? (
                                            <img
                                                src={getFullUrl(b.image_url)}
                                                alt={b.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                                                <Building2
                                                    size={34}
                                                    className="text-gray-300 mb-1"
                                                />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    No Image
                                                </span>
                                            </div>
                                        )}

                                        {/* Status badges */}
                                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
                                            <Badge
                                                variant={
                                                    b.status === "active"
                                                        ? "success"
                                                        : "gray"
                                                }
                                                className="shadow-sm backdrop-blur-sm"
                                            >
                                                {b.status === "active"
                                                    ? "Active"
                                                    : "Closed"}
                                            </Badge>
                                        </div>

                                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-none">
                                            <Badge
                                                variant={
                                                    b.status_display ===
                                                    "VISIBLE"
                                                        ? "brand"
                                                        : b.status_display ===
                                                          "MAINTENANCE"
                                                        ? "warning"
                                                        : b.status_display ===
                                                          "HIDDEN"
                                                        ? "danger"
                                                        : "gray"
                                                }
                                                className="shadow-sm backdrop-blur-sm"
                                            >
                                                {b.status_display ===
                                                "VISIBLE"
                                                    ? "Visible"
                                                    : b.status_display ===
                                                      "MAINTENANCE"
                                                    ? "Maintenance"
                                                    : b.status_display ===
                                                      "HIDDEN"
                                                    ? "Hidden"
                                                    : "Draft"}
                                            </Badge>
                                        </div>

                                        {b.has_model && (
                                            <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                                                <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide">
                                                    <Box size={10} /> 3D Model
                                                </span>
                                            </div>
                                        )}

                                        {/* Hover Overlay Button */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center pointer-events-none">
                                            <div className="opacity-0 group-hover:opacity-100 bg-white/95 backdrop-blur-sm text-brand font-bold text-xs px-3.5 py-1.5 rounded-md transition-all duration-200 shadow-md transform translate-y-2 group-hover:translate-y-0 flex items-center gap-1.5">
                                                <Edit3 size={13} />
                                                <span>Edit Building</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Building Details */}
                                    <div>
                                        <h3
                                            className="font-bold text-gray-900 group-hover:text-brand transition-colors text-base truncate"
                                            title={b.name}
                                        >
                                            {b.name}
                                        </h3>
                                        {b.lat && b.lng ? (
                                            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-gray-500">
                                                <MapPin
                                                    size={12}
                                                    className="text-gray-400 shrink-0"
                                                />
                                                <span>
                                                    {Number(b.lat).toFixed(5)}, {Number(b.lng).toFixed(5)}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-400 italic">
                                                <MapPin
                                                    size={12}
                                                    className="text-gray-300 shrink-0"
                                                />
                                                <span>No coordinates set</span>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2 line-clamp-2 min-h-[2rem]">
                                            {b.description ||
                                                "No description provided."}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditClick(b);
                                        }}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand/80 transition-colors"
                                    >
                                        <Edit3 size={13} />
                                        Edit
                                    </button>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedBuildingForQr(b);
                                                setIsQrModalOpen(true);
                                            }}
                                            title="Download QR Code"
                                            className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light rounded-md transition-colors"
                                        >
                                            <QrCode size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClick(b.id);
                                            }}
                                            title="Move to Archive"
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-4">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    )}
                </>
            )}

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Move to Archive"
                message="This building will be moved to the Archive and permanently deleted after 30 days."
            />

            <QRCodeModal
                isOpen={isQrModalOpen}
                onClose={() => setIsQrModalOpen(false)}
                building={selectedBuildingForQr}
            />
        </div>
    );
}
