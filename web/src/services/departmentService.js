import api from "./api";

export const departmentService = {
    getDepartments: async () => {
        const response = await api.get("/api/buildings/departments/");
        return response.data.data;
    },

    getDepartment: async (id) => {
        const response = await api.get(`/api/buildings/departments/${id}/`);
        return response.data.data;
    },

    createDepartment: async (departmentData) => {
        const response = await api.post(
            "/api/buildings/departments/",
            departmentData,
        );
        return response.data.data;
    },

    updateDepartment: async (id, departmentData) => {
        const response = await api.patch(
            `/api/buildings/departments/${id}/`,
            departmentData,
        );
        return response.data.data;
    },

    deleteDepartment: async (id) => {
        await api.delete(`/api/buildings/departments/${id}/`);
    },
};
