import api from './api'

export const feedbackService = {
	getFeedbacks: async () => {
		const response = await api.get('/api/feedback/')
		return response.data.data
	},
	updateFeedbackStatus: async (id, status) => {
		const response = await api.patch(`/api/feedback/${id}/`, { status })
		return response.data.data
	},
	deleteFeedback: async (id) => {
		const response = await api.delete(`/api/feedback/${id}/`)
		return response.data
	}
}
