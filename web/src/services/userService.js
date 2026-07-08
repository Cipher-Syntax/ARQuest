import api from "./api";

export const userService = {
    getUsers: async () => {
        const response = await api.get("/api/auth/users/");
        return response.data.data;
    },
    getLeaderboard: async () => {
        const response = await api.get("/api/auth/leaderboard/");
        return response.data.data;
    },
    createProfessional: async (data) => {
        const response = await api.post("/api/auth/users/professional/", data);
        return response.data;
    },
    deleteProfessional: async (id) => {
        const response = await api.delete(`/api/auth/users/professional/${id}/`);
        return response.data;
    },
};
