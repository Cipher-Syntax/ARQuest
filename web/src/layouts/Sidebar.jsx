import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Building2,
    Users,
    FileVideo,
    Map,
    HelpCircle,
    Settings,
    LogOut,
    Menu,
    X,
    Target,
    MonitorPlay,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    Camera,
    Layers,
    ArchiveRestore,
    Activity,
    ChevronDown,
    ChevronUp,
    Box,
    Navigation,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const NAV_GROUPS = [
    {
        label: "Overview",
        items: [
            { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        ],
    },
    {
        label: "Campus Map",
        items: [
            { to: "/departments", icon: Layers, label: "Colleges" },
            { to: "/buildings", icon: Building2, label: "Buildings" },
            { to: "/geofences", icon: Map, label: "Geofences" },
            { to: "/navigation", icon: Navigation, label: "Walking Paths" },
        ],
    },
    {
        label: "Content & Media",
        items: [
            { to: "/panoramas", icon: Camera, label: "Manage Panorama" },
            { to: "/media", icon: FileVideo, label: "Content & Media Viewer" },
            { to: "/compressor", icon: Box, label: "3D Model Compressor" },
        ],
    },
    {
        label: "Gamification",
        items: [
            { to: "/cms", icon: MonitorPlay, label: "Quests/Trivias/Quizzes" },
            { to: "/users", icon: Users, label: "Student Rankings" },
        ],
    },
    {
        label: "System & Admin",
        items: [
            { to: "/professionals", icon: Briefcase, label: "Professionals" },
            { to: "/feedback", icon: HelpCircle, label: "Feedback & Issues" },
            { to: "/history", icon: Activity, label: "History & Logs" },
            { to: "/archives", icon: ArchiveRestore, label: "Archives" },
            { to: "/settings", icon: Settings, label: "Settings" },
        ],
    },
];

function SidebarContent({
    onMobileClose,
    isCollapsed,
    setIsCollapsed,
}) {
    const navRef = useRef(null);
    const [canScrollDown, setCanScrollDown] = useState(false);
    const [canScrollUp, setCanScrollUp] = useState(false);

    const checkScroll = () => {
        if (navRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = navRef.current;
            setCanScrollUp(scrollTop > 4);
            setCanScrollDown(scrollTop + clientHeight < scrollHeight - 6);
        }
    };

    const scrollUp = () => {
        if (navRef.current) {
            navRef.current.scrollBy({ top: -220, behavior: "smooth" });
        }
    };

    const scrollDown = () => {
        if (navRef.current) {
            navRef.current.scrollBy({ top: 220, behavior: "smooth" });
        }
    };

    useEffect(() => {
        // Give it a tiny delay to allow initial layout to settle
        const timer = setTimeout(checkScroll, 120);
        window.addEventListener("resize", checkScroll);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", checkScroll);
        };
    }, [isCollapsed]);

    return (
        <div className="flex flex-col h-full bg-brand relative transition-all duration-300">
            <div
                className={`px-5 py-6 flex items-center transition-all duration-300 border-b border-white/50 ${isCollapsed ? "justify-center px-0" : "justify-between"}`}
            >
                <div className="flex items-center gap-3 border-white">
                    <div className="w-10 h-10 bg-white text-brand rounded-md flex items-center justify-center shrink-0 p-2 shadow-sm">
                        <img
                            src="/logo.png"
                            alt="ARQuest"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    {!isCollapsed && (
                        <div className="animate-in fade-in duration-500">
                            <p className="font-extrabold text-white text-lg tracking-tight leading-none">
                                ARQuest
                            </p>
                            <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold leading-none mt-1">
                                Admin Panel
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3.5 top-8 bg-white border border-gray-200 text-brand hover:bg-brand-light rounded-md p-1.5 shadow-md transition-all lg:flex hidden items-center justify-center z-50 group"
            >
                {isCollapsed ? (
                    <ChevronRight
                        size={14}
                        className="group-hover:translate-x-0.5 transition-transform"
                    />
                ) : (
                    <ChevronLeft
                        size={14}
                        className="group-hover:-translate-x-0.5 transition-transform"
                    />
                )}
            </button>

            {/* Scroll Container with Edge Gradient Fades */}
            <div className="relative flex-1 min-h-0 flex flex-col">
                {/* Top Edge Gradient Fade + Micro Chevron */}
                <button
                    type="button"
                    onClick={scrollUp}
                    aria-label="Scroll navigation up"
                    className={`absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-brand via-brand/85 to-transparent z-20 flex items-start justify-center pt-1.5 transition-opacity duration-300 ${
                        canScrollUp
                            ? "opacity-100 pointer-events-auto cursor-pointer"
                            : "opacity-0 pointer-events-none"
                    }`}
                >
                    <div className="bg-white/15 hover:bg-white/25 text-white/90 hover:text-white rounded-full p-1 shadow-sm backdrop-blur-sm transition-all hover:scale-105 active:scale-95">
                        <ChevronUp size={14} className="stroke-[2.5]" />
                    </div>
                </button>

                {/* Scrollable Navigation */}
                <nav 
                    ref={navRef}
                    onScroll={checkScroll}
                    className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-none pb-8"
                >
                    {NAV_GROUPS.map((group, i) => (
                        <div key={i} className="space-y-1.5">
                            {!isCollapsed && (
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 px-3 animate-in fade-in">
                                    {group.label}
                                </p>
                            )}
                            {group.items.map(({ to, icon: Icon, label }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    onClick={onMobileClose}
                                    title={isCollapsed ? label : ""}
                                    className={({ isActive }) =>
                                        `relative flex items-center rounded-md text-sm font-semibold transition-all duration-200 group
                  ${isCollapsed ? "justify-center px-2 py-3" : "px-4 py-3 gap-3"}
                  ${
                      isActive
                          ? "text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon
                                                size={18}
                                                className={`shrink-0 transition-colors ${isActive ? "text-white" : "text-white/70 group-hover:text-white"}`}
                                            />
                                            {!isCollapsed && (
                                                <span className="animate-in fade-in duration-300">
                                                    {label}
                                                </span>
                                            )}
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-white rounded-r-md shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Bottom Edge Gradient Fade + Micro Chevron */}
                <button
                    type="button"
                    onClick={scrollDown}
                    aria-label="Scroll navigation down"
                    className={`absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-brand via-brand/85 to-transparent z-20 flex items-end justify-center pb-1.5 transition-opacity duration-300 ${
                        canScrollDown
                            ? "opacity-100 pointer-events-auto cursor-pointer"
                            : "opacity-0 pointer-events-none"
                    }`}
                >
                    <div className="bg-white/15 hover:bg-white/25 text-white/90 hover:text-white rounded-full p-1 shadow-sm backdrop-blur-sm transition-all hover:scale-105 active:scale-95">
                        <ChevronDown size={14} className="stroke-[2.5]" />
                    </div>
                </button>
            </div>
        </div>
    );
}

export default function Sidebar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <>
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-3 left-4 z-40 p-2 bg-white rounded-lg border border-brand-border shadow-sm text-brand active:scale-95 transition-all"
            >
                <Menu size={20} />
            </button>

            {}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative w-64 h-full shadow-2xl border-r-4 border-r-brand">
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-white/10 rounded-lg transition-colors z-10"
                        >
                            <X size={20} />
                        </button>
                        <SidebarContent
                            onMobileClose={() => setMobileOpen(false)}
                            isCollapsed={false}
                            setIsCollapsed={() => {}}
                        />
                    </div>
                </div>
            )}

            {}
            <aside
                className={`hidden lg:flex flex-col bg-brand h-screen sticky top-0 flex-shrink-0 border-r-4 border-r-brand transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`}
            >
                <SidebarContent
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                />
            </aside>

        </>
    );
}
