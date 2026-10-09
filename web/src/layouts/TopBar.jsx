import React, { useState, useRef, useEffect } from "react";
import { Search, User, LogOut, Settings, ShieldCheck, HelpCircle, ChevronRight, ChevronDown } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import NotificationDropdown from "../components/layout/NotificationDropdown";
import { useAuth } from "../hooks/useAuth";
import { Modal, Button } from "../components/ui";
import { triggerAdminTour } from "../components/common/AdminOnboardingTour";
import { getProfileImageUrl } from "../utils/avatarUtils";

export default function TopBar({ user }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
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

                    {/* Global Search */}
                    <div className="hidden md:flex items-center relative w-64 lg:w-80 group">
                        <Search size={16} className="absolute left-3 text-gray-400 group-focus-within:text-brand transition-colors" />
                        <input
                            type="text"
                            placeholder="Search ARQuest..."
                            className="w-full h-9 pl-9 pr-14 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                        />
                        <div className="absolute right-1.5 flex items-center gap-0.5">
                            <kbd className="px-1.5 py-0.5 text-[9px] font-bold text-gray-400 bg-white border border-gray-200 rounded shadow-sm">Ctrl</kbd>
                            <kbd className="px-1.5 py-0.5 text-[9px] font-bold text-gray-400 bg-white border border-gray-200 rounded shadow-sm">K</kbd>
                        </div>
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
