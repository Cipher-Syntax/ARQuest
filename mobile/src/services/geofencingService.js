import { api } from './api';

export const geofencingService = {
    async fetchGeofences() {
        const response = await api.get('/api/buildings/');
        return response.data.data.map(building => ({
            id: building.id,
            name: building.name,
            latitude: building.latitude,
            longitude: building.longitude,
            geofence: building.geofence ? {
                radius: building.geofence.radius_meters,
                latitude: building.geofence.latitude,
                longitude: building.geofence.longitude,
            } : null,
        }));
    },

    async validateLocation(latitude, longitude, accuracy) {
        const response = await api.post('/api/geofencing/validate/', {
            latitude,
            longitude,
            accuracy_meters: accuracy,
        });
        return response.data.data;
    },

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const lat1Radians = (lat1 * Math.PI) / 180;
        const lat2Radians = (lat2 * Math.PI) / 180;
        const deltaLatRadians = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLonRadians = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(deltaLatRadians / 2) * Math.sin(deltaLatRadians / 2) +
            Math.cos(lat1Radians) * Math.cos(lat2Radians) * Math.sin(deltaLonRadians / 2) * Math.sin(deltaLonRadians / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    },
};
