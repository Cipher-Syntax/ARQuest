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
	clearAllNotifications: async (unreadIds = []) => {
		if (unreadIds.length > 0) {
			await Promise.all(unreadIds.map(id => api.post(`/api/notifications/${id}/read/`)))
			return { status: 'all_marked_read' }
		}
		
		// Fallback to bulk endpoint if no IDs provided
		const response = await api.post('/api/notifications/read_all/')
		return response.data
	}
}
