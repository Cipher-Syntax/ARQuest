import React, { createContext, useContext, useState, useEffect } from "react";
import { } from "react-native"
import { customAlert as Alert } from '../components/CustomAlert';
import { api } from "../services/api";
import { authService } from "../services/authService";
import NetInfo from '@react-native-community/netinfo';
import { offlineQueueService } from '../services/offlineQueueService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkToken();
        
        // Listen for network restoration to process offline queue
        const unsubscribe = NetInfo.addEventListener(state => {
            if (state.isConnected) {
                offlineQueueService.processQueue();
            }
        });
        
        return () => unsubscribe();
    }, []);

    const checkToken = async () => {
        try {
            const token = await authService.getAccessToken();
            if (token) {
                const response = await api.get("/api/auth/me/");
                // The backend `success_response` wraps in { data: { user: {...} } }
                const payload = response.data.data || response.data;
                const restoredUser = payload.user;
                setUser(prev => {
                    if (prev?.rank_info && restoredUser?.rank_info) {
                        if (restoredUser.rank_info.level > prev.rank_info.level) {
                            setTimeout(() => {
                                Alert(
                                    `⭐ Level Up!`,
                                    `Congratulations! You've reached Level ${restoredUser.rank_info.level}: ${restoredUser.rank_info.title}.`,
                                    [{ text: 'Awesome!', style: 'default' }]
                                );
                            }, 1200);
                        }
                    }
                    return restoredUser;
                });

                // Fire daily streak on every app open — safe to call repeatedly,
                // update_streak() is a no-op when already checked in today.
                let streakBonusExp = 0;
                try {
                    const checkinRes = await api.post("/api/auth/checkin/");
                    const checkinData = checkinRes.data.data || checkinRes.data;
                    streakBonusExp = checkinData.streak_bonus_exp || 0;

                    // Sync the updated streak_count back into local user state
                    let newStreak = checkinData.streak_count !== undefined ? checkinData.streak_count : restoredUser.streak_count;
                    if (checkinData.streak_count !== undefined) {
                        setUser(prev => ({ ...prev, streak_count: checkinData.streak_count }));
                    }

                    // Show global toast for daily check-in and milestones
                    if (streakBonusExp > 0) {
                        // Small delay ensures the UI is ready before showing the alert
                        setTimeout(() => {
                            if (streakBonusExp === 10 && newStreak > 0 && newStreak % 3 === 0) {
                                Alert(
                                    `🔥 ${newStreak}-Day Streak!`,
                                    `Amazing consistency! You've reached ${newStreak} consecutive days and earned a +${streakBonusExp} EXP bonus.`,
                                    [{ text: 'Awesome!', style: 'default' }]
                                );
                            } else {
                                Alert(
                                    `✅ Daily Check-in`,
                                    `You earned +${streakBonusExp} EXP for logging in today. Keep your streak going!`,
                                    [{ text: 'Okay', style: 'default' }]
                                );
                            }
                        }, 500);
                    }
                } catch (checkinErr) {
                    // Non-fatal — streak update failure should not break session restore
                    console.log("Checkin failed (non-fatal):", checkinErr);
                }

                return { user: restoredUser, streakBonusExp };
            }
        } catch (e) {
            console.log("Token check failed:", e);
            await authService.clearTokens();
        } finally {
            setIsLoading(false);
        }
        return null;
    };

    const login = async (username, password) => {
        setIsLoading(true);
        try {
            const response = await api.post("/api/auth/login/", {
                username,
                password });

            // Extract tokens from the response
            const payload = response.data.data || response.data;
            const { access, refresh } = payload;
            await authService.setTokens(access, refresh);

            // checkToken handles the checkin + streak update
            return await checkToken();
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            const refresh = await authService.getRefreshToken();
            if (refresh) {
                await api.post("/api/auth/logout/", { refresh });
            }
        } catch (e) {
            console.log("Logout API failed, clearing local tokens anyway");
        } finally {
            await authService.clearTokens();
            setUser(null);
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, isLoading, login, logout, checkToken }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};


