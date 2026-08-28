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
    AlertCircle,
    ArrowRight,
    Layers,
    FileVideo,
    Briefcase,
    ArchiveRestore,
} from "lucide-react";
import { Card } from "../components/ui";
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
    const [error, setError] = useState(null);
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
        setError(null);
        try {
            const data = await dashboardService.getStats();
            if (data) {
                setStats((prev) => ({
                    ...prev,
                    ...data,
                    gps_unlocks: data.gps_unlocks || prev.gps_unlocks,
                    most_visited: data.most_visited || [],
                    least_visited: data.least_visited || [],
                    role_distribution: data.role_distribution || prev.role_distribution,
                    content_coverage: data.content_coverage || prev.content_coverage,
                    recent_activity: data.recent_activity || [],
                    recent_feedbacks: data.recent_feedbacks || [],
                }));
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error("Failed to load dashboard stats", err);
            setError(err?.response?.data?.error?.message || err?.message || "Failed to load dashboard data from backend");
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
            sublabel: "Campus Facilities",
            color: "bg-brand/10 text-brand",
            link: "/buildings",
        },
        {
            label: "Active Students",
            value: stats.active_students,
            icon: Users,
            sublabel: `${stats.role_distribution?.students || stats.active_students || 0} Registered`,
            color: "bg-blue-50 text-blue-700",
            link: "/users",
        },
        {
            label: "GPS Unlocks Today",
            value: stats.gps_unlocks_today,
            icon: Navigation,
            sublabel: "Building Check-ins",
            color: "bg-emerald-50 text-emerald-700",
            link: "/geofences",
        },
        {
            label: "Trivia Facts",
            value: stats.trivia_facts,
            icon: HelpCircle,
            sublabel: "Learning Content",
            color: "bg-amber-50 text-amber-700",
            link: "/cms",
        },
        {
            label: "Quests Completed",
            value: stats.total_quests_completed,
            icon: Target,
            sublabel: `${stats.quest_completion_rate}% Completion Rate`,
            color: "bg-purple-50 text-purple-700",
            link: "/cms",
        },
    ];

    const panoramaPercent = stats.total_buildings > 0
        ? Math.round(((stats.content_coverage?.buildings_with_panoramas || 0) / stats.total_buildings) * 100)
        : 0;

    const totalUsers = stats.role_distribution?.total || (stats.active_students || 1);
    const studentCount = stats.role_distribution?.students ?? stats.active_students ?? 0;
    const profCount = stats.role_distribution?.professionals ?? 0;
    const visitorCount = stats.role_distribution?.visitors ?? 0;
    const adminCount = stats.role_distribution?.admins ?? 1;

    const studentPercent = Math.round((studentCount / (totalUsers || 1)) * 100);
    const profPercent = Math.round((profCount / (totalUsers || 1)) * 100);
    const visitorPercent = Math.round((visitorCount / (totalUsers || 1)) * 100);
    const adminPercent = Math.max(0, 100 - studentPercent - profPercent - visitorPercent);

    if (loading && !isRefreshing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-gray-500">Loading Dashboard Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200/80 rounded-md p-6 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-display">
                        Dashboard
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Real-time overview of campus buildings, student activity, and exploration stats.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 mr-2 hidden sm:inline">
                        Synced {lastUpdated.toLocaleTimeString()}
                    </span>
                    <button
                        onClick={fetchStats}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={isRefreshing ? "animate-spin text-brand" : "text-gray-500"} />
                        Refresh
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

            {/* Error Alert if backend unreachable */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-3 text-red-700 text-sm">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={fetchStats}
                        className="text-xs font-bold text-red-700 underline hover:no-underline"
                    >
                        Retry Connection
                    </button>
                </div>
            )}

            {/* Quick Navigation Shortcuts */}
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
                            <p className="text-xs font-bold text-gray-900">Buildings</p>
                            <p className="text-[11px] text-gray-500">{stats.total_buildings} Facilities</p>
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
                            <p className="text-xs font-bold text-gray-900">Manage Panorama</p>
                            <p className="text-[11px] text-gray-500">{stats.content_coverage?.total_panoramas || 0} Scenes</p>
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
                            <p className="text-xs font-bold text-gray-900">Quests/Trivias/Quizzes</p>
                            <p className="text-[11px] text-gray-500">{stats.content_coverage?.total_quests || 0} Quests</p>
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
                            <p className="text-xs font-bold text-gray-900">Feedback & Issues</p>
                            <p className="text-[11px] text-gray-500">{stats.content_coverage?.open_feedbacks || 0} Pending</p>
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
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 truncate max-w-[100px]">
                                    {stat.sublabel}
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
                {/* GPS Unlocks (8 Columns) */}
                <div className="lg:col-span-8">
                    <Card className="rounded-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                                    <Navigation size={18} className="text-brand" />
                                    GPS Unlocks
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Geofence building unlocks recorded across campus
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
                                        <Bar dataKey="value" fill="#8A1538" radius={[4, 4, 0, 0]} barSize={28} />
                                    </BarChart>
                                ) : (
                                    <AreaChart
                                        data={stats.gps_unlocks?.[timeframe] || []}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="unlockGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8A1538" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#8A1538" stopOpacity={0.0} />
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
                                            stroke="#8A1538"
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

                {/* Content & Media Coverage (4 Columns) */}
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
                                            360° Panoramas
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
                                            Quests & Challenges
                                        </span>
                                        <span className="font-bold text-gray-900">
                                            {stats.content_coverage?.total_quests || 0} Quests
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
                                            {stats.content_coverage?.total_quizzes || stats.trivia_facts || 0} Questions
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (stats.content_coverage?.total_quizzes || stats.trivia_facts || 0) * 5)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-5 mt-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Manage all AR assets</span>
                            <Link to="/cms" className="text-xs font-bold text-brand hover:underline flex items-center gap-1">
                                Open CMS <ArrowRight size={12} />
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>

            {/* 2-Column Detailed Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Most Visited Buildings */}
                <Card className="rounded-md">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-1">
                        <TrendingUp size={16} className="text-emerald-600" />
                        Most Visited Buildings
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

                {/* Column 3: History & Logs */}
                <Card className="rounded-md">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <Activity size={16} className="text-brand" />
                            History & Logs
                        </h3>
                        <Link to="/history" className="text-[11px] font-bold text-brand hover:underline">
                            View All
                        </Link>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">System notifications and events</p>

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
                            <p className="text-xs text-gray-400 text-center py-4">No recent history events</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
