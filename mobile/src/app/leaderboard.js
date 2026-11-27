import React, { useCallback } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trophy } from "lucide-react-native";
import { router } from "expo-router";

import LeaderboardEmptyState from "../components/leaderboard/LeaderboardEmptyState";
import LeaderboardHeader from "../components/leaderboard/LeaderboardHeader";
import LeaderboardMetricCards from "../components/leaderboard/LeaderboardMetricCards";
import LeaderboardPodium from "../components/leaderboard/LeaderboardPodium";
import LeaderboardRecentActivity from "../components/leaderboard/LeaderboardRecentActivity";
import LeaderboardSearch from "../components/leaderboard/LeaderboardSearch";
import MyRankBar from "../components/leaderboard/MyRankBar";
import RankListHeader from "../components/leaderboard/RankListHeader";
import RankRow from "../components/leaderboard/RankRow";
import StudentDetailModal from "../components/leaderboard/StudentDetailModal";
import { useLeaderboardStyles } from "../components/leaderboard/leaderboardStyles";
import { useBottomInset } from "../components/ui/SafeAreaSheet";
import { useThemeColors } from "../context/ThemeContext";
import { useLeaderboard } from "../hooks/useLeaderboard";

export default function LeaderboardScreen() {
    const colors = useThemeColors();
    const styles = useLeaderboardStyles();
    // Android 3-button navigation floats the sticky bar over the system bar,
    // so the bar and the list need the bottom inset as padding.
    const bottomInset = useBottomInset(0);

    const {
        user,
        leaderboard,
        recentActivity,
        loading,
        refreshing,
        leaderboardEnabled,
        onRefresh,
        metrics,
        avgRankDetails,
        filteredLeaderboard,
        top3,
        myRankItem,
        myRankPosition,
        searchTerm,
        setSearchTerm,
        activeFilter,
        setActiveFilter,
        selectedStudent,
        setSelectedStudent,
    } = useLeaderboard();

    const firstPlace = top3[0] || null;
    const isFiltering = Boolean(searchTerm) || activeFilter !== "all";

    const renderItem = useCallback(
        ({ item, index }) => {
            const rank = item.rank || index + 1;
            const isTop3 = rank <= 3 && !searchTerm && activeFilter === "all";

            // Hide top 3 from the main list if they are already in the podium (matching web)
            if (isTop3) return null;

            return (
                <RankRow
                    item={item}
                    rank={rank}
                    isMe={user?.username === item.username}
                    onSelect={setSelectedStudent}
                />
            );
        },
        [searchTerm, activeFilter, user?.username, setSelectedStudent]
    );

    const renderHeader = () => (
        <View>
            <LeaderboardMetricCards
                metrics={metrics}
                avgRankDetails={avgRankDetails}
                activeFilter={activeFilter}
                onSelectFilter={setActiveFilter}
                onOpenTopStudent={() =>
                    firstPlace && setSelectedStudent({ ...firstPlace, rank: 1 })
                }
                filteredCount={filteredLeaderboard.length}
            />

            <LeaderboardPodium
                top3={top3}
                searchTerm={searchTerm}
                activeFilter={activeFilter}
                onSelectStudent={setSelectedStudent}
            />

            <LeaderboardSearch
                searchTerm={searchTerm}
                onChangeSearch={setSearchTerm}
                activeFilter={activeFilter}
                onSelectFilter={setActiveFilter}
                totalCount={leaderboard.length}
            />

            <RankListHeader
                filteredCount={filteredLeaderboard.length}
                isFiltering={isFiltering}
            />
        </View>
    );

    const renderFooter = () => (
        <LeaderboardRecentActivity recentActivity={recentActivity} />
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <LeaderboardHeader onBack={() => router.back()} />

            {leaderboardEnabled === false ? (
                <LeaderboardEmptyState
                    icon={<Trophy size={48} color={colors.textMuted} />}
                    title="Leaderboard Disabled"
                    subtitle="The administrator has turned off student rankings. Your XP and rank are still tracked."
                />
            ) : loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredLeaderboard}
                    keyExtractor={(item) => String(item.id || item.username)}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: 80 + bottomInset },
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <LeaderboardEmptyState
                            icon={
                                <Trophy
                                    size={36}
                                    color="#CBD5E1"
                                    style={{ marginBottom: 8 }}
                                />
                            }
                            title="No Explorers Found"
                            subtitle={
                                searchTerm
                                    ? `No student matching "${searchTerm}"`
                                    : "No explorers match this filter criterion."
                            }
                        />
                    }
                />
            )}

            {/* Sticky "My Position" Floating Bottom Bar */}
            {myRankItem && (
                <MyRankBar
                    myRankItem={myRankItem}
                    myRankPosition={myRankPosition}
                    bottomInset={bottomInset}
                    onPress={() =>
                        setSelectedStudent({ ...myRankItem, rank: myRankItem.rank })
                    }
                />
            )}

            {/* --- Student Detail Profile Modal (Matching Web) --- */}
            {selectedStudent && (
                <StudentDetailModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
        </SafeAreaView>
    );
}
