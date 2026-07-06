import api from "./api";

export const triviaService = {
    getTrivias: async () => {
        const response = await api.get("/api/buildings/trivias/");
        return response.data.data;
    },

    createTrivia: async (triviaData) => {
        const response = await api.post("/api/buildings/trivias/", triviaData);
        return response.data.data;
    },

    updateTrivia: async (id, triviaData) => {
        const response = await api.patch(
            `/api/buildings/trivias/${id}/`,
            triviaData,
        );
        return response.data.data;
    },

    deleteTrivia: async (id) => {
        const response = await api.delete(`/api/buildings/trivias/${id}/`);
        return response.data;
    },
};
