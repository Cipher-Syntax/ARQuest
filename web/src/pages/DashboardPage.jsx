import { useState, useEffect } from "react";
import {
    Building2,
    Users,
    Navigation,
    HelpCircle,
    Target,
    TrendingUp,
    TrendingDown,
    Camera,
    RefreshCw,
    Plus,
    Activity,
    Shield,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    MapPin,
    Layers,
    Clock,
    Sparkles,
} from "lucide-react";
import { Card, Badge, Button } from "../components/ui";
import { dashboardService } from "../services/dashboardService";
import { Link } from "react-router-dom";
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
    const [timeframe, setTimeframe] = useState("weekly");
    const [chartType, setChartType] = useState("area");
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const [stats, setStats] = useState({
        total_buildings: 0,
        active_students: 0,
        trivia_facts: 0,
        gps_unlocks_today: 0,
        gps_unlocks: {
            daily: [],
            weekly: [],
            monthly: [],
            yearly: [],
        },
        building_status: [],
        most_visited: [],
        least_visited: [],
        quest_completion_rate: 0,
        total_quests_completed: 0,
        role_distribution: {
            students: 0,
            professionals: 0,
            visitors: 0,
            admins: 0,
            total: 0,
        },
        content_coverage: {
            total_buildings: 0,
            buildings_with_panoramas: 0,
            total_panoramas: 0,
            total_quests: 0,
            total_challenges: 0,
            total_quizzes: 0,
            open_feedbacks: 0,
        },
        recent_activity: [],
        recent_feedbacks: [],
    });

    const fetchStats = async () => {
        setIsRefreshing(true);
        try {
            const data = await dashboardService.getStats();
            setStats(data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Failed to load dashboard stats", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const STATS = [
        {
            label: "Total Buildings",
            value: stats.total_buildings,
            icon: Building2,
            trend: "Campus Facilities",
            color: "bg-brand/10 text-brand",
            link: "/buildings",
        },
        {
            label: "Active Students",
            value: stats.active_students,
            icon: Users,
            trend: `${stats.role_distribution?.students || 0} Registered`,
            color: "bg-blue-50 text-blue-700",
            link: "/users",
        },
        {
            label: "GPS Unlocks Today",
            value: stats.gps_unlocks_today,
            icon: Navigation,
            trend: "Live Foot Traffic",
            color: "bg-emerald-50 text-emerald-700",
            link: "/geofences",
        },
        {
            label: "Quests Completed",
            value: stats.total_quests_completed,
            icon: Target,
            trend: `${stats.quest_completion_rate}% Rate`,
            color: "bg-purple-50 text-purple-700",
            link: "/cms",
        },
        {
            label: "Unresolved Issues",
            value: stats.content_coverage?.open_feedbacks || 0,
            icon: AlertCircle,
            trend: stats.content_coverage?.open_feedbacks > 0 ? "Requires Review" : "All Clean",
            color: stats.content_coverage?.open_feedbacks > 0 ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-700",
            link: "/feedback",
        },
    ];

    const panoramaPercent = stats.total_buildings > 0
        ? Math.round((stats.content_coverage?.buildings_with_panoramas / stats.total_buildings) * 100)
        : 0;

    const totalUsers = stats.role_distribution?.total || 1;
    const studentPercent = Math.round(((stats.role_distribution?.students || 0) / totalUsers) * 100);
    const profPercent = Math.round(((stats.role_distribution?.professionals || 0) / totalUsers) * 100);
    const visitorPercent = Math.round(((stats.role_distribution?.visitors || 0) / totalUsers) * 100);
    const adminPercent = Math.max(0, 100 - studentPercent - profPercent - visitorPercent);

    return (
        <div className="space-y-6 pb-12">
            {/* Hero Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200/80 rounded-md p-6 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live System Operational
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs font-medium text-gray-500">
                            Last synced {lastUpdated.toLocaleTimeString()}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        Campus Operational Overview
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Real-time analytics for ARQuest campus exploration, foot traffic, and user engagement.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchStats}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={isRefreshing ? "animate-spin text-brand" : "text-gray-500"} />
                        Refresh Data
                    </button>
                    <Link
                        to="/buildings"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-brand/90 rounded-md shadow-sm transition-all"
                    >
                        <Plus size={14} />
                        Add Building
                    </Link>
                </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link
                    to="/buildings"
                    className="flex items-center justify-between p-3.5 bg-white border border-gray-200/80 rounded-md hover:border-brand/40 hover:shadow-sm transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-brand/10 text-brand">
                            <Building2 size={16} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-900">Manage Buildings</p>
                            <p className="text-[11px] text-gray-500">{stats.total_buildings} active facilities</p>
                        </div>
                    </div>
                    <ArrowRight size={14} className="text-gray-400 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                    to="/panoramas"
                    className="flex items-center justify-between p-3.5 bg-white border border-gray-200/80 rounded-md hover:border-brand/40 hover:shadow-sm transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-purple-50 text-purple-700">
                            <Camera size={16} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-900">360° Panoramas</p>
                            <p className="text-[11px] text-gray-500">{stats.content_coverage?.total_panoramas || 0} scenes live</p>
                        </div>
                    </div>
                    <ArrowRight size={14} className="text-gray-400 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                    to="/cms"
                    className="flex items-center justify-between p-3.5 bg-white border border-gray-200/80 rounded-md hover:border-brand/40 hover:shadow-sm transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-blue-50 text-blue-700">
                            <Target size={16} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-900">Quests & Quizzes</p>
                            <p className="text-[11px] text-gray-500">{stats.content_coverage?.total_quests || 0} active quests</p>
                        </div>
                    </div>
                    <ArrowRight size={14} className="text-gray-400 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                    to="/feedback"
                    className="flex items-center justify-between p-3.5 bg-white border border-gray-200/80 rounded-md hover:border-brand/40 hover:shadow-sm transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-amber-50 text-amber-700">
                            <AlertCircle size={16} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-900">User Feedback</p>
                            <p className="text-[11px] text-gray-500">{stats.content_coverage?.open_feedbacks || 0} pending review</p>
                        </div>
                    </div>
                    <ArrowRight size={14} className="text-gray-400 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                </Link>
            </div>

            {/* 5 KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {STATS.map((stat, i) => (
                    <Link key={i} to={stat.link}>
                        <Card className="relative overflow-hidden hover:border-brand/30 transition-all rounded-md">
                            <div className="flex items-start justify-between">
                                <div className={`p-2 rounded-md ${stat.color}`}>
                                    <stat.icon size={16} />
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                                    {stat.trend}
                                </span>
                            </div>
                            <div className="mt-3">
                                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                                    {stat.value}
                                </h3>
                                <p className="text-xs font-semibold text-gray-500 mt-0.5">
                                    {stat.label}
                                </p>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Main Charts & Coverage Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Foot Traffic & GPS Unlocks (7 Columns) */}
                <div className="lg:col-span-8">
                    <Card className="rounded-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                                    <Navigation size={18} className="text-brand" />
                                    Campus Foot Traffic & GPS Unlocks
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Physical geofence check-ins recorded across campus facilities
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-gray-100 rounded-md p-1">
                                    {["daily", "weekly", "monthly", "yearly"].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTimeframe(t)}
                                            className={`px-2.5 py-1 text-xs font-bold rounded-md capitalize transition-colors ${
                                                timeframe === t
                                                    ? "bg-white text-gray-900 shadow-sm"
                                                    : "text-gray-500 hover:text-gray-900"
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center bg-gray-100 rounded-md p-1">
                                    <button
                                        onClick={() => setChartType("area")}
                                        className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
                                            chartType === "area"
                                                ? "bg-white text-gray-900 shadow-sm"
                                                : "text-gray-500 hover:text-gray-900"
                                        }`}
                                    >
                                        Area
                                    </button>
                                    <button
                                        onClick={() => setChartType("bar")}
                                        className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
                                            chartType === "bar"
                                                ? "bg-white text-gray-900 shadow-sm"
                                                : "text-gray-500 hover:text-gray-900"
                                        }`}
                                    >
                                        Bar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                {chartType === "bar" ? (
                                    <BarChart
                                        data={stats.gps_unlocks?.[timeframe] || []}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    >
                                        <XAxis
                                            dataKey="label"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: "#6B7280", fontWeight: "600" }}
                                            dy={5}
                                        />
                                        <Tooltip
                                            cursor={{ fill: "rgba(138, 21, 56, 0.05)" }}
                                            contentStyle={{
                                                borderRadius: "6px",
                                                border: "1px solid #E5E7EB",
                                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                                            }}
                                            labelStyle={{ fontWeight: "bold", color: "#111827", marginBottom: "4px" }}
                                        />
                                        <Bar dataKey="value" fill="#9b1b30" radius={[4, 4, 0, 0]} barSize={28} />
                                    </BarChart>
                                ) : (
                                    <AreaChart
                                        data={stats.gps_unlocks?.[timeframe] || []}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="unlockGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#9b1b30" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#9b1b30" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="label"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: "#6B7280", fontWeight: "600" }}
                                            dy={5}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: "6px",
                                                border: "1px solid #E5E7EB",
                                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                                            }}
                                            labelStyle={{ fontWeight: "bold", color: "#111827", marginBottom: "4px" }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#9b1b30"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#unlockGrad)"
                                        />
                                    </AreaChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Campus Content & Coverage (4 Columns) */}
                <div className="lg:col-span-4">
                    <Card className="rounded-md h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                                    <Layers size={18} className="text-brand" />
                                    Campus Content Coverage
                                </h3>
                            </div>
                            <p className="text-xs text-gray-500 mb-5">
                                Deployment status of virtual tours, geofences, and quizzes.
                            </p>

                            <div className="space-y-4">
                                {/* 360 Panoramas Coverage */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <Camera size={13} className="text-purple-600" />
                                            360° Virtual Walkthroughs
                                        </span>
                                        <span className="font-bold text-gray-900">
                                            {stats.content_coverage?.buildings_with_panoramas || 0}/{stats.total_buildings} ({panoramaPercent}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${panoramaPercent}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Active Quests & Challenges */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <Target size={13} className="text-brand" />
                                            Active Quests & Missions
                                        </span>
                                        <span className="font-bold text-gray-900">
                                            {stats.content_coverage?.total_quests || 0} Live Quests
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-brand h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (stats.content_coverage?.total_quests || 0) * 10)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Quizzes & Trivia */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <HelpCircle size={13} className="text-emerald-600" />
                                            Trivia & Quizzes Pool
                                        </span>
                                        <span className="font-bold text-gray-900">
                                            {stats.content_coverage?.total_quizzes || 0} Questions
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (stats.content_coverage?.total_quizzes || 0) * 5)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-5 mt-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Manage all AR assets</span>
                            <Link to="/cms" className="text-xs font-bold text-brand hover:underline flex items-center gap-1">
                                Open CMS Hub <ArrowRight size={12} />
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>

            {/* 3-Column Detailed Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Column 1: Most & Least Visited Buildings */}
                <Card className="rounded-md">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-1">
                        <TrendingUp size={16} className="text-emerald-600" />
                        Top Visited Facilities
                    </h3>
                    <p className="text-[11px] text-gray-500 mb-4">Ranked by physical check-ins</p>

                    <div className="space-y-3">
                        {stats.most_visited.map((b, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 w-full">
                                    <span className="w-5 text-xs font-bold text-gray-400">#{i + 1}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs font-semibold text-gray-800 truncate max-w-[150px]">
                                                {b.name}
                                            </span>
                                            <span className="text-xs font-bold text-gray-900">
                                                {b.unlock_count}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-emerald-500 h-1.5 rounded-full"
                                                style={{
                                                    width: `${Math.min(100, (b.unlock_count / (stats.most_visited[0]?.unlock_count || 1)) * 100)}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {stats.most_visited.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No visits recorded yet</p>
                        )}
                    </div>
                </Card>

                {/* Column 2: User Role Composition */}
                <Card className="rounded-md">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-1">
                        <Shield size={16} className="text-blue-600" />
                        User Role Composition
                    </h3>
                    <p className="text-[11px] text-gray-500 mb-4">{stats.role_distribution?.total || 0} Total registered accounts</p>

                    <div className="space-y-3.5">
                        {/* Students */}
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-gray-700">Students</span>
                                <span className="font-bold text-gray-900">
                                    {stats.role_distribution?.students || 0} ({studentPercent}%)
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${studentPercent}%` }} />
                            </div>
                        </div>

                        {/* Accreditors / Professionals */}
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-gray-700">Accreditors & Faculty</span>
                                <span className="font-bold text-gray-900">
                                    {stats.role_distribution?.professionals || 0} ({profPercent}%)
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${profPercent}%` }} />
                            </div>
                        </div>

                        {/* Visitors */}
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-gray-700">Guests & Visitors</span>
                                <span className="font-bold text-gray-900">
                                    {stats.role_distribution?.visitors || 0} ({visitorPercent}%)
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${visitorPercent}%` }} />
                            </div>
                        </div>

                        {/* Administrators */}
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-gray-700">Administrators</span>
                                <span className="font-bold text-gray-900">
                                    {stats.role_distribution?.admins || 0} ({adminPercent}%)
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-brand h-2 rounded-full" style={{ width: `${adminPercent}%` }} />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Column 3: Recent Activity & Open Feedback */}
                <Card className="rounded-md">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <Activity size={16} className="text-brand" />
                            Live System Events
                        </h3>
                        <Link to="/history" className="text-[11px] font-bold text-brand hover:underline">
                            View All
                        </Link>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">Audit trail and mobile alerts</p>

                    <div className="space-y-2.5">
                        {stats.recent_activity.map((item, i) => (
                            <div key={i} className="p-2.5 bg-gray-50 rounded-md border border-gray-100">
                                <p className="text-xs font-bold text-gray-800 leading-snug">{item.title}</p>
                                <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{item.message}</p>
                                <span className="text-[10px] text-gray-400 block mt-1">
                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                        {stats.recent_activity.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No recent system events</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
