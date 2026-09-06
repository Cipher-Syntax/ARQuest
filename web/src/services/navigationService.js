import api from "./api";

export const navigationService = {
    // Nodes
    getNodes: async () => {
        const response = await api.get("/api/navigation/nodes/");
        return response.data.data;
    },

    createNode: async (nodeData) => {
        const response = await api.post("/api/navigation/nodes/", nodeData);
        return response.data.data;
    },

    updateNode: async (nodeId, nodeData) => {
        const response = await api.patch(`/api/navigation/nodes/${nodeId}/`, nodeData);
        return response.data.data;
    },

    deleteNode: async (nodeId) => {
        const response = await api.delete(`/api/navigation/nodes/${nodeId}/`);
        return response.data;
    },

    // Paths
    getPaths: async () => {
        const response = await api.get("/api/navigation/paths/");
        return response.data.data;
    },

    createPath: async (pathData) => {
        const response = await api.post("/api/navigation/paths/", pathData);
        return response.data.data;
    },

    updatePath: async (pathId, pathData) => {
        const response = await api.patch(`/api/navigation/paths/${pathId}/`, pathData);
        return response.data.data;
    },

    deletePath: async (pathId) => {
        const response = await api.delete(`/api/navigation/paths/${pathId}/`);
        return response.data;
    },
};
