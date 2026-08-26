import { isARSupportedOnDevice } from '@reactvision/react-viro';

/**
 * Checks if the current device supports Native AR (ARCore for Android, ARKit for iOS).
 * Returns a Promise that resolves to true if supported, false otherwise.
 */
export const checkARSupport = () => {
    return new Promise((resolve) => {
        try {
            if (typeof isARSupportedOnDevice === 'function') {
                isARSupportedOnDevice(
                    "", 
                    (isSupported, reason) => {
                        resolve(!!isSupported);
                    }
                );
            } else {
                // If native module is loaded in custom build, default to true
                resolve(true);
            }
        } catch (e) {
            console.log("Error checking AR support:", e);
            resolve(true); // Don't block custom build APK
        }
    });
};
