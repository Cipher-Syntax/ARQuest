import { useState } from "react";
import { Upload, Edit3 } from "lucide-react";
import { Button, Input, Modal, FormBuilder } from "../ui";
import {
    validateForm,
    validateString,
    validateRequired,
} from "../../utils/validation";

export default function AssetModal({
    isOpen,
    onClose,
    onSave,
    editingAsset,
    newName,
    setNewName,
    newCategory,
    setNewCategory,
    newType,
    setNewType,
    selectedFile,
    fileInputRef,
    handleFileChange,
    categories,
}) {
    const [errors, setErrors] = useState({});

    const handleSave = () => {
        const formData = {
            newName,
            newCategory,
            newType,
            selectedFile,
        };

        const schema = {
            newName: (val) => validateString(val, 1),
            newCategory: (val) => validateRequired(val),
            newType: (val) => validateRequired(val),
            selectedFile: (val) =>
                editingAsset ? null : validateRequired(val),
        };

        const validationErrors = validateForm(formData, schema);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        onSave();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingAsset ? "Edit Asset" : "Upload Asset"}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="gap-2">
                        {editingAsset ? (
                            <Edit3 size={16} />
                        ) : (
                            <Upload size={16} />
                        )}
                        {editingAsset ? "Save Changes" : "Upload Asset"}
                    </Button>
                </>
            }
        >
            <div className="p-0 space-y-5">
                <FormBuilder
                    formData={{ newName, newCategory, newType }}
                    setFormData={(data) => {
                        if (data.newName !== undefined) {
                            setNewName(data.newName);
                            if (errors.newName) setErrors({ ...errors, newName: null });
                        }
                        if (data.newCategory !== undefined) {
                            setNewCategory(data.newCategory);
                            if (errors.newCategory) setErrors({ ...errors, newCategory: null });
                        }
                        if (data.newType !== undefined) {
                            setNewType(data.newType);
                            if (errors.newType) setErrors({ ...errors, newType: null });
                        }
                    }}
                    errors={errors}
                    fields={[
                        { name: "newName", label: "Asset Name", placeholder: "e.g. ccs_entrance_v1.glb" },
                        { 
                            name: "newCategory", 
                            label: "Building", 
                            type: "select", 
                            options: categories.map(cat => ({ label: cat.name, value: cat.name }))
                        },
                        { 
                            name: "newType", 
                            label: "Asset Type", 
                            type: "toggleGroup", 
                            options: [
                                { label: "3D Model", value: "3D Model" },
                                { label: "360° Panorama", value: "360° Panorama" }
                            ]
                        }
                    ]}
                />

                {!editingAsset && (
                    <div className="space-y-2">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed ${errors.selectedFile ? "border-red-500" : "border-brand-border"} rounded-lg p-8 flex flex-col items-center justify-center gap-2 bg-brand-light/20 hover:bg-brand-light/40 transition-colors cursor-pointer group`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={(e) => {
                                    handleFileChange(e);
                                    if (errors.selectedFile)
                                        setErrors({
                                            ...errors,
                                            selectedFile: null,
                                        });
                                }}
                                accept={
                                    newType === "3D Model"
                                        ? ".glb,.gltf"
                                        : "image/*"
                                }
                            />
                            <Upload
                                size={24}
                                className={
                                    selectedFile
                                        ? "text-brand"
                                        : "text-gray-400 group-hover:text-brand transition-colors"
                                }
                            />
                            <p className="text-xs font-bold text-gray-500 text-center">
                                {selectedFile ? (
                                    <span className="text-brand">
                                        Selected: {selectedFile.name}
                                    </span>
                                ) : (
                                    "Click to upload file"
                                )}
                            </p>
                            {selectedFile && (
                                <p className="text-[10px] text-gray-400">
                                    {(
                                        selectedFile.size /
                                        (1024 * 1024)
                                    ).toFixed(2)}{" "}
                                    MB
                                </p>
                            )}
                        </div>
                        {errors.selectedFile && (
                            <p className="text-xs text-red-500 mt-1">
                                {errors.selectedFile}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
