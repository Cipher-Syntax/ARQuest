import { useCallback, useEffect, useState } from "react";

import { api } from "../services";
import { useRoleAccess } from "./useRoleAccess";

/**
 * Owns the Explore screen's data: buildings list, active quests, weekly progress.
 * Presentation stays in the screen and components/explore/.
 */
export function useExploreData() {
    const { role } = useRoleAccess();

    const [buildingsList, setBuildingsList] = useState([]);
    const [totalBuildings, setTotalBuildings] = useState(0);
    const [activeQuests, setActiveQuests] = useState([]);
    const [weeklyProgress, setWeeklyProgress] = useState({ completed: 0, target: 10 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const res = await api.get("/api/buildings/");
            if (res.data.success) {
                setBuildingsList(res.data.data);
                setTotalBuildings(res.data.data.length);
            }
            if (role === "student") {
                const questRes = await api.get("/api/gamification/quests/active/");
                if (questRes.data.success) {
                    const quests = questRes.data.data.quests || questRes.data.data;
                    setActiveQuests(quests);
                    if (questRes.data.data.weekly_progress) {
                        setWeeklyProgress(questRes.data.data.weekly_progress);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch explore data", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [role]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const refresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    return {
        buildingsList,
        totalBuildings,
        activeQuests,
        weeklyProgress,
        loading,
        refreshing,
        refresh,
    };
}

export default useExploreData;