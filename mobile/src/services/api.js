import axios from "axios";
import { authService } from "./authService";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export const api = axios.create({
    baseURL: EXPO_PUBLIC_API_URL,
    headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
    },
});

// Request Interceptor: Attach JWT token to every request
api.interceptors.request.use(
    async (config) => {
        const token = await authService.getAccessToken();
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// Response Interceptor: Format errors cleanly for the UI to consume
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If the server responded with a status code
        if (error.response) {
            // Automatic Token Refresh Logic
            if (error.response.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                const refreshToken = await authService.getRefreshToken();

                if (refreshToken) {
                    try {
                        const response = await axios.post(
                            `${EXPO_PUBLIC_API_URL}/api/auth/token/refresh/`,
                            {
                                refresh: refreshToken,
                            },
                        );
                        const { access } = response.data;
                        await authService.setTokens(access, null); // Don't overwrite the refresh token

                        // Retry the original request with the new access token
                        originalRequest.headers["Authorization"] =
                            `Bearer ${access}`;
                        return api(originalRequest);
                    } catch (refreshError) {
                        // Refresh token is expired or invalid
                        await authService.clearTokens();
                        throw {
                            status: 401,
                            data: {
                                detail: "Session expired. Please log in again.",
                            },
                        };
                    }
                }
            }

            // We throw an object that matches the previous error structure the UI expects
            throw { status: error.response.status, data: error.response.data };
        }
        // The request was made but no response was received
        else if (error.request) {
            const method = originalRequest.method?.toUpperCase();
            const url = originalRequest.url || '';
            
            // Auto-queue offline gamification actions
            if (method === 'POST' && (url.includes('/gamification/quests/') || url.includes('/buildings/unlock/'))) {
                const { offlineQueueService } = require('./offlineQueueService');
                const data = originalRequest.data ? JSON.parse(originalRequest.data) : null;
                await offlineQueueService.enqueueRequest(url, method, data);
                
                // Fake success so the UI doesn't crash or block the user
                return {
                    data: {
                        success: true,
                        data: {
                            message: "Queued offline",
                            newly_earned_badges: [],
                            rank_info: null
                        }
                    }
                };
            }

            throw {
                data: {
                    detail: "Network error. Please check your connection.",
                },
            };
        }
        // Something else happened
        else {
            throw { data: { detail: error.message } };
        }
    },
);

export default api;
