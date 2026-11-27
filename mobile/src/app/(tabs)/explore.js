import React from "react";
import {
    DeviceEventEmitter,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { GeoStatusIndicator } from "../../components/ui/GeoStatusIndicator";
import { useExploreData } from "../../hooks/useExploreData";
import { useExploreGeofence } from "../../hooks/useExploreGeofence";
import { useRadarAnimations } from "../../hooks/useRadarAnimations";
import { useIsFocused } from "../../hooks/useIsFocused";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import { useTourHighlight } from "../../utils/tourHighlight";
import DailyMissions from "../../components/explore/DailyMissions";
import ExploreHeader from "../../components/explore/ExploreHeader";
import GeoStatusCard from "../../components/explore/GeoStatusCard";
import NearbyBuildingsList from "../../components/explore/NearbyBuildingsList";
import ProgressTracker from "../../components/explore/ProgressTracker";
import RadarSection from "../../components/explore/RadarSection";
import { useExploreStyles } from "../../components/explore/exploreStyles";
import { useThemeColors } from "../../context/ThemeContext";

export default function ExploreScreen() {
    const isFocused = useIsFocused();
    const colors = useThemeColors();
    const styles = useExploreStyles();
    const { role } = useRoleAccess();
    const { location, startTracking, stopTracking, isTracking, requestPermission, permissionStatus, error } =
        useLocationTracking();
    const { unlockedBuildings } = useUnlockedBuildings();

    const {
        buildingsList,
        totalBuildings,
        activeQuests,
        weeklyProgress,
        loading,
        refreshing,
        refresh,
    } = useExploreData();

    const {
        validationResult,
        isValidating,
        nearbyBuildings,
        insideBuilding,
        insideLockedForStudent,
        insideOwned,
    } = useExploreGeofence({ buildingsList });

    const { pulseAnim1, pulseAnim2, spinInterpolate } = useRadarAnimations({
        isTracking,
        isFocused,
    });

    const homeScrollRef = React.useRef(null);
    React.useEffect(() => {
        const sub = DeviceEventEmitter.addListener("tour_scroll_explore_top", () => {
            homeScrollRef.current?.scrollTo({ y: 0, animated: false });
        });
        return () => sub.remove();
    }, []);

    const targetBuildingImageUrl = React.useMemo(() => {
        const targetBuilding = validationResult?.building;
        if (!targetBuilding) return null;
        if (targetBuilding.image_url) return targetBuilding.image_url;

        const buildingFromList = buildingsList.find(
            (building) => String(building.id) === String(targetBuilding.id)
        );
        return buildingFromList?.image_url || null;
    }, [validationResult?.building?.id, validationResult?.building?.image_url, buildingsList]);

    const handleStartTracking = async () => {
        if (permissionStatus !== "granted") {
            await requestPermission();
        }
        startTracking();
    };

    const onOpenScanner = () => {
        if (!insideBuilding) return;
        router.push({
            pathname: "/(tabs)/ar",
            params: {
                targetBuildingId: String(insideBuilding.id),
            },
        });
    };

    const onNavigate = (building) => {
        router.push({
            pathname: "/(tabs)/ar",
            params: { targetBuildingId: building.id },
        });
    };

    const onMap = (building) => {
        router.push({
            pathname: "/(tabs)/buildings",
            params: { targetBuildingId: building.id },
        });
    };

    const onQuestPress = (quest) => {
        router.push({
            pathname: "/(tabs)/ar",
            params: {
                targetBuildingId: quest.target_building,
                questId: quest.id,
            },
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
            {isFocused && <StatusBar style="dark" />}
            {/* Subtle Background Gradient */}
            <LinearGradient
                colors={["#FFFFFF", "#F2F4F7"]}
                style={StyleSheet.absoluteFill}
            />
            <ScrollView
                ref={homeScrollRef}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                <ExploreHeader />

                <RadarSection
                    isTracking={isTracking}
                    pulseAnim1={pulseAnim1}
                    pulseAnim2={pulseAnim2}
                    spinInterpolate={spinInterpolate}
                    onPress={isTracking ? stopTracking : handleStartTracking}
                />

                {/* GPS Status — permission denied, fake GPS, weak signal, inside, nearby */}
                <GeoStatusIndicator
                    status={validationResult?.status}
                    buildingName={validationResult?.building?.name}
                    permissionDenied={permissionStatus === "denied"}
                    mockedGPS={!!error && error.includes("Fake GPS")}
                    onRetry={() => {
                        stopTracking();
                        setTimeout(() => startTracking(), 300);
                    }}
                    insideSubText={
                        insideLockedForStudent
                            ? "Open the AR Scanner to unlock the AR content."
                            : null
                    }
                />

                {/* Active Scanning Status HUD */}
                <GeoStatusCard
                    isTracking={isTracking}
                    isValidating={isValidating}
                    location={location}
                    validationResult={validationResult}
                    insideLockedForStudent={insideLockedForStudent}
                    insideOwned={insideOwned}
                    targetBuildingImageUrl={targetBuildingImageUrl}
                    onOpenScanner={onOpenScanner}
                />

                {/* Nearby Buildings List */}
                <NearbyBuildingsList
                    nearbyBuildings={nearbyBuildings}
                    unlockedBuildings={unlockedBuildings}
                    role={role}
                    onNavigate={onNavigate}
                    onMap={onMap}
                />

                {/* Gamified Widgets */}
                {role === "student" && (
                    <>
                        <ProgressTracker
                            unlockedCount={unlockedBuildings.length}
                            totalBuildings={totalBuildings}
                        />
                        <DailyMissions
                            activeQuests={activeQuests}
                            weeklyProgress={weeklyProgress}
                            onQuestPress={onQuestPress}
                        />
                    </>
                )}
            </ScrollView>
        </View>
    );
}