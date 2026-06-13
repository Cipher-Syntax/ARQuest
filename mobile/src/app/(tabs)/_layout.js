import { Tabs } from "expo-router";
import { Home, Map, ScanLine, Building2, User } from "lucide-react-native";
import theme from "../../theme/tokens";
import { useAuth } from "../../hooks/useAuth";
import { Redirect } from "expo-router";

export default function TabLayout() {
    const { user } = useAuth();

    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: theme.colors.surface,
                },
                headerTintColor: theme.colors.textPrimary,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                },
                tabBarActiveTintColor: theme.colors.arHighlight,
                tabBarInactiveTintColor: theme.colors.textMuted,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: "Explore",
                    tabBarIcon: ({ color }) => <Map size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="ar"
                options={{
                    title: "AR View",
                    tabBarIcon: ({ color }) => (
                        <ScanLine size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="buildings"
                options={{
                    title: "Buildings",
                    tabBarIcon: ({ color }) => (
                        <Building2 size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
