import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Users, Trophy, UserCheck } from "lucide-react";
import LeaderboardPage from "./LeaderboardPage";
import ProfessionalsPage from "./ProfessionalsPage";

export default function UserManagementPage({ defaultTab }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    const getInitialTab = () => {
        const tabParam = searchParams.get("tab");
        if (["rankings", "visitors"].includes(tabParam)) return tabParam;
        if (defaultTab) return defaultTab;
        if (location.pathname.includes("professionals")) return "visitors";
        return "rankings";
    };

    const [activeTab, setActiveTabState] = useState(getInitialTab);

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam && ["rankings", "visitors"].includes(tabParam)) {
            setActiveTabState(tabParam);
        } else if (location.pathname.includes("professionals")) {
            setActiveTabState("visitors");
        }
    }, [searchParams, location.pathname]);

    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        setSearchParams({ tab });
    };

    return (
        <div className="space-y-5">
            {/* Top Bar Header & 2-Way Mode Switcher (Strict 6px: rounded-md) */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-brand-border rounded-md px-4 py-3 shadow-xs shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-brand-light text-brand flex items-center justify-center shrink-0">
                        <Users size={18} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2 leading-tight">
                            User Management
                        </h1>
                        <p className="text-[11px] text-gray-500 leading-tight">
                            Student explorer rankings & visitor account management
                        </p>
                    </div>
                </div>

                {/* 2-Way Mode Switcher (Strict 6px: rounded-md) */}
                <div className="inline-flex p-1 bg-gray-100 border border-gray-200 rounded-md shadow-xs self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab("rankings")}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                            activeTab === "rankings"
                                ? "bg-brand text-white shadow-sm"
                                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                        }`}
                    >
                        <Trophy
                            size={14}
                            className={activeTab === "rankings" ? "text-white" : "text-gray-500"}
                        />
                        <span>Student Rankings</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("visitors")}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                            activeTab === "visitors"
                                ? "bg-brand text-white shadow-sm"
                                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                        }`}
                    >
                        <UserCheck
                            size={14}
                            className={activeTab === "visitors" ? "text-white" : "text-gray-500"}
                        />
                        <span>Visitors</span>
                    </button>
                </div>
            </header>

            {/* Content Stage */}
            <div>
                {activeTab === "rankings" && (
                    <LeaderboardPage hideHeader={true} />
                )}
                {activeTab === "visitors" && (
                    <ProfessionalsPage hideHeader={true} />
                )}
            </div>
        </div>
    );
}
