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
    createUser: async (data) => {
        const isFormData = data instanceof FormData;
        const config = isFormData
            ? { headers: { "Content-Type": "multipart/form-data" } }
            : {};
        const response = await api.post("/api/auth/users/", data, config);
        return response.data;
    },
    deleteUser: async (id) => {
        const response = await api.delete(`/api/auth/users/${id}/`);
        return response.data;
    },
    exportUsersCSV: async () => {
        const response = await api.get("/api/auth/users/export/", {
            responseType: "blob",
        });

        const disposition = response.headers?.["content-disposition"];
        const match = /filename="?([^";]+)"?/i.exec(disposition || "");
        const today = new Date().toISOString().slice(0, 10);
        const filename = match?.[1] || `arquest-users-${today}.csv`;

        const url = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return filename;
    },
    createProfessional: async (data) => {
        const response = await api.post("/api/auth/users/professional/", data);
        return response.data;
    },
    deleteProfessional: async (id) => {
        const response = await api.delete(`/api/auth/users/professional/${id}/`);
        return response.data;
    },
    getArchivedVisitors: async () => {
        const response = await api.get("/api/auth/users/archived/");
        return response.data.data;
    },
    restoreVisitor: async (id) => {
        const response = await api.post(`/api/auth/users/${id}/restore/`);
        return response.data;
    },
    hardDeleteVisitor: async (id) => {
        const response = await api.delete(`/api/auth/users/${id}/hard-delete/`);
        return response.data;
    },
};
