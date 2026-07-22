import { Plus, Edit3 } from "lucide-react";
import { Button, Modal, FormBuilder } from "../ui";

export default function TriviaModal({
    isOpen,
    onClose,
    onSave,
    editingFact,
    newBuilding,
    setNewBuilding,
    newFact,
    setNewFact,
    categories,
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingFact ? "Edit Trivia Fact" : "Add Trivia Fact"}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onSave} className="gap-2">
                        {editingFact ? <Edit3 size={16} /> : <Plus size={16} />}
                        {editingFact ? "Update Fact" : "Add Fact"}
                    </Button>
                </>
            }
        >
            <div className="space-y-5">
                <FormBuilder
                    formData={{ building: newBuilding, fact: newFact }}
                    setFormData={(data) => {
                        if (data.building !== undefined) setNewBuilding(data.building);
                        if (data.fact !== undefined) setNewFact(data.fact);
                    }}
                    fields={[
                        {
                            name: "building",
                            label: "Building",
                            type: "select",
                            options: categories.map(cat => ({ label: cat.name, value: cat.name }))
                        },
                        {
                            name: "fact",
                            label: "Trivia Fact",
                            type: "textarea",
                            placeholder: "Enter an interesting fact about this building...",
                            rows: 4
                        }
                    ]}
                />
            </div>
        </Modal>
    );
}
