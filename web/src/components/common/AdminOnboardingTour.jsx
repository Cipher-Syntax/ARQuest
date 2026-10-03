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
    Route,
    Trophy,
    ShieldCheck,
    Layers,
    Cpu,
    Sliders,
    MapPin,
    Target,
    Navigation,
    RefreshCw,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const TOUR_STEPS = [
    {
        targetId: "tour-sidebar-header",
        badge: "SYSTEM OVERVIEW",
        badgeColor: "bg-red-50 text-brand border-brand/30",
        icon: Compass,
        title: "Welcome to ARQuest Admin",
        subtitle: "Campus Navigation & Digital Twin Operating System",
        description:
            "This sidebar is your administrative command center for authoring campus geospatial models, pedestrian pathways, building landmarks, and monitoring student gamification.",
        points: [
            {
                icon: Building2,
                title: "Digital Twin Facilities",
                desc: "Author 3D buildings, coordinate anchors, and 360° virtual tours.",
            },
            {
                icon: Route,
                title: "Walkway Pathway Graph",
                desc: "Draw connected pedestrian routes for mobile turn-by-turn guidance.",
            },
            {
                icon: Trophy,
                title: "Student Gamification",
                desc: "Track exploration points, daily quests, and student achievements.",
            },
        ],
    },
    {
        targetId: "tour-nav-dashboard",
        badge: "LIVE TELEMETRY",
        badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
        icon: LayoutDashboard,
        title: "Dashboard & Live Analytics",
        subtitle: "Campus facility metrics, unlock statistics, and activity feed",
        description:
            "Monitor live university engagement in real time, review visitor traffic, and check system operational status across all deployed services.",
        points: [
            {
                icon: Layers,
                title: "Facility Coverage",
                desc: "High-level overview of total buildings, active models, and students.",
            },
            {
                icon: CheckCircle2,
                title: "Student Engagement",
                desc: "Inspect live campus check-ins and daily quest completion rates.",
            },
            {
                icon: ShieldCheck,
                title: "Maintenance Alerts",
                desc: "Real-time visibility into maintenance mode and operational alerts.",
            },
        ],
    },
    {
        targetId: "tour-nav-buildings",
        badge: "FACILITIES HUB",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Building2,
        title: "Buildings & 3D Facilities",
        subtitle: "Author campus facilities with precise GPS coordinates",
        description:
            "Manage every campus building record with mandatory GPS coordinates, Draco-optimized 3D models, and the consolidated 'More Features' hub.",
        points: [
            {
                icon: MapPin,
                title: "Geospatial Anchoring",
                desc: "Precise latitude and longitude anchors for AR calibration and map pins.",
            },
            {
                icon: Box,
                title: "3D Digital Twins",
                desc: "Upload Draco-compressed .glb structural models for native AR.",
            },
            {
                icon: Layers,
                title: "More Features Hub",
                desc: "Configure 360° virtual panoramas, 3D hotspots, and building trivia.",
            },
        ],
    },
    {
        targetId: "tour-nav-campus-map",
        badge: "SPATIAL NETWORKS",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: Map,
        title: "Campus Map & Pathways",
        subtitle: "Dual-mode switcher for arrival geofences and pathway networks",
        description:
            "Seamlessly switch between calibrating building arrival geofences and authoring connected walking routes for turn-by-turn mobile navigation.",
        points: [
            {
                icon: Target,
                title: "Arrival Geofences",
                desc: "Calibrate radial detection perimeters around campus buildings.",
            },
            {
                icon: Route,
                title: "Pathway Graph Authoring",
                desc: "Drop entrance, walkway, and POI waypoints to build the path graph.",
            },
            {
                icon: Navigation,
                title: "Dijkstra Routing",
                desc: "Mobile app computes shortest walking routes with turn-by-turn voice.",
            },
        ],
    },
    {
        targetId: "tour-nav-compressor",
        badge: "ASSET PIPELINE",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
        icon: Box,
        title: "3D Model Compressor",
        subtitle: "Draco mesh optimization for silky 60 FPS mobile performance",
        description:
            "Transform heavy raw CAD and photogrammetry models (up to 500 MB) into lightweight mobile assets under 25 MB directly inside your browser.",
        points: [
            {
                icon: Cpu,
                title: "Mesh Decimation",
                desc: "Automated Draco quantization and polygon indexing with Meshoptimizer.",
            },
            {
                icon: Sliders,
                title: "Telemetry & Metrics",
                desc: "Live before/after polygon reduction, draw calls, and memory savings.",
            },
            {
                icon: CheckCircle2,
                title: "1-Click Assignment",
                desc: "Deploy compressed assets straight to published building records.",
            },
        ],
    },
    {
        targetId: "tour-nav-users",
        badge: "IDENTITY & ROLES",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        icon: Users,
        title: "User Management Directory",
        subtitle: "All Accounts, Student Leaderboard, and Guest Access",
        description:
            "Inspect user accounts with real-time role filtering, explore student gamification rankings, and provision guest/visitor credentials.",
        points: [
            {
                icon: Users,
                title: "Account Directory",
                desc: "Search and filter students, guests, visitors, and campus admins.",
            },
            {
                icon: Trophy,
                title: "Student Hall of Fame",
                desc: "Olympic podium showcasing top explorer XP, ranks, and streaks.",
            },
            {
                icon: ShieldCheck,
                title: "Role Enforcement",
                desc: "Strict capability boundaries between students and guest accounts.",
            },
        ],
    },
    {
        targetId: "tour-nav-recycle-bin",
        badge: "DATA RESILIENCE",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Trash2,
        title: "Recycle Bin & Safe Holding",
        subtitle: "30-day temporary holding area with 1-click recovery",
        description:
            "Accidental deletions are never catastrophic. Archived buildings, visitor accounts, and quests remain safely recoverable for 30 days.",
        points: [
            {
                icon: ShieldCheck,
                title: "Safety Net Protection",
                desc: "Soft-delete staging buffer for all platform entities.",
            },
            {
                icon: RefreshCw,
                title: "1-Click Instant Restore",
                desc: "Restore records back into production with complete relational integrity.",
            },
            {
                icon: Trash2,
                title: "Automated Cleanup",
                desc: "Automated purge only executes after 30-day retention expiration.",
            },
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
            // Scroll target smoothly into view
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
            const cardHeight = cardRef.current ? cardRef.current.offsetHeight : 380;
            const viewportHeight = window.innerHeight;

            if (isDesktop) {
                // Speech bubble sits comfortably to the right of the sidebar item
                const left = Math.min(rect.right + 20, window.innerWidth - 460);

                // Align speech bubble vertically centered with the target item
                const targetCenterY = rect.top + rect.height / 2;
                let top = targetCenterY - 70;

                // Keep inside screen boundaries
                if (top + cardHeight > viewportHeight - 20) {
                    top = Math.max(20, viewportHeight - cardHeight - 20);
                }
                if (top < 20) {
                    top = 20;
                }

                // Pointer arrow relative to card top
                const pointerTop = Math.max(
                    24,
                    Math.min(targetCenterY - top - 10, cardHeight - 38)
                );

                setCardPos({ top, left, pointerTop });
            } else {
                // Mobile/Tablet fallback: Center card
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
                left: Math.max(20, (window.innerWidth - 440) / 2),
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
        // Listen for manual trigger events from header or settings
        const handleOpenTour = () => {
            setCurrentStep(0);
            setIsOpen(true);
        };

        window.addEventListener("arquest:open-tour", handleOpenTour);
        return () => window.removeEventListener("arquest:open-tour", handleOpenTour);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        // Give DOM and scroll a moment to settle then calculate position
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
        // Keyboard navigation support
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
    const progressPercent = ((currentStep + 1) / TOUR_STEPS.length) * 100;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-auto">
            {/* Click outside backdrop catcher */}
            <div
                onClick={handleClose}
                className="fixed inset-0 z-[99] cursor-pointer"
            />

            {/* Crystal-Clear Spotlight Cutout Window */}
            {targetRect ? (
                <div
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                        boxShadow:
                            "0 0 0 9999px rgba(15, 23, 42, 0.78), 0 0 25px rgba(255, 255, 255, 0.45)",
                    }}
                    className="fixed z-[100] rounded-md border-2 border-white ring-2 ring-brand/90 pointer-events-none transition-all duration-300"
                />
            ) : (
                <div
                    onClick={handleClose}
                    className="fixed inset-0 z-[100] bg-slate-900/80 transition-opacity duration-300"
                />
            )}

            {/* Pulsing Beacon Indicator at sidebar item */}
            {targetRect && isDesktop && (
                <div
                    style={{
                        top: targetRect.top + targetRect.height / 2 - 5,
                        left: targetRect.right + 2,
                    }}
                    className="fixed z-[102] w-2.5 h-2.5 bg-white rounded-full ring-4 ring-brand shadow-md animate-ping pointer-events-none transition-all duration-300"
                />
            )}

            {/* Redesigned Floating Guide Card */}
            <div
                ref={cardRef}
                style={{
                    top: cardPos.top,
                    left: cardPos.left,
                }}
                className="fixed z-[105] w-[92vw] sm:w-[440px] max-w-[460px] bg-white border border-brand-border rounded-md shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Top Crimson Accent Header Bar with Interactive Step Progress */}
                <div className="h-1 bg-gray-100 relative overflow-hidden">
                    <div
                        style={{ width: `${progressPercent}%` }}
                        className="h-full bg-brand transition-all duration-300 ease-out"
                    />
                </div>

                {/* Speech Bubble Arrow Pointer (Desktop) */}
                {isDesktop && cardPos.pointerTop !== null && (
                    <>
                        <div
                            style={{ top: cardPos.pointerTop - 1 }}
                            className="absolute -left-3 w-0 h-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-brand-border pointer-events-none transition-all duration-200"
                        />
                        <div
                            style={{ top: cardPos.pointerTop }}
                            className="absolute -left-2.5 w-0 h-0 border-y-[9px] border-y-transparent border-r-[11px] border-r-white pointer-events-none transition-all duration-200"
                        />
                    </>
                )}

                {/* Card Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 bg-white">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-brand-light text-brand flex items-center justify-center shrink-0 border border-brand/20 shadow-xs">
                                <StepIcon size={20} />
                            </div>
                            <div>
                                <span
                                    className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-widest font-hud border ${step.badgeColor}`}
                                >
                                    {step.badge}
                                </span>
                                <h3 className="text-base font-extrabold text-gray-900 tracking-tight leading-tight mt-0.5 font-heading">
                                    {step.title}
                                </h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-sm font-hud">
                                {currentStep + 1} / {TOUR_STEPS.length}
                            </span>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
                                title="Close Guide (Esc)"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed">
                        {step.subtitle}
                    </p>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 space-y-3.5 bg-gray-50/50">
                    <p className="text-xs text-gray-700 leading-relaxed font-normal">
                        {step.description}
                    </p>

                    {/* Feature Highlight Cards */}
                    <div className="space-y-2 pt-1">
                        {step.points.map((pt, idx) => {
                            const PointIcon = pt.icon;
                            return (
                                <div
                                    key={idx}
                                    className="flex items-start gap-2.5 p-2.5 bg-white border border-gray-200/80 rounded-md shadow-2xs hover:border-brand/40 transition-colors"
                                >
                                    <div className="w-6 h-6 rounded bg-brand-light text-brand flex items-center justify-center shrink-0 mt-0.5 border border-brand/20">
                                        <PointIcon size={13} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-bold text-gray-900 leading-snug">
                                            {pt.title}
                                        </h4>
                                        <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                                            {pt.desc}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Card Footer Controls */}
                <div className="p-4 sm:p-5 bg-white border-t border-gray-100 flex flex-col gap-3.5">
                    {/* Don't show again toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-brand focus:ring-brand border-gray-300 cursor-pointer accent-brand"
                        />
                        <span className="text-[11px] text-gray-500 font-medium">
                            Don't show this guide automatically on login
                        </span>
                    </label>

                    {/* Step Navigation & Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                        {/* Step Pagination Dots (Interactive) */}
                        <div className="flex items-center gap-1.5">
                            {TOUR_STEPS.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setCurrentStep(i)}
                                    title={`Go to step ${i + 1}`}
                                    className={`rounded-sm transition-all duration-200 ${
                                        i === currentStep
                                            ? "w-5 h-1.5 bg-brand"
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
                                    className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                                >
                                    Skip Tour
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-2xs"
                                >
                                    <ChevronLeft size={14} />
                                    <span>Back</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleNext}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-brand hover:bg-brand/90 rounded-md transition-all shadow-xs active:scale-98"
                            >
                                <span>{isLastStep ? "Finish Guide" : "Next Step"}</span>
                                {isLastStep ? (
                                    <CheckCircle2 size={14} />
                                ) : (
                                    <ChevronRight size={14} />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Desktop Keyboard Hints */}
                    {isDesktop && (
                        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 font-mono border-t border-gray-50">
                            <span>Use keyboard arrows:</span>
                            <div className="flex items-center gap-2">
                                <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9px]">←</kbd> Prev</span>
                                <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9px]">→</kbd> Next</span>
                                <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9px]">Esc</kbd> Close</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function triggerAdminTour() {
    window.dispatchEvent(new CustomEvent("arquest:open-tour"));
}
