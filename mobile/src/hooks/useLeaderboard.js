import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";

import { api } from "../services";
import { useAuth } from "./useAuth";
import {
    computeLeaderboardMetrics,
    filterLeaderboardEntries,
    findMyRankItem,
    findMyRankPosition,
    getRankDetails,
} from "../utils/leaderboard";

/**
 * Owns the Global Rankings data lifecycle and every derived value the screen
 * renders: metrics, the filtered list, the podium, and the signed-in rank.
 *
 * Presentation stays in app/leaderboard.js and components/leaderboard/.
 */
export function useLeaderboard() {
    const { user } = useAuth();

    const [leaderboard, setLeaderboard] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [leaderboardEnabled, setLeaderboardEnabled] = useState(true);

    // Search & Filter state (matching web)
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState("all"); // "all" | "above_avg" | "legends"
    const [selectedStudent, setSelectedStudent] = useState(null);

    const fetchData = async () => {
        try {
            const [leaderboardRes, recentRes] = await Promise.all([
                api.get("/api/gamification/leaderboard/"),
                api.get("/api/gamification/recent-activity/"),
            ]);

            if (leaderboardRes.data?.success) {
                const list = leaderboardRes.data.data || [];
                setLeaderboard(Array.isArray(list) ? list : []);
                setLeaderboardEnabled(
                    leaderboardRes.data.leaderboard_enabled !== false,
                );
            }
            if (recentRes.data?.success) {
                const recent = recentRes.data.data || [];
                setRecentActivity(Array.isArray(recent) ? recent : []);
            }
        } catch (error) {
            console.error("Failed to fetch leaderboard data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user && user.role !== "student") {
            router.replace("/(tabs)/explore");
            return;
        }
        fetchData();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Calculate Summary Metrics matching web
    const metrics = useMemo(
        () => computeLeaderboardMetrics(leaderboard),
        [leaderboard]
    );

    const avgRankDetails = useMemo(
        () => getRankDetails(metrics.avgScore),
        [metrics.avgScore]
    );

    // Filter and search logic
    const filteredLeaderboard = useMemo(
        () =>
            filterLeaderboardEntries(leaderboard, {
                activeFilter,
                searchTerm,
                avgScore: metrics.avgScore,
            }),
        [leaderboard, activeFilter, searchTerm, metrics.avgScore]
    );

    // Top 3 Podium
    const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);

    // Current user rank
    const myRankItem = useMemo(
        () => findMyRankItem(leaderboard, user?.username),
        [leaderboard, user]
    );

    const myRankPosition = useMemo(
        () => findMyRankPosition(leaderboard, user?.username),
        [leaderboard, user]
    );

    return {
        user,
        leaderboard,
        recentActivity,
        loading,
        refreshing,
        leaderboardEnabled,
        onRefresh,
        metrics,
        avgRankDetails,
        filteredLeaderboard,
        top3,
        myRankItem,
        myRankPosition,
        searchTerm,
        setSearchTerm,
        activeFilter,
        setActiveFilter,
        selectedStudent,
        setSelectedStudent,
    };
}

export default useLeaderboard;
