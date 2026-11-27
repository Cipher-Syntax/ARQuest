/**
 * Pure Global Rankings helpers.
 *
 * These carry the ranking, metric, and filtering rules that the leaderboard
 * screen and the web gamification engine share. They deliberately avoid React
 * and React Native imports so they stay unit-testable outside the app runtime.
 */

// Progression Ranks Matching Web Gamification Engine
export const RANKS = [
    { level: 1, title: "Freshman", min_exp: 0, icon: "🎒", color: "#0284C7", bg: "#F0F9FF", border: "#BAE6FD" },
    { level: 2, title: "Explorer", min_exp: 100, icon: "🗺️", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
    { level: 3, title: "Scout", min_exp: 300, icon: "⛺", color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4" },
    { level: 4, title: "Ranger", min_exp: 600, icon: "🦅", color: "#4F46E5", bg: "#EEF2FF", border: "#C7D2FE" },
    { level: 5, title: "Veteran", min_exp: 1000, icon: "⚔️", color: "#9333EA", bg: "#FAF5FF", border: "#E9D5FF" },
    { level: 6, title: "Campus Legend", min_exp: 2000, icon: "👑", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
];

/** EXP required for the top tier; drives both the KPI card and the "legends" filter. */
export const LEGEND_MIN_EXP = 2000;

export const getRankDetails = (exp = 0, rankInfo = null) => {
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
                      ((exp - currentRankExp) / (nextRankExp - currentRankExp)) * 100
                  )
              )
          )
        : 100;

    return {
        level: rankInfo?.level || rank.level,
        title: rankInfo?.title || rank.title,
        icon: rankInfo?.icon || rank.icon,
        color: rank.color,
        bg: rank.bg,
        border: rank.border,
        currentRankExp,
        nextRankExp,
        progress,
    };
};

/** Summary numbers for the four KPI cards. */
export const computeLeaderboardMetrics = (leaderboard = []) => {
    if (!leaderboard.length) {
        return { totalStudents: 0, topScore: 0, avgScore: 0, legendsCount: 0 };
    }
    const totalStudents = leaderboard.length;
    const topScore = leaderboard[0]?.points || 0;
    const totalExp = leaderboard.reduce(
        (acc, u) => acc + (u.points || 0),
        0
    );
    const avgScore = Math.round(totalExp / totalStudents);
    const legendsCount = leaderboard.filter(
        (u) => (u.points || 0) >= LEGEND_MIN_EXP
    ).length;
    return { totalStudents, topScore, avgScore, legendsCount };
};

/**
 * Applies the active quick filter, then the search term. Search matches the
 * student's names, username, and derived rank title.
 */
export const filterLeaderboardEntries = (
    leaderboard = [],
    { activeFilter = "all", searchTerm = "", avgScore = 0 } = {}
) => {
    let list = leaderboard;

    if (activeFilter === "above_avg") {
        list = list.filter((u) => (u.points || 0) >= avgScore);
    } else if (activeFilter === "legends") {
        list = list.filter((u) => (u.points || 0) >= LEGEND_MIN_EXP);
    }

    const term = searchTerm.toLowerCase().trim();
    if (!term) return list;

    return list.filter((item) => {
        const first = item.first_name?.toLowerCase() || "";
        const last = item.last_name?.toLowerCase() || "";
        const username = item.username?.toLowerCase() || "";
        const rankTitle = getRankDetails(item.points, item.rank_info).title.toLowerCase();
        return (
            first.includes(term) ||
            last.includes(term) ||
            username.includes(term) ||
            rankTitle.includes(term)
        );
    });
};

/** Display name with a username fallback, used by the podium, rows, and modal. */
export const getDisplayName = (student) => {
    if (!student) return "";
    if (student.first_name && student.last_name) {
        return `${student.first_name} ${student.last_name}`;
    }
    if (student.first_name) {
        return student.first_name;
    }
    return student.username;
};

/** The signed-in student's leaderboard entry, or null when they are unranked. */
export const findMyRankItem = (leaderboard = [], username) =>
    leaderboard.find((u) => u.username === username) || null;

/** 1-based position of the signed-in student in the full ranking. */
export const findMyRankPosition = (leaderboard = [], username) =>
    leaderboard.findIndex((u) => u.username === username) + 1;
