import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Compass,
    LayoutDashboard,
    Building2,
    Map,
    Box,
    Users,
    Trash2,
    ChevronLeft,
    ChevronRight,
    X,
    CheckCircle2,
    HelpCircle,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const TOUR_STEPS = [
    {
        targetId: "tour-sidebar-header",
        badge: "WELCOME",
        badgeColor: "bg-red-50 text-brand border-brand/30",
        icon: Compass,
        title: "Welcome to ARQuest Admin",
        subtitle: "Campus Navigation & Digital Twin Operating System",
        description:
            "This sidebar is your control center for managing university geospatial data, 3D architectural assets, pedestrian routing, and student gamification.",
        points: [
            "🏛️ Author building records and campus digital twin models",
            "🚶 Draw walkable pathways for mobile turn-by-turn navigation",
            "🎓 Track student exploration points (XP) and daily missions",
        ],
    },
    {
        targetId: "tour-nav-dashboard",
        badge: "OVERVIEW",
        badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
        icon: LayoutDashboard,
        title: "Dashboard & Live Analytics",
        subtitle: "Campus overview, system metrics, and quick actions",
        description:
            "Get high-level visibility across campus facilities, monitor visitor unlock counts, and review real-time student activity logs.",
        points: [
            "📊 Track total buildings, active models, and registered students",
            "📈 Inspect recent check-in trends and daily mission completion",
            "⚠️ Monitor maintenance mode and system operational alerts",
        ],
    },
    {
        targetId: "tour-nav-buildings",
        badge: "CAMPUS MAP",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Building2,
        title: "Buildings & 3D Facilities",
        subtitle: "Author campus facilities with precise GPS coordinates",
        description:
            "Every building is anchored with mandatory coordinates, 3D model configuration, and publishing visibility controls.",
        points: [
            "📍 Mandatory Latitude & Longitude for AR and map placement",
            "📦 Upload Draco-compressed .glb models for AR inspection",
            "🚦 Toggle status: Visible, Maintenance, Hidden, or Draft",
        ],
    },
    {
        targetId: "tour-nav-campus-map",
        badge: "CAMPUS MAP",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: Map,
        title: "Campus Map & Pathways",
        subtitle: "2-way mode switcher for geofences and pathway networks",
        description:
            "Switch between configuring arrival detection radiuses around buildings and authoring connected walking routes.",
        points: [
            "⭕ Map (Arrival Geofences): Set detection radiuses for arrivals",
            "🚶 Pathway Network: Drop entrance, walkway, and POI waypoints",
            "🧭 Graph Routing: Mobile AR computes shortest paths for users",
        ],
    },
    {
        targetId: "tour-nav-compressor",
        badge: "TOOLS",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
        icon: Box,
        title: "3D Model Compressor",
        subtitle: "Draco geometry optimization for mobile 60 FPS performance",
        description:
            "Optimize large CAD and 3D architectural files, reducing sizes from 500 MB down to mobile targets under 25 MB.",
        points: [
            "⚡ Automatic Draco mesh decimation and texture optimization",
            "📊 Real-time before/after polygon and memory analytics",
            "🔗 1-Click assignment directly to campus buildings",
        ],
    },
    {
        targetId: "tour-nav-users",
        badge: "USERS & ACCOUNTS",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        icon: Users,
        title: "User Management Directory",
        subtitle: "All Accounts, Student Rankings, and Visitor Access",
        description:
            "Unified 3-way switcher: browse All Accounts (Students, Visitors, Guests, Admins), inspect student leaderboard XP, and provision visitor credentials.",
        points: [
            "👥 All Accounts: Directory with live role filtering & search",
            "🏆 Student Rankings: Gamification leaderboard and podium",
            "🎫 Visitors: Generate credentials for campus accreditors",
        ],
    },
    {
        targetId: "tour-nav-recycle-bin",
        badge: "SYSTEM & ADMIN",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Trash2,
        title: "Recycle Bin & Safe Holding",
        subtitle: "30-day temporary holding area with 1-click recovery",
        description:
            "Deleted Buildings, Visitor Accounts, Quests, and Trivias are held safely for 30 days before automated permanent cron cleanup.",
        points: [
            "🛡️ Multi-entity safety holding area for all deleted records",
            "⏱️ 30-day countdown badge warns before automated purging",
            "🔄 1-Click Restore to active status or permanent deletion",
        ],
    },
];

export default function AdminOnboardingTour() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [targetRect, setTargetRect] = useState(null);
    const [cardPos, setCardPos] = useState({ top: 100, left: 280, pointerTop: 24 });
    const cardRef = useRef(null);

    const storageKey = user?.id
        ? `@arquest_web_tutorial_completed_${user.id}`
        : "@arquest_web_tutorial_completed_guest";

    const updatePosition = useCallback(() => {
        const step = TOUR_STEPS[currentStep];
        if (!step) return;

        const el = document.getElementById(step.targetId);
        if (el) {
            // Scroll target into view if needed
            el.scrollIntoView({ block: "nearest", behavior: "smooth" });

            const rect = el.getBoundingClientRect();
            setTargetRect({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                bottom: rect.bottom,
                right: rect.right,
            });

            // Calculate card position on desktop (placing speech bubble right of sidebar)
            const isDesktop = window.innerWidth >= 1024;
            const cardHeight = cardRef.current ? cardRef.current.offsetHeight : 340;
            const viewportHeight = window.innerHeight;

            if (isDesktop) {
                // Speech bubble sits on the right of the sidebar item
                const left = Math.min(rect.right + 20, window.innerWidth - 440);
                
                // Align speech bubble vertically centered with the target item
                const targetCenterY = rect.top + rect.height / 2;
                let top = targetCenterY - 60; // offset slightly above center
                
                // Keep inside screen boundaries
                if (top + cardHeight > viewportHeight - 20) {
                    top = Math.max(20, viewportHeight - cardHeight - 20);
                }
                if (top < 20) {
                    top = 20;
                }

                // Pointer arrow relative to card top
                const pointerTop = Math.max(
                    18,
                    Math.min(targetCenterY - top - 10, cardHeight - 34)
                );

                setCardPos({ top, left, pointerTop });
            } else {
                // Mobile/Tablet fallback: Center speech bubble
                setCardPos({
                    top: Math.max(20, (viewportHeight - cardHeight) / 2),
                    left: Math.max(16, (window.innerWidth - 380) / 2),
                    pointerTop: null,
                });
            }
        } else {
            // Fallback if target element not found
            setTargetRect(null);
            setCardPos({
                top: 100,
                left: Math.max(20, (window.innerWidth - 420) / 2),
                pointerTop: null,
            });
        }
    }, [currentStep]);

    useEffect(() => {
        // Auto-open on initial login if not previously completed
        const isCompleted = localStorage.getItem(storageKey);
        if (!isCompleted) {
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [storageKey]);

    useEffect(() => {
        // Listen for manual trigger events
        const handleOpenTour = () => {
            setCurrentStep(0);
            setIsOpen(true);
        };

        window.addEventListener("arquest:open-tour", handleOpenTour);
        return () => window.removeEventListener("arquest:open-tour", handleOpenTour);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        // Give DOM and scroll a moment to settle then position
        const timer = setTimeout(updatePosition, 100);
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [isOpen, currentStep, updatePosition]);

    useEffect(() => {
        // Keyboard navigation
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === "ArrowRight") {
                handleNext();
            } else if (e.key === "ArrowLeft") {
                handlePrev();
            } else if (e.key === "Escape") {
                handleClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, currentStep]);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep((prev) => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleComplete = () => {
        if (dontShowAgain) {
            localStorage.setItem(storageKey, "true");
        }
        setIsOpen(false);
    };

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem(storageKey, "true");
        }
        setIsOpen(false);
    };

    if (!isOpen) return null;

    const step = TOUR_STEPS[currentStep];
    const StepIcon = step.icon;
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === TOUR_STEPS.length - 1;
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-auto">
            {/* Click outside backdrop catcher */}
            <div
                onClick={handleClose}
                className="fixed inset-0 z-[99] cursor-pointer"
            />

            {/* Crystal-Clear Spotlight Cutout Window (Zero Blur, 100% Sharp Focus on Sidebar Item) */}
            {targetRect ? (
                <div
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                        boxShadow:
                            "0 0 0 9999px rgba(10, 10, 15, 0.75), 0 0 25px rgba(255, 255, 255, 0.5)",
                    }}
                    className="fixed z-[100] rounded-md border-2 border-white ring-2 ring-brand/80 pointer-events-none transition-all duration-300"
                />
            ) : (
                <div
                    onClick={handleClose}
                    className="fixed inset-0 z-[100] bg-gray-950/75 transition-opacity duration-300"
                />
            )}

            {/* Pulsing Beacon Pill at sidebar item's right border */}
            {targetRect && isDesktop && (
                <div
                    style={{
                        top: targetRect.top + targetRect.height / 2 - 5,
                        left: targetRect.right + 2,
                    }}
                    className="fixed z-[102] w-2.5 h-2.5 bg-white rounded-full ring-4 ring-brand shadow-md animate-ping pointer-events-none transition-all duration-300"
                />
            )}

            {/* Floating Speech Bubble Tooltip Card */}
            <div
                ref={cardRef}
                style={{
                    top: cardPos.top,
                    left: cardPos.left,
                }}
                className="fixed z-[105] w-[90vw] sm:w-[420px] max-w-[440px] bg-white border border-brand-border rounded-md shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-left-4"
            >
                {/* Speech Bubble Arrow Pointer (pointing left at sidebar item) */}
                {isDesktop && cardPos.pointerTop !== null && (
                    <>
                        {/* Outer shadow triangle */}
                        <div
                            style={{ top: cardPos.pointerTop - 1 }}
                            className="absolute -left-3 w-0 h-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-brand-border/60 pointer-events-none transition-all duration-200"
                        />
                        {/* Inner white fill triangle */}
                        <div
                            style={{ top: cardPos.pointerTop }}
                            className="absolute -left-2.5 w-0 h-0 border-y-[9px] border-y-transparent border-r-[11px] border-r-white pointer-events-none transition-all duration-200"
                        />
                    </>
                )}

                {/* Card Header */}
                <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-brand-light text-brand flex items-center justify-center shrink-0 border border-brand/20 shadow-xs">
                            <StepIcon size={20} />
                        </div>
                        <div>
                            <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${step.badgeColor}`}
                            >
                                {step.badge}
                            </span>
                            <h3 className="text-base font-bold text-gray-900 tracking-tight leading-tight mt-0.5">
                                {step.title}
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                            {currentStep + 1}/{TOUR_STEPS.length}
                        </span>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
                            title="Close Tour (Esc)"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                        {step.description}
                    </p>

                    {/* Highlight Points */}
                    <div className="space-y-1.5 pt-1">
                        {step.points.map((point, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 p-2 bg-brand-light/30 border border-brand-border/40 rounded-md text-[11px] font-semibold text-gray-800"
                            >
                                <span>{point}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card Footer Controls */}
                <div className="p-4 bg-gray-50/80 border-t border-gray-100 rounded-b-md flex flex-col gap-3">
                    {/* Don't show again toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-brand focus:ring-brand border-gray-300 cursor-pointer"
                        />
                        <span className="text-[11px] text-gray-500 font-medium">
                            Don't show this guide on login
                        </span>
                    </label>

                    {/* Progress Dots & Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/60">
                        {/* Step Pagination Dots */}
                        <div className="flex items-center gap-1.5">
                            {TOUR_STEPS.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setCurrentStep(i)}
                                    title={`Step ${i + 1}`}
                                    className={`rounded-md transition-all ${
                                        i === currentStep
                                            ? "w-4 h-1.5 bg-brand"
                                            : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400"
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Back / Skip / Next Buttons */}
                        <div className="flex items-center gap-2">
                            {isFirstStep ? (
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="px-2.5 py-1 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 rounded-md transition-colors"
                                >
                                    Skip
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    className="inline-flex items-center gap-0.5 px-2.5 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-2xs"
                                >
                                    <ChevronLeft size={13} />
                                    Back
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleNext}
                                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-brand hover:bg-brand/90 rounded-md transition-all shadow-sm active:scale-98"
                            >
                                <span>{isLastStep ? "Finish" : "Next"}</span>
                                {isLastStep ? (
                                    <CheckCircle2 size={13} />
                                ) : (
                                    <ChevronRight size={13} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function triggerAdminTour() {
    window.dispatchEvent(new CustomEvent("arquest:open-tour"));
}
