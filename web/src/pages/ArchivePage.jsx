import { useState, useEffect } from "react";
import { buildingService } from "../services/buildingService";
import { Card, Button, Badge } from "../components/ui";
import { ArchiveRestore, Trash2 } from "lucide-react";

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
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Archives</h1>
            <p className="text-gray-500">
                Items here will be permanently deleted after 30 days.
            </p>

            <div className="space-y-4">
                {archived.map((b) => (
                    <Card
                        key={b.id}
                        className="flex justify-between items-center p-4"
                    >
                        <div>
                            <h3 className="font-bold">{b.name}</h3>
                            <p className="text-xs text-gray-500">
                                Deleted at:{" "}
                                {new Date(b.deleted_at).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleRestore(b.id)}
                                className="bg-brand"
                            >
                                <ArchiveRestore size={16} className="mr-2" />{" "}
                                Restore
                            </Button>
                            <Button
                                onClick={() => handleHardDelete(b.id)}
                                variant="danger"
                            >
                                <Trash2 size={16} className="mr-2" /> Permanent
                                Delete
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
