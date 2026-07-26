import React, { useState, useRef, useEffect } from "react";
import { Bell, Search, User, LogOut, Settings, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import NotificationDropdown from "../components/layout/NotificationDropdown";
import { useAuth } from "../hooks/useAuth";
import { Modal, Button } from "../components/ui";

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
        navigate("/login");
    };

    return (
        <>
            <header className="h-16 bg-brand-light border-b border-brand-border px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-6 flex-1">
                    {}
                    <div className="w-12 lg:hidden" />
                </div>

                <div className="flex items-center gap-3 lg:gap-6">
                    <NotificationDropdown />

                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`flex items-center gap-3 pl-4 border-l border-brand-border hover:bg-gray-50 transition-colors p-1.5 rounded-xl text-left ${isDropdownOpen ? 'bg-gray-50' : ''}`}
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-gray-900 leading-none">
                                    {user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Admin User"}
                                </p>
                                <p className="text-[10px] font-bold text-brand mt-1 uppercase tracking-wider">
                                    {user?.role || "Administrator"}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white border border-brand-border flex items-center justify-center text-brand shadow-sm">
                                <User size={20} />
                            </div>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Profile Header */}
                                <div className="flex flex-col items-center justify-center pt-6 pb-4 px-5">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-brand/5 text-brand mb-3">
                                        <User size={32} />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900 mb-0.5">{user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Admin User"}</h2>
                                    <p className="text-xs text-gray-500 mb-2">{user?.email || "admin@wmsu.edu.ph"}</p>
                                    <div className="flex items-center gap-1 bg-brand/10 text-brand px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider">
                                        <ShieldCheck size={12} />
                                        {user?.role || "Administrator"}
                                    </div>
                                </div>

                                {/* Quick Settings */}
                                <div className="py-2">
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
                                <div className="p-2 border-t border-red-500">
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
