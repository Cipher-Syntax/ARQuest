import { useState, useEffect } from "react";
import { buildingService } from "../services/buildingService";
import { Card, Button, ConfirmDeleteModal, Pagination, Badge } from "../components/ui";
import { ArchiveRestore, Trash2, Building2, Search, AlertTriangle, Clock } from "lucide-react";

export default function ArchivePage() {
    const [archived, setArchived] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [loading, setLoading] = useState(true);

    const itemsPerPage = 8;

    useEffect(() => {
        loadArchived();
    }, []);

    const loadArchived = async () => {
        setLoading(true);
        try {
            const data = await buildingService.getArchivedBuildings();
            setArchived(data);
        } catch (error) {
            console.error("Failed to load archived buildings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id) => {
        await buildingService.restoreBuilding(id);
        loadArchived();
    };

    const handleHardDeleteClick = (id) => {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (itemToDelete) {
            await buildingService.hardDeleteBuilding(itemToDelete);
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            loadArchived();
        }
    };

    const getDaysLeft = (deletedAt) => {
        const deletedDate = new Date(deletedAt);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate - deletedDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysLeft = 30 - diffDays;
        return daysLeft > 0 ? daysLeft : 0;
    };

    const filteredArchived = archived.filter((b) =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredArchived.length / itemsPerPage);
    const paginatedArchived = filteredArchived.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Archives</h2>
                    <p className="text-gray-500 mt-1">
                        Restore or permanently delete removed items.
                    </p>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div>
                    <h3 className="text-sm font-bold text-amber-800">Retention Policy</h3>
                    <p className="text-xs text-amber-700 mt-1">
                        Items in the archive will be permanently deleted after 30 days from their deletion date. This action is irreversible.
                    </p>
                </div>
            </div>

            <Card noPadding className="overflow-visible">
                <div className="p-4 border-b border-brand-border flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search archived buildings..."
                            className="w-full pl-10 pr-4 py-2 bg-brand-light/30 border border-brand-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="font-medium">Loading archives...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-visible w-full">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-light/20">
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                            Building Details
                                        </th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border/50">
                                    {paginatedArchived.map((b) => {
                                        const daysLeft = getDaysLeft(b.deleted_at);
                                        const isUrgent = daysLeft <= 7;

                                        return (
                                            <tr
                                                key={b.id}
                                                className="hover:bg-brand-light/30 transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 group-hover:bg-brand-light group-hover:text-brand transition-colors">
                                                            <Building2 size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-sm group-hover:text-brand transition-colors">
                                                                {b.name}
                                                            </p>
                                                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 font-medium">
                                                                <Clock size={12} />
                                                                Deleted on {new Date(b.deleted_at).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={isUrgent ? "danger" : "warning"}>
                                                        {daysLeft} days left
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            onClick={() => handleRestore(b.id)}
                                                            variant="secondary"
                                                            className="text-xs py-1.5 px-3 h-auto gap-1.5 hover:text-brand hover:border-brand transition-colors"
                                                        >
                                                            <ArchiveRestore size={14} /> Restore
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleHardDeleteClick(b.id)}
                                                            variant="danger"
                                                            className="text-xs py-1.5 px-3 h-auto gap-1.5"
                                                        >
                                                            <Trash2 size={14} /> Delete
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredArchived.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan="3"
                                                className="px-6 py-12 text-center"
                                            >
                                                <div className="flex flex-col items-center justify-center text-gray-400">
                                                    <ArchiveRestore size={48} className="mb-4 opacity-20" />
                                                    <p className="text-gray-500 font-medium">
                                                        {searchTerm ? "No matching items found." : "Your archive is currently empty."}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </>
                )}
            </Card>

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Permanent Delete"
                message="Are you sure you want to permanently delete this item? This action cannot be undone."
            />
        </div>
    );
}
