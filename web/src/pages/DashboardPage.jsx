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

    const [systemHealth, setSystemHealth] = useState(null);
    const [featureFlags, setFeatureFlags] = useState(null);
    const [navSummary, setNavSummary] = useState({ nodes: 0, paths: 0, totalDistance: 0 });
    const [leaderboard, setLeaderboard] = useState([]);

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

    const fetchSideData = async () => {
        const api = (await import("../services/api")).default;

        try {
            const res = await api.get("/api/health/");
            setSystemHealth(res.data?.status === "healthy");
        } catch {
            setSystemHealth(false);
        }

        try {
            const res = await api.get("/api/settings/");
            setFeatureFlags(res.data?.data || null);
        } catch {
            setFeatureFlags(null);
        }

        try {
            const [nodesRes, pathsRes] = await Promise.all([
                api.get("/api/navigation/nodes/"),
                api.get("/api/navigation/paths/"),
            ]);
            const nodes = nodesRes.data?.data || [];
            const paths = pathsRes.data?.data || [];
            const totalDistance = paths.reduce((acc, p) => acc + (p.distance_meters || 0), 0);
            setNavSummary({
                nodes: nodes.filter((n) => n.is_active !== false).length,
                paths: paths.filter((p) => p.is_active !== false).length,
                totalDistance: Math.round(totalDistance),
            });
        } catch {
            /* silent */
        }

        try {
            const res = await api.get("/api/auth/leaderboard/");
            const list = res.data?.data || [];
            setLeaderboard(list.slice(0, 3));
        } catch {
            setLeaderboard([]);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchSideData();
    }, []);

    const handleRefresh = () => {
        fetchStats();
        fetchSideData();
    };

    // ── KPI cards (Tier 1 & Tier 2) ────────────────────────────────────────────
    const TIER1_STATS = [
        {
            label: "Total Buildings",
            value: stats.total_buildings,
            icon: Building2,
            sublabel: "Campus Facilities",
            iconColor: "text-brand",
            link: "/buildings",
        },
        {
            label: "Active Students",
            value: stats.active_students,
            icon: Users,
            sublabel: `${stats.role_distribution?.students || stats.active_students || 0} Registered`,
            iconColor: "text-blue-600",
            link: "/users",
        },
        {
            label: "GPS Unlocks Today",
            value: stats.gps_unlocks_today,
            icon: Navigation,
            sublabel: "Building Check-ins",
            iconColor: "text-emerald-600",
            link: "/campus-map",
        },
        {
            label: "Quests Completed",
            value: stats.total_quests_completed,
            icon: Target,
            sublabel: `${stats.quest_completion_rate}% Completion Rate`,
            iconColor: "text-purple-600",
            link: "/buildings",
        },
    ];

    const TIER2_STATS = [
        {
            label: "Open Feedbacks",
            value: stats.content_coverage?.open_feedbacks ?? 0,
            icon: AlertCircle,
            sublabel: "Pending Review",
            iconColor: "text-red-500",
            link: "/feedback",
        },
        {
            label: "Panorama Scenes",
            value: stats.content_coverage?.total_panoramas ?? 0,
            icon: Camera,
            sublabel: "360° Tours",
            iconColor: "text-violet-500",
            link: "/buildings",
        },
        {
            label: "Timed Challenges",
            value: stats.content_coverage?.total_challenges ?? 0,
            icon: Shield,
            sublabel: "w/ Expiry",
            iconColor: "text-orange-500",
            link: "/buildings",
        },
        {
            label: "Trivia Facts",
            value: stats.trivia_facts,
            icon: HelpCircle,
            sublabel: "Learning Content",
            iconColor: "text-amber-500",
            link: "/buildings",
        },
    ];

    // ── Role breakdown ─────────────────────────────────────────────────────────
    const totalUsers = stats.role_distribution?.total || (stats.active_students || 1);
    const studentCount = stats.role_distribution?.students ?? stats.active_students ?? 0;
    const profCount = stats.role_distribution?.professionals ?? 0;
    const visitorCount = stats.role_distribution?.visitors ?? 0;
    const adminCount = stats.role_distribution?.admins ?? 1;

    const studentPercent = Math.round((studentCount / (totalUsers || 1)) * 100);
    const profPercent = Math.round((profCount / (totalUsers || 1)) * 100);
    const visitorPercent = Math.round((visitorCount / (totalUsers || 1)) * 100);
    const adminPercent = Math.max(0, 100 - studentPercent - profPercent - visitorPercent);

    const ROLE_BREAKDOWN = [
        { label: "Students", count: studentCount, percent: studentPercent, color: "bg-blue-500" },
        { label: "Professionals", count: profCount, percent: profPercent, color: "bg-brand" },
        { label: "Visitors", count: visitorCount, percent: visitorPercent, color: "bg-amber-500" },
        { label: "Admins", count: adminCount, percent: adminPercent, color: "bg-gray-500" },
    ];

    // ── Content coverage ───────────────────────────────────────────────────────
    const panoramaPercent = stats.total_buildings > 0
        ? Math.round(((stats.content_coverage?.buildings_with_panoramas || 0) / stats.total_buildings) * 100)
        : 0;

    // ── Feature flags ──────────────────────────────────────────────────────────
    const FLAG_DEFS = [
        { key: "enable_gps", label: "GPS Unlock" },
        { key: "enable_qr", label: "QR Unlock" },
        { key: "enable_ar_selfie", label: "AR Selfie" },
        { key: "enable_trivia", label: "Trivia" },
        { key: "enable_leaderboard", label: "Leaderboard" },
        { key: "enable_accreditation", label: "Accreditation" },
        { key: "maintenance_mode", label: "Maintenance", danger: true },
    ];

    // ── Helpers ────────────────────────────────────────────────────────────────
    const RANK_LABELS = ["🥇", "🥈", "🥉"];

    const feedbackTypeColor = {
        bug: "bg-red-100 text-red-700",
        feature: "bg-blue-100 text-blue-700",
        other: "bg-gray-100 text-gray-600",
    };
    const feedbackTypeLabel = { bug: "🐛 Bug", feature: "✨ Feature", other: "💬 Other" };

    const buildingStatusColor = {
        Live: "bg-emerald-100 text-emerald-700",
        Draft: "bg-amber-100 text-amber-700",
        Hidden: "bg-gray-100 text-gray-500",
        Maintenance: "bg-red-100 text-red-600",
    };

    // ── Loading skeleton ───────────────────────────────────────────────────────
    if (loading && !isRefreshing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-gray-500">Loading Dashboard Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16">
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-l-4 border-l-brand border-y border-r border-gray-200/80 rounded-md p-6 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-heading">
                        Dashboard
                    </h1>
                    <p className="text-sm text-gray-400 mt-1 font-medium">
                        Real-time overview of campus buildings, student activity, and exploration stats.
                    </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                    {/* System Health Indicator */}
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                        <span className="text-gray-500">Status:</span>
                        {systemHealth === null ? (
                            <span className="text-gray-400">Checking...</span>
                        ) : systemHealth ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                                System Operational
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                            </span>
                        ) : (
                            <span className="text-red-600 flex items-center gap-1">
                                System Degraded
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-gray-400 hidden sm:inline font-hud tracking-wide mr-1">
                            Synced {lastUpdated.toLocaleTimeString()}
                        </span>

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-md transition-colors shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={isRefreshing ? "animate-spin text-brand" : "text-gray-500"} />
                        Refresh
                    </button>

                    <Link
                        to="/buildings/new"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-brand/90 rounded-md shadow-sm transition-all"
                    >
                        <Plus size={14} />
                        Add Building
                    </Link>
                    </div>
                </div>
            </div>

            {/* Error alert */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-3 text-red-700 text-sm">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="text-xs font-bold text-red-700 underline hover:no-underline"
                    >
                        Retry Connection
                    </button>
                </div>
            )}

            {/* ── KPI Tier 1: Primary Metrics ─────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {TIER1_STATS.map((stat, i) => (
                    <Link key={i} to={stat.link} className="group">
                        <Card className="relative overflow-hidden border-l-2 border-l-brand/20 group-hover:border-l-brand transition-all duration-300 h-full hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div className="flex flex-col">
                                    <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight font-heading mt-1">
                                        {stat.value}
                                    </h3>
                                    <p className="text-xs font-semibold text-gray-800 mt-1">
                                        {stat.label}
                                    </p>
                                    <div className="w-8 border-b border-gray-100 my-2"></div>
                                    <p className="text-[10px] font-medium text-gray-400 truncate">
                                        {stat.sublabel}
                                    </p>
                                </div>
                                <div className={`p-2 rounded-md shrink-0 bg-gray-50 ${stat.iconColor}`}>
                                    <stat.icon size={20} />
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* ── KPI Tier 2: Secondary Metrics ───────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {TIER2_STATS.map((stat, i) => (
                    <Link key={i} to={stat.link} className="group">
                        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-md hover:border-brand/30 hover:shadow-sm transition-all h-full">
                            <div className="flex items-center gap-3 min-w-0">
                                <stat.icon size={16} className={stat.iconColor} />
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-800 truncate">{stat.label}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{stat.sublabel}</p>
                                </div>
                            </div>
                            <span className="text-xl font-bold text-gray-900 ml-3 shrink-0">
                                {stat.value}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* ── GPS Unlocks Chart + Content Coverage ────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* GPS Unlocks (8 cols) */}
                <div className="lg:col-span-8">
                    <Card className="rounded-md h-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                    <Navigation size={18} className="text-brand" />
                                    GPS Unlocks
                                    {stats.gps_unlocks?.[timeframe]?.length > 0 && (
                                        <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">
                                            ↑ {stats.gps_unlocks[timeframe].reduce((acc, curr) => acc + curr.value, 0)} this period
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Geofence building unlocks recorded across campus
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3">
                                    {["daily", "weekly", "monthly", "yearly"].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTimeframe(t)}
                                            className={`text-xs font-bold capitalize transition-colors relative pb-1 ${
                                                timeframe === t
                                                    ? "text-brand"
                                                    : "text-gray-400 hover:text-gray-700"
                                            }`}
                                        >
                                            {t}
                                            {timeframe === t && (
                                                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand rounded-t-sm" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="w-px h-4 bg-gray-200"></div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setChartType("area")}
                                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors border ${
                                            chartType === "area"
                                                ? "bg-gray-50 border-gray-200 text-gray-800"
                                                : "bg-transparent border-transparent text-gray-400 hover:text-gray-600"
                                        }`}
                                    >
                                        AREA
                                    </button>
                                    <button
                                        onClick={() => setChartType("bar")}
                                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors border ${
                                            chartType === "bar"
                                                ? "bg-gray-50 border-gray-200 text-gray-800"
                                                : "bg-transparent border-transparent text-gray-400 hover:text-gray-600"
                                        }`}
                                    >
                                        BAR
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="h-[280px]">
                            {stats.gps_unlocks?.[timeframe]?.length > 0 ? (
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
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <Navigation size={32} className="mb-2 opacity-20" />
                                    <p className="text-xs">No unlock data for this period</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Content Coverage (4 cols) */}
                <div className="lg:col-span-4">
                    <Card className="rounded-md h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                    <Layers size={18} className="text-brand" />
                                    Campus Content Coverage
                                </h3>
                            </div>
                            <p className="text-xs text-gray-500 mb-5">
                                Deployment status of virtual tours, geofences, and quizzes.
                            </p>

                            <div className="space-y-5">
                                {/* Panoramas */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <Camera size={14} className="text-violet-500" />
                                            360° Panoramas
                                        </span>
                                        <span className="font-bold text-gray-900">
                                            {stats.content_coverage?.buildings_with_panoramas || 0} / {stats.total_buildings} <span className="text-gray-400 font-medium ml-1">({panoramaPercent}%)</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-violet-500 h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${panoramaPercent}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Quests & Challenges */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <Target size={14} className="text-brand" />
                                            Quests &amp; Challenges
                                        </span>
                                        <span className="font-bold text-gray-900">
                                            {stats.content_coverage?.total_quests || 0} / {stats.content_coverage?.total_challenges || 0} <span className="text-gray-400 font-medium ml-1">Timed</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-brand h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (stats.content_coverage?.total_quests || 0) * 10)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Trivia & Quizzes */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <HelpCircle size={14} className="text-amber-500" />
                                            Trivia &amp; Quizzes Pool
                                        </span>
                                        <span className="font-bold text-gray-900">
                                            {stats.content_coverage?.total_quizzes || stats.trivia_facts || 0} Qs
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-amber-400 h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (stats.content_coverage?.total_quizzes || stats.trivia_facts || 0) * 5)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Open Feedbacks Health */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <AlertCircle size={14} className="text-red-500" />
                                            Open Feedback Tickets
                                        </span>
                                        <span className="font-bold text-red-600">
                                            {stats.content_coverage?.open_feedbacks ?? 0} Pending
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-red-500 h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (stats.content_coverage?.open_feedbacks || 0) * 10)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 mt-6 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Manage inside building features</span>
                            <Link to="/buildings" className="text-[11px] font-bold text-brand hover:text-brand/80 transition-colors flex items-center gap-1">
                                View Buildings <ArrowRight size={12} />
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>

            {/* ── Most Visited + Least Visited ─────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Most Visited */}
                <Card className="rounded-md h-full">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-500" />
                            Most Visited Buildings
                        </h3>
                        <Link to="/buildings" className="text-[11px] font-bold text-brand hover:text-brand/80 transition-colors">View All →</Link>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mb-4">Ranked by physical check-ins</p>

                    <div className="space-y-4">
                        {stats.most_visited.map((b, i) => (
                            <div key={i} className="flex items-center gap-3 w-full group">
                                <span className={`w-5 text-xs font-bold text-center ${i === 0 ? "text-amber-500 text-base" : "text-gray-400"}`}>
                                    {i === 0 ? "🏆" : `#${i + 1}`}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between mb-1.5">
                                        <Link
                                            to={`/buildings/${b.id}`}
                                            className="text-xs font-semibold text-gray-800 hover:text-brand truncate max-w-[150px] transition-colors"
                                        >
                                            {b.name}
                                        </Link>
                                        <span className="text-xs font-bold text-gray-900 font-hud">{b.unlock_count}</span>
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
                        ))}
                        {stats.most_visited.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No visits recorded yet</p>
                        )}
                    </div>
                </Card>

                {/* Least Visited */}
                <Card className="rounded-md h-full">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <TrendingDown size={16} className="text-orange-500" />
                            Least Visited Buildings
                        </h3>
                        <Link to="/buildings" className="text-[11px] font-bold text-brand hover:text-brand/80 transition-colors">View All →</Link>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mb-4">Buildings needing more attention</p>

                    <div className="space-y-4">
                        {stats.least_visited.map((b, i) => (
                            <div key={i} className="flex items-center gap-3 w-full group">
                                <span className="w-5 text-xs font-bold text-gray-400 text-center">#{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between mb-1.5 items-center">
                                        <Link
                                            to={`/buildings/${b.id}`}
                                            className="text-xs font-semibold text-gray-800 hover:text-brand truncate max-w-[150px] transition-colors"
                                        >
                                            {b.name}
                                        </Link>
                                        <div className="flex items-center gap-2">
                                            {b.unlock_count === 0 && (
                                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-bold rounded-sm uppercase tracking-wider">
                                                    Zero Visits
                                                </span>
                                            )}
                                            <span className="text-xs font-bold text-gray-900 font-hud">{b.unlock_count}</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-orange-400 h-1.5 rounded-full"
                                            style={{
                                                width: `${Math.min(100, Math.max(4, (b.unlock_count / (stats.most_visited[0]?.unlock_count || 1)) * 100))}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {stats.least_visited.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No visit data yet</p>
                        )}
                    </div>
                </Card>
            </div>

            {/* ── User Role Distribution + Building Status Feed ─────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Role Distribution */}
                <Card className="rounded-md h-full flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <Users size={16} className="text-blue-500" />
                            User Role Distribution
                        </h3>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{totalUsers} Total</span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mb-5">Breakdown of all registered accounts by role</p>

                    <div className="space-y-4 flex-1">
                        {ROLE_BREAKDOWN.map((r) => (
                            <div key={r.label}>
                                <div className="flex justify-between text-xs font-semibold text-gray-800 mb-1.5">
                                    <span>{r.label}</span>
                                    <span className="font-bold text-gray-900 font-hud">
                                        {r.count}{" "}
                                        <span className="text-gray-400 font-medium font-sans text-[10px] ml-1">({r.percent}%)</span>
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                                    <div
                                        className={`${r.color} h-2 rounded-full transition-all duration-500`}
                                        style={{ width: `${r.percent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 mt-6 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Manage all accounts</span>
                        <Link to="/users" className="text-[11px] font-bold text-brand hover:text-brand/80 transition-colors flex items-center gap-1">
                            View Users <ArrowRight size={12} />
                        </Link>
                    </div>
                </Card>

                {/* Building Status Feed */}
                <Card className="rounded-md h-full">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <Building2 size={16} className="text-brand" />
                            Building Status Feed
                        </h3>
                        <Link to="/buildings" className="text-[11px] font-bold text-brand hover:text-brand/80 transition-colors">View All →</Link>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mb-4">Recently updated facilities and their publish status</p>

                    <div className="space-y-1">
                        {stats.building_status.map((b, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded shadow-sm w-12 text-center shrink-0">
                                        {b.code}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-800 truncate group-hover:text-brand transition-colors">
                                        {b.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                    <span className={`w-2 h-2 rounded-full ${
                                        b.status === "Live" ? "bg-emerald-500" :
                                        b.status === "Draft" ? "bg-amber-500" :
                                        b.status === "Maintenance" ? "bg-red-500" : "bg-gray-400"
                                    }`} />
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider w-16">
                                        {b.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {stats.building_status.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No buildings found</p>
                        )}
                    </div>
                </Card>
            </div>

            {/* ── Recent Feedback + History & Logs ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Feedback Inbox */}
                <Card className="rounded-md h-full">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-500" />
                            Recent Feedback
                            {stats.content_coverage?.open_feedbacks > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                                    {stats.content_coverage.open_feedbacks} open
                                </span>
                            )}
                        </h3>
                        <Link to="/feedback" className="text-[11px] font-bold text-brand hover:text-brand/80 transition-colors">View All →</Link>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mb-4">Latest open tickets from students</p>

                    <div className="space-y-3">
                        {stats.recent_feedbacks.map((item, i) => (
                            <div key={i} className="flex flex-col gap-1.5 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${feedbackTypeColor[item.type] || "bg-gray-100 text-gray-600"}`}
                                    >
                                        {feedbackTypeLabel[item.type] || item.type}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-700 line-clamp-1 font-medium">{item.message}</p>
                                {item.user && (
                                    <p className="text-[10px] text-gray-400">by {item.user}</p>
                                )}
                            </div>
                        ))}
                        {stats.recent_feedbacks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                                <AlertCircle size={24} className="mb-2 opacity-20" />
                                <p className="text-xs">No open feedback tickets</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* History & Logs */}
                <Card className="rounded-md h-full">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <Activity size={16} className="text-brand" />
                            History &amp; Logs
                        </h3>
                        <Link to="/history" className="text-[11px] font-bold text-brand hover:text-brand/80 transition-colors">
                            View All →
                        </Link>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mb-4">System notifications and events</p>

                    <div className="space-y-3">
                        {stats.recent_activity.map((item, i) => (
                            <div key={i} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs font-bold text-gray-800 leading-snug truncate">{item.title}</p>
                                        <span className="text-[10px] text-gray-400 shrink-0">
                                            {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{item.message}</p>
                                </div>
                            </div>
                        ))}
                        {stats.recent_activity.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                                <Activity size={24} className="mb-2 opacity-20" />
                                <p className="text-xs">No recent history events</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* ── Leaderboard Snapshot + Campus Navigation Summary ──────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Explorers */}
                <Card className="rounded-md h-full">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <Target size={16} className="text-purple-600" />
                            Top Explorers
                        </h3>
                        <Link to="/users" className="text-[11px] font-bold text-brand hover:text-brand/80 transition-colors">Full Rankings →</Link>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mb-4">Top 3 students by exploration points</p>

                    <div className="space-y-2">
                        {leaderboard.map((user, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50/50 border border-gray-100 rounded-md">
                                <span className="text-lg leading-none drop-shadow-sm">{RANK_LABELS[i]}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-900 truncate">
                                        {user.first_name
                                            ? `${user.first_name} ${user.last_name || ""}`.trim()
                                            : user.username || user.email}
                                    </p>
                                    <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                                </div>
                                <div className="text-right shrink-0 flex items-baseline gap-1">
                                    <span className="text-base font-bold text-brand font-hud tracking-wide">
                                        {user.exploration_points ?? user.points ?? 0}
                                    </span>
                                    <span className="text-[10px] font-bold text-brand/50">XP</span>
                                </div>
                            </div>
                        ))}
                        {leaderboard.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No leaderboard data yet</p>
                        )}
                    </div>
                </Card>

                {/* Campus Navigation Summary */}
                <Card className="rounded-md h-full flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-1">
                            <Navigation size={16} className="text-emerald-500" />
                            Campus Navigation Network
                        </h3>
                        <p className="text-[11px] text-gray-500 font-medium mb-5">Live stats of the pedestrian routing graph</p>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-md p-4 text-center">
                                <p className="text-3xl font-bold text-emerald-700 font-heading">{navSummary.nodes}</p>
                                <p className="text-[10px] font-bold text-emerald-600/70 mt-1 uppercase tracking-wider">Waypoints</p>
                            </div>
                            <div className="bg-blue-50/50 border border-blue-100/50 rounded-md p-4 text-center">
                                <p className="text-3xl font-bold text-blue-700 font-heading">{navSummary.paths}</p>
                                <p className="text-[10px] font-bold text-blue-600/70 mt-1 uppercase tracking-wider">Segments</p>
                            </div>
                            <div className="bg-purple-50/50 border border-purple-100/50 rounded-md p-4 text-center">
                                <p className="text-3xl font-bold text-purple-700 font-heading">{navSummary.totalDistance}</p>
                                <p className="text-[10px] font-bold text-purple-600/70 mt-1 uppercase tracking-wider">Total Meters</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 mt-6 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Edit walkways and nodes</span>
                        <Link to="/campus-map" className="text-[11px] font-bold text-brand hover:text-brand/80 transition-colors flex items-center gap-1">
                            Open GIS Editor <ArrowRight size={12} />
                        </Link>
                    </div>
                </Card>
            </div>

            {/* ── Feature Flag Status Panel ─────────────────────────────────────── */}
            <Card className="rounded-md">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <Shield size={16} className="text-brand" />
                        System Feature Flags
                    </h3>
                    <Link to="/settings" className="text-[11px] font-bold text-brand hover:text-brand/80 transition-colors">
                        Manage in Settings →
                    </Link>
                </div>
                <p className="text-[11px] text-gray-500 font-medium mb-5">Current on/off state of mobile app features</p>

                {featureFlags ? (
                    <div className="flex flex-wrap gap-2.5">
                        {FLAG_DEFS.map((f) => {
                            const isOn = featureFlags[f.key];
                            return (
                                <div
                                    key={f.key}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-md border text-[11px] font-bold shadow-sm transition-all ${
                                        f.danger && isOn
                                            ? "bg-red-50 border-red-200 text-red-700 ring-1 ring-red-500/20"
                                            : isOn
                                            ? "bg-white border-emerald-200 text-emerald-700"
                                            : "bg-gray-50 border-gray-200 text-gray-400"
                                    }`}
                                >
                                    <span
                                        className={`w-2 h-2 rounded-full ${
                                            f.danger && isOn ? "bg-red-500 animate-pulse" : isOn ? "bg-emerald-500" : "bg-gray-300"
                                        }`}
                                    />
                                    <span className="tracking-wide">{f.label}</span>
                                    <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] ${
                                        f.danger && isOn ? "bg-red-100" : isOn ? "bg-emerald-50 text-emerald-600" : "bg-gray-100"
                                    }`}>
                                        {isOn ? "ON" : "OFF"}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-gray-400 py-2">
                        <RefreshCw size={14} className="animate-spin" />
                        <span className="text-xs">Loading feature flags...</span>
                    </div>
                )}
            </Card>
        </div>
    );
}

