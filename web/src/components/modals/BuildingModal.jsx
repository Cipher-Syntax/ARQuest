import { X, Building2, Box, Image as ImageIcon } from "lucide-react";
import { Button, Input, Modal, FormBuilder } from "../ui";

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
                <FormBuilder
                    formData={formData}
                    setFormData={setFormData}
                    fields={[
                        { name: "name", label: "Building Name", placeholder: "e.g. College of Computer Studies" },
                        { name: "code", label: "Short Code", placeholder: "e.g. CCS", width: "half" },
                        { 
                            name: "department", 
                            label: "Category / Department", 
                            type: "select", 
                            width: "half",
                            options: [
                                { label: "Uncategorized", value: "Uncategorized" },
                                ...categories.map(c => ({ label: c.name, value: c.name }))
                            ]
                        },
                        { name: "lat", label: "Latitude", placeholder: "14.5547", width: "half" },
                        { name: "lng", label: "Longitude", placeholder: "121.0244", width: "half" },
                        { 
                            name: "status", 
                            label: "Status", 
                            type: "toggleGroup", 
                            options: [
                                { label: "active", value: "active" },
                                { label: "inactive", value: "inactive" }
                            ]
                        }
                    ]}
                />

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
