import api from "./api";

export const questService = {
    getQuests: async () => {
        const response = await api.get("/api/buildings/quests/");
        return response.data.data;
    },

    createQuest: async (questData) => {
        const response = await api.post("/api/buildings/quests/", questData);
        return response.data.data;
    },

    updateQuest: async (id, questData) => {
        const response = await api.patch(
            `/api/buildings/quests/${id}/`,
            questData,
        );
        return response.data.data;
    },

    deleteQuest: async (id) => {
        const response = await api.delete(`/api/buildings/quests/${id}/`);
        return response.data;
    },
    getArchivedQuests: async () => {
        const response = await api.get("/api/buildings/quests/archived/");
        return response.data.data;
    },
    restoreQuest: async (id) => {
        const response = await api.post(`/api/buildings/quests/${id}/restore/`);
        return response.data;
    },
    hardDeleteQuest: async (id) => {
        const response = await api.delete(`/api/buildings/quests/${id}/hard-delete/`);
        return response.data;
    },
};
