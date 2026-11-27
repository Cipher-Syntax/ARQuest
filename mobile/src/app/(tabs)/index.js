import React from "react";
import {
    DeviceEventEmitter,
    RefreshControl,
    ScrollView,
    View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import { TourSpotlight } from "../../components/features/TourHighlights";
import AskJustineWidget from "../../components/home/AskJustineWidget";
import CampusRadarPreview from "../../components/home/CampusRadarPreview";
import EvaluationReadyCard from "../../components/home/EvaluationReadyCard";
import HeroMissionCarousel from "../../components/home/HeroMissionCarousel";
import HomeHeader from "../../components/home/HomeHeader";
import LimitedChallenges from "../../components/home/LimitedChallenges";
import QuickActions from "../../components/home/QuickActions";
import QuickStatsRow from "../../components/home/QuickStatsRow";
import { useHomeStyles } from "../../components/home/homeStyles";
import { usePublicSettings } from "../../context/PublicSettingsContext";
import { useThemeColors } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { useHomeDashboard } from "../../hooks/useHomeDashboard";
import { useHomeMapPreview } from "../../hooks/useHomeMapPreview";
import { useIsFocused } from "../../hooks/useIsFocused";
import { useTourHighlight } from "../../utils/tourHighlight";

export default function HomeScreen() {
    const isFocused = useIsFocused();
    const { showStreakModal } = useAuth();
    const { enable_leaderboard } = usePublicSettings();
    const colors = useThemeColors();
    const styles = useHomeStyles();

    const {
        user,
        location,
        stats,
        loading,
        refreshing,
        refresh,
        buildings,
        distanceToNearest,
        activeQuests,
        completedQuestsToday,
        heroMissionTab,
        setHeroMissionTab,
        challenges,
        askJustine,
    } = useHomeDashboard();

    const { webViewRef, mapHtml, markWebViewReady } = useHomeMapPreview({
        buildings,
        location,
    });

    const isStudent = user?.role === "student";

    // The Justine tour spotlights the mission card, so it asks Home to scroll
    // back to the top first to keep the card on screen.
    const tour = useTourHighlight();
    const homeScrollRef = React.useRef(null);
    React.useEffect(() => {
        const sub = DeviceEventEmitter.addListener("tour_scroll_home_top", () => {
            homeScrollRef.current?.scrollTo({ y: 0, animated: false });
        });
        return () => sub.remove();
    }, []);

    return (
        <View style={styles.container}>
            {isFocused && <StatusBar style="light" />}
            <ScrollView
                ref={homeScrollRef}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        colors={[colors.primary]}
                        tintColor={"#FFFFFF"}
                    />
                }
            >
                <HomeHeader
                    user={user}
                    stats={stats}
                    showStreakModal={showStreakModal}
                />

                <View style={styles.contentArea}>
                    {isStudent ? (
                        <>
                            <HeroMissionCarousel
                                activeQuests={activeQuests}
                                completedQuestsToday={completedQuestsToday}
                                heroMissionTab={heroMissionTab}
                                onSelectTab={setHeroMissionTab}
                                loading={loading}
                            >
                                {/* Justine guide: frame/arrow/speech drawn over the card itself */}
                                {tour.missionCard && <TourSpotlight text={tour.missionText} />}
                            </HeroMissionCarousel>

                            <LimitedChallenges challenges={challenges} />
                        </>
                    ) : (
                        <EvaluationReadyCard />
                    )}

                    <QuickStatsRow
                        isStudent={isStudent}
                        stats={stats}
                        buildingsCount={buildings.length}
                        distanceToNearest={distanceToNearest}
                    />

                    <QuickActions
                        isStudent={isStudent}
                        enableLeaderboard={enable_leaderboard}
                    />

                    <CampusRadarPreview
                        webViewRef={webViewRef}
                        mapHtml={mapHtml}
                        onWebViewLoadEnd={markWebViewReady}
                    />
                </View>
            </ScrollView>

            {isStudent && (
                <AskJustineWidget
                    questCount={activeQuests.length}
                    onPress={askJustine}
                />
            )}
        </View>
    );
}
