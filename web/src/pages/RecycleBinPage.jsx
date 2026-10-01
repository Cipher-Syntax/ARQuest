import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { recycleBinService } from "../services/recycleBinService";
import { Card, Button, ConfirmDeleteModal, Pagination, Badge } from "../components/ui";
import {
    Trash2,
    Building2,
    Users,
    Target,
    HelpCircle,
    Search,
    AlertTriangle,
    Clock,
    RotateCcw,
    Layers,
    CheckCircle2,
    Info,
    ChevronDown,
} from "lucide-react";

const CATEGORIES = [
    { key: "all", label: "All Items", icon: Layers },
    { key: "buildings", label: "Buildings", icon: Building2 },
    { key: "visitors", label: "Visitors", icon: Users },
    { key: "quests", label: "Quests", icon: Target },
    { key: "trivias", label: "Trivias", icon: HelpCircle },
];

export default function RecycleBinPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "all";

    const [data, setData] = useState({
        all: [],
        buildings: [],
        visitors: [],
        quests: [],
        trivias: [],
    });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [feedbackMessage, setFeedbackMessage] = useState(null);

    // Modal state for permanent deletion
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const itemsPerPage = 8;

    useEffect(() => {
        loadRecycleBin();
    }, []);

    const loadRecycleBin = async () => {
        setLoading(true);
        try {
            const result = await recycleBinService.getAllArchived();
            setData(result);
        } catch (error) {
            console.error("Failed to load recycle bin items:", error);
            showFeedback("Failed to load recycle bin items. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    const showFeedback = (text, type = "success") => {
        setFeedbackMessage({ text, type });
        setTimeout(() => setFeedbackMessage(null), 4000);
    };

    const handleTabChange = (key) => {
        setSearchParams(key === "all" ? {} : { tab: key });
        setCurrentPage(1);
    };

    const handleRestore = async (item) => {
        setActionLoading(true);
        try {
            await recycleBinService.restoreItem(item.itemType, item.id);
            showFeedback(`"${item.title}" has been restored successfully.`);
            await loadRecycleBin();
        } catch (error) {
            console.error("Restore failed:", error);
            showFeedback(`Failed to restore "${item.title}". Please try again.`, "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleHardDeleteClick = (item) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setActionLoading(true);
        try {
            await recycleBinService.hardDeleteItem(itemToDelete.itemType, itemToDelete.id);
            showFeedback(`"${itemToDelete.title}" was permanently removed.`);
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            await loadRecycleBin();
        } catch (error) {
            console.error("Permanent delete failed:", error);
            showFeedback(`Failed to permanently delete item.`, "error");
        } finally {
            setActionLoading(false);
        }
    };

    const getDaysLeft = (deletedAt) => {
        if (!deletedAt) return 30;
        const deletedDate = new Date(deletedAt);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate - deletedDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const daysLeft = 30 - diffDays;
        return daysLeft > 0 ? daysLeft : 0;
    };

    // Filter current list by category tab and search query
    const currentList = useMemo(() => {
        const sourceList = data[activeTab] || data.all || [];
        if (!searchTerm.trim()) return sourceList;

        const term = searchTerm.toLowerCase();
        return sourceList.filter(
            (item) =>
                item.title?.toLowerCase().includes(term) ||
                item.subtitle?.toLowerCase().includes(term) ||
                item.itemType?.toLowerCase().includes(term)
        );
    }, [data, activeTab, searchTerm]);

    const totalPages = Math.ceil(currentList.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        return currentList.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [currentList, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    const getItemTypeBadge = (type) => {
        switch (type) {
            case "building":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Building2 size={11} /> Building
                    </span>
                );
            case "visitor":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Users size={11} /> Visitor
                    </span>
                );
            case "quest":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Target size={11} /> Quest
                    </span>
                );
            case "trivia":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <HelpCircle size={11} /> Trivia
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 text-gray-700 border border-gray-200">
                        {type}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                    <Trash2 className="text-brand" size={26} />
                    Recycle Bin
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                    Review, restore, or permanently remove deleted campus entities. Items are retained for 30 days before permanent purging.
                </p>
            </div>

            {/* Retention Policy Banner */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-md p-4 flex items-start gap-3 shadow-xs">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-amber-900">
                        30-Day Automated Retention Window
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                        Entities placed in the Recycle Bin (Buildings, Visitor Accounts, Quests, and Trivias) remain recoverable for up to 30 days. After 30 days, automated campus cron cleanup will permanently erase them from database storage.
                    </p>
                </div>
            </div>

            {/* Feedback Toast Banner */}
            {feedbackMessage && (
                <div
                    className={`rounded-md p-3.5 text-xs font-semibold flex items-center gap-2.5 transition-all animate-in fade-in ${
                        feedbackMessage.type === "error"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                >
                    {feedbackMessage.type === "error" ? (
                        <AlertTriangle size={16} className="text-red-500 shrink-0" />
                    ) : (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    )}
                    <span>{feedbackMessage.text}</span>
                </div>
            )}

            {/* Data Table Card */}
            <Card noPadding className="overflow-visible rounded-md border border-brand-border shadow-xs">
                <div className="p-4 border-b border-brand-border flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative flex-1 w-full">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search deleted items by name, email, or details..."
                            className="w-full pl-10 pr-4 py-2 bg-brand-light/30 border border-brand-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Category Filter Dropdown */}
                    <div className="relative w-full sm:w-60 shrink-0">
                        <select
                            value={activeTab}
                            onChange={(e) => handleTabChange(e.target.value)}
                            className="w-full pl-3.5 pr-9 py-2 bg-white border border-brand-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand appearance-none font-semibold text-gray-800 shadow-xs cursor-pointer"
                        >
                            <option value="all">All Categories ({data.all?.length ?? 0})</option>
                            <option value="buildings">Buildings ({data.buildings?.length ?? 0})</option>
                            <option value="visitors">Visitors ({data.visitors?.length ?? 0})</option>
                            <option value="quests">Quests ({data.quests?.length ?? 0})</option>
                            <option value="trivias">Trivias ({data.trivias?.length ?? 0})</option>
                        </select>
                        <ChevronDown
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                            size={16}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-16 text-center flex flex-col items-center justify-center text-gray-500">
                        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-md animate-spin mb-4" />
                        <p className="font-medium text-sm">Loading recycle bin items...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-light/20 border-b border-brand-border">
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            Item Details
                                        </th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            Retention Status
                                        </th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border/60">
                                    {paginatedItems.map((item) => {
                                        const daysLeft = getDaysLeft(item.deleted_at);
                                        const isUrgent = daysLeft <= 7;

                                        return (
                                            <tr
                                                key={`${item.itemType}-${item.id}`}
                                                className="hover:bg-brand-light/20 transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 group-hover:bg-brand-light group-hover:text-brand transition-colors mt-0.5">
                                                            {item.itemType === "building" && <Building2 size={18} />}
                                                            {item.itemType === "visitor" && <Users size={18} />}
                                                            {item.itemType === "quest" && <Target size={18} />}
                                                            {item.itemType === "trivia" && <HelpCircle size={18} />}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-bold text-gray-900 text-sm group-hover:text-brand transition-colors truncate">
                                                                {item.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">
                                                                {item.subtitle}
                                                            </p>
                                                            <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400 font-medium">
                                                                <Clock size={11} />
                                                                Deleted on{" "}
                                                                {item.deleted_at
                                                                    ? new Date(item.deleted_at).toLocaleDateString(undefined, {
                                                                          year: "numeric",
                                                                          month: "short",
                                                                          day: "numeric",
                                                                      })
                                                                    : "Recent"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getItemTypeBadge(item.itemType)}
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <Badge variant={isUrgent ? "danger" : "warning"}>
                                                            {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                                                        </Badge>
                                                        <span className="text-[10px] text-gray-400 font-medium">
                                                            {isUrgent ? "Purge imminent" : "Auto-purges after 30d"}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            onClick={() => handleRestore(item)}
                                                            variant="secondary"
                                                            disabled={actionLoading}
                                                            className="text-xs py-1.5 px-3 h-auto gap-1.5 rounded-md hover:text-brand hover:border-brand transition-colors"
                                                            title="Restore item to active status"
                                                        >
                                                            <RotateCcw size={13} /> Restore
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleHardDeleteClick(item)}
                                                            variant="danger"
                                                            disabled={actionLoading}
                                                            className="text-xs py-1.5 px-3 h-auto gap-1.5 rounded-md"
                                                            title="Permanently remove item from database"
                                                        >
                                                            <Trash2 size={13} /> Delete
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {currentList.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-400">
                                                    <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center mb-4">
                                                        <Trash2 size={32} className="opacity-40 text-gray-400" />
                                                    </div>
                                                    <p className="text-gray-700 font-bold text-base">
                                                        {searchTerm
                                                            ? "No matching items found"
                                                            : `No deleted ${activeTab === "all" ? "items" : activeTab} in recycle bin`}
                                                    </p>
                                                    <p className="text-gray-400 text-xs mt-1 max-w-sm">
                                                        {searchTerm
                                                            ? "Try clearing your search query to view all items."
                                                            : "When buildings, visitor accounts, quests, or trivias are deleted, they will be safely held here for 30 days."}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="p-4 border-t border-brand-border">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* Permanent Deletion Confirmation Modal */}
            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Permanent Delete Confirmation"
                message={`Are you sure you want to permanently delete "${itemToDelete?.title || "this item"}"? This will irreversibly remove this entity and all associated records from the database.`}
            />
        </div>
    );
}
