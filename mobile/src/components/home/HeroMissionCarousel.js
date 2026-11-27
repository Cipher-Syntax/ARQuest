import React from "react";
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { CheckCircle2, ChevronRight, Crosshair } from "lucide-react-native";
import { router } from "expo-router";

import { fonts } from "../../constants/typography";
import { useThemeColors } from "../../context/ThemeContext";
import CompletedMissionCard from "./CompletedMissionCard";
import HeroMissionCard from "./HeroMissionCard";
import MissionEmptyCard from "./MissionEmptyCard";

/**
 * Daily Objectives carousel with the Available/Completed switcher.
 * `children` renders after the carousel, inside the same wrapper, so the
 * Justine tour spotlight can decorate the mission card.
 */
export default function HeroMissionCarousel({
    activeQuests,
    completedQuestsToday,
    heroMissionTab,
    onSelectTab,
    loading,
    children,
}) {
    const colors = useThemeColors();
    const screenWidth = Dimensions.get("window").width;

    return (
        <>
            {/* --- Daily Objectives Section Header with Segmented Switcher --- */}
            <View style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
                paddingHorizontal: 4,
            }}>
                <View style={{
                    flexDirection: "row",
                    backgroundColor: "#F1F5F9",
                    padding: 3,
                    borderRadius: 20,
                    gap: 4,
                }}>
                    <TouchableOpacity
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 16,
                            backgroundColor: heroMissionTab === "available" ? colors.primary : "transparent",
                        }}
                        onPress={() => onSelectTab("available")}
                    >
                        <Crosshair size={12} color={heroMissionTab === "available" ? "#FFFFFF" : colors.textSecondary} />
                        <Text style={{
                            fontFamily: fonts.heading.bold,
                            fontSize: 11,
                            color: heroMissionTab === "available" ? "#FFFFFF" : colors.textSecondary,
                        }}>
                            Available ({activeQuests.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 16,
                            backgroundColor: heroMissionTab === "completed" ? "#16a34a" : "transparent",
                        }}
                        onPress={() => onSelectTab("completed")}
                    >
                        <CheckCircle2 size={12} color={heroMissionTab === "completed" ? "#FFFFFF" : colors.textSecondary} />
                        <Text style={{
                            fontFamily: fonts.heading.bold,
                            fontSize: 11,
                            color: heroMissionTab === "completed" ? "#FFFFFF" : colors.textSecondary,
                        }}>
                            Completed ({completedQuestsToday.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={() => router.push("/missions")}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: "rgba(255, 255, 255, 0.22)",
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.38)",
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={{ fontFamily: fonts.heading.bold, fontSize: 11, color: "#FFFFFF" }}>
                        All Missions
                    </Text>
                    <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 24 }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ overflow: "visible" }}
                    contentContainerStyle={{ gap: 20 }}
                    snapToInterval={screenWidth - 20}
                    decelerationRate="fast"
                >
                    {heroMissionTab === "available" ? (
                        activeQuests.length > 0 ? (
                            activeQuests.map((quest, index) => (
                                <HeroMissionCard
                                    key={quest.id}
                                    quest={quest}
                                    showNextArrow={index < activeQuests.length - 1}
                                />
                            ))
                        ) : (
                            <MissionEmptyCard
                                icon={<CheckCircle2 color="#16a34a" size={14} />}
                                chipStyle={{ backgroundColor: "rgba(22, 163, 74, 0.12)" }}
                                label="ALL CLEARED"
                                labelStyle={{ color: "#16a34a" }}
                                title={
                                    loading
                                        ? "Loading..."
                                        : "All daily missions cleared! 🎉\nTap Completed to review your achievements."
                                }
                            />
                        )
                    ) : completedQuestsToday.length > 0 ? (
                        completedQuestsToday.map((quest) => (
                            <CompletedMissionCard key={quest.id} quest={quest} />
                        ))
                    ) : (
                        <MissionEmptyCard
                            icon={<Crosshair color={colors.primary} size={14} />}
                            label="MISSION LOG"
                            title={"No missions completed yet today.\nTake on your available objectives to earn EXP!"}
                        />
                    )}
                </ScrollView>
                {children}
            </View>
        </>
    );
}
