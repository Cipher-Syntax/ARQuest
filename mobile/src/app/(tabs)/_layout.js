import { Tabs } from "expo-router";
import { Home, Map, Scan, Building2, User, Trophy } from "lucide-react-native";
import { View, TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import theme from "../../theme/tokens";
import { useAuth } from "../../hooks/useAuth";
import { Redirect } from "expo-router";
import { registerForPushNotificationsAsync } from '../../utils/pushNotifications';
import { useEffect } from 'react';
import OnboardingTutorial from "../../components/OnboardingTutorial";

function CustomTabBar({ state, descriptors, navigation }) {
    return (
        <SafeAreaView
            edges={["bottom"]}
            style={{
                backgroundColor: theme.colors.surface, // Light tab bar base
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
                                                ? theme.colors.primary // WMSU Red for active
                                                : theme.colors.textMuted,
                                            size: 24,
                                        })}
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: isFocused
                                                ? theme.colors.primary // WMSU Red
                                                : theme.colors.textMuted,
                                            fontWeight: isFocused ? "600" : "400",
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
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (user) {
            registerForPushNotificationsAsync();
        }
    }, [user]);

    if (isLoading) return null;

    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenOptions={{
                    headerStyle: {
                        backgroundColor: theme.colors.primary,
                    },
                    headerTintColor: "#FFFFFF",
                    tabBarStyle: {
                        backgroundColor: theme.colors.surface,
                        borderTopColor: theme.colors.border,
                    },
                    tabBarActiveTintColor: theme.colors.primary,
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
                        title: "Maps",
                        tabBarLabel: "Maps",
                        tabBarIcon: ({ color }) => (
                            <Map size={24} color={color} />
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
                        title: "Explore",
                        tabBarLabel: "Explore",
                        tabBarIcon: ({ color }) => <Building2 size={24} color={color} />,
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
            <OnboardingTutorial />
        </View>
    );
}
