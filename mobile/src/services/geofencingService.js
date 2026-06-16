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
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    },
};
