import { useState, useEffect } from "react";
import { buildingService } from "../services/buildingService";
import { Card, Button } from "../components/ui";
import { ArchiveRestore, Trash2, Building2 } from "lucide-react";

export default function ArchivePage() {
    const [archived, setArchived] = useState([]);

    useEffect(() => {
        loadArchived();
    }, []);

    const loadArchived = async () => {
        const data = await buildingService.getArchivedBuildings();
        setArchived(data);
    };

    const handleRestore = async (id) => {
        await buildingService.restoreBuilding(id);
        loadArchived();
    };

    const handleHardDelete = async (id) => {
        if (confirm("Are you sure? This cannot be undone.")) {
            await buildingService.hardDeleteBuilding(id);
            loadArchived();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Archives
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Items here will be permanently deleted after 30 days.
                    </p>
                </div>
            </div>

            <Card noPadding className="overflow-visible">
                <div className="overflow-visible w-full">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-brand-light/20">
                                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                    Building Name
                                </th>
                                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                    Deleted At
                                </th>
                                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/50">
                            {archived.map((b) => (
                                <tr
                                    key={b.id}
                                    className="hover:bg-brand-light/30 transition-colors group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-md bg-brand-light flex items-center justify-center text-brand shrink-0">
                                                <Building2 size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm group-hover:text-brand transition-colors">
                                                    {b.name}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-medium text-gray-500">
                                            {new Date(b.deleted_at).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                onClick={() => handleRestore(b.id)}
                                                className="bg-brand text-xs py-1.5 px-3 h-auto"
                                            >
                                                <ArchiveRestore size={14} className="mr-1.5" /> Restore
                                            </Button>
                                            <Button
                                                onClick={() => handleHardDelete(b.id)}
                                                variant="danger"
                                                className="text-xs py-1.5 px-3 h-auto"
                                            >
                                                <Trash2 size={14} className="mr-1.5" /> Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {archived.length === 0 && (
                                <tr>
                                    <td
                                        colSpan="3"
                                        className="px-6 py-8 text-center text-gray-500"
                                    >
                                        No archived items found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
