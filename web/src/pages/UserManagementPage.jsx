import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Users, Trophy, UserCheck, Shield } from "lucide-react";
import UserManagement from "./UserManagement";
import LeaderboardPage from "./LeaderboardPage";
import ProfessionalsPage from "./ProfessionalsPage";

export default function UserManagementPage({ defaultTab }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    const getInitialTab = () => {
        const tabParam = searchParams.get("tab");
        if (["accounts", "all", "rankings", "visitors"].includes(tabParam)) {
            return tabParam === "all" ? "accounts" : tabParam;
        }
        if (defaultTab) return defaultTab;
        if (location.pathname.includes("professionals")) return "visitors";
        return "accounts";
    };

    const [activeTab, setActiveTabState] = useState(getInitialTab);

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam && ["accounts", "all", "rankings", "visitors"].includes(tabParam)) {
            setActiveTabState(tabParam === "all" ? "accounts" : tabParam);
        } else if (location.pathname.includes("professionals")) {
            setActiveTabState("visitors");
        }
    }, [searchParams, location.pathname]);

    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        setSearchParams(tab === "accounts" ? {} : { tab });
    };

    return (
        <div className="space-y-5">
            {/* Top Bar Header & 3-Way Mode Switcher (Strict 6px: rounded-md) */}
            <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white border border-brand-border rounded-md px-4 py-3 shadow-xs shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-brand-light text-brand flex items-center justify-center shrink-0">
                        <Users size={18} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2 leading-tight">
                            User Management
                        </h1>
                        <p className="text-[11px] text-gray-500 leading-tight">
                            Directory of campus accounts, student rankings, and visitor access
                        </p>
                    </div>
                </div>

                {/* 3-Way Mode Switcher (Strict 6px: rounded-md) */}
                <div className="inline-flex p-1 bg-gray-100 border border-gray-200 rounded-md shadow-xs self-start lg:self-auto overflow-x-auto max-w-full">
                    <button
                        type="button"
                        onClick={() => setActiveTab("accounts")}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === "accounts"
                                ? "bg-brand text-white shadow-sm"
                                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                        }`}
                    >
                        <Users
                            size={14}
                            className={activeTab === "accounts" ? "text-white" : "text-gray-500"}
                        />
                        <span>All Accounts</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("rankings")}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
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
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
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
                {activeTab === "accounts" && (
                    <UserManagement hideHeader={true} />
                )}
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
