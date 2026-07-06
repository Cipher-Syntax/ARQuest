import api from "./api";

export const feedbackService = {
    getFeedbacks: async (
        page = 1,
        filterStatus = "all",
        filterType = "all",
    ) => {
        const response = await api.get(
            `/api/feedback/?page=${page}&status=${filterStatus}&type=${filterType}`,
        );
        return response.data;
    },
    updateFeedbackStatus: async (id, status) => {
        const response = await api.patch(`/api/feedback/${id}/`, { status });
        return response.data;
    },
    deleteFeedback: async (id) => {
        const response = await api.delete(`/api/feedback/${id}/`);
        return response.data;
    },
};
