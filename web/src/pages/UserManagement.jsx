import { useState, useEffect } from "react";
import { Search, ChevronDown, User, Shield, GraduationCap, UserCheck, Sparkles } from "lucide-react";
import { Card, Badge, Pagination } from "../components/ui";
import { userService } from "../services/userService";
import { getAvatarUri } from "../utils/avatarUtils";

export default function UserManagement({ hideHeader }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

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
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                        User Management
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Directory of all campus accounts: Students, Visitors, Guests, and Administrators.
                    </p>
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
                                                            {user.avatar_id && getAvatarUri(user.avatar_id) ? (
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
                                                    <span className="text-xs font-semibold text-gray-700">
                                                        {user.exploration_points
                                                            ? `${Number(user.exploration_points).toLocaleString()} XP`
                                                            : "0 XP"}
                                                    </span>
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
        </div>
    );
}
