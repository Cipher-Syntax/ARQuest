import { useState, useEffect, useMemo } from "react";
import { Card, Badge, Pagination, Modal, Button } from "../components/ui";
import {
    Trophy,
    Medal,
    Search,
    Download,
    Flame,
    Crown,
    Award,
    Sparkles,
    Users,
    TrendingUp,
    Calendar,
    Mail,
    User as UserIcon,
} from "lucide-react";
import { userService } from "../services/userService";
import { getAvatarUri } from "../utils/avatarUtils";

// Progression Ranks Matching ARQuest Gamification Engine
const RANKS = [
    {
        level: 1,
        title: "Freshman",
        min_exp: 0,
        icon: "🎒",
        badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    },
    {
        level: 2,
        title: "Explorer",
        min_exp: 100,
        icon: "🗺️",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
        level: 3,
        title: "Scout",
        min_exp: 300,
        icon: "⛺",
        badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    },
    {
        level: 4,
        title: "Ranger",
        min_exp: 600,
        icon: "🦅",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    {
        level: 5,
        title: "Veteran",
        min_exp: 1000,
        icon: "⚔️",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
        level: 6,
        title: "Campus Legend",
        min_exp: 2000,
        icon: "👑",
        badgeColor: "bg-amber-50 text-amber-800 border-amber-300",
    },
];

const getRankDetails = (exp = 0, rankInfo = null) => {
    let rank = RANKS[0];
    let nextRank = RANKS[1];

    for (let i = 0; i < RANKS.length; i++) {
        if (exp >= RANKS[i].min_exp) {
            rank = RANKS[i];
            nextRank = i + 1 < RANKS.length ? RANKS[i + 1] : null;
        } else {
            break;
        }
    }

    const currentRankExp = rank.min_exp;
    const nextRankExp = nextRank ? nextRank.min_exp : null;
    const progress = nextRankExp
        ? Math.min(
              100,
              Math.max(
                  0,
                  Math.round(
                      ((exp - currentRankExp) / (nextRankExp - currentRankExp)) *
                          100,
                  ),
              ),
          )
        : 100;

    return {
        level: rankInfo?.level || rank.level,
        title: rankInfo?.title || rank.title,
        icon: rankInfo?.icon || rank.icon,
        badgeColor: rank.badgeColor,
        currentRankExp,
        nextRankExp,
        progress,
    };
};

export default function LeaderboardPage({ hideHeader }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                setLoading(true);
                const data = await userService.getLeaderboard();
                setUsers(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to load leaderboard", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const filteredUsers = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return users;
        return users.filter((user) => {
            const first = user.first_name?.toLowerCase() || "";
            const last = user.last_name?.toLowerCase() || "";
            const username = user.username?.toLowerCase() || "";
            const email = user.email?.toLowerCase() || "";
            const rankTitle =
                getRankDetails(user.exploration_points, user.rank_info)
                    .title.toLowerCase();
            return (
                first.includes(term) ||
                last.includes(term) ||
                username.includes(term) ||
                email.includes(term) ||
                rankTitle.includes(term)
            );
        });
    }, [users, searchTerm]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Top 3 Podium Students (Always based on overall standings)
    const top3 = useMemo(() => users.slice(0, 3), [users]);
    const firstPlace = top3[0] || null;
    const secondPlace = top3[1] || null;
    const thirdPlace = top3[2] || null;

    // Leaderboard Summary Metrics
    const metrics = useMemo(() => {
        if (!users.length) {
            return { totalStudents: 0, topScore: 0, avgScore: 0, legendsCount: 0 };
        }
        const totalStudents = users.length;
        const topScore = users[0]?.exploration_points || 0;
        const totalExp = users.reduce(
            (acc, u) => acc + (u.exploration_points || 0),
            0,
        );
        const avgScore = Math.round(totalExp / totalStudents);
        const legendsCount = users.filter(
            (u) => (u.exploration_points || 0) >= 2000,
        ).length;
        return { totalStudents, topScore, avgScore, legendsCount };
    }, [users]);

    // Export CSV Report Functionality
    const handleExportCSV = () => {
        if (!users.length) return;
        const headers = [
            "Rank,Student ID,Username,Full Name,Email,Exploration Points,Rank Level,Rank Title,Streak Days,Date Joined",
        ];
        const rows = users.map((u, i) => {
            const rank = i + 1;
            const rankDetails = getRankDetails(u.exploration_points, u.rank_info);
            const fullName = `"${((u.first_name || "") + " " + (u.last_name || "")).trim() || u.username}"`;
            const joined = u.date_joined
                ? new Date(u.date_joined).toLocaleDateString()
                : "";
            return [
                rank,
                u.id,
                `"${u.username || ""}"`,
                fullName,
                `"${u.email || ""}"`,
                u.exploration_points || 0,
                rankDetails.level,
                `"${rankDetails.title}"`,
                u.streak_count || 0,
                `"${joined}"`,
            ].join(",");
        });

        const csvString = [headers, ...rows].join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
            "download",
            `arquest-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {!hideHeader && (
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 font-heading">
                        Leaderboard
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Campus student rankings based on exploration points from
                        geofenced facility quests and trivias.
                    </p>
                </div>
            )}

            {/* KPI Summary Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="p-4 sm:p-5 flex items-center gap-3.5 border-brand-border/70 hover:shadow-md transition-shadow">
                    <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                        <Users size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Total Explorers
                        </p>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-900 font-hud">
                            {metrics.totalStudents}
                        </p>
                    </div>
                </Card>

                <Card className="p-4 sm:p-5 flex items-center gap-3.5 border-brand-border/70 hover:shadow-md transition-shadow">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Trophy size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Top Campus Score
                        </p>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-900 font-hud">
                            {metrics.topScore.toLocaleString()} XP
                        </p>
                    </div>
                </Card>

                <Card className="p-4 sm:p-5 flex items-center gap-3.5 border-brand-border/70 hover:shadow-md transition-shadow">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Average Points
                        </p>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-900 font-hud">
                            {metrics.avgScore.toLocaleString()} XP
                        </p>
                    </div>
                </Card>

                <Card className="p-4 sm:p-5 flex items-center gap-3.5 border-brand-border/70 hover:shadow-md transition-shadow">
                    <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Crown size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Campus Legends
                        </p>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-900 font-hud">
                            {metrics.legendsCount}
                        </p>
                    </div>
                </Card>
            </div>

            {/* TOP 3 HIERARCHY OLYMPIC PODIUM (Before Search Bar) */}
            {top3.length > 0 && !searchTerm && (
                <div className="bg-gradient-to-b from-white via-brand-light/30 to-white rounded-2xl border border-brand-border/80 p-5 sm:p-8 shadow-sm">
                    <div className="text-center mb-6 sm:mb-8">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-light text-brand text-xs font-bold tracking-widest uppercase rounded-full border border-brand-border font-hud">
                            <Sparkles size={13} />
                            <span>Campus Hall of Fame</span>
                        </span>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight font-heading mt-2">
                            Top Explorer Champions
                        </h3>
                    </div>

                    <div className="flex items-end justify-center gap-2 sm:gap-6 max-w-2xl mx-auto pt-8 pb-2">
                        {/* 2nd Place (Silver - Left) */}
                        {secondPlace ? (
                            <div
                                onClick={() =>
                                    setSelectedStudent({
                                        ...secondPlace,
                                        rank: 2,
                                    })
                                }
                                className="flex-1 flex flex-col items-center group cursor-pointer transition-transform hover:-translate-y-1"
                            >
                                <div className="relative mb-2">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-slate-300 shadow-md bg-white flex items-center justify-center overflow-hidden ring-2 ring-slate-200">
                                        {secondPlace.avatar_id &&
                                        getAvatarUri(secondPlace.avatar_id) ? (
                                            <img
                                                src={getAvatarUri(
                                                    secondPlace.avatar_id,
                                                )}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xl sm:text-2xl font-bold text-slate-600">
                                                {secondPlace.first_name?.charAt(
                                                    0,
                                                ) ||
                                                    secondPlace.username?.charAt(
                                                        0,
                                                    ) ||
                                                    "2"}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-100 text-slate-800 text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-slate-300 shadow-sm flex items-center gap-1 font-hud whitespace-nowrap">
                                        <span>🥈 #2</span>
                                    </div>
                                </div>

                                <p className="font-bold text-gray-900 text-xs sm:text-sm text-center line-clamp-1 mt-2 group-hover:text-brand transition-colors max-w-[110px] sm:max-w-[140px]">
                                    {secondPlace.first_name
                                        ? `${secondPlace.first_name} ${secondPlace.last_name || ""}`
                                        : secondPlace.username}
                                </p>
                                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">
                                    {
                                        getRankDetails(
                                            secondPlace.exploration_points,
                                            secondPlace.rank_info,
                                        ).title
                                    }
                                </span>
                                <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 mb-2">
                                    {secondPlace.exploration_points?.toLocaleString() ||
                                        0}{" "}
                                    XP
                                </span>

                                {/* Silver Pedestal */}
                                <div className="w-full h-24 sm:h-28 rounded-t-xl bg-gradient-to-t from-slate-200 via-slate-100 to-slate-50 border-t-2 border-x-2 border-slate-300 flex flex-col items-center justify-center shadow-inner">
                                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-400 font-hud">
                                        2
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1" />
                        )}

                        {/* 1st Place (Gold - Center / Elevated) */}
                        {firstPlace && (
                            <div
                                onClick={() =>
                                    setSelectedStudent({
                                        ...firstPlace,
                                        rank: 1,
                                    })
                                }
                                className="flex-1 flex flex-col items-center group cursor-pointer -mt-6 transition-transform hover:-translate-y-1"
                            >
                                <div className="relative mb-2">
                                    {/* Floating Crown Badge */}
                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl filter drop-shadow">
                                        👑
                                    </div>
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-amber-400 shadow-xl shadow-amber-400/25 bg-white flex items-center justify-center overflow-hidden ring-4 ring-amber-200">
                                        {firstPlace.avatar_id &&
                                        getAvatarUri(firstPlace.avatar_id) ? (
                                            <img
                                                src={getAvatarUri(
                                                    firstPlace.avatar_id,
                                                )}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                                                {firstPlace.first_name?.charAt(
                                                    0,
                                                ) ||
                                                    firstPlace.username?.charAt(
                                                        0,
                                                    ) ||
                                                    "1"}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-amber-500 shadow-sm flex items-center gap-1 font-hud whitespace-nowrap">
                                        <Trophy size={12} />
                                        <span>#1 CHAMPION</span>
                                    </div>
                                </div>

                                <p className="font-extrabold text-gray-900 text-sm sm:text-base text-center line-clamp-1 mt-2 group-hover:text-brand transition-colors max-w-[130px] sm:max-w-[170px]">
                                    {firstPlace.first_name
                                        ? `${firstPlace.first_name} ${firstPlace.last_name || ""}`
                                        : firstPlace.username}
                                </p>
                                <span className="text-[11px] sm:text-xs font-bold text-amber-600 mb-1">
                                    {
                                        getRankDetails(
                                            firstPlace.exploration_points,
                                            firstPlace.rank_info,
                                        ).title
                                    }
                                </span>
                                <span className="px-3 py-0.5 rounded-full bg-brand text-white text-xs font-extrabold shadow-sm mb-2">
                                    {firstPlace.exploration_points?.toLocaleString() ||
                                        0}{" "}
                                    XP
                                </span>

                                {/* Gold Pedestal */}
                                <div className="w-full h-36 sm:h-40 rounded-t-xl bg-gradient-to-t from-amber-200 via-amber-100 to-amber-50 border-t-2 border-x-2 border-amber-400 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-300/30 via-transparent to-transparent pointer-events-none" />
                                    <span className="text-4xl sm:text-5xl font-extrabold text-amber-500 font-hud">
                                        1
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place (Bronze - Right) */}
                        {thirdPlace ? (
                            <div
                                onClick={() =>
                                    setSelectedStudent({
                                        ...thirdPlace,
                                        rank: 3,
                                    })
                                }
                                className="flex-1 flex flex-col items-center group cursor-pointer transition-transform hover:-translate-y-1"
                            >
                                <div className="relative mb-2">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-600/50 shadow-md bg-white flex items-center justify-center overflow-hidden ring-2 ring-amber-700/20">
                                        {thirdPlace.avatar_id &&
                                        getAvatarUri(thirdPlace.avatar_id) ? (
                                            <img
                                                src={getAvatarUri(
                                                    thirdPlace.avatar_id,
                                                )}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xl sm:text-2xl font-bold text-amber-800">
                                                {thirdPlace.first_name?.charAt(
                                                    0,
                                                ) ||
                                                    thirdPlace.username?.charAt(
                                                        0,
                                                    ) ||
                                                    "3"}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-900 text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300 shadow-sm flex items-center gap-1 font-hud whitespace-nowrap">
                                        <span>🥉 #3</span>
                                    </div>
                                </div>

                                <p className="font-bold text-gray-900 text-xs sm:text-sm text-center line-clamp-1 mt-2 group-hover:text-brand transition-colors max-w-[110px] sm:max-w-[140px]">
                                    {thirdPlace.first_name
                                        ? `${thirdPlace.first_name} ${thirdPlace.last_name || ""}`
                                        : thirdPlace.username}
                                </p>
                                <span className="text-[10px] sm:text-xs font-semibold text-amber-700 mb-1">
                                    {
                                        getRankDetails(
                                            thirdPlace.exploration_points,
                                            thirdPlace.rank_info,
                                        ).title
                                    }
                                </span>
                                <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200 mb-2">
                                    {thirdPlace.exploration_points?.toLocaleString() ||
                                        0}{" "}
                                    XP
                                </span>

                                {/* Bronze Pedestal */}
                                <div className="w-full h-18 sm:h-20 rounded-t-xl bg-gradient-to-t from-amber-200/70 via-amber-100/70 to-amber-50 border-t-2 border-x-2 border-amber-600/40 flex flex-col items-center justify-center shadow-inner">
                                    <span className="text-3xl sm:text-4xl font-extrabold text-amber-700/60 font-hud">
                                        3
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1" />
                        )}
                    </div>
                </div>
            )}

            {/* Search Bar & Action Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="relative flex-1 w-full">
                    <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                    />
                    <input
                        type="text"
                        placeholder="Search by student name, username, or rank title..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Export CSV Button */}
                <Button
                    variant="secondary"
                    onClick={handleExportCSV}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold border-brand-border shadow-sm text-gray-700 hover:text-brand"
                    title="Download complete ranking report"
                >
                    <Download size={15} />
                    <span>Export CSV</span>
                </Button>
            </div>

            {/* Complete Rankings Data Table */}
            <Card noPadding className="border-brand-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/70 border-b border-brand-border text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                <th className="px-6 py-3.5 w-20 text-center">
                                    Rank
                                </th>
                                <th className="px-6 py-3.5">Student Explorer</th>
                                <th className="px-6 py-3.5">Rank Tier</th>
                                <th className="px-6 py-3.5 text-center">Streak</th>
                                <th className="px-6 py-3.5 text-right">
                                    Exploration Points
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/60">
                            {paginatedUsers.map((user, index) => {
                                const overallRank = users.findIndex(
                                    (u) => u.id === user.id,
                                );
                                const displayRank =
                                    overallRank !== -1
                                        ? overallRank + 1
                                        : (currentPage - 1) * itemsPerPage +
                                          index +
                                          1;

                                const rankDetails = getRankDetails(
                                    user.exploration_points,
                                    user.rank_info,
                                );

                                return (
                                    <tr
                                        key={user.id}
                                        onClick={() =>
                                            setSelectedStudent({
                                                ...user,
                                                rank: displayRank,
                                            })
                                        }
                                        className="hover:bg-brand-light/40 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-3.5">
                                            <div className="flex justify-center">
                                                {displayRank === 1 ? (
                                                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
                                                        <Trophy size={16} />
                                                    </div>
                                                ) : displayRank === 2 ? (
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shadow-sm">
                                                        <Medal size={16} />
                                                    </div>
                                                ) : displayRank === 3 ? (
                                                    <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center shadow-sm">
                                                        <Medal size={16} />
                                                    </div>
                                                ) : (
                                                    <span className="font-extrabold text-gray-500 text-sm font-hud">
                                                        #{displayRank}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-brand-light border border-brand-border flex items-center justify-center text-brand font-bold text-xs shrink-0 overflow-hidden">
                                                    {user.avatar_id &&
                                                    getAvatarUri(
                                                        user.avatar_id,
                                                    ) ? (
                                                        <img
                                                            src={getAvatarUri(
                                                                user.avatar_id,
                                                            )}
                                                            alt="Avatar"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : user.first_name ? (
                                                        user.first_name
                                                            .charAt(0)
                                                            .toUpperCase()
                                                    ) : (
                                                        user.username
                                                            .charAt(0)
                                                            .toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm group-hover:text-brand transition-colors">
                                                        {user.first_name ||
                                                        user.last_name
                                                            ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                                            : user.username}
                                                    </p>
                                                    <p className="text-xs text-gray-400 font-medium">
                                                        @{user.username}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${rankDetails.badgeColor}`}
                                            >
                                                <span>{rankDetails.icon}</span>
                                                <span>{rankDetails.title}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-center">
                                            {user.streak_count > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-xs font-extrabold">
                                                    <Flame
                                                        size={13}
                                                        className="fill-orange-500"
                                                    />
                                                    <span>{user.streak_count}d</span>
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-300 font-medium">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <Badge
                                                variant="brand"
                                                className="text-xs px-3 py-1 font-hud font-extrabold tracking-wide"
                                            >
                                                {(
                                                    user.exploration_points || 0
                                                ).toLocaleString()}{" "}
                                                XP
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td
                                        colSpan="5"
                                        className="px-6 py-12 text-center text-gray-500 text-sm font-medium"
                                    >
                                        {loading
                                            ? "Loading campus leaderboard rankings..."
                                            : "No student explorers matched your search."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-brand-border">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </Card>

            {/* Student Profile Detail Modal */}
            {selectedStudent && (
                <Modal
                    isOpen={Boolean(selectedStudent)}
                    onClose={() => setSelectedStudent(null)}
                    title="Student Explorer Profile"
                    maxWidth="md"
                    footer={
                        <Button
                            variant="secondary"
                            onClick={() => setSelectedStudent(null)}
                        >
                            Close
                        </Button>
                    }
                >
                    <div className="space-y-6 pt-2">
                        {/* Profile Header */}
                        <div className="flex items-center gap-4 bg-brand-light/50 p-4 rounded-xl border border-brand-border">
                            <div className="w-16 h-16 rounded-full bg-white border-2 border-brand-border flex items-center justify-center text-brand font-extrabold text-xl overflow-hidden shrink-0 shadow-sm">
                                {selectedStudent.avatar_id &&
                                getAvatarUri(selectedStudent.avatar_id) ? (
                                    <img
                                        src={getAvatarUri(
                                            selectedStudent.avatar_id,
                                        )}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span>
                                        {selectedStudent.first_name?.charAt(0) ||
                                            selectedStudent.username?.charAt(0) ||
                                            "U"}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-extrabold text-gray-900 truncate">
                                        {selectedStudent.first_name ||
                                        selectedStudent.last_name
                                            ? `${selectedStudent.first_name || ""} ${selectedStudent.last_name || ""}`.trim()
                                            : selectedStudent.username}
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-full bg-brand text-white text-[10px] font-extrabold font-hud">
                                        RANK #{selectedStudent.rank || "—"}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                                    <UserIcon size={12} />
                                    <span>@{selectedStudent.username}</span>
                                </p>
                                {selectedStudent.email && (
                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                                        <Mail size={12} />
                                        <span>{selectedStudent.email}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Rank & EXP Progress */}
                        {(() => {
                            const rank = getRankDetails(
                                selectedStudent.exploration_points,
                                selectedStudent.rank_info,
                            );
                            return (
                                <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="flex items-center gap-1.5 text-gray-700">
                                            <span>{rank.icon}</span>
                                            <span>
                                                Level {rank.level}: {rank.title}
                                            </span>
                                        </span>
                                        <span className="text-brand font-hud text-sm">
                                            {(
                                                selectedStudent.exploration_points ||
                                                0
                                            ).toLocaleString()}{" "}
                                            XP
                                        </span>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-brand rounded-full transition-all duration-500"
                                            style={{
                                                width: `${rank.progress}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[11px] text-gray-400 font-medium pt-1">
                                        <span>
                                            Current: {rank.currentRankExp} XP
                                        </span>
                                        <span>
                                            {rank.nextRankExp
                                                ? `Next Rank: ${rank.nextRankExp} XP`
                                                : "Max Rank Achieved"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-xs">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                    Login Streak
                                </span>
                                <div className="flex items-center gap-1.5 text-orange-600 font-extrabold text-sm">
                                    <Flame
                                        size={16}
                                        className="fill-orange-500"
                                    />
                                    <span>
                                        {selectedStudent.streak_count || 0} Consecutive
                                        Days
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-xs">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                    Joined ARQuest
                                </span>
                                <div className="flex items-center gap-1.5 text-gray-700 font-bold text-sm">
                                    <Calendar size={15} />
                                    <span>
                                        {selectedStudent.date_joined
                                            ? new Date(
                                                  selectedStudent.date_joined,
                                              ).toLocaleDateString()
                                            : "N/A"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
