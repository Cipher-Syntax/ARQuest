import api from "./api";

export const dashboardService = {
    getStats: async () => {
        const response = await api.get("/api/dashboard/");
        return response.data.data;
    },

    getGpsUnlocks: async ({ start_date, end_date }) => {
        const response = await api.get("/api/dashboard/gps-unlocks/", {
            params: { start_date, end_date },
        });
        return response.data.data;
    },
};
