import { useState, useEffect, useCallback, useRef } from "react";
import {
    User,
    Plus,
    Image as ImageIcon,
    Trash2,
    Loader2,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    X,
    Check,
} from "lucide-react";
import { Card, Button, Modal, ConfirmDeleteModal, Input } from "../components/ui";
import { avatarService } from "../services/avatarService";
import DragDropFileUpload from "../components/common/DragDropFileUpload";
import { theme } from "../theme";

const AVATARS_PER_PAGE = 8;
const MAX_FILES = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AvatarManagementPage() {
    const [avatars, setAvatars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [generalError, setGeneralError] = useState("");
    const [notification, setNotification] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [avatarToDelete, setAvatarToDelete] = useState(null);
    const fileInputRef = useRef(null);

    const totalPages = Math.ceil(avatars.length / AVATARS_PER_PAGE);
    const paginatedAvatars = avatars.slice(
        (currentPage - 1) * AVATARS_PER_PAGE,
        currentPage * AVATARS_PER_PAGE
    );

    const fetchAvatars = useCallback(async () => {
        setLoading(true);
        try {
            const data = await avatarService.getAllAvatars();
            setAvatars(Array.isArray(data) ? data : []);
            setCurrentPage(1); // Reset to first page on refresh
        } catch (error) {
            console.error("Failed to load avatars", error);
            showNotification("error", "Failed to load avatars. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAvatars();
    }, [fetchAvatars]);

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const validateFiles = (files) => {
        const errs = {};
        if (!files || files.length === 0) {
            errs.image = "At least one avatar image is required.";
            return errs;
        }
        if (files.length > MAX_FILES) {
            errs.image = `Maximum ${MAX_FILES} files allowed at once.`;
            return errs;
        }
        for (const file of files) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                errs.image = "Only JPG, PNG, or WebP images are allowed.";
                return errs;
            }
            if (file.size > MAX_FILE_SIZE) {
                errs.image = "Each image must be less than 5MB.";
                return errs;
            }
        }
        return errs;
    };

    const handleImageChange = (files) => {
        if (!files || files.length === 0) {
            setImageFiles([]);
            setImagePreviews([]);
            return;
        }

        const newFiles = Array.from(files);
        const errs = validateFiles(newFiles);
        if (Object.keys(errs).length > 0) {
            setFormErrors(errs);
            return;
        }

        setFormErrors((prev) => {
            const next = { ...prev };
            delete next.image;
            return next;
        });

        // Clean up old previews
        imagePreviews.forEach((url) => URL.revokeObjectURL(url));

        const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
        setImageFiles(newFiles);
        setImagePreviews(newPreviews);
    };

    const removeFileAtIndex = (index) => {
        if (imagePreviews[index]) {
            URL.revokeObjectURL(imagePreviews[index]);
        }
        setImageFiles((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleRemoveAllImages = () => {
        imagePreviews.forEach((url) => URL.revokeObjectURL(url));
        setImageFiles([]);
        setImagePreviews([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const openCreateModal = () => {
        handleRemoveAllImages();
        setFormErrors({});
        setGeneralError("");
        setIsCreateModalOpen(true);
    };

    const handleCloseModal = () => {
        if (isSubmitting) return;
        setIsCreateModalOpen(false);
        handleRemoveAllImages();
        setFormErrors({});
        setGeneralError("");
    };

    const validateForm = () => {
        const errs = validateFiles(imageFiles);
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        setGeneralError("");

        try {
            const fd = new FormData();
            imageFiles.forEach((file) => fd.append("image", file));
            const result = await avatarService.createAvatarsBulk(fd);

            if (result.data.success_count > 0) {
                showNotification("success", `${result.data.success_count} avatar(s) uploaded successfully.`);
            }
            if (result.data.error_count > 0) {
                showNotification("error", `${result.data.error_count} file(s) failed to upload.`);
            }

            handleCloseModal();
            await fetchAvatars();
        } catch (error) {
            console.error("Bulk create avatar failed", error);
            const errMsg = error.response?.data?.error?.message ||
                "Failed to upload avatars. Please try again.";
            setGeneralError(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (avatar) => {
        setAvatarToDelete(avatar);
        setIsDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setAvatarToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!avatarToDelete) return;
        try {
            await avatarService.deleteAvatar(avatarToDelete.id);
            handleCloseDeleteModal();
            showNotification("success", "Avatar deleted successfully.");
            await fetchAvatars();
        } catch (error) {
            console.error("Delete avatar failed", error);
            showNotification("error", "Failed to delete avatar. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white border border-brand-border rounded-md px-4 py-3 shadow-xs shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-brand-light text-brand flex items-center justify-center shrink-0">
                        <User size={18} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2 leading-tight">
                            Avatar Management
                        </h1>
                        <p className="text-[11px] text-gray-500 leading-tight">
                            Upload avatar images for user profiles. Avatars are available immediately after upload.
                        </p>
                    </div>
                </div>

                <Button variant="primary" onClick={openCreateModal} className="self-start lg:self-auto">
                    <Plus size={14} className="mr-1" />
                    Add Avatar
                </Button>
            </header>

            {/* Notification Toast */}
            {notification && (
                <div
                    className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2 ${
                        notification.type === "success"
                            ? "bg-green-600 text-white"
                            : "bg-red-600 text-white"
                    }`}
                >
                    {notification.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {notification.message}
                </div>
            )}

            {/* Avatar Grid */}
            <Card className="p-0 overflow-hidden">
                {avatars.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <User size={48} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">No avatars yet</p>
                        <p className="text-sm mt-1">Click "Add Avatar" to upload your first avatar.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {paginatedAvatars.map((avatar) => (
                                    <div
                                        key={avatar.id}
                                        className="relative bg-white border border-brand-border rounded-md transition-all hover:shadow-md group"
                                    >
                                        {/* Avatar Image */}
                                        <div className="aspect-square relative overflow-hidden">
                                            <img
                                                src={avatar.image_url}
                                                alt="Avatar"
                                                className="w-full h-full object-cover transition-transform hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="bg-white/90 backdrop-blur-sm rounded-md p-2 shadow-lg">
                                                    <ImageIcon size={20} className="text-brand" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="p-3 pt-1 flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteClick(avatar)}
                                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                disabled={isSubmitting}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    Page {currentPage} of {totalPages} ({avatars.length} avatars)
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1 || isSubmitting}
                                    >
                                        <ChevronLeft size={14} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || isSubmitting}
                                    >
                                        <ChevronRight size={14} />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={handleCloseModal}
                title="Upload Avatars"
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {generalError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {generalError}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                            Avatar Images <span className="text-red-500">*</span>
                            {imageFiles.length > 0 && (
                                <span className="text-sm font-normal text-gray-500 ml-2">
                                    ({imageFiles.length}/{MAX_FILES} selected)
                                </span>
                            )}
                        </label>
                        <DragDropFileUpload
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageChange}
                            value={imageFiles}
                            multiple={true}
                            previewNode={imagePreviews.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative inline-block">
                                            <img
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                className="w-20 h-20 object-cover rounded-md border border-gray-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeFileAtIndex(index)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            placeholder="Drag & drop multiple avatar images (JPG, PNG, WebP) or click to browse"
                            disabled={isSubmitting}
                        />
                        {formErrors.image && (
                            <p className="mt-1 text-xs text-red-600">{formErrors.image}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Recommended: 256x256px, square aspect ratio, under 5MB each. Max {MAX_FILES} files.</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" isLoading={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={14} className="mr-1 animate-spin" />
                                    Uploading {imageFiles.length} Avatar{imageFiles.length !== 1 ? 's' : ''}...
                                </>
                            ) : (
                                <>
                                    <ImageIcon size={14} className="mr-1" />
                                    Upload {imageFiles.length || 'Avatars'}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
                title="Delete Avatar"
                message="Are you sure you want to delete this avatar? Users who have this avatar selected will have their avatar cleared and will need to pick a new one."
                confirmText="Delete"
                variant="destructive"
                isLoading={isSubmitting}
            />
        </div>
    );
}