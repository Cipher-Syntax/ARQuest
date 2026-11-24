// src/hooks/useARQuestTrivia.js
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "../services";
import SoundManager from "../utils/SoundManager";
import { Animated, Easing } from "react-native";

/**
 * Custom hook for AR quest and trivia management:
 * - Fetches active quests for the current user
 * - Handles quest completion/claiming with error handling
 * - Fetches random trivia facts for buildings
 * - Manages badge and rank-up animations
 */
export function useARQuestTrivia({
    user,
    enableTrivia,
    navTargetFull,
    nearbyBuildingFull,
    activeQuests: initialQuests,
    checkToken,
}) {
    const [activeQuests, setActiveQuests] = useState(initialQuests || []);
    const [fetchedTrivia, setFetchedTrivia] = useState(null);
    const [claimedQuest, setClaimedQuest] = useState(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimErrorMessage, setClaimErrorMessage] = useState("");
    const [claimErrorModalVisible, setClaimErrorModalVisible] = useState(false);
    const [claimTargetQuest, setClaimTargetQuest] = useState(null);
    const [newlyEarnedBadges, setNewlyEarnedBadges] = useState([]);
    const [rankUpInfo, setRankUpInfo] = useState(null);
    const [triviaModalVisible, setTriviaModalVisible] = useState(false);

    // Animation refs
    const slideAnim = useRef(new Animated.Value(400)).current;
    const badgeAnim = useRef(new Animated.Value(0)).current;
    const rankAnim = useRef(new Animated.Value(0)).current;

    const fetchQuests = useCallback(async () => {
        if (user?.role !== "student") return;
        try {
            const res = await api.get("/api/gamification/quests/active/");
            if (res.data.success) {
                const quests = res.data.data?.quests || (Array.isArray(res.data.data) ? res.data.data : []);
                setActiveQuests(quests);
            }
        } catch (error) {
            console.error("Error fetching quests", error);
        }
    }, [user?.role]);

    useEffect(() => {
        fetchQuests();
    }, [fetchQuests]);

    // Find matching quest for current location/target
    const matchingQuest = useMemo(() => {
        const safeActiveQuests = Array.isArray(activeQuests) ? activeQuests : [];
        return safeActiveQuests.find((q) => {
            if (q.is_completed) return false;
            // Match by nav target building
            if (navTargetFull?.id && String(q.target_building) === String(navTargetFull.id)) {
                return true;
            }
            // Match by nearby building
            if (nearbyBuildingFull?.id && String(q.target_building) === String(nearbyBuildingFull.id)) {
                return true;
            }
            return false;
        });
    }, [activeQuests, navTargetFull?.id, nearbyBuildingFull?.id]);

    const handleClaimQuest = useCallback(async (questOverride = null) => {
        const validOverride = (questOverride && typeof questOverride === 'object' && questOverride.id && !questOverride.nativeEvent)
            ? questOverride
            : null;
        const validClaimTarget = (claimTargetQuest && claimTargetQuest.id) ? claimTargetQuest : null;
        const validMatching = (matchingQuest && matchingQuest.id) ? matchingQuest : null;
        const targetQuest = validOverride || validClaimTarget || validMatching;

        if (!targetQuest || !targetQuest.id || isClaiming) return;

        setClaimTargetQuest(targetQuest);
        setIsClaiming(true);

        try {
            const res = await api.post(
                `/api/gamification/quests/${targetQuest.id}/complete/`,
            );

            if (res.data.success) {
                SoundManager.play("quest_complete");
                setClaimedQuest(targetQuest);
                setClaimTargetQuest(null);
                setActiveQuests((prev) =>
                    (Array.isArray(prev) ? prev : []).map((q) =>
                        q.id === targetQuest.id
                            ? { ...q, is_completed: true }
                            : q,
                    ),
                );

                // Show newly earned badges
                const earned = res.data.data?.newly_earned_badges || [];
                if (earned.length > 0) {
                    setTimeout(() => {
                        SoundManager.play("badge_earned");
                    }, 1200);

                    setNewlyEarnedBadges(earned);
                    Animated.sequence([
                        Animated.delay(600),
                        Animated.spring(badgeAnim, {
                            toValue: 1,
                            tension: 60,
                            friction: 8,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        setTimeout(() => {
                            Animated.timing(badgeAnim, {
                                toValue: 0,
                                duration: 300,
                                useNativeDriver: true,
                            }).start(() => setNewlyEarnedBadges([]));
                        }, 3500);
                    });
                }

                // Show rank up toast if applicable
                const newRankInfo = res.data.data?.rank_info;
                if (
                    newRankInfo &&
                    user?.rank_info &&
                    newRankInfo.level > user.rank_info.level
                ) {
                    setRankUpInfo(newRankInfo);
                    Animated.sequence([
                        Animated.delay(earned.length > 0 ? 4500 : 600),
                        Animated.spring(rankAnim, {
                            toValue: 1,
                            tension: 60,
                            friction: 8,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        setTimeout(() => {
                            Animated.timing(rankAnim, {
                                toValue: 0,
                                duration: 300,
                                useNativeDriver: true,
                            }).start(() => {
                                setRankUpInfo(null);
                                checkToken();
                            });
                        }, 4000);
                    });
                } else {
                    checkToken();
                }

                // Fetch Trivia Fact
                if (enableTrivia) {
                    try {
                        const activeBldg = navTargetFull || nearbyBuildingFull;
                        const triviaRes = await api.get(
                            `/api/buildings/trivias/?building_id=${activeBldg?.id}`,
                        );
                        if (
                            triviaRes.data.success &&
                            triviaRes.data.data.length > 0
                        ) {
                            const trivias = triviaRes.data.data;
                            const randomTrivia =
                                trivias[Math.floor(Math.random() * trivias.length)];
                            setFetchedTrivia(randomTrivia.fact);
                        } else {
                            setFetchedTrivia(null);
                        }
                    } catch (e) {
                        console.error("Error fetching trivia", e);
                        setFetchedTrivia(null);
                    }
                } else {
                    setFetchedTrivia(null);
                }

                setTriviaModalVisible(true);
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }).start();
            } else {
                setClaimErrorMessage(res?.data?.error || "Failed to complete quest.");
                setClaimErrorModalVisible(true);
            }
        } catch (err) {
            console.error("CLAIM QUEST ERROR:", err);
            let errorMessage = "The server took too long to respond. Please check your connection and retry.";
            if (typeof err?.data === "string" && err.data.includes("<html")) {
                if (err.status === 404) {
                    errorMessage = "Quest could not be located on the server (404).";
                } else if (err.status >= 500) {
                    errorMessage = "Server error encountered (500). Please try again shortly.";
                }
            } else if (err?.data?.error) {
                errorMessage = err.data.error;
            } else if (err?.data?.detail) {
                errorMessage = err.data.detail;
            } else if (err?.message) {
                errorMessage = err.message;
            } else if (typeof err === "string") {
                errorMessage = err;
            }
            setClaimErrorMessage(errorMessage);
            setClaimErrorModalVisible(true);
        } finally {
            setIsClaiming(false);
        }
    }, [claimTargetQuest, matchingQuest, isClaiming, enableTrivia, navTargetFull, nearbyBuildingFull, user, checkToken]);

    const handleViewTriviaOnly = useCallback(async () => {
        setClaimedQuest(null);
        const activeBldg = navTargetFull || nearbyBuildingFull;
        if (!activeBldg) return;

        if (enableTrivia) {
            try {
                const triviaRes = await api.get(
                    `/api/buildings/trivias/?building_id=${activeBldg.id}`,
                );
                if (triviaRes.data.success && triviaRes.data.data.length > 0) {
                    const trivias = triviaRes.data.data;
                    const randomTrivia =
                        trivias[Math.floor(Math.random() * trivias.length)];
                    setFetchedTrivia(randomTrivia.fact);
                } else {
                    setFetchedTrivia(null);
                }
            } catch (e) {
                console.error("Error fetching trivia", e);
                setFetchedTrivia(null);
            }
        } else {
            setFetchedTrivia(null);
        }

        setTriviaModalVisible(true);
        Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();
    }, [enableTrivia, navTargetFull, nearbyBuildingFull]);

    const closeTriviaModal = useCallback(() => {
        Animated.timing(slideAnim, {
            toValue: 400,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setTriviaModalVisible(false);
            setClaimedQuest(null);
        });
    }, []);

    return {
        activeQuests,
        matchingQuest,
        fetchedTrivia,
        claimedQuest,
        isClaiming,
        claimErrorMessage,
        claimErrorModalVisible,
        setClaimErrorModalVisible,
        triviaModalVisible,
        setTriviaModalVisible,
        newlyEarnedBadges,
        rankUpInfo,
        slideAnim,
        badgeAnim,
        rankAnim,
        fetchQuests,
        handleClaimQuest,
        handleViewTriviaOnly,
        closeTriviaModal,
    };
}