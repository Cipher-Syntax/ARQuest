import api from "./api";

export const compressorService = {
    /**
     * Uploads a 3D model and processes it via gltf-transform engine with progress tracking.
     * @param {FormData} formData 
     * @param {Function} onUploadProgress - Callback for upload percentage (0-100)
     * @returns {Promise<Object>} Compression report and download paths
     */
    compressModel: async (formData, onUploadProgress) => {
        const response = await api.post("/api/buildings/compress-model/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total && onUploadProgress) {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    onUploadProgress(percentCompleted);
                }
            },
        });
        return response.data.data;
    },

    /**
     * Assigns a newly compressed model directly to an existing building.
     * @param {string} buildingId 
     * @param {string} outputFilename 
     */
    assignToBuilding: async (buildingId, outputFilename) => {
        const response = await api.post(`/api/buildings/${buildingId}/assign-compressed-model/`, {
            output_filename: outputFilename,
        });
        return response.data.data;
    },

    /**
     * Fetches all buildings for the assignment selector.
     */
    getBuildings: async () => {
        const response = await api.get("/api/buildings/");
        return response.data.data;
    },
};
