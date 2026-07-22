import { useState } from "react";
import { Plus, Edit3 } from "lucide-react";
import { Button, Modal, FormBuilder } from "../ui";
import {
    validateForm,
    validateString,
    validateRequired,
    validateNumber,
} from "../../utils/validation";

export default function GeofenceModal({
    isOpen,
    onClose,
    onSave,
    editingGeo,
    newName,
    setNewName,
    newRadius,
    setNewRadius,
    newFullBuilding,
    setNewFullBuilding,
    newLat,
    setNewLat,
    newLng,
    setNewLng,
}) {
    const [errors, setErrors] = useState({});

    const handleSave = () => {
        const formData = {
            newName,
            newRadius,
            newFullBuilding,
            newLat,
            newLng,
        };

        const schema = {
            newName: (val) => validateString(val, 1),
            newRadius: (val) => {
                const req = validateRequired(val);
                if (req) return req;
                const match = String(val).match(/([0-9]*\.?[0-9]+)/);
                if (!match) return "Must contain a valid number";
                return validateNumber(match[1], 1);
            },
            newFullBuilding: (val) => validateString(val, 1),
            newLat: (val) => {
                const req = validateRequired(val);
                if (req) return req;
                const match = String(val).match(/([-+]?[0-9]*\.?[0-9]+)/);
                if (!match) return "Must contain a valid coordinate";
                return validateNumber(match[1], -90, 90);
            },
            newLng: (val) => {
                const req = validateRequired(val);
                if (req) return req;
                const match = String(val).match(/([-+]?[0-9]*\.?[0-9]+)/);
                if (!match) return "Must contain a valid coordinate";
                return validateNumber(match[1], -180, 180);
            },
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
            title={editingGeo ? "Edit Boundary" : "Define Boundary"}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="gap-2">
                        {editingGeo ? <Edit3 size={16} /> : <Plus size={16} />}
                        {editingGeo ? "Save Changes" : "Define Boundary"}
                    </Button>
                </>
            }
        >
            <div className="space-y-5">
                <FormBuilder
                    formData={{ newName, newRadius, newFullBuilding, newLat, newLng }}
                    setFormData={(data) => {
                        if (data.newName !== undefined) {
                            setNewName(data.newName);
                            if (errors.newName) setErrors({ ...errors, newName: null });
                        }
                        if (data.newRadius !== undefined) {
                            setNewRadius(data.newRadius);
                            if (errors.newRadius) setErrors({ ...errors, newRadius: null });
                        }
                        if (data.newFullBuilding !== undefined) {
                            setNewFullBuilding(data.newFullBuilding);
                            if (errors.newFullBuilding) setErrors({ ...errors, newFullBuilding: null });
                        }
                        if (data.newLat !== undefined) {
                            setNewLat(data.newLat);
                            if (errors.newLat) setErrors({ ...errors, newLat: null });
                        }
                        if (data.newLng !== undefined) {
                            setNewLng(data.newLng);
                            if (errors.newLng) setErrors({ ...errors, newLng: null });
                        }
                    }}
                    errors={errors}
                    fields={[
                        { name: "newName", label: "Building Code", placeholder: "e.g. CCS", width: "half" },
                        { name: "newRadius", label: "Radius", placeholder: "e.g. 50m", width: "half" },
                        { name: "newFullBuilding", label: "Full Building Name", placeholder: "e.g. College of Computer Studies" },
                        { name: "newLat", label: "Latitude", placeholder: "14.5547° N", width: "half" },
                        { name: "newLng", label: "Longitude", placeholder: "121.0244° E", width: "half" }
                    ]}
                />
            </div>
        </Modal>
    );
}
