import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { api } from "./api";

const QUEUE_KEY = "arquest_offline_queue";

export const offlineQueueService = {
    async enqueueRequest(url, method, data) {
        try {
            const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
            const queue = queueStr ? JSON.parse(queueStr) : [];
            queue.push({ url, method, data, timestamp: Date.now() });
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
            console.log(`Queued ${method} request to ${url} for offline sync.`);
        } catch (e) {
            console.error("Failed to enqueue request", e);
        }
    },

    async processQueue() {
        try {
            const netInfo = await NetInfo.fetch();
            if (!netInfo.isConnected) return; // Still offline

            const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
            const queue = queueStr ? JSON.parse(queueStr) : [];
            if (queue.length === 0) return;

            console.log(`Processing ${queue.length} offline requests...`);
            const failedQueue = [];

            for (const req of queue) {
                try {
                    if (req.method === "POST") {
                        await api.post(req.url, req.data);
                    }
                    // Handle other methods if needed
                } catch (e) {
                    // If it failed because of 4xx (like already completed), we drop it.
                    // If it's another network error, keep it in queue.
                    if (
                        e?.data?.detail ===
                        "Network error. Please check your connection."
                    ) {
                        failedQueue.push(req);
                    }
                }
            }

            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedQueue));
        } catch (e) {
            console.error("Failed to process offline queue", e);
        }
    },
};
