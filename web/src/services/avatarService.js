import api from "./api";

export const avatarService = {
    // Get all avatars (for mobile/web consumption and admin management)
    getAvatars: async () => {
        const response = await api.get("/api/auth/avatars/");
        return response.data.data;
    },

    // Alias for admin page
    getAllAvatars: async () => {
        const response = await api.get("/api/auth/avatars/");
        return response.data.data;
    },

    // Create new avatar (admin only)
    createAvatar: async (formData) => {
        const response = await api.post("/api/auth/avatars/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    // Create multiple avatars at once (admin only)
    createAvatarsBulk: async (formData) => {
        const response = await api.post("/api/auth/avatars/bulk/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    // Delete avatar (admin only) - hard delete
    deleteAvatar: async (id) => {
        const response = await api.delete(`/api/auth/avatars/${id}/`);
        return response.data;
    },
};