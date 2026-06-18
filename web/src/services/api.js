import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json'
	}
})

const AUTH_FREE_PATHS = [
	'/api/auth/login/',
	'/api/auth/register/',
	'/api/auth/verify-otp/',
	'/api/auth/resend-otp/',
	'/api/auth/token/refresh/'
]

api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('access_token')
		const requestUrl = config.url || ''
		const isAuthFreeRequest = AUTH_FREE_PATHS.some((path) => requestUrl.includes(path))

		if (token && !isAuthFreeRequest) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	},
	(error) => Promise.reject(error)
)

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config
		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true
			const refreshToken = localStorage.getItem('refresh_token')
			if (refreshToken) {
				try {
					const response = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, {
						refresh: refreshToken
					})
					const { access } = response.data
					localStorage.setItem('access_token', access)
					originalRequest.headers.Authorization = `Bearer ${access}`
					return api(originalRequest)
				} catch (refreshError) {
					localStorage.removeItem('access_token')
					localStorage.removeItem('refresh_token')
					window.location.href = '/login'
					return Promise.reject(refreshError)
				}
			}
		}
		return Promise.reject(error)
	}
)

export default api
