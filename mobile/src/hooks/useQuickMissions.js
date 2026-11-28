import { useCallback, useState } from "react";

import { api } from "../services";

/**
 * Owns the Quick Missions (daily quests) data for the Buildings screen.
 * Mirrors the same API calls as Explore/Home but scoped to Buildings.
 */
export function useQuickMissions({ role }) {
    const [quickModalVisible, setQuickModalVisible] = useState(false);
    const [quickQuests, setQuickQuests] = useState([]);
    const [completedQuickQuests, setCompletedQuickQuests] = useState([]);
    const [isQuickUnlocked, setIsQuickUnlocked] = useState(false);
    const [dailyProgress, setDailyProgress] = useState({ completed: 0, total: 3 });
    const [missionBuildingIds, setMissionBuildingIds] = useState([]);

    const fetchQuickMissions = useCallback(async () => {
        if (role !== "student") return;
        try {
            const res = await api.get("/api/gamification/quests/quick/");
            if (res.data.success) {
                const data = res.data.data;
                setIsQuickUnlocked(data.is_unlocked);
                setDailyProgress({
                    completed: data.daily_completed_count || 0,
                    total: data.daily_total_count || 3,
                });
                const available = data.available_quests || data.quests || [];
                const completed = data.completed_quests || [];
                setQuickQuests(available);
                setCompletedQuickQuests(completed);
                const bIds = available.map((q) => q.target_building);
                setMissionBuildingIds(bIds);
            }
        } catch (err) {
            console.log("Failed to fetch quick missions:", err);
        }
    }, [role]);

    const handleSelectQuickMission = useCallback(
        (mission, allBuildings, routingActions) => {
            if (!mission || !mission.target_building) return;
            const targetB = allBuildings.find(
                (b) => b.id.toString() === mission.target_building.toString(),
            );
            if (targetB) {
                routingActions.handleSelectRouteTarget(targetB);
                setQuickModalVisible(false);
            }
        },
        [],
    );

    return {
        quickModalVisible,
        setQuickModalVisible,
        quickQuests,
        completedQuickQuests,
        isQuickUnlocked,
        dailyProgress,
        missionBuildingIds,
        fetchQuickMissions,
        handleSelectQuickMission,
    };
}

export default useQuickMissions;