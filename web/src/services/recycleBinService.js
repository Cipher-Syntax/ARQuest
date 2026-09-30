import { buildingService } from "./buildingService";
import { userService } from "./userService";
import { questService } from "./questService";
import { triviaService } from "./triviaService";

export const recycleBinService = {
    getAllArchived: async () => {
        const [buildingsRes, visitorsRes, questsRes, triviasRes] = await Promise.allSettled([
            buildingService.getArchivedBuildings(),
            userService.getArchivedVisitors(),
            questService.getArchivedQuests(),
            triviaService.getArchivedTrivias(),
        ]);

        const buildings = (buildingsRes.status === "fulfilled" && Array.isArray(buildingsRes.value) ? buildingsRes.value : []).map(
            (b) => ({
                id: b.id,
                itemType: "building",
                title: b.name,
                subtitle: b.description || `Coordinates: ${b.latitude || 0}, ${b.longitude || 0}`,
                deleted_at: b.deleted_at,
                raw: b,
            })
        );

        const visitors = (visitorsRes.status === "fulfilled" && Array.isArray(visitorsRes.value) ? visitorsRes.value : []).map(
            (u) => ({
                id: u.id,
                itemType: "visitor",
                title: u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.username,
                subtitle: u.email ? `Visitor Account • ${u.email}` : "Visitor Account",
                deleted_at: u.deleted_at || u.date_joined,
                raw: u,
            })
        );

        const quests = (questsRes.status === "fulfilled" && Array.isArray(questsRes.value) ? questsRes.value : []).map(
            (q) => ({
                id: q.id,
                itemType: "quest",
                title: q.title,
                subtitle: `${q.target_building_name || "Campus Mission"} • ${q.reward_points || 0} EXP • ${q.difficulty || "EASY"}`,
                deleted_at: q.deleted_at || q.created_at,
                raw: q,
            })
        );

        const trivias = (triviasRes.status === "fulfilled" && Array.isArray(triviasRes.value) ? triviasRes.value : []).map(
            (t) => ({
                id: t.id,
                itemType: "trivia",
                title: t.fact ? (t.fact.length > 75 ? `${t.fact.substring(0, 75)}...` : t.fact) : "Campus Trivia",
                subtitle: t.building_name ? `Associated with ${t.building_name}` : "General Campus Trivia",
                deleted_at: t.deleted_at || t.created_at,
                raw: t,
            })
        );

        return {
            all: [...buildings, ...visitors, ...quests, ...trivias].sort(
                (a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0)
            ),
            buildings,
            visitors,
            quests,
            trivias,
        };
    },

    restoreItem: async (itemType, id) => {
        switch (itemType) {
            case "building":
                return await buildingService.restoreBuilding(id);
            case "visitor":
                return await userService.restoreVisitor(id);
            case "quest":
                return await questService.restoreQuest(id);
            case "trivia":
                return await triviaService.restoreTrivia(id);
            default:
                throw new Error(`Unsupported item type: ${itemType}`);
        }
    },

    hardDeleteItem: async (itemType, id) => {
        switch (itemType) {
            case "building":
                return await buildingService.hardDeleteBuilding(id);
            case "visitor":
                return await userService.hardDeleteVisitor(id);
            case "quest":
                return await questService.hardDeleteQuest(id);
            case "trivia":
                return await triviaService.hardDeleteTrivia(id);
            default:
                throw new Error(`Unsupported item type: ${itemType}`);
        }
    },
};
