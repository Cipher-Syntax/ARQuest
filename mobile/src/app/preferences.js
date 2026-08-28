import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Linking,
    Platform,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    ArrowLeft,
    Volume2,
    Vibrate,
    Bell,
    Flame,
    MapPin,
    Camera,
    Settings,
    Compass,
    Ruler,
    Trash2,
    Check,
    X,
    ExternalLink,
    HardDrive,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Camera as ExpoCamera } from "expo-camera";
import theme from "../theme/tokens";
import { fonts } from "../constants/typography";
import soundManager from "../utils/SoundManager";
import { customAlert as Alert } from "../components/ui/CustomAlert";

export default function PreferencesScreen() {
    // Audio & Haptics
    const [soundEffects, setSoundEffects] = useState(true);
    const [haptics, setHaptics] = useState(true);

    // Notifications
    const [pushNotifications, setPushNotifications] = useState(true);
    const [streakReminders, setStreakReminders] = useState(true);

    // Map & Display
    const [distanceUnit, setDistanceUnit] = useState("meters"); // 'meters' | 'feet'
    const [compassRotation, setCompassRotation] = useState(true);

    // Permissions Status
    const [locationPermission, setLocationPermission] = useState("checking");
    const [cameraPermission, setCameraPermission] = useState("checking");

    // Cache clearing
    const [isClearingCache, setIsClearingCache] = useState(false);

    useEffect(() => {
        loadPreferences();
        checkPermissions();
    }, []);

    const loadPreferences = async () => {
        try {
            const [sfx, hap, push, streak, unit, rotation] = await Promise.all([
                AsyncStorage.getItem("@pref_sound_effects"),
                AsyncStorage.getItem("@pref_haptics"),
                AsyncStorage.getItem("@pref_push_notifications"),
                AsyncStorage.getItem("@pref_streak_reminders"),
                AsyncStorage.getItem("@pref_distance_unit"),
                AsyncStorage.getItem("@pref_map_rotation"),
            ]);

            if (sfx !== null) setSoundEffects(sfx === "true");
            if (hap !== null) setHaptics(hap !== "false");
            if (push !== null) setPushNotifications(push !== "false");
            if (streak !== null) setStreakReminders(streak !== "false");
            if (unit !== null) setDistanceUnit(unit);
            if (rotation !== null) setCompassRotation(rotation !== "false");
        } catch (e) {
            console.error("Failed to load preferences:", e);
        }
    };

    const checkPermissions = async () => {
        try {
            const loc = await Location.getForegroundPermissionsAsync();
            setLocationPermission(loc.granted ? "granted" : "denied");
        } catch (e) {
            setLocationPermission("denied");
        }

        try {
            const cam = await ExpoCamera.getCameraPermissionsAsync();
            setCameraPermission(cam.granted ? "granted" : "denied");
        } catch (e) {
            setCameraPermission("denied");
        }
    };

    const toggleSoundEffects = async (val) => {
        setSoundEffects(val);
        soundManager.setMuted(!val);
        await AsyncStorage.setItem("@pref_sound_effects", val ? "true" : "false");
        if (val) {
            soundManager.play("quest_complete");
        }
    };

    const toggleHaptics = async (val) => {
        setHaptics(val);
        await AsyncStorage.setItem("@pref_haptics", val ? "true" : "false");
    };

    const togglePushNotifications = async (val) => {
        setPushNotifications(val);
        await AsyncStorage.setItem("@pref_push_notifications", val ? "true" : "false");
    };

    const toggleStreakReminders = async (val) => {
        setStreakReminders(val);
        await AsyncStorage.setItem("@pref_streak_reminders", val ? "true" : "false");
    };

    const updateDistanceUnit = async (unit) => {
        setDistanceUnit(unit);
        await AsyncStorage.setItem("@pref_distance_unit", unit);
    };

    const toggleCompassRotation = async (val) => {
        setCompassRotation(val);
        await AsyncStorage.setItem("@pref_map_rotation", val ? "true" : "false");
    };

    const handleClearCache = async () => {
        Alert(
            "Clear App Cache",
            "Are you sure you want to clear temporary 3D models and cached files? Downloaded files will be refreshed on next use.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear Cache",
                    style: "destructive",
                    onPress: async () => {
                        setIsClearingCache(true);
                        try {
                            // Clear specific cached items
                            const allKeys = await AsyncStorage.getAllKeys();
                            const cacheKeys = allKeys.filter((k) => k.startsWith("@cache_"));
                            if (cacheKeys.length > 0) {
                                await AsyncStorage.multiRemove(cacheKeys);
                            }
                            setTimeout(() => {
                                setIsClearingCache(false);
                                Alert("Cache Cleared", "Temporary cache and files have been successfully cleared.");
                            }, 500);
                        } catch (e) {
                            setIsClearingCache(false);
                            Alert("Error", "Could not clear cache.");
                        }
                    },
                },
            ]
        );
    };

    const openSystemSettings = () => {
        if (Platform.OS === "ios") {
            Linking.openURL("app-settings:");
        } else {
            Linking.openSettings();
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.8}
                >
                    <ArrowLeft color={theme.colors.textPrimary} size={22} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>App Preferences</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Audio & Haptics */}
                <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>AUDIO & HAPTICS</Text>

                    {/* Sound Effects */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingIconWrap}>
                            <Volume2 size={18} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingTextWrap}>
                            <Text style={styles.settingTitle}>Sound Effects (SFX)</Text>
                            <Text style={styles.settingSubtitle}>
                                Play audio for building unlocks, quests & quizzes
                            </Text>
                        </View>
                        <Switch
                            value={soundEffects}
                            onValueChange={toggleSoundEffects}
                            trackColor={{ false: "#E5E7EB", true: theme.colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    {/* Haptic Vibration */}
                    <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                        <View style={styles.settingIconWrap}>
                            <Vibrate size={18} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingTextWrap}>
                            <Text style={styles.settingTitle}>Haptic Vibration</Text>
                            <Text style={styles.settingSubtitle}>
                                Tactile feedback on button presses & QR scans
                            </Text>
                        </View>
                        <Switch
                            value={haptics}
                            onValueChange={toggleHaptics}
                            trackColor={{ false: "#E5E7EB", true: theme.colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* 2. Notifications */}
                <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>NOTIFICATIONS</Text>

                    {/* Push Notifications */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingIconWrap}>
                            <Bell size={18} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingTextWrap}>
                            <Text style={styles.settingTitle}>Push Notifications</Text>
                            <Text style={styles.settingSubtitle}>
                                Campus announcements and important updates
                            </Text>
                        </View>
                        <Switch
                            value={pushNotifications}
                            onValueChange={togglePushNotifications}
                            trackColor={{ false: "#E5E7EB", true: theme.colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    {/* Daily Streak Reminders */}
                    <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                        <View style={styles.settingIconWrap}>
                            <Flame size={18} color="#EA580C" />
                        </View>
                        <View style={styles.settingTextWrap}>
                            <Text style={styles.settingTitle}>Daily Streak Alerts</Text>
                            <Text style={styles.settingSubtitle}>
                                Reminders to maintain your daily login streak
                            </Text>
                        </View>
                        <Switch
                            value={streakReminders}
                            onValueChange={toggleStreakReminders}
                            trackColor={{ false: "#E5E7EB", true: theme.colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* 3. Device Permissions */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardSectionTitle}>DEVICE PERMISSIONS</Text>
                        <TouchableOpacity
                            style={styles.refreshBtn}
                            onPress={checkPermissions}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.refreshBtnText}>Check Status</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Location Permission */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingIconWrap}>
                            <MapPin size={18} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingTextWrap}>
                            <Text style={styles.settingTitle}>Location (GPS)</Text>
                            <Text style={styles.settingSubtitle}>
                                Live map navigation and geofenced unlocks
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.permissionBadge,
                                locationPermission === "granted"
                                    ? styles.permissionGranted
                                    : styles.permissionDenied,
                            ]}
                        >
                            {locationPermission === "granted" ? (
                                <Check size={11} color="#059669" style={{ marginRight: 2 }} />
                            ) : (
                                <X size={11} color={theme.colors.error} style={{ marginRight: 2 }} />
                            )}
                            <Text
                                style={[
                                    styles.permissionBadgeText,
                                    {
                                        color:
                                            locationPermission === "granted"
                                                ? "#059669"
                                                : theme.colors.error,
                                    },
                                ]}
                            >
                                {locationPermission === "granted" ? "GRANTED" : "DENIED"}
                            </Text>
                        </View>
                    </View>

                    {/* Camera Permission */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingIconWrap}>
                            <Camera size={18} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingTextWrap}>
                            <Text style={styles.settingTitle}>Camera Access</Text>
                            <Text style={styles.settingSubtitle}>
                                Real-time AR wayfinding and QR scanner
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.permissionBadge,
                                cameraPermission === "granted"
                                    ? styles.permissionGranted
                                    : styles.permissionDenied,
                            ]}
                        >
                            {cameraPermission === "granted" ? (
                                <Check size={11} color="#059669" style={{ marginRight: 2 }} />
                            ) : (
                                <X size={11} color={theme.colors.error} style={{ marginRight: 2 }} />
                            )}
                            <Text
                                style={[
                                    styles.permissionBadgeText,
                                    {
                                        color:
                                            cameraPermission === "granted"
                                                ? "#059669"
                                                : theme.colors.error,
                                    },
                                ]}
                            >
                                {cameraPermission === "granted" ? "GRANTED" : "DENIED"}
                            </Text>
                        </View>
                    </View>

                    {/* Open Device Settings Button */}
                    <TouchableOpacity
                        style={styles.openSettingsBtn}
                        onPress={openSystemSettings}
                        activeOpacity={0.8}
                    >
                        <Settings size={15} color={theme.colors.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.openSettingsBtnText}>Open Phone Device Settings</Text>
                        <ExternalLink size={13} color={theme.colors.primary} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                </View>

                {/* 4. Map & Display */}
                <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>MAP & DISPLAY</Text>

                    {/* Distance Unit */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingIconWrap}>
                            <Ruler size={18} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingTextWrap}>
                            <Text style={styles.settingTitle}>Distance Unit</Text>
                            <Text style={styles.settingSubtitle}>
                                Campus walking distance measurement
                            </Text>
                        </View>
                        <View style={styles.unitSelector}>
                            <TouchableOpacity
                                style={[
                                    styles.unitSegment,
                                    distanceUnit === "meters" && styles.unitSegmentActive,
                                ]}
                                onPress={() => updateDistanceUnit("meters")}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.unitSegmentText,
                                        distanceUnit === "meters" && styles.unitSegmentTextActive,
                                    ]}
                                >
                                    m
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.unitSegment,
                                    distanceUnit === "feet" && styles.unitSegmentActive,
                                ]}
                                onPress={() => updateDistanceUnit("feet")}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.unitSegmentText,
                                        distanceUnit === "feet" && styles.unitSegmentTextActive,
                                    ]}
                                >
                                    ft
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Compass Map Rotation */}
                    <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                        <View style={styles.settingIconWrap}>
                            <Compass size={18} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingTextWrap}>
                            <Text style={styles.settingTitle}>Compass Map Rotation</Text>
                            <Text style={styles.settingSubtitle}>
                                Rotate campus map based on device heading
                            </Text>
                        </View>
                        <Switch
                            value={compassRotation}
                            onValueChange={toggleCompassRotation}
                            trackColor={{ false: "#E5E7EB", true: theme.colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* 5. Storage & Cache */}
                <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>STORAGE & CACHE</Text>
                    <View style={styles.cacheRow}>
                        <View style={styles.settingIconWrap}>
                            <HardDrive size={18} color={theme.colors.textSecondary} />
                        </View>
                        <View style={styles.settingTextWrap}>
                            <Text style={styles.settingTitle}>3D Models & Cache</Text>
                            <Text style={styles.settingSubtitle}>
                                Free up temporary downloaded assets
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.clearCacheBtn}
                            onPress={handleClearCache}
                            disabled={isClearingCache}
                            activeOpacity={0.8}
                        >
                            {isClearingCache ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <>
                                    <Trash2 size={13} color={theme.colors.primary} style={{ marginRight: 4 }} />
                                    <Text style={styles.clearCacheBtnText}>Clear</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
    },
    headerTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 17,
        color: theme.colors.textPrimary,
        letterSpacing: 0.3,
    },
    content: {
        padding: 16,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    cardHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    cardSectionTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: "#594040",
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    refreshBtn: {
        backgroundColor: "rgba(155, 27, 48, 0.06)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    refreshBtnText: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 11,
        color: theme.colors.primary,
    },
    settingRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    settingIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: "rgba(155, 27, 48, 0.08)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    settingTextWrap: {
        flex: 1,
        paddingRight: 8,
    },
    settingTitle: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 14,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    settingSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 16,
    },
    permissionBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    permissionGranted: {
        backgroundColor: "rgba(16, 185, 129, 0.08)",
    },
    permissionDenied: {
        backgroundColor: "rgba(211, 47, 47, 0.08)",
    },
    permissionBadgeText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        letterSpacing: 0.4,
    },
    openSettingsBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(155, 27, 48, 0.05)",
        borderWidth: 1,
        borderColor: "rgba(155, 27, 48, 0.15)",
        paddingVertical: 10,
        borderRadius: 6,
        marginTop: 12,
    },
    openSettingsBtnText: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 12.5,
        color: theme.colors.primary,
    },
    unitSelector: {
        flexDirection: "row",
        backgroundColor: "#F3F4F6",
        borderRadius: 6,
        padding: 2,
    },
    unitSegment: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
    },
    unitSegmentActive: {
        backgroundColor: theme.colors.primary,
    },
    unitSegmentText: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    unitSegmentTextActive: {
        color: "#FFFFFF",
    },
    cacheRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
    },
    clearCacheBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(155, 27, 48, 0.08)",
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "rgba(155, 27, 48, 0.2)",
    },
    clearCacheBtnText: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: theme.colors.primary,
    },
});
