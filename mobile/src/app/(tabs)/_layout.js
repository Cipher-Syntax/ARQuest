import { Tabs } from "expo-router";
import { Home, Map, Scan, Building2, User, Trophy } from "lucide-react-native";
import { View, TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import theme from "../../theme/tokens";
import { useAuth } from "../../hooks/useAuth";
import { Redirect } from "expo-router";

function CustomTabBar({ state, descriptors, navigation }) {
    return (
        <SafeAreaView
            edges={["bottom"]}
            style={{
                backgroundColor: "rgba(26, 4, 11, 0.95)", // Solid dark for tab bar base
                borderTopColor: theme.colors.border,
                borderTopWidth: 1,
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    backgroundColor: "transparent",
                    paddingBottom: 8,
                    paddingTop: 8,
                    alignItems: "center",
                    justifyContent: "space-around",
                    height: 70,
                }}
            >
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label = options.tabBarLabel || options.title || route.name;
                    const isFocused = state.index === index;
                    const isAR = route.name === "ar";

                    const onPress = () => {
                        const event = navigation.emit({
                            type: "tabPress",
                            target: route.key,
                            preventDefault: false,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    return (
                        <TouchableOpacity
                            key={route.key}
                            onPress={onPress}
                            style={{
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {isAR ? (
                                <View
                                    style={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: 30,
                                        backgroundColor: theme.colors.primary,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginBottom: 8,
                                    }}
                                >
                                    <Scan size={28} color="#FFFFFF" />
                                </View>
                            ) : (
                                <View style={{ alignItems: "center", gap: 4 }}>
                                    {options.tabBarIcon &&
                                        options.tabBarIcon({
                                            color: isFocused
                                                ? theme.colors.arHighlight
                                                : theme.colors.textMuted,
                                            size: 24,
                                        })}
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: isFocused
                                                ? theme.colors.arHighlight
                                                : theme.colors.textMuted,
                                            fontWeight: isFocused ? "600" : "400",
                                            textShadowColor: isFocused ? "rgba(0, 229, 255, 0.5)" : "transparent",
                                            textShadowOffset: { width: 0, height: 0 },
                                            textShadowRadius: isFocused ? 5 : 0,
                                        }}
                                    >
                                        {label}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </SafeAreaView>
    );
}

export default function TabLayout() {
    const { user } = useAuth();

    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: "rgba(26, 4, 11, 0.95)",
                },
                headerTintColor: theme.colors.textPrimary,
                tabBarStyle: {
                    backgroundColor: "rgba(26, 4, 11, 0.95)",
                    borderTopColor: theme.colors.border,
                },
                tabBarActiveTintColor: theme.colors.arHighlight,
                tabBarInactiveTintColor: theme.colors.textMuted,
            }}
            tabBar={(props) => <CustomTabBar {...props} />}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarLabel: "Home",
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />,
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="buildings"
                options={{
                    title: "Buildings",
                    tabBarLabel: "Buildings",
                    tabBarIcon: ({ color }) => (
                        <Building2 size={24} color={color} />
                    ),
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="ar"
                options={{
                    title: "AR",
                    tabBarLabel: "AR",
                    tabBarIcon: ({ color }) => (
                        <Scan size={24} color={color} />
                    ),
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: "Map",
                    tabBarLabel: "Map",
                    tabBarIcon: ({ color }) => <Map size={24} color={color} />,
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarLabel: "Profile",
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
                    headerShown: false,
                }}
            />
        </Tabs>
    );
}
