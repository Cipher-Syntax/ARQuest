import { ViroUtils } from '@viro-community/react-viro';

/**
 * Checks if the current device supports Native AR (ARCore for Android, ARKit for iOS).
 * Returns a Promise that resolves to true if supported, false otherwise.
 */
export const checkARSupport = () => {
    return new Promise((resolve) => {
        try {
            ViroUtils.isARSupportedOnDevice(
                "", 
                (isSupported, reason) => {
                    resolve(isSupported);
                }
            );
        } catch (e) {
            console.log("Error checking AR support", e);
            resolve(false);
        }
    });
};
