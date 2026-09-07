import { Stack } from "expo-router";
import { AuthProvider, useAuthState, useAuthActions } from "../context/AuthContext";
import OfflineBanner from "../components/ui/OfflineBanner";
import CustomAlert, { alertRef } from "../components/ui/CustomAlert";
import DailyStreakModal from "../components/features/DailyStreakModal";
import { StatusBar } from "expo-status-bar";
import theme from "../theme/tokens";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import UpdateBanner from "../components/UpdateBanner";
import useAppUpdate from "../hooks/useAppUpdate";

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
    const { streakModalData } = useAuthState();
    const { hideStreakModal } = useAuthActions();

    const {
        applyUpdate,
        dismissUpdateBanner,
        isUpdateDownloading,
        shouldShowUpdateBanner,
    } = useAppUpdate();

    return (
        <>
            <StatusBar style="dark" />
            <OfflineBanner />
            <UpdateBanner
                visible={shouldShowUpdateBanner}
                isUpdating={isUpdateDownloading}
                onUpdatePress={applyUpdate}
                onDismissPress={dismissUpdateBanner}
            />
            <CustomAlert ref={alertRef} />
            <DailyStreakModal
                visible={streakModalData?.visible || false}
                streakCount={streakModalData?.streakCount || 0}
                bonusExp={streakModalData?.bonusExp || 0}
                isNewCheckin={streakModalData?.isNewCheckin || false}
                onClose={hideStreakModal}
            />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.colors.bgPrimary },
                }}
            >
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
        </>
    );
}

export default function RootLayout() {
    const [fontsLoaded, error] = useFonts({
        Exo2_400Regular: require("../../assets/fonts/Exo_2/Exo2-VariableFont_wght.ttf"),
        Exo2_500Medium: require("../../assets/fonts/Exo_2/Exo2-VariableFont_wght.ttf"),
        Exo2_600SemiBold: require("../../assets/fonts/Exo_2/Exo2-VariableFont_wght.ttf"),
        Inter_400Regular: require("../../assets/fonts/Inter/Inter-VariableFont_opsz,wght.ttf"),
        Inter_500Medium: require("../../assets/fonts/Inter/Inter-VariableFont_opsz,wght.ttf"),
        Rajdhani_500Medium: require("../../assets/fonts/Rajdhani/Rajdhani-Medium.ttf"),
        Rajdhani_600SemiBold: require("../../assets/fonts/Rajdhani/Rajdhani-SemiBold.ttf"),
    });

    useEffect(() => {
        if (fontsLoaded || error) {
            SplashScreen.hideAsync();
        }

        // Initialize SoundManager
        import("../utils/SoundManager").then((module) => {
            module.default.init();
        });
    }, [fontsLoaded, error]);

    if (!fontsLoaded && !error) {
        return null;
    }

    return (
        <AuthProvider>
            <RootLayoutContent />
        </AuthProvider>
    );
}

