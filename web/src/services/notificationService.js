import api from './api'

export const notificationService = {
	getNotifications: async () => {
		const timestamp = new Date().getTime()
		const response = await api.get(`/api/notifications/?_t=${timestamp}`)
		return response.data.results || response.data
	},
	markAsRead: async (id) => {
		const response = await api.post(`/api/notifications/${id}/read/`)
		return response.data
	},
	clearAllNotifications: async () => {
		const response = await api.post('/api/notifications/read_all/')
		return response.data
	}
}
