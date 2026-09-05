import api from "./api";

export const panoramaService = {
    getBuildingScenes: async (buildingId) => {
        const response = await api.get(
            `/api/panorama/buildings/${buildingId}/scenes/`,
        );
        return response.data.data;
    },

    createScene: async (buildingId, formData) => {
        const response = await api.post(
            `/api/panorama/buildings/${buildingId}/scenes/`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            },
        );
        return response.data.data;
    },

    deleteScene: async (sceneId) => {
        const response = await api.delete(
            `/api/panorama/scenes/${sceneId}/admin/`,
        );
        return response.data;
    },

    updateScene: async (sceneId, data) => {
        const response = await api.patch(
            `/api/panorama/scenes/${sceneId}/admin/`,
            data,
        );
        return response.data.data;
    },

    getSceneHotspots: async (sceneId) => {
        const response = await api.get(
            `/api/panorama/scenes/${sceneId}/hotspots/`,
        );
        return response.data.data;
    },

    createHotspot: async (sceneId, hotspotData) => {
        const response = await api.post(
            `/api/panorama/scenes/${sceneId}/hotspots/`,
            hotspotData,
        );
        return response.data.data;
    },

    updateHotspot: async (hotspotId, hotspotData) => {
        const response = await api.patch(
            `/api/panorama/hotspots/${hotspotId}/`,
            hotspotData,
        );
        return response.data.data;
    },

    deleteHotspot: async (hotspotId) => {
        const response = await api.delete(
            `/api/panorama/hotspots/${hotspotId}/`,
        );
        return response.data;
    },
};
