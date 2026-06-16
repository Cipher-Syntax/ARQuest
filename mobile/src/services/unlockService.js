import { api } from './api';

export const unlockService = {
    async unlockBuilding(latitude, longitude, accuracy) {
        const response = await api.post('/api/buildings/unlock/', {
            latitude,
            longitude,
            accuracy_meters: accuracy,
        });
        return response.data.data;
    },

    async getUnlockedBuildings() {
        const response = await api.get('/api/buildings/unlocked/');
        return response.data.data;
    },
};
