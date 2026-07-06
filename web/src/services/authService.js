import api from "./api";

export const authService = {
    login: async (username, password) => {
        const response = await api.post("/api/auth/login/", {
            username,
            password,
        });
        const { data } = response.data;
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);
        return data;
    },

    logout: async () => {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
            try {
                await api.post("/api/auth/logout/", { refresh: refreshToken });
            } catch (error) {
                console.error("Logout error:", error);
            }
        }
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
    },

    getCurrentUser: async () => {
        const response = await api.get("/api/auth/me/");
        return response.data.data;
    },

    isAuthenticated: () => {
        return !!localStorage.getItem("access_token");
    },
};
