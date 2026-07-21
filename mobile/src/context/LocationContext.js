import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as Location from "expo-location";

const LocationStateContext = createContext(null);
const LocationActionsContext = createContext(null);

export const LocationProvider = ({ children }) => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [permissionStatus, setPermissionStatus] = useState("undetermined");
    const [isTracking, setIsTracking] = useState(false);
    const [heading, setHeading] = useState(0);

    const watchSubscription = useRef(null);
    const headingSubscription = useRef(null);

    const checkPermission = useCallback(async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            setPermissionStatus(status);
        } catch (err) {
            setError(err.message);
        }
    }, []);

    const requestPermission = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setPermissionStatus(status);
            return status === "granted";
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, []);

    const stopTracking = useCallback(() => {
        if (watchSubscription.current) {
            watchSubscription.current.remove();
            watchSubscription.current = null;
        }
        if (headingSubscription.current) {
            headingSubscription.current.remove();
            headingSubscription.current = null;
        }
        setIsTracking(false);
    }, []);

    const startTracking = useCallback(async () => {
        if (permissionStatus !== "granted") {
            const granted = await requestPermission();
            if (!granted) {
                setError("Location permission denied");
                return;
            }
        }

        try {
            setIsTracking(true);
            setError(null);

            if (watchSubscription.current) {
                watchSubscription.current.remove();
            }

            watchSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10,
                    timeInterval: 5000,
                },
                (newLocation) => {
                    const accuracy = newLocation.coords.accuracy;
                    const isWeak = accuracy > 40;
                    const isMocked = newLocation.mocked === true;

                    if (isMocked) {
                        setError("Fake GPS detected! Please disable mock locations to play.");
                        return;
                    } else if (isWeak) {
                        setError("Weak GPS Signal. Please step outside or use QR code fallback.");
                    } else {
                        setError(null);
                    }

                    setLocation({
                        latitude: newLocation.coords.latitude,
                        longitude: newLocation.coords.longitude,
                        accuracy: accuracy,
                        timestamp: newLocation.timestamp,
                        isWeakSignal: isWeak,
                    });
                }
            );

            if (headingSubscription.current) {
                headingSubscription.current.remove();
            }
            
            headingSubscription.current = await Location.watchHeadingAsync((headingData) => {
                const compassHeading = headingData.trueHeading !== -1 && headingData.trueHeading !== undefined
                    ? headingData.trueHeading
                    : headingData.magHeading;
                setHeading(compassHeading);
            });
        } catch (err) {
            setError(err.message);
            setIsTracking(false);
        }
    }, [permissionStatus, requestPermission]);

    useEffect(() => {
        checkPermission();
        return () => stopTracking();
    }, [checkPermission, stopTracking]);

    const stateValue = useMemo(() => ({
        location,
        error,
        permissionStatus,
        isTracking,
        heading
    }), [location, error, permissionStatus, isTracking, heading]);

    const actionsValue = useMemo(() => ({
        startTracking,
        stopTracking,
        requestPermission
    }), [startTracking, stopTracking, requestPermission]);

    return (
        <LocationStateContext.Provider value={stateValue}>
            <LocationActionsContext.Provider value={actionsValue}>
                {children}
            </LocationActionsContext.Provider>
        </LocationStateContext.Provider>
    );
};

export const useLocationState = () => {
    const context = useContext(LocationStateContext);
    if (!context) throw new Error("useLocationState must be used within a LocationProvider");
    return context;
};

export const useLocationActions = () => {
    const context = useContext(LocationActionsContext);
    if (!context) throw new Error("useLocationActions must be used within a LocationProvider");
    return context;
};
