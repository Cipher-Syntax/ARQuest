import React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    Compass,
    ArrowLeft,
    LayoutDashboard,
    Home,
    Building2,
    MapPin,
    FileText,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const NotFound = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-brand-light/40 to-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
            {/* Background Ambient Glow Accents */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-brand/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar / Header Branding */}
            <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10 py-2">
                <Link to="/" className="flex items-center gap-3 group">
                    <img
                        src="/logo.png"
                        alt="ARQuest Logo"
                        className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
                        onError={(e) => {
                            e.target.style.display = "none";
                        }}
                    />
                    <div>
                        <span className="text-xl font-extrabold text-gray-900 tracking-tight font-heading">
                            AR<span className="text-brand">Quest</span>
                        </span>
                        <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-brand/10 text-brand rounded border border-brand/20">
                            Campus Admin
                        </span>
                    </div>
                </Link>

                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>System Active</span>
                </div>
            </header>

            {/* Main Center 404 Card */}
            <main className="w-full max-w-xl mx-auto my-auto py-8 z-10">
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-[0_20px_50px_-15px_rgba(138,21,56,0.08)] border border-brand-border/60 text-center relative">
                    {/* Big Decorative Radar / Compass Icon */}
                    <div className="relative mx-auto mb-8 w-32 h-32 flex items-center justify-center">
                        {/* Outer Glow Ring */}
                        <div className="absolute inset-0 rounded-full bg-brand/10 animate-ping opacity-25" />

                        {/* Outer Soft Circle with Border */}
                        <div className="absolute inset-0 rounded-full bg-brand-light border-2 border-brand-border flex items-center justify-center shadow-inner" />

                        {/* Core Circular Badge with Big Icon */}
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-brand to-[#70021b] text-white flex items-center justify-center shadow-lg shadow-brand/25">
                            <Compass size={56} className="text-white stroke-[1.75]" />
                            {/* Gold Indicator Pip */}
                            <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-amber-400 border-2 border-white rounded-full shadow-sm" />
                        </div>
                    </div>

                    {/* HUD Status Pill */}
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-brand-light border border-brand-border text-brand text-xs font-bold tracking-widest uppercase font-hud mb-4">
                        <span>404</span>
                        <span>•</span>
                        <span>OUT OF BOUNDS</span>
                    </div>

                    {/* Page Not Found Heading */}
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight font-heading mb-3">
                        Page Not Found
                    </h1>

                    {/* Explanatory Description */}
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-8">
                        The requested page, coordinate, or facility asset
                        doesn't exist, has been relocated, or is outside the
                        active ARQuest campus geofence grid.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-8">
                        {user?.role === "admin" ? (
                            <Link
                                to="/dashboard"
                                className="px-6 py-3.5 bg-brand hover:bg-brand/90 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand/20 transition-all flex items-center justify-center gap-2 group"
                            >
                                <LayoutDashboard
                                    size={18}
                                    className="group-hover:scale-110 transition-transform"
                                />
                                <span>Back to Dashboard</span>
                            </Link>
                        ) : (
                            <Link
                                to="/"
                                className="px-6 py-3.5 bg-brand hover:bg-brand/90 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand/20 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Home
                                    size={18}
                                    className="group-hover:scale-110 transition-transform"
                                />
                                <span>Campus Landing Page</span>
                            </Link>
                        )}

                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-5 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-sm rounded-xl border border-gray-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <ArrowLeft size={18} />
                            <span>Previous Page</span>
                        </button>
                    </div>

                    {/* Quick Section Shortcuts for Admins */}
                    {user?.role === "admin" && (
                        <div className="pt-6 border-t border-gray-100">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                Frequently Visited Sections
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <Link
                                    to="/buildings"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-brand-light hover:text-brand text-xs font-medium text-gray-600 border border-gray-200/80 transition-colors"
                                >
                                    <Building2 size={13} />
                                    <span>Buildings</span>
                                </Link>
                                <Link
                                    to="/geofences"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-brand-light hover:text-brand text-xs font-medium text-gray-600 border border-gray-200/80 transition-colors"
                                >
                                    <MapPin size={13} />
                                    <span>Geofences</span>
                                </Link>
                                <Link
                                    to="/cms"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-brand-light hover:text-brand text-xs font-medium text-gray-600 border border-gray-200/80 transition-colors"
                                >
                                    <FileText size={13} />
                                    <span>Quests CMS</span>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full max-w-5xl mx-auto text-center py-4 z-10">
                <p className="text-xs text-gray-400 font-medium">
                    ARQuest Platform • Western Mindanao State University Campus
                    Exploration & Accreditation System
                </p>
            </footer>
        </div>
    );
};

export default NotFound;