import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import theme from "../theme/tokens";

export default function RootLayout() {
    return (
        <AuthProvider>
            <Stack screenOptions={{ 
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.bgPrimary }
            }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
        </AuthProvider>
    );
}
