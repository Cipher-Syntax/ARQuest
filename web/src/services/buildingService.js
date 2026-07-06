import api from "./api";

export const buildingService = {
    getBuildings: async () => {
        const response = await api.get("/api/buildings/");
        return response.data.data;
    },

    getBuilding: async (id) => {
        const response = await api.get(`/api/buildings/${id}/`);
        return response.data.data;
    },

    createBuilding: async (buildingData) => {
        const isFormData = buildingData instanceof FormData;
        const config = isFormData
            ? { headers: { "Content-Type": "multipart/form-data" } }
            : {};

        const response = await api.post(
            "/api/buildings/",
            buildingData,
            config,
        );
        return response.data.data;
    },

    updateBuilding: async (id, buildingData) => {
        const isFormData = buildingData instanceof FormData;
        const config = isFormData
            ? { headers: { "Content-Type": "multipart/form-data" } }
            : {};

        const response = await api.patch(
            `/api/buildings/${id}/`,
            buildingData,
            config,
        );
        return response.data.data;
    },

    deleteBuilding: async (id) => {
        await api.delete(`/api/buildings/${id}/`);
    },

    getGeofence: async (buildingId) => {
        const response = await api.get(
            `/api/buildings/${buildingId}/geofence/`,
        );
        return response.data.data;
    },

    createGeofence: async (buildingId, geofenceData) => {
        const response = await api.post(
            `/api/buildings/${buildingId}/geofence/`,
            geofenceData,
        );
        return response.data.data;
    },

    updateGeofence: async (geofenceId, geofenceData) => {
        const response = await api.patch(
            `/api/buildings/geofence/${geofenceId}/`,
            geofenceData,
        );
        return response.data.data;
    },

    getArchivedBuildings: async () => {
        const response = await api.get("/api/buildings/archived/");
        return response.data.data;
    },

    restoreBuilding: async (id) => {
        const response = await api.post(`/api/buildings/${id}/restore/`);
        return response.data;
    },

    hardDeleteBuilding: async (id) => {
        const response = await api.delete(`/api/buildings/${id}/hard-delete/`);
        return response.data;
    },
};
