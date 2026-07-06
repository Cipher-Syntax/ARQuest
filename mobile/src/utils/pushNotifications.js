import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import api from "../services/api";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } =
            await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== "granted") {
            console.log("Failed to get push token for push notification!");
            return;
        }

        // Learn more about projectId:
        // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId;

        if (!projectId) {
            console.log(
                "Project ID not found. Ensure app.json has eas.projectId if using EAS.",
            );
            // Fallback for Expo Go (usually works without projectId if logged into Expo account)
            try {
                token = (await Notifications.getExpoPushTokenAsync()).data;
            } catch (e) {
                console.log("Error getting token without projectId:", e);
            }
        } else {
            try {
                token = (
                    await Notifications.getExpoPushTokenAsync({ projectId })
                ).data;
            } catch (e) {
                console.log("Error getting token with projectId:", e);
            }
        }
    } else {
        console.log("Must use physical device for Push Notifications");
    }

    if (token) {
        try {
            await api.post("/api/auth/push-token/", { token });
            console.log(
                "Successfully registered push token with backend:",
                token,
            );
        } catch (error) {
            console.error("Failed to send push token to backend:", error);
        }
    }

    return token;
}
