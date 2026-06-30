import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

class SoundManager {
    constructor() {
        this.players = {};
        this.isLoaded = false;
        
        // Map sound names to asset paths
        this.soundFiles = {
            'quest_complete': require('../../assets/sounds/quest_complete.mp3'),
            'building_unlock': require('../../assets/sounds/building_unlock.wav'),
            'badge_earned': require('../../assets/sounds/badge_earned.wav'),
            'trivia_correct': require('../../assets/sounds/trivia_correct.wav'),
            'trivia_wrong': require('../../assets/sounds/trivia_wrong.wav'),
        };
    }

    async init() {
        if (this.isLoaded) return;
        
        try {
            await setAudioModeAsync({
                playsInSilentMode: true,
                shouldPlayInBackground: false,
                interruptionMode: 'mixWithOthers'
            });

            // Pre-load all sounds and store their player instances
            for (const [key, asset] of Object.entries(this.soundFiles)) {
                this.players[key] = createAudioPlayer(asset);
            }
            
            this.isLoaded = true;
            console.log("Audio assets preloaded successfully!");
        } catch (error) {
            console.error("Error loading sounds:", error);
        }
    }

    play(soundName) {
        if (!this.isLoaded) this.init();
        
        const player = this.players[soundName];
        if (player) {
            try {
                player.seekTo(0);
                player.play();
            } catch (error) {
                console.error(`Error playing sound ${soundName}:`, error);
            }
        } else {
            console.warn(`Sound '${soundName}' not found.`);
        }
    }

    unloadAll() {
        for (const player of Object.values(this.players)) {
            player.release();
        }
        this.isLoaded = false;
        this.players = {};
    }
}

const soundManager = new SoundManager();
export default soundManager;
