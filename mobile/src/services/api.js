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
        // If the server responded with a status code
        if (error.response) {
            // You can implement token refresh logic here by checking error.response.status === 401

            // We throw an object that matches the previous error structure the UI expects
            throw { status: error.response.status, data: error.response.data };
        }
        // The request was made but no response was received
        else if (error.request) {
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
