import { X, Building2, Box, Image as ImageIcon } from "lucide-react";
import { Button, Input, Modal } from "../ui";

export default function BuildingModal({
    isOpen,
    onClose,
    onSave,
    editingBuilding,
    formData,
    setFormData,
    categories,
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingBuilding ? "Edit Building" : "Add New Building"}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onSave} className="gap-2">
                        <Building2 size={16} />
                        {editingBuilding ? "Update Building" : "Add Building"}
                    </Button>
                </>
            }
        >
            <div className="space-y-5 max-h-[70vh] overflow-y-auto scrollbar-thin pr-2">
                <Input
                    label="Building Name"
                    placeholder="e.g. College of Computer Studies"
                    value={formData.name}
                    onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                    }
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Short Code"
                        placeholder="e.g. CCS"
                        value={formData.code}
                        onChange={(e) =>
                            setFormData({ ...formData, code: e.target.value })
                        }
                    />
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Category / Department
                        </label>
                        <select
                            value={formData.department}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    department: e.target.value,
                                })
                            }
                            className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer font-bold"
                        >
                            <option value="Uncategorized">Uncategorized</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.name}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Latitude"
                        placeholder="14.5547"
                        value={formData.lat}
                        onChange={(e) =>
                            setFormData({ ...formData, lat: e.target.value })
                        }
                    />
                    <Input
                        label="Longitude"
                        placeholder="121.0244"
                        value={formData.lng}
                        onChange={(e) =>
                            setFormData({ ...formData, lng: e.target.value })
                        }
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Status
                    </label>
                    <div className="flex gap-2">
                        {["active", "inactive"].map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() =>
                                    setFormData({ ...formData, status: s })
                                }
                                className={`flex-1 py-2.5 rounded-md text-sm font-bold capitalize transition-all ${
                                    formData.status === s
                                        ? "bg-brand text-white shadow-sm"
                                        : "bg-gray-50 text-gray-500 hover:bg-brand-light"
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-6 border-t border-brand-border">
                    <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mb-4">
                        Content & Media (Partial Upload)
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                3D Model / GLB
                            </label>
                            <div className="border-2 border-dashed border-brand-border rounded-lg p-8 flex flex-col items-center justify-center gap-2 bg-brand-light/20 hover:bg-brand-light/40 transition-all cursor-pointer group">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 group-hover:text-brand shadow-sm transition-colors">
                                    <Box size={20} />
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase group-hover:text-brand transition-colors">
                                    Select GLB File
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                360° Panorama
                            </label>
                            <div className="border-2 border-dashed border-brand-border rounded-lg p-8 flex flex-col items-center justify-center gap-2 bg-brand-light/20 hover:bg-brand-light/40 transition-all cursor-pointer group">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 group-hover:text-brand shadow-sm transition-colors">
                                    <ImageIcon size={20} />
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase group-hover:text-brand transition-colors">
                                    Select Image
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
