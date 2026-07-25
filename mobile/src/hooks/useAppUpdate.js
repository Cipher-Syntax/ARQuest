import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Updates from "expo-updates";

let hasCheckedForUpdateThisSession = false;
let dismissedBannerThisSession = false;

const isExpoUpdatesAvailable = () => {
    const hasRequiredApi =
        Updates &&
        typeof Updates.checkForUpdateAsync === "function" &&
        typeof Updates.fetchUpdateAsync === "function" &&
        typeof Updates.reloadAsync === "function";

    if (!hasRequiredApi) {
        return false;
    }

    return typeof Updates.isEnabled === "boolean" ? Updates.isEnabled : true;
};

export default function useAppUpdate() {
    const checkInFlightRef = useRef(false);
    const updateInFlightRef = useRef(false);

    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
    const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
    const [isUpdateDownloading, setIsUpdateDownloading] = useState(false);
    const [isDismissedForSession, setIsDismissedForSession] = useState(dismissedBannerThisSession);
    const [hasCheckedForUpdate, setHasCheckedForUpdate] = useState(hasCheckedForUpdateThisSession);

    const checkForUpdate = useCallback(async () => {
        if (hasCheckedForUpdateThisSession || checkInFlightRef.current) {
            return;
        }

        if (!isExpoUpdatesAvailable()) {
            hasCheckedForUpdateThisSession = true;
            setHasCheckedForUpdate(true);
            return;
        }

        checkInFlightRef.current = true;
        setIsCheckingForUpdate(true);

        try {
            const result = await Updates.checkForUpdateAsync();
            setIsUpdateAvailable(Boolean(result?.isAvailable));
        } catch (error) {
            console.log("[useAppUpdate] Failed to check for updates:", error);
        } finally {
            hasCheckedForUpdateThisSession = true;
            setHasCheckedForUpdate(true);
            setIsCheckingForUpdate(false);
            checkInFlightRef.current = false;
        }
    }, []);

    const applyUpdate = useCallback(async () => {
        if (!isExpoUpdatesAvailable() || updateInFlightRef.current) {
            return;
        }

        updateInFlightRef.current = true;
        setIsUpdateDownloading(true);

        try {
            const updateResult = await Updates.fetchUpdateAsync();

            if (updateResult?.isNew) {
                await Updates.reloadAsync();
                return;
            }

            // Clear the banner if the update is no longer available by the time user taps.
            setIsUpdateAvailable(false);
        } catch (error) {
            console.log("[useAppUpdate] Failed to apply update:", error);
        } finally {
            setIsUpdateDownloading(false);
            updateInFlightRef.current = false;
        }
    }, []);

    const dismissUpdateBanner = useCallback(() => {
        dismissedBannerThisSession = true;
        setIsDismissedForSession(true);
    }, []);

    useEffect(() => {
        checkForUpdate();
    }, [checkForUpdate]);

    const shouldShowUpdateBanner = useMemo(
        () => isUpdateAvailable && !isDismissedForSession,
        [isUpdateAvailable, isDismissedForSession]
    );

    return {
        applyUpdate,
        checkForUpdate,
        dismissUpdateBanner,
        hasCheckedForUpdate,
        isCheckingForUpdate,
        isUpdateAvailable,
        isUpdateDownloading,
        shouldShowUpdateBanner,
    };
}