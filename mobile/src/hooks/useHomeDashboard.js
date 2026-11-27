import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";

import { api, geofencingService } from "../services";
import { buildJustineHint } from "../utils/home";
import { useAuth } from "./useAuth";
import { useLocationTracking } from "./useLocationTracking";

/**
 * Owns the Home dashboard's data: campus buildings, the student's leaderboard
 * snapshot, active and completed daily quests, time-limited challenges, and the
 * nearest-building proximity readout.
 *
 * Presentation stays in app/(tabs)/index.js and components/home/.
 */
export function useHomeDashboard() {
    const { user } = useAuth();
    const { location } = useLocationTracking();

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [buildings, setBuildings] = useState([]);
    const [nearestBuilding, setNearestBuilding] = useState(null);
    const [distanceToNearest, setDistanceToNearest] = useState(null);

    // Gamification Backend States
    const [activeQuests, setActiveQuests] = useState([]);
    const [completedQuestsToday, setCompletedQuestsToday] = useState([]);
    const [heroMissionTab, setHeroMissionTab] = useState("available"); // "available" | "completed"
    const [hasCompletedAllToday, setHasCompletedAllToday] = useState(false);
    const [challenges, setChallenges] = useState([]);

    const loadData = async () => {
        try {
            const resBuildings = await api.get("/api/buildings/");
            if (resBuildings.data.success) {
                setBuildings(resBuildings.data.data);
            }

            if (user?.role === "student") {
                const resStats = await api.get(
                    "/api/gamification/leaderboard/",
                );
                if (resStats.data.success) {
                    const myStats = resStats.data.data.find(
                        (r) => r.username === user.username,
                    );
                    setStats(myStats);
                }

                const resQuest = await api.get("/api/gamification/quests/active/");
                if (resQuest.data.success) {
                    const quests = resQuest.data.data.quests || resQuest.data.data;
                    if (quests && quests.length > 0) {
                        const incompleteQuests = quests.filter(q => !q.is_completed);
                        const completedQuests = quests.filter(q => q.is_completed);
                        setActiveQuests(incompleteQuests);
                        setCompletedQuestsToday(completedQuests);
                        setHasCompletedAllToday(completedQuests.length > 0 && incompleteQuests.length === 0);
                    } else {
                        setActiveQuests([]);
                        setCompletedQuestsToday([]);
                        setHasCompletedAllToday(false);
                    }
                } else {
                    setActiveQuests([]);
                    setCompletedQuestsToday([]);
                    setHasCompletedAllToday(false);
                }

                const resChallenges = await api.get(
                    "/api/gamification/challenges/",
                );
                if (resChallenges.data.success) {
                    setChallenges(resChallenges.data.data);
                }
            } else {
                setActiveQuests([]);
                setChallenges([]);
            }
        } catch (error) {
            console.error("Failed to fetch gamification data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Nearest published building, recalculated whenever the fix or the campus
    // catalogue changes.
    useEffect(() => {
        if (location && buildings.length > 0) {
            let minDistance = Infinity;
            let nearest = null;

            buildings.forEach((b) => {
                if (b.latitude && b.longitude) {
                    const dist = geofencingService.calculateDistance(
                        location.latitude,
                        location.longitude,
                        parseFloat(b.latitude),
                        parseFloat(b.longitude),
                    );
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearest = b;
                    }
                }
            });

            if (nearest) {
                setNearestBuilding(nearest);
                setDistanceToNearest(Math.round(minDistance));
            }
        }
    }, [location, buildings]);

    const refresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    /** Emits the 2D companion hint; the guide modal listens for this event. */
    const askJustine = () => {
        DeviceEventEmitter.emit(
            "show_justine_hint",
            buildJustineHint({
                activeQuests,
                hasCompletedAllToday,
                nearestBuilding,
                distanceToNearest,
            })
        );
    };

    return {
        user,
        location,
        stats,
        loading,
        refreshing,
        refresh,
        buildings,
        nearestBuilding,
        distanceToNearest,
        activeQuests,
        completedQuestsToday,
        heroMissionTab,
        setHeroMissionTab,
        hasCompletedAllToday,
        challenges,
        askJustine,
    };
}

export default useHomeDashboard;
