import React, { useState, useRef, useEffect } from "react";
import {
    Search,
    User,
    LogOut,
    Settings,
    ShieldCheck,
    HelpCircle,
    ChevronRight,
    ChevronDown,
    Building2,
    LayoutDashboard,
    MapPin,
    Users,
    FileText,
    MessageSquare,
    History,
    Box,
    Trash2,
    X,
} from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import NotificationDropdown from "../components/layout/NotificationDropdown";
import { useAuth } from "../hooks/useAuth";
import { Modal, Button } from "../components/ui";
import { triggerAdminTour } from "../components/common/AdminOnboardingTour";
import { getProfileImageUrl } from "../utils/avatarUtils";
import { buildingService } from "../services/buildingService";

const APP_PAGES = [
    { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard, category: "Pages", keywords: "home overview analytics stats kpi" },
    { title: "Buildings & Facilities", path: "/buildings", icon: Building2, category: "Pages", keywords: "locations places models facilities structures" },
    { title: "Campus Map", path: "/campus-map", icon: MapPin, category: "Pages", keywords: "gps geofence coordinates map boundaries" },
    { title: "User Management", path: "/users", icon: Users, category: "Pages", keywords: "accounts students admins roles permissions" },
    { title: "Content CMS", path: "/cms", icon: FileText, category: "Pages", keywords: "content trivia facts quests articles" },
    { title: "User Feedback", path: "/feedback", icon: MessageSquare, category: "Pages", keywords: "reports issues bugs suggestions" },
    { title: "Audit History", path: "/history", icon: History, category: "Pages", keywords: "logs activity audits changes tracking" },
    { title: "3D Model Compressor", path: "/compressor", icon: Box, category: "Tools", keywords: "glb gltf 3d optimize draco compression" },
    { title: "Recycle Bin", path: "/recycle-bin", icon: Trash2, category: "Tools", keywords: "deleted archives trash restore" },
    { title: "Account Settings", path: "/settings", icon: Settings, category: "System", keywords: "profile password preferences configuration" },
];

export default function TopBar({ user }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const dropdownRef = useRef(null);

    // ── Global Search State ──
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [buildings, setBuildings] = useState([]);
    const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
    const searchRef = useRef(null);
    const searchInputRef = useRef(null);

    const loadBuildings = async () => {
        if (buildings.length > 0) return;
        try {
            setIsLoadingBuildings(true);
            const data = await buildingService.getBuildings();
            setBuildings(data || []);
        } catch (err) {
            console.error("Failed to load buildings for search", err);
        } finally {
            setIsLoadingBuildings(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleConfirmLogout = () => {
        setIsLogoutConfirmOpen(false);
        setIsDropdownOpen(false);
        logout();
        navigate("/admin");
    };

    const handleSelectResult = (path) => {
        setIsSearchOpen(false);
        setSearchQuery("");
        navigate(path);
    };

    // Filter matched pages and buildings
    const query = searchQuery.trim().toLowerCase();
    const matchedPages = query
        ? APP_PAGES.filter(
              (p) =>
                  p.title.toLowerCase().includes(query) ||
                  p.keywords.toLowerCase().includes(query)
          )
        : [];

    const matchedBuildings = query
        ? buildings
              .filter(
                  (b) =>
                      b.name?.toLowerCase().includes(query) ||
                      b.code?.toLowerCase().includes(query) ||
                      b.description?.toLowerCase().includes(query)
              )
              .slice(0, 5)
        : [];

    const hasResults = matchedPages.length > 0 || matchedBuildings.length > 0;

    return (
        <>
            <header className="h-16 bg-white border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                
                {/* ── Left Side: Navigation & Search ── */}
                <div className="flex items-center gap-6 flex-1">
                    {/* Mobile Menu Spacer */}
                    <div className="w-10 lg:hidden" />

                    {/* Breadcrumbs (Desktop only) */}
                    <div className="hidden lg:flex items-center gap-2 text-[13px] font-semibold tracking-wide">
                        <Link to="/dashboard" className="text-gray-400 hover:text-brand transition-colors">Home</Link>
                        {location.pathname !== '/dashboard' && (
                            <>
                                <ChevronRight size={14} className="text-gray-300" />
                                <span className="text-gray-900 capitalize">
                                    {location.pathname.split('/')[1]?.replace('-', ' ')}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Global Search Input & Dropdown */}
                    <div className="hidden md:flex items-center relative w-64 lg:w-80" ref={searchRef}>
                        <Search size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onFocus={() => {
                                setIsSearchOpen(true);
                                loadBuildings();
                            }}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchOpen(true);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                    setIsSearchOpen(false);
                                    searchInputRef.current?.blur();
                                }
                            }}
                            placeholder="Search buildings, pages..."
                            className="w-full h-9 pl-9 pr-8 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    searchInputRef.current?.focus();
                                }}
                                className="absolute right-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}

                        {/* Search Results Dropdown */}
                        {isSearchOpen && query && (
                            <div className="absolute top-11 left-0 w-80 lg:w-96 bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                {hasResults ? (
                                    <div className="max-h-80 overflow-y-auto p-1.5 space-y-2">
                                        {/* Matched Pages */}
                                        {matchedPages.length > 0 && (
                                            <div>
                                                <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                                    Navigation & Pages
                                                </div>
                                                <div className="space-y-0.5">
                                                    {matchedPages.map((page) => {
                                                        const Icon = page.icon;
                                                        return (
                                                            <button
                                                                key={page.path}
                                                                type="button"
                                                                onClick={() => handleSelectResult(page.path)}
                                                                className="w-full flex items-center justify-between px-2.5 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-brand/5 hover:text-brand rounded-md transition-colors group"
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-6 h-6 rounded bg-gray-100 group-hover:bg-brand/10 flex items-center justify-center text-gray-500 group-hover:text-brand transition-colors">
                                                                        <Icon size={13} />
                                                                    </div>
                                                                    <span>{page.title}</span>
                                                                </div>
                                                                <span className="text-[10px] text-gray-400 font-mono group-hover:text-brand/70 transition-colors">
                                                                    {page.path}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Matched Buildings */}
                                        {matchedBuildings.length > 0 && (
                                            <div className="border-t border-gray-100 pt-1.5">
                                                <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                                    Buildings & Facilities
                                                </div>
                                                <div className="space-y-0.5">
                                                    {matchedBuildings.map((building) => (
                                                        <button
                                                            key={building.id}
                                                            type="button"
                                                            onClick={() => handleSelectResult(`/buildings/${building.id}`)}
                                                            className="w-full flex items-center justify-between px-2.5 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-brand/5 hover:text-brand rounded-md transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span className="text-[9px] font-mono font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1 py-0.5 rounded shrink-0">
                                                                    {building.code || "BLDG"}
                                                                </span>
                                                                <span className="truncate">{building.name}</span>
                                                            </div>
                                                            <span className="text-[10px] text-brand/80 shrink-0 ml-2">
                                                                Edit ➔
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-xs text-gray-400">
                                        No results found for "<span className="text-gray-700 font-medium">{searchQuery}</span>"
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right Side: Action Center ── */}
                <div className="flex items-center gap-3 lg:gap-4">
                    
                    {/* Platform Guide Tour Trigger */}
                    <button
                        type="button"
                        onClick={triggerAdminTour}
                        className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-brand bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                        title="Open Platform Guide"
                    >
                        <HelpCircle size={18} />
                    </button>

                    <NotificationDropdown />

                    {/* Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`flex items-center gap-1.5 pl-4 ml-1 border-l border-gray-200 hover:bg-gray-50 transition-colors py-1.5 px-2 rounded-md ${isDropdownOpen ? 'bg-gray-50' : ''}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-brand shadow-sm overflow-hidden shrink-0">
                                {user?.profile_image ? (
                                    <img
                                        src={getProfileImageUrl(user.profile_image)}
                                        alt={user?.first_name || "Admin"}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User size={16} />
                                )}
                            </div>
                            <ChevronDown size={14} className="text-gray-400" />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white z-50 overflow-hidden rounded-md border border-gray-200 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Profile Header */}
                                <div className="flex flex-col items-center justify-center pt-6 pb-4 px-5">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-brand/5 text-brand mb-3 overflow-hidden border-2 border-brand/20 shadow-sm shrink-0">
                                        {user?.profile_image ? (
                                            <img
                                                src={getProfileImageUrl(user.profile_image)}
                                                alt={user?.first_name || "Admin"}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User size={32} />
                                        )}
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900 mb-0.5">{user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Admin User"}</h2>
                                    <p className="text-xs text-gray-500 mb-2">{user?.email || "admin@wmsu.edu.ph"}</p>
                                    <div className="flex items-center gap-1 bg-brand/10 text-brand px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider">
                                        <ShieldCheck size={12} />
                                        {user?.role || "Administrator"}
                                    </div>
                                </div>

                                {/* Quick Settings */}
                                <div className="py-2 border-t border-gray-100">
                                    <Link
                                        to="/settings"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="w-full flex items-center justify-start gap-3 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand transition-colors"
                                    >
                                        <Settings size={16} className="text-gray-400" />
                                        Account Settings
                                    </Link>
                                </div>

                                {/* Logout Zone */}
                                <div className="p-2 border-t border-red-100">
                                    <button
                                        onClick={() => setIsLogoutConfirmOpen(true)}
                                        className="w-full flex items-center justify-start gap-3 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Log Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <Modal
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                title="Log Out"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setIsLogoutConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleConfirmLogout}>
                            Log Out
                        </Button>
                    </>
                }
            >
                <div className="py-4">
                    <p className="text-gray-600">
                        Are you sure you want to log out of the dashboard?
                    </p>
                </div>
            </Modal>
        </>
    );
}
