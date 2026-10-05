import { useState, useEffect, useRef } from "react";
import {
    Search,
    ChevronDown,
    User,
    Shield,
    GraduationCap,
    UserCheck,
    Plus,
    Camera,
    Trash2,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    X,
} from "lucide-react";
import { Card, Badge, Pagination, Button, Modal } from "../components/ui";
import { userService } from "../services/userService";
import { getAvatarUri, getProfileImageUrl } from "../utils/avatarUtils";

export default function UserManagement({ hideHeader }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Create Account Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        role: "student",
    });
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [generalError, setGeneralError] = useState("");
    const [notification, setNotification] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            setFormErrors((prev) => ({
                ...prev,
                profile_image: "Please select a JPG, PNG, or WebP image.",
            }));
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setFormErrors((prev) => ({
                ...prev,
                profile_image: "Image size must be less than 5MB.",
            }));
            return;
        }

        setFormErrors((prev) => {
            const next = { ...prev };
            delete next.profile_image;
            return next;
        });

        if (profileImagePreview) {
            URL.revokeObjectURL(profileImagePreview);
        }

        setProfileImageFile(file);
        setProfileImagePreview(URL.createObjectURL(file));
    };

    const handleRemoveImage = () => {
        if (profileImagePreview) {
            URL.revokeObjectURL(profileImagePreview);
        }
        setProfileImageFile(null);
        setProfileImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleCloseModal = () => {
        if (isSubmitting) return;
        setIsCreateModalOpen(false);
        setFormData({
            username: "",
            email: "",
            password: "",
            first_name: "",
            last_name: "",
            role: "student",
        });
        handleRemoveImage();
        setFormErrors({});
        setGeneralError("");
        setShowPassword(false);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setGeneralError("");

        const errs = {};
        if (!formData.username.trim()) {
            errs.username = "Username is required.";
        }
        if (!formData.email.trim()) {
            errs.email = "Email is required.";
        }
        if (!formData.password) {
            errs.password = "Password is required.";
        } else if (formData.password.length < 8) {
            errs.password = "Password must be at least 8 characters.";
        }

        if (Object.keys(errs).length > 0) {
            setFormErrors(errs);
            return;
        }

        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append("username", formData.username.trim());
            data.append("email", formData.email.trim());
            data.append("password", formData.password);
            if (formData.first_name.trim()) data.append("first_name", formData.first_name.trim());
            if (formData.last_name.trim()) data.append("last_name", formData.last_name.trim());
            data.append("role", formData.role);
            if (profileImageFile) {
                data.append("profile_image", profileImageFile);
            }

            await userService.createUser(data);
            handleCloseModal();
            setNotification({
                type: "success",
                message: `Account created successfully for @${formData.username.trim()}!`,
            });
            setTimeout(() => setNotification(null), 5000);
            await fetchUsers();
        } catch (err) {
            console.error("Create user failed:", err);
            const details = err.response?.data?.details;
            if (details && typeof details === "object") {
                const fieldErrs = {};
                for (const [key, val] of Object.entries(details)) {
                    fieldErrs[key] = Array.isArray(val) ? val.join(" ") : String(val);
                }
                setFormErrors(fieldErrs);
            } else {
                setGeneralError(
                    err.response?.data?.error ||
                    err.response?.data?.message ||
                    "Failed to create account. Please check the entered data."
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRoleInfo = (role) => {
        switch (role?.toLowerCase()) {
            case "admin":
                return { label: "Admin", variant: "brand", icon: Shield };
            case "student":
                return { label: "Student", variant: "info", icon: GraduationCap };
            case "professional":
                return { label: "Visitor", variant: "warning", icon: UserCheck };
            case "visitor":
                return { label: "Guest", variant: "gray", icon: User };
            default:
                return { label: role || "User", variant: "gray", icon: User };
        }
    };

    const filteredUsers = users.filter((user) => {
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim().toLowerCase();
        const username = (user.username || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        const term = searchTerm.toLowerCase();

        const matchesSearch =
            fullName.includes(term) || username.includes(term) || email.includes(term);

        if (!matchesSearch) return false;

        if (roleFilter === "all") return true;
        if (roleFilter === "student") return user.role === "student";
        if (roleFilter === "professional") return user.role === "professional";
        if (roleFilter === "visitor") return user.role === "visitor";
        if (roleFilter === "admin") return user.role === "admin";

        return true;
    });

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter]);

    return (
        <div className="space-y-4">
            {!hideHeader && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                            User Management
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            Directory of all campus accounts: Students, Visitors, Guests, and Administrators.
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setFormErrors({});
                            setGeneralError("");
                            setIsCreateModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
                    >
                        <Plus size={16} />
                        <span>Add Account</span>
                    </Button>
                </div>
            )}

            {notification && (
                <div
                    className={`flex items-center justify-between p-3.5 rounded-md border text-sm font-medium ${
                        notification.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-red-50 text-red-800 border-red-200"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {notification.type === "success" ? (
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle size={18} className="text-red-600 shrink-0" />
                        )}
                        <span>{notification.message}</span>
                    </div>
                    <button
                        onClick={() => setNotification(null)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                    >
                        <X size={15} />
                    </button>
                </div>
            )}

            <Card noPadding className="overflow-visible rounded-md border border-brand-border shadow-xs">
                {/* Search & Role Filter Toolbar */}
                <div className="p-4 border-b border-brand-border flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative flex-1 w-full">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search by name, username, or email..."
                            className="w-full pl-10 pr-4 py-2 bg-brand-light/30 border border-brand-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <div className="relative w-full sm:w-52 shrink-0">
                            <select
                                className="w-full pl-3.5 pr-9 py-2 bg-white border border-brand-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand appearance-none font-semibold text-gray-800 shadow-xs cursor-pointer"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="all">All Roles ({users.length})</option>
                                <option value="student">
                                    Students ({users.filter((u) => u.role === "student").length})
                                </option>
                                <option value="professional">
                                    Visitors ({users.filter((u) => u.role === "professional").length})
                                </option>
                                <option value="visitor">
                                    Guests ({users.filter((u) => u.role === "visitor").length})
                                </option>
                                <option value="admin">
                                    Admins ({users.filter((u) => u.role === "admin").length})
                                </option>
                            </select>
                            <ChevronDown
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                                size={16}
                            />
                        </div>

                        {hideHeader && (
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setFormErrors({});
                                    setGeneralError("");
                                    setIsCreateModalOpen(true);
                                }}
                                className="flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                            >
                                <Plus size={16} />
                                <span>Add Account</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table Content */}
                {loading ? (
                    <div className="p-16 text-center flex flex-col items-center justify-center text-gray-500">
                        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-md animate-spin mb-4" />
                        <p className="font-medium text-sm">Loading user accounts...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-brand-light/20 border-b border-brand-border">
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            User Account
                                        </th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            Email Address
                                        </th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            Exploration Points
                                        </th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border/60">
                                    {paginatedUsers.map((user) => {
                                        const roleInfo = getRoleInfo(user.role);
                                        const RoleIcon = roleInfo.icon;

                                        return (
                                            <tr
                                                key={user.id}
                                                className="hover:bg-brand-light/20 transition-colors group"
                                            >
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-md bg-brand-light border border-brand-border flex items-center justify-center text-brand font-bold text-xs shrink-0 overflow-hidden">
                                                            {user.profile_image ? (
                                                                <img
                                                                    src={getProfileImageUrl(user.profile_image)}
                                                                    alt="Profile"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : user.avatar_id && getAvatarUri(user.avatar_id) ? (
                                                                <img
                                                                    src={getAvatarUri(user.avatar_id)}
                                                                    alt="Avatar"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : user.first_name ? (
                                                                user.first_name.charAt(0).toUpperCase()
                                                            ) : (
                                                                (user.username || "U").charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-gray-900 text-sm group-hover:text-brand transition-colors truncate">
                                                                {user.first_name || user.last_name
                                                                    ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                                                    : user.username}
                                                            </p>
                                                            <p className="text-[11px] text-gray-400 font-medium truncate">
                                                                @{user.username}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-3.5">
                                                    <span className="text-xs text-gray-600 font-medium">
                                                        {user.email || "No email"}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-brand-border/80">
                                                        <RoleIcon size={12} className="text-gray-500" />
                                                        {roleInfo.label}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    {user.role?.toLowerCase() !== "student" ? (
                                                        <span className="text-xs text-gray-400 font-medium">
                                                            —
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-gray-700">
                                                            {user.exploration_points
                                                                ? `${Number(user.exploration_points).toLocaleString()} XP`
                                                                : "0 XP"}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-50 border border-gray-200">
                                                        <span
                                                            className={`w-2 h-2 rounded-full ${
                                                                user.is_active ? "bg-emerald-500" : "bg-gray-300"
                                                            }`}
                                                        />
                                                        <span
                                                            className={
                                                                user.is_active ? "text-emerald-700" : "text-gray-500"
                                                            }
                                                        >
                                                            {user.is_active ? "Active" : "Inactive"}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-400">
                                                    <User size={36} className="mb-2 opacity-30 text-gray-400" />
                                                    <p className="text-gray-700 font-bold text-sm">
                                                        No accounts found
                                                    </p>
                                                    <p className="text-gray-400 text-xs mt-1">
                                                        Try adjusting your search query or role filter.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="p-4 border-t border-brand-border">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* Create Account Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={handleCloseModal}
                title="Create User Account"
                maxWidth="max-w-lg w-full"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={handleCloseModal}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            form="create-user-form"
                            loading={isSubmitting}
                        >
                            Create Account
                        </Button>
                    </>
                }
            >
                <form
                    id="create-user-form"
                    onSubmit={handleCreateSubmit}
                    className="space-y-4"
                >
                    {generalError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-medium flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0 text-red-500" />
                            <span>{generalError}</span>
                        </div>
                    )}

                    {/* Profile Photo Upload */}
                    <div className="flex items-center gap-4 p-3.5 rounded-md bg-brand-light/20 border border-brand-border/60">
                        <div className="w-16 h-16 rounded-full border-2 border-brand-border bg-white shadow-xs overflow-hidden flex items-center justify-center shrink-0">
                            {profileImagePreview ? (
                                <img
                                    src={profileImagePreview}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User size={28} className="text-brand/50" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                Profile Photo <span className="text-gray-400 font-normal lowercase">(optional)</span>
                            </p>
                            <p className="text-[11px] text-gray-500">
                                JPG, PNG or WebP, up to 5MB.
                            </p>
                            <div className="flex items-center gap-2 pt-0.5">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-brand-border rounded-md hover:bg-brand-light transition-colors cursor-pointer"
                                >
                                    <Camera size={13} />
                                    <span>{profileImageFile ? "Change" : "Upload"}</span>
                                </button>
                                {profileImageFile && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                    >
                                        <Trash2 size={13} />
                                        <span>Remove</span>
                                    </button>
                                )}
                            </div>
                            {formErrors.profile_image && (
                                <p className="text-[11px] text-red-500 font-medium pt-0.5">
                                    {formErrors.profile_image}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                First Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Maria"
                                value={formData.first_name}
                                onChange={(e) =>
                                    setFormData({ ...formData, first_name: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-white border border-brand-border rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand font-medium placeholder-gray-400"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Last Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Santos"
                                value={formData.last_name}
                                onChange={(e) =>
                                    setFormData({ ...formData, last_name: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-white border border-brand-border rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand font-medium placeholder-gray-400"
                            />
                        </div>
                    </div>

                    {/* Username & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Username <span className="text-brand">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. msantos"
                                required
                                value={formData.username}
                                onChange={(e) => {
                                    setFormData({ ...formData, username: e.target.value });
                                    if (formErrors.username) {
                                        setFormErrors((prev) => ({ ...prev, username: null }));
                                    }
                                }}
                                className={`w-full px-3 py-2 bg-white border rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand font-medium placeholder-gray-400 ${
                                    formErrors.username ? "border-red-400" : "border-brand-border"
                                }`}
                            />
                            {formErrors.username && (
                                <p className="text-[11px] text-red-500 font-medium">
                                    {formErrors.username}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Email Address <span className="text-brand">*</span>
                            </label>
                            <input
                                type="email"
                                placeholder="e.g. msantos@wmsu.edu.ph"
                                required
                                value={formData.email}
                                onChange={(e) => {
                                    setFormData({ ...formData, email: e.target.value });
                                    if (formErrors.email) {
                                        setFormErrors((prev) => ({ ...prev, email: null }));
                                    }
                                }}
                                className={`w-full px-3 py-2 bg-white border rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand font-medium placeholder-gray-400 ${
                                    formErrors.email ? "border-red-400" : "border-brand-border"
                                }`}
                            />
                            {formErrors.email && (
                                <p className="text-[11px] text-red-500 font-medium">
                                    {formErrors.email}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Account Role <span className="text-brand">*</span>
                        </label>
                        <div className="relative">
                            <select
                                value={formData.role}
                                onChange={(e) =>
                                    setFormData({ ...formData, role: e.target.value })
                                }
                                className="w-full pl-3 pr-9 py-2 bg-white border border-brand-border rounded-md text-sm text-gray-900 font-medium focus:outline-none focus:ring-1 focus:ring-brand appearance-none cursor-pointer"
                            >
                                <option value="student">Student (Campus Explorer)</option>
                                <option value="professional">Visitor (Campus Partner / VIP)</option>
                                <option value="visitor">Guest (Public Visitor)</option>
                                <option value="admin">Administrator (Full Dashboard Access)</option>
                            </select>
                            <ChevronDown
                                size={16}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Temporary Password <span className="text-brand">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Minimum 8 characters"
                                required
                                value={formData.password}
                                onChange={(e) => {
                                    setFormData({ ...formData, password: e.target.value });
                                    if (formErrors.password) {
                                        setFormErrors((prev) => ({ ...prev, password: null }));
                                    }
                                }}
                                className={`w-full pl-3 pr-10 py-2 bg-white border rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand font-medium placeholder-gray-400 ${
                                    formErrors.password ? "border-red-400" : "border-brand-border"
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {formErrors.password ? (
                            <p className="text-[11px] text-red-500 font-medium">
                                {formErrors.password}
                            </p>
                        ) : (
                            <p className="text-[10px] text-gray-400">
                                User can update their password after logging in.
                            </p>
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    );
}
