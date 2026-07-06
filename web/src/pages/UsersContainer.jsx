import React, { useState } from "react";
import UserManagement from "./UserManagement";
import LeaderboardPage from "./LeaderboardPage";
import { Users, Trophy } from "lucide-react";

export default function UsersContainer() {
    const [activeTab, setActiveTab] = useState("users");

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Users & Leaderboard
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Manage user access and view student rankings.
                    </p>
                </div>
            </div>

            <div className="flex border-b border-brand-border">
                <button
                    onClick={() => setActiveTab("users")}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors relative ${activeTab === "users" ? "text-brand" : "text-gray-500 hover:text-gray-700"}`}
                >
                    <Users size={18} />
                    Manage Users
                    {activeTab === "users" && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("leaderboard")}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors relative ${activeTab === "leaderboard" ? "text-brand" : "text-gray-500 hover:text-gray-700"}`}
                >
                    <Trophy size={18} />
                    Leaderboard
                    {activeTab === "leaderboard" && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand rounded-t-full" />
                    )}
                </button>
            </div>

            <div className="pt-2">
                {activeTab === "users" && <UserManagement hideHeader={true} />}
                {activeTab === "leaderboard" && (
                    <LeaderboardPage hideHeader={true} />
                )}
            </div>
        </div>
    );
}
