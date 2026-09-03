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
    const lastHeadingRef = useRef(0);
    const lastHeadingTimeRef = useRef(0);
    const permissionStatusRef = useRef(permissionStatus);
    permissionStatusRef.current = permissionStatus;

    const checkPermission = useCallback(async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            setPermissionStatus(status);
            return status;
        } catch (err) {
            setError(err.message);
            return "denied";
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
        let currentPerm = permissionStatusRef.current;
        if (currentPerm !== "granted") {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                setPermissionStatus(status);
                if (status !== "granted") {
                    setError("Location permission denied");
                    return;
                }
            } catch (err) {
                setError(err.message);
                return;
            }
        }

        try {
            setIsTracking(true);
            setError(null);

            // Avoid re-subscribing if already active
            if (!watchSubscription.current) {
                watchSubscription.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        distanceInterval: 5,
                        timeInterval: 3000,
                    },
                    (newLocation) => {
                        const accuracy = newLocation.coords.accuracy;
                        const isWeak = accuracy > 50; // Aligned with backend weak_signal threshold (>50m)
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
                            coords: {
                                latitude: newLocation.coords.latitude,
                                longitude: newLocation.coords.longitude,
                                accuracy: accuracy,
                                altitude: newLocation.coords.altitude,
                                heading: newLocation.coords.heading,
                                speed: newLocation.coords.speed,
                            }
                        });
                    }
                );
            }

            if (!headingSubscription.current) {
                headingSubscription.current = await Location.watchHeadingAsync((headingData) => {
                    const rawHeading = headingData.trueHeading !== -1 && headingData.trueHeading !== undefined
                        ? headingData.trueHeading
                        : headingData.magHeading;
                    
                    const rounded = Math.round(rawHeading);
                    const now = Date.now();
                    // Throttle: Max 8 updates/sec (120ms) AND >= 2 degree delta to prevent render depth overflow
                    if (now - lastHeadingTimeRef.current >= 120 && Math.abs(rounded - lastHeadingRef.current) >= 2) {
                        lastHeadingTimeRef.current = now;
                        lastHeadingRef.current = rounded;
                        setHeading(rounded);
                    }
                });
            }
        } catch (err) {
            setError(err.message);
            setIsTracking(false);
        }
    }, []);

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
