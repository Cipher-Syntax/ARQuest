import { Audio } from 'expo-av';

class SoundManager {
    constructor() {
        this.sounds = {};
        this.isLoaded = false;
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
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });

            for (const [key, asset] of Object.entries(this.soundFiles)) {
                const { sound } = await Audio.Sound.createAsync(asset);
                this.sounds[key] = sound;
            }
            
            this.isLoaded = true;
            console.log("Audio assets preloaded successfully!");
        } catch (error) {
            console.error("Error loading sounds:", error);
        }
    }

    async play(soundName) {
        if (!this.isLoaded) await this.init();
        
        const sound = this.sounds[soundName];
        if (sound) {
            try {
                // Stop and reset position to play from beginning if it's already playing
                await sound.stopAsync();
                await sound.setPositionAsync(0);
                await sound.playAsync();
            } catch (error) {
                console.error(`Error playing sound ${soundName}:`, error);
            }
        } else {
            console.warn(`Sound '${soundName}' not found.`);
        }
    }

    async unloadAll() {
        for (const sound of Object.values(this.sounds)) {
            await sound.unloadAsync();
        }
        this.isLoaded = false;
        this.sounds = {};
    }
}

export default new SoundManager();
