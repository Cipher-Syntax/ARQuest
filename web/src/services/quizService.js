import api from './api'

export const quizService = {
    getQuizzes: async (buildingId = null) => {
        const url = buildingId ? `/api/buildings/quiz-questions/?building_id=${buildingId}` : '/api/buildings/quiz-questions/'
        const response = await api.get(url)
        return response.data.data
    },

    createQuiz: async (quizData) => {
        const response = await api.post('/api/buildings/quiz-questions/', quizData)
        return response.data.data
    },

    updateQuiz: async (id, quizData) => {
        const response = await api.patch(`/api/buildings/quiz-questions/${id}/`, quizData)
        return response.data.data
    },

    deleteQuiz: async (id) => {
        const response = await api.delete(`/api/buildings/quiz-questions/${id}/`)
        return response.data
    }
}
