import React, { useState, useEffect } from "react";
import {
    Compass,
    Building2,
    Map,
    Box,
    Users,
    Trash2,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    X,
    CheckCircle2,
    ArrowRight,
    HelpCircle,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const TOUR_STEPS = [
    {
        badge: "CAMPUS PLATFORM",
        badgeColor: "bg-red-50 text-brand border-brand/30",
        icon: Compass,
        title: "Welcome to ARQuest Admin",
        subtitle: "The Operating System for Campus Navigation & Digital Twin Management",
        description:
            "ARQuest allows administrators to digitize campus facilities, map pedestrian pathways, deploy 3D models, and manage real-time gamified exploration for students and visitors.",
        points: [
            {
                emoji: "🏛️",
                title: "Digital Twin Authoring",
                desc: "Manage building profiles, 3D architecture, and interactive floor plans.",
            },
            {
                emoji: "📱",
                title: "Live Mobile Synchronization",
                desc: "All facilities, geofences, and paths sync instantly to the ARQuest mobile app.",
            },
            {
                emoji: "🎓",
                title: "Gamified Campus Life",
                desc: "Engage students with arrival missions, quizzes, badges, and campus rankings.",
            },
        ],
    },
    {
        badge: "CAMPUS MAP",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Building2,
        title: "Buildings & 3D Facilities",
        subtitle: "Author campus landmarks with precise geospatial coordinates",
        description:
            "Every campus building features mandatory coordinates, publishing states, and interactive 3D model support for mobile AR viewports.",
        points: [
            {
                emoji: "📍",
                title: "Mandatory GPS Coordinates",
                desc: "Latitude and Longitude anchor real-time AR markers and map pins on campus.",
            },
            {
                emoji: "📦",
                title: "3D Model Integration",
                desc: "Upload `.glb` CAD architecture with real-time thumbnail regeneration.",
            },
            {
                emoji: "🚦",
                title: "Publishing Controls",
                desc: "Seamlessly switch buildings between Visible, Maintenance, Hidden, and Draft.",
            },
        ],
    },
    {
        badge: "GEODATA & PATHS",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: Map,
        title: "Campus Map & Pathways",
        subtitle: "Unified 2-way mode switcher for geofences and walkable routes",
        description:
            "Manage physical arrival boundaries and author pedestrian pathway networks to guide students between university colleges and landmarks.",
        points: [
            {
                emoji: "⭕",
                title: "Map (Arrival Geofences)",
                desc: "Set arrival detection radiuses around buildings to trigger mobile discoveries.",
            },
            {
                emoji: "🚶",
                title: "Pathway Network Canvas",
                desc: "Drop entrance, walkway, and POI waypoints to create connected walking routes.",
            },
            {
                emoji: "🧭",
                title: "Shortest-Path AR Routing",
                desc: "Mobile AR utilizes this graph network to draw turn-by-turn walking arrows.",
            },
        ],
    },
    {
        badge: "OPTIMIZATION TOOL",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
        icon: Box,
        title: "3D Model Compressor",
        subtitle: "High-performance mesh and texture compression for mobile devices",
        description:
            "Optimize large university architectural CAD models with Draco geometry decimation, reducing file sizes from 500 MB down to mobile-friendly ≤25 MB targets.",
        points: [
            {
                emoji: "⚡",
                title: "Automated Mesh Decimation",
                desc: "Reduces heavy polygon counts while preserving building contours and facades.",
            },
            {
                emoji: "📊",
                title: "Before & After Analytics",
                desc: "Inspect mesh metrics, texture sizing, and compression ratios in real time.",
            },
            {
                emoji: "🔗",
                title: "1-Click Assignment",
                desc: "Assign compressed `.glb` files directly to existing campus buildings.",
            },
        ],
    },
    {
        badge: "USERS & ACCOUNTS",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        icon: Users,
        title: "User Management Directory",
        subtitle: "All Accounts, Student Rankings, and Visitor Access",
        description:
            "Oversee all platform accounts in a unified 3-way management hub with real-time role filtering and gamification tracking.",
        points: [
            {
                emoji: "👥",
                title: "All Accounts Directory",
                desc: "Search, filter, and inspect Students, Visitors, Guests, and Administrators.",
            },
            {
                emoji: "🏆",
                title: "Student Exploration Rankings",
                desc: "Track exploration XP, login streaks, rank tiers, and top campus explorers.",
            },
            {
                emoji: "🎫",
                title: "Visitor Credentials",
                desc: "Create and provision dedicated credentials for campus accreditors and evaluators.",
            },
        ],
    },
    {
        badge: "SYSTEM & ADMIN",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Trash2,
        title: "Recycle Bin & Safe Holding",
        subtitle: "Multi-category 30-day temporary holding area with 1-click recovery",
        description:
            "Deleted campus entities are safely preserved in the Recycle Bin with a 30-day retention countdown before automated permanent cleanup.",
        points: [
            {
                emoji: "🛡️",
                title: "Unified Holding Area",
                desc: "Safely holds deleted Buildings, Visitor Accounts, Quests, and Trivias.",
            },
            {
                emoji: "⏱️",
                title: "30-Day Retention Badges",
                desc: "Warning badges count down remaining days, highlighting urgent items (≤7 days).",
            },
            {
                emoji: "🔄",
                title: "Instant Restore & Hard Delete",
                desc: "Restore entities back to active state or permanently purge with confirmation.",
            },
        ],
    },
    {
        badge: "CONNECTED FEATURES",
        badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
        icon: Sparkles,
        title: "More Features Hub",
        subtitle: "Virtual tours, 3D hotspots, and quests inside the Building Editor",
        description:
            "After saving any building, the More Features hub lets you directly author immersive 360° panoramas, interactive 3D anchors, and student challenges.",
        points: [
            {
                emoji: "📸",
                title: "360° Virtual Tours",
                desc: "Upload equirectangular panoramas and configure walkthrough hotlinks.",
            },
            {
                emoji: "🎯",
                title: "3D Hotspots Editor",
                desc: "Place interactive speech bubbles inside 3D models with daylight lighting.",
            },
            {
                emoji: "🎁",
                title: "Quests & Trivias",
                desc: "Manage building missions, clues, and educational trivia questions.",
            },
        ],
    },
];

export default function AdminOnboardingTour() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const storageKey = user?.id
        ? `@arquest_web_tutorial_completed_${user.id}`
        : "@arquest_web_tutorial_completed_guest";

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
        // Listen for manual trigger events from TopBar or Help shortcuts
        const handleOpenTour = () => {
            setCurrentStep(0);
            setIsOpen(true);
        };

        window.addEventListener("arquest:open-tour", handleOpenTour);
        return () => window.removeEventListener("arquest:open-tour", handleOpenTour);
    }, []);

    useEffect(() => {
        // Keyboard navigation (Arrow keys & Escape)
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/75 backdrop-blur-xs animate-in fade-in duration-200">
            {/* Modal Dialog (Strict 6px: rounded-md) */}
            <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header Zone */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-md bg-brand-light/70 text-brand flex items-center justify-center shrink-0 border border-brand/20 shadow-xs">
                            <StepIcon size={24} />
                        </div>
                        <div>
                            <span
                                className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border mb-1 ${step.badgeColor}`}
                            >
                                {step.badge} • Step {currentStep + 1} of {TOUR_STEPS.length}
                            </span>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight font-heading leading-tight">
                                {step.title}
                            </h2>
                            <p className="text-xs font-semibold text-gray-500 mt-0.5">
                                {step.subtitle}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                        title="Close Tour (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="px-6 py-5 overflow-y-auto space-y-4">
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                        {step.description}
                    </p>

                    {/* Feature Highlights Grid */}
                    <div className="grid grid-cols-1 gap-2.5 pt-1">
                        {step.points.map((point, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-3 p-3 bg-brand-light/25 border border-brand-border/60 rounded-md transition-colors hover:bg-brand-light/40"
                            >
                                <span className="text-lg leading-none mt-0.5 shrink-0 select-none">
                                    {point.emoji}
                                </span>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-gray-900 leading-tight">
                                        {point.title}
                                    </h4>
                                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                                        {point.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Don't show again checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer select-none self-start sm:self-auto">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="w-4 h-4 rounded text-brand focus:ring-brand border-gray-300 cursor-pointer"
                        />
                        <span className="text-xs text-gray-600 font-medium">
                            Don't show this guide on login
                        </span>
                    </label>

                    {/* Step Dots & Navigation Buttons */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Progress Dots */}
                        <div className="flex items-center gap-1.5 px-2">
                            {TOUR_STEPS.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentStep(idx)}
                                    title={`Go to step ${idx + 1}`}
                                    className={`transition-all rounded-md ${
                                        currentStep === idx
                                            ? "w-5 h-1.5 bg-brand"
                                            : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400"
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Back Button */}
                        {!isFirstStep && (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-2xs"
                            >
                                <ChevronLeft size={14} />
                                Back
                            </button>
                        )}

                        {/* Next / Get Started Button */}
                        <button
                            type="button"
                            onClick={handleNext}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-brand/90 rounded-md transition-all shadow-sm active:scale-98"
                        >
                            <span>{isLastStep ? "Get Started" : "Next"}</span>
                            {isLastStep ? (
                                <CheckCircle2 size={14} />
                            ) : (
                                <ChevronRight size={14} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function triggerAdminTour() {
    window.dispatchEvent(new CustomEvent("arquest:open-tour"));
}
