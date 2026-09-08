import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

class SoundManager {
    constructor() {
        this.players = {};
        this.isLoaded = false;
        this.isMuted = false;
        this.initPromise = null;

        // Map sound names to asset paths
        this.soundFiles = {
            quest_complete: require("../../assets/sounds/quest_complete.mp3"),
            building_unlock: require("../../assets/sounds/building_unlock.wav"),
            badge_earned: require("../../assets/sounds/badge_earned.wav"),
            trivia_correct: require("../../assets/sounds/trivia_correct.wav"),
            trivia_wrong: require("../../assets/sounds/trivia_wrong.wav"),
        };

        // Listen for AppState changes to pause/release audio when backgrounded
        this.appStateSubscription = AppState.addEventListener("change", (nextAppState) => {
            if (nextAppState === "background" || nextAppState === "inactive") {
                this.pauseAll();
            }
        });
    }

    async init() {
        if (this.isLoaded) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                const savedPref = await AsyncStorage.getItem("@pref_sound_effects");
                if (savedPref !== null) {
                    this.isMuted = savedPref === "false";
                }

                await setAudioModeAsync({
                    playsInSilentMode: true,
                    shouldPlayInBackground: false,
                    interruptionMode: "mixWithOthers",
                });

                // Pre-load all sounds safely into pooled player slots
                for (const [key, asset] of Object.entries(this.soundFiles)) {
                    if (!this.players[key]) {
                        try {
                            this.players[key] = createAudioPlayer(asset);
                        } catch (playerErr) {
                            console.warn(`Failed to create player for ${key}:`, playerErr);
                        }
                    }
                }

                this.isLoaded = true;
            } catch (error) {
                console.error("Error loading sounds:", error);
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    setMuted(muted) {
        this.isMuted = !!muted;
    }

    async play(soundName) {
        if (this.isMuted) return;
        if (!this.isLoaded) {
            await this.init();
        }

        const player = this.players[soundName];
        if (player) {
            try {
                player.seekTo(0);
                player.play();
            } catch (error) {
                console.warn(`Error playing sound ${soundName}:`, error);
            }
        } else {
            console.warn(`Sound '${soundName}' not found or failed to load.`);
        }
    }

    pauseAll() {
        for (const player of Object.values(this.players)) {
            try {
                if (player && typeof player.pause === "function") {
                    player.pause();
                }
            } catch {
                // Ignore errors during emergency background pause
            }
        }
    }

    unloadAll() {
        for (const player of Object.values(this.players)) {
            try {
                if (player && typeof player.release === "function") {
                    player.release();
                }
            } catch {
                // Ignore cleanup errors
            }
        }
        this.isLoaded = false;
        this.players = {};
    }
}

const soundManager = new SoundManager();
export default soundManager;
