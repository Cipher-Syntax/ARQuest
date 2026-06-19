import api from './api'

export const notificationService = {
	getNotifications: async () => {
		const response = await api.get('/api/notifications/')
		return response.data.results || response.data
	},
	markAsRead: async (id) => {
		const response = await api.post(`/api/notifications/${id}/read/`)
		return response.data
	},
	markAllAsRead: async () => {
		const response = await api.post('/api/notifications/read-all/')
		return response.data
	}
}
