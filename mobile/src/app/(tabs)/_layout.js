import { Tabs } from "expo-router";
import { Home, Map, Scan, Building2, User, Trophy } from "lucide-react-native";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColors } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { UnlockedBuildingsProvider } from "../../context/UnlockedBuildingsContext";
import { Redirect } from "expo-router";
import { registerForPushNotificationsAsync } from "../../utils/pushNotifications";
import { useEffect } from "react";
import OnboardingTutorial from "../../components/features/OnboardingTutorial";
import JustineGuideModal from "../../components/features/JustineGuideModal";
import { TourRing, GOLD } from "../../components/features/TourHighlights";
import { useTourHighlight, setTourHighlight } from "../../utils/tourHighlight";

function CustomTabBar({ state, descriptors, navigation }) {
    const colors = useThemeColors();
    const tour = useTourHighlight();
    const ringColor = tour.tone === "gold" ? GOLD : colors.primary;

    return (
        <SafeAreaView
            edges={["bottom"]}
            // The onboarding overlays stop at the top of this bar, so they need its height.
            onLayout={(e) =>
                setTourHighlight({ tabBarHeight: e.nativeEvent.layout.height })
            }
            style={{
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
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
                    const label =
                        options.tabBarLabel || options.title || route.name;
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
                                        backgroundColor: colors.primary,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginBottom: 8,
                                    }}
                                >
                                    <Scan size={28} color="#FFFFFF" />
                                    {tour.tab === route.name && (
                                        <TourRing
                                            size={64}
                                            parentW={60}
                                            parentH={60}
                                            color={ringColor}
                                            pulse={tour.pulse}
                                        />
                                    )}
                                </View>
                            ) : (
                                <View style={{ alignItems: "center", gap: 4 }}>
                                    <View style={{ width: 24, height: 24 }}>
                                        {options.tabBarIcon &&
                                            options.tabBarIcon({
                                                color: isFocused
                                                    ? colors.primary
                                                    : colors.textMuted,
                                                size: 24,
                                            })}
                                        {tour.tab === route.name && (
                                            <TourRing
                                                size={52}
                                                parentW={24}
                                                parentH={24}
                                                color={ringColor}
                                                pulse={tour.pulse}
                                            />
                                        )}
                                    </View>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: isFocused
                                                ? colors.primary
                                                : colors.textMuted,
                                            fontWeight: isFocused
                                                ? "600"
                                                : "400",
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
            {/* While a tour highlights a tab, the bar stays visible but must not navigate. */}
            {tour.tab && <View style={StyleSheet.absoluteFill} />}
        </SafeAreaView>
    );
}

export default function TabLayout() {
    const { user, isLoading } = useAuth();
    const colors = useThemeColors();

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
        <UnlockedBuildingsProvider>
            {/* The onboarding overlays render inline inside this root (no Modal)
                and stop above the tab bar, which draws its own highlight ring. */}
            <View style={{ flex: 1 }}>
                    <Tabs
                        screenOptions={{
                            headerStyle: {
                                backgroundColor: colors.primary,
                            },
                            headerTintColor: "#FFFFFF",
                            tabBarStyle: {
                                backgroundColor: colors.surface,
                                borderTopColor: colors.border,
                            },
                            tabBarActiveTintColor: colors.primary,
                            tabBarInactiveTintColor: colors.textMuted,
                        }}
                        tabBar={(props) => <CustomTabBar {...props} />}
                    >
                        <Tabs.Screen
                            name="index"
                            options={{
                                title: "Home",
                                tabBarLabel: "Home",
                                tabBarIcon: ({ color }) => (
                                    <Home size={24} color={color} />
                                ),
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
                                tabBarIcon: ({ color }) => (
                                    <Building2 size={24} color={color} />
                                ),
                                headerShown: false,
                            }}
                        />
                        <Tabs.Screen
                            name="profile"
                            options={{
                                title: "Profile",
                                tabBarLabel: "Profile",
                                tabBarIcon: ({ color }) => (
                                    <User size={24} color={color} />
                                ),
                                headerShown: false,
                            }}
                        />
                    </Tabs>
                    <OnboardingTutorial />
                    <JustineGuideModal />
                </View>
            </UnlockedBuildingsProvider>
    );
}
