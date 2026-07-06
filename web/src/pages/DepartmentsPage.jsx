import { useState, useEffect, useRef } from "react";
import { Plus, Edit3, Trash2, Layers, X, MoreVertical } from "lucide-react";
import {
    Card,
    Badge,
    Button,
    ConfirmDeleteModal,
    Pagination,
} from "../components/ui";
import { departmentService } from "../services/departmentService";
import { validateForm, validateString } from "../utils/validation";

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

function DepartmentModal({ isOpen, onClose, onSuccess, editingDepartment }) {
    const isEdit = Boolean(editingDepartment);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: "",
        color_hex: "#96C0CE",
        is_active: true,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState({});
    const nameRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            if (editingDepartment) {
                setFormData({
                    name: editingDepartment.name || "",
                    code: editingDepartment.code || "",
                    description: editingDepartment.description || "",
                    color_hex: editingDepartment.color_hex || "#96C0CE",
                    is_active: editingDepartment.is_active !== false,
                });
            } else {
                setFormData({
                    name: "",
                    code: "",
                    description: "",
                    color_hex: "#96C0CE",
                    is_active: true,
                });
            }
            setError("");
            setErrors({});
            nameRef.current = false;
        }
    }, [isOpen, editingDepartment]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === "checkbox" ? checked : value;

        setFormData((prev) => {
            const updated = { ...prev, [name]: finalValue };
            // Auto-slugify code from name only on create and before user edits code
            if (name === "name" && !isEdit && !nameRef.current) {
                updated.code = slugify(value);
            }
            return updated;
        });

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleCodeChange = (e) => {
        nameRef.current = true;
        setFormData((prev) => ({ ...prev, code: e.target.value }));
        if (errors.code) {
            setErrors((prev) => ({ ...prev, code: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setErrors({});

        const schema = {
            name: (val) => validateString(val, 1),
            code: (val) => validateString(val, 1),
            description: (val) => null,
            color_hex: (val) => validateString(val, 4, 7),
            is_active: (val) => null,
        };

        const validationErrors = validateForm(formData, schema);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                name: formData.name,
                code: formData.code,
                description: formData.description,
                color_hex: formData.color_hex,
                is_active: formData.is_active,
            };

            if (isEdit) {
                await departmentService.updateDepartment(
                    editingDepartment.id,
                    payload,
                );
            } else {
                await departmentService.createDepartment(payload);
            }

            onSuccess();
            onClose();
        } catch (err) {
            const apiErrors = err.response?.data?.details || {};
            if (Object.keys(apiErrors).length > 0) {
                setErrors(apiErrors);
            } else {
                setError(
                    err.response?.data?.message || "Failed to save department.",
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-brand-border bg-gray-50/50">
                    <h3 className="font-bold text-lg text-gray-900">
                        {isEdit ? "Edit College" : "New College"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="p-6 overflow-y-auto space-y-4"
                >
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${errors.name ? "border-red-500 focus:ring-red-200" : "border-brand-border focus:ring-brand/20"}`}
                            placeholder="College of Computer Studies"
                        />
                        {errors.name && (
                            <p className="text-xs text-red-500">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Code (slug) *
                        </label>
                        <input
                            type="text"
                            name="code"
                            required
                            value={formData.code}
                            onChange={handleCodeChange}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm font-mono ${errors.code ? "border-red-500 focus:ring-red-200" : "border-brand-border focus:ring-brand/20"}`}
                            placeholder="ccs"
                        />
                        {errors.code && (
                            <p className="text-xs text-red-500">
                                {Array.isArray(errors.code)
                                    ? errors.code.join(", ")
                                    : errors.code}
                            </p>
                        )}
                        <p className="text-xs text-gray-400">
                            Auto-generated from name. Letters, numbers, hyphens
                            only.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-brand-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 text-sm resize-none"
                            placeholder="Optional description..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Color (Map Pin)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                name="color_hex"
                                value={formData.color_hex || "#96c0ce"}
                                onChange={handleChange}
                                className={`w-10 h-10 p-1 border rounded-md shrink-0 cursor-pointer bg-white ${errors.color_hex ? "border-red-500" : "border-brand-border"}`}
                            />
                            <input
                                type="text"
                                name="color_hex"
                                value={formData.color_hex}
                                onChange={handleChange}
                                maxLength={7}
                                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm font-mono ${errors.color_hex ? "border-red-500 focus:ring-red-200" : "border-brand-border focus:ring-brand/20"}`}
                                placeholder="#96C0CE"
                            />
                        </div>
                        {errors.color_hex && (
                            <p className="text-xs text-red-500">
                                {errors.color_hex}
                            </p>
                        )}
                        <p className="text-xs text-gray-400">
                            Hex color used for building pins on the map.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                        <input
                            id="dept-is-active"
                            type="checkbox"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={handleChange}
                            className="w-4 h-4 accent-brand"
                        />
                        <label
                            htmlFor="dept-is-active"
                            className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                            Active (visible to mobile users)
                        </label>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading
                                ? "Saving..."
                                : isEdit
                                  ? "Save Changes"
                                  : "Create College"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);
    const [departmentToDelete, setDepartmentToDelete] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const menuRef = useRef(null);

    useEffect(() => {
        loadDepartments();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadDepartments = async () => {
        setLoading(true);
        try {
            const data = await departmentService.getDepartments();
            setDepartments(data);
        } catch (err) {
            console.error("Failed to load departments", err);
        } finally {
            setLoading(false);
        }
    };

    const handleNewClick = () => {
        setEditingDepartment(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (dept) => {
        setEditingDepartment(dept);
        setIsModalOpen(true);
        setOpenMenu(null);
    };

    const handleDeleteClick = (dept) => {
        setDepartmentToDelete(dept);
        setIsDeleteModalOpen(true);
        setOpenMenu(null);
    };

    const handleConfirmDelete = async () => {
        if (departmentToDelete) {
            try {
                await departmentService.deleteDepartment(departmentToDelete.id);
                setIsDeleteModalOpen(false);
                setDepartmentToDelete(null);
                await loadDepartments();
            } catch (err) {
                console.error("Failed to delete department", err);
            }
        }
    };

    const totalPages = Math.ceil(departments.length / itemsPerPage);
    const paginatedDepartments = departments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        Colleges
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Group buildings by college to organize map pins and
                        search results.
                    </p>
                </div>
                <Button onClick={handleNewClick} className="shrink-0">
                    <Plus size={18} className="mr-2" />
                    New College
                </Button>
            </div>

            <Card noPadding className="overflow-visible">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 font-medium">
                        Loading colleges...
                    </div>
                ) : (
                    <>
                        <div className="overflow-visible w-full">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-light/20">
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                            Code
                                        </th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                            Buildings
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
                                    {paginatedDepartments.map((dept) => (
                                        <tr
                                            key={dept.id}
                                            className="hover:bg-brand-light/30 transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-3 h-8 rounded-sm shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                dept.color_hex ||
                                                                "#96C0CE",
                                                        }}
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <Layers
                                                            size={16}
                                                            className="text-gray-400 shrink-0"
                                                        />
                                                        <p className="font-bold text-gray-900 text-sm group-hover:text-brand transition-colors">
                                                            {dept.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {dept.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-semibold text-gray-700">
                                                    {dept.building_count}
                                                </span>
                                                <span className="text-xs text-gray-400 ml-1">
                                                    buildings
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge
                                                    variant={
                                                        dept.is_active
                                                            ? "success"
                                                            : "gray"
                                                    }
                                                >
                                                    {dept.is_active
                                                        ? "Active"
                                                        : "Inactive"}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div
                                                    className="relative inline-block text-left"
                                                    ref={
                                                        openMenu === dept.id
                                                            ? menuRef
                                                            : null
                                                    }
                                                >
                                                    <button
                                                        onClick={() =>
                                                            setOpenMenu(
                                                                openMenu ===
                                                                    dept.id
                                                                    ? null
                                                                    : dept.id,
                                                            )
                                                        }
                                                        className="p-2 text-gray-400 hover:text-brand transition-colors rounded-lg hover:bg-brand-light"
                                                    >
                                                        <MoreVertical
                                                            size={18}
                                                        />
                                                    </button>

                                                    {openMenu === dept.id && (
                                                        <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-md shadow-xl border border-brand-border z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <button
                                                                onClick={() =>
                                                                    handleEditClick(
                                                                        dept,
                                                                    )
                                                                }
                                                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-brand-light hover:text-brand flex items-center gap-2 font-medium"
                                                            >
                                                                <Edit3
                                                                    size={14}
                                                                />{" "}
                                                                Edit College
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteClick(
                                                                        dept,
                                                                    )
                                                                }
                                                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                                            >
                                                                <Trash2
                                                                    size={14}
                                                                />{" "}
                                                                Delete College
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {departments.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan="5"
                                                className="px-6 py-8 text-center text-gray-500"
                                            >
                                                No colleges found. Create your
                                                first college to get started.
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

            <DepartmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadDepartments}
                editingDepartment={editingDepartment}
            />

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete College"
                message={`Are you sure you want to delete "${departmentToDelete?.name}"? Buildings assigned to this college will become Uncategorized.`}
            />
        </div>
    );
}
