import api from './api'

export const dashboardService = {
	getStats: async () => {
		const response = await api.get('/api/dashboard/')
		return response.data.data
	}
}
