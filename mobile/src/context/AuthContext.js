import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {} from "react-native";
import { customAlert as Alert } from "../components/ui/CustomAlert";
import { api } from "../services";
import { authService } from "../services";
import NetInfo from "@react-native-community/netinfo";
import { offlineQueueService } from "../services";

const AuthStateContext = createContext(null);
const AuthActionsContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkToken = useCallback(async () => {
        try {
            const token = await authService.getAccessToken();
            if (token) {
                const response = await api.get("/api/auth/me/");
                const payload = response.data.data || response.data;
                const restoredUser = payload.user;
                setUser((prev) => {
                    if (restoredUser?.role === "student" && prev?.rank_info && restoredUser?.rank_info) {
                        if (restoredUser.rank_info.level > prev.rank_info.level) {
                            setTimeout(() => {
                                Alert(
                                    `⭐ Level Up!`,
                                    `Congratulations! You've reached Level ${restoredUser.rank_info.level}: ${restoredUser.rank_info.title}.`,
                                    [{ text: "Awesome!", style: "default" }],
                                );
                            }, 1200);
                        }
                    }
                    return restoredUser;
                });

                let streakBonusExp = 0;
                // Only students participate in daily checkins & streak EXP rewards
                if (restoredUser?.role === "student") {
                    try {
                        const checkinRes = await api.post("/api/auth/checkin/");
                        const checkinData = checkinRes.data.data || checkinRes.data;
                        streakBonusExp = checkinData.streak_bonus_exp || 0;

                        let newStreak = checkinData.streak_count !== undefined
                                ? checkinData.streak_count
                                : restoredUser.streak_count;
                                
                        if (checkinData.streak_count !== undefined) {
                            setUser((prev) => ({
                                ...prev,
                                streak_count: checkinData.streak_count,
                            }));
                        }

                        if (streakBonusExp > 0) {
                            setTimeout(() => {
                                if (streakBonusExp === 10 && newStreak > 0 && newStreak % 3 === 0) {
                                    Alert(
                                        `🔥 ${newStreak}-Day Streak!`,
                                        `Amazing consistency! You've reached ${newStreak} consecutive days and earned a +${streakBonusExp} EXP bonus.`,
                                        [{ text: "Awesome!", style: "default" }],
                                    );
                                } else {
                                    Alert(
                                        `✅ Daily Check-in`,
                                        `You earned +${streakBonusExp} EXP for logging in today. Keep your streak going!`,
                                        [{ text: "Okay", style: "default" }],
                                    );
                                }
                            }, 500);
                        }
                    } catch (checkinErr) {
                        console.log("Checkin failed (non-fatal):", checkinErr);
                    }
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
    }, []);

    const login = useCallback(async (username, password) => {
        setIsLoading(true);
        try {
            const response = await api.post("/api/auth/login/", { username, password });
            const payload = response.data.data || response.data;
            const { access, refresh } = payload;
            await authService.setTokens(access, refresh);
            return await checkToken();
        } finally {
            setIsLoading(false);
        }
    }, [checkToken]);

    const logout = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        checkToken();

        const unsubscribe = NetInfo.addEventListener((state) => {
            if (state.isConnected) {
                offlineQueueService.processQueue();
            }
        });

        return () => unsubscribe();
    }, [checkToken]);

    const stateValue = useMemo(() => ({
        user,
        isLoading
    }), [user, isLoading]);

    const actionsValue = useMemo(() => ({
        login,
        logout,
        checkToken
    }), [login, logout, checkToken]);

    return (
        <AuthStateContext.Provider value={stateValue}>
            <AuthActionsContext.Provider value={actionsValue}>
                {children}
            </AuthActionsContext.Provider>
        </AuthStateContext.Provider>
    );
};

export const useAuthState = () => {
    const context = useContext(AuthStateContext);
    if (!context) throw new Error("useAuthState must be used within an AuthProvider");
    return context;
};

export const useAuthActions = () => {
    const context = useContext(AuthActionsContext);
    if (!context) throw new Error("useAuthActions must be used within an AuthProvider");
    return context;
};

// Backwards compatibility layer
export const useAuth = () => {
    const state = useAuthState();
    const actions = useAuthActions();
    return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};
