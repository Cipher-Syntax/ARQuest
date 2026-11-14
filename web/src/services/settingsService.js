import api from "./api";

export const settingsService = {
    getSettings: async () => {
        const response = await api.get("/api/settings/");
        return response.data.data;
    },
    updateSettings: async (settingsData) => {
        const response = await api.put("/api/settings/", settingsData);
        return response.data.data;
    },
    uploadLogo: async (file) => {
        const formData = new FormData();
        formData.append("logo", file);
        const response = await api.post("/api/settings/logo/", formData);
        return response.data.data;
    },
    removeLogo: async () => {
        const response = await api.delete("/api/settings/logo/");
        return response.data.data;
    },
};
