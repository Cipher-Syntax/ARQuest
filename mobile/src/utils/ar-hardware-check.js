import { isARSupportedOnDevice } from '@reactvision/react-viro';

/**
 * Checks if the current device supports Native AR (ARCore for Android, ARKit for iOS).
 * Returns a Promise that resolves to true if supported, false otherwise.
 * 
 * Handles Google ARCore 'TRANSIENT' state gracefully by polling with retry backoff
 * and catching unhandled promise rejections originating from ViroUtils.
 */
export const checkARSupport = (maxRetries = 3, delayMs = 350) => {
    return new Promise((resolve) => {
        let attempts = 0;

        const attemptCheck = () => {
            attempts++;
            try {
                if (typeof isARSupportedOnDevice === 'function') {
                    // isARSupportedOnDevice returns a Promise AND accepts a callback.
                    // ViroUtils internally calls reject(new Error(result)) when result !== "SUPPORTED".
                    // We must attach .catch() to suppress unhandled promise rejection warnings.
                    let viroPromise;
                    try {
                        viroPromise = isARSupportedOnDevice(
                            "", 
                            (isSupported, reason) => {
                                if (isSupported) {
                                    resolve(true);
                                    return;
                                }

                                const reasonStr = String(reason || "");
                                const isTransient = reasonStr.toUpperCase().includes("TRANSIENT");

                                if (isTransient && attempts < maxRetries) {
                                    setTimeout(attemptCheck, delayMs);
                                    return;
                                }

                                const isExplicitlyUnsupported = reasonStr.toUpperCase().includes("UNSUPPORTED");
                                if (isExplicitlyUnsupported) {
                                    resolve(false);
                                } else {
                                    // If TRANSIENT persists past retries, assume supported so certified devices
                                    // with delayed Google Play Services network checks aren't falsely blocked
                                    resolve(isTransient ? true : false);
                                }
                            }
                        );
                    } catch (invokeErr) {
                        console.log("isARSupportedOnDevice call error:", invokeErr);
                        resolve(true);
                        return;
                    }

                    if (viroPromise && typeof viroPromise.catch === 'function') {
                        viroPromise.catch((err) => {
                            // Suppress the unhandled promise rejection originating from ViroUtils.js line 166
                            const errStr = String(err?.message || err || "");
                            if (errStr.toUpperCase().includes("TRANSIENT")) {
                                // Handled via callback retry loop
                                return;
                            }
                            if (errStr.toUpperCase().includes("UNSUPPORTED")) {
                                resolve(false);
                            }
                        });
                    }
                } else {
                    // If native module is loaded in custom build, default to true
                    resolve(true);
                }
            } catch (e) {
                console.log("Error checking AR support:", e);
                resolve(true); // Don't block custom build APK
            }
        };

        attemptCheck();
    });
};
