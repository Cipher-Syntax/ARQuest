import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

export const useLocationTracking = () => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [permissionStatus, setPermissionStatus] = useState('undetermined');
    const [isTracking, setIsTracking] = useState(false);
    const watchSubscription = useRef(null);

    useEffect(() => {
        checkPermission();
        return () => {
            stopTracking();
        };
    }, []);

    const checkPermission = async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            setPermissionStatus(status);
        } catch (err) {
            setError(err.message);
        }
    };

    const requestPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setPermissionStatus(status);
            return status === 'granted';
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const startTracking = async () => {
        if (permissionStatus !== 'granted') {
            const granted = await requestPermission();
            if (!granted) {
                setError('Location permission denied');
                return;
            }
        }

        try {
            setIsTracking(true);
            setError(null);

            watchSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10,
                    timeInterval: 5000,
                },
                (newLocation) => {
                    setLocation({
                        latitude: newLocation.coords.latitude,
                        longitude: newLocation.coords.longitude,
                        accuracy: newLocation.coords.accuracy,
                        timestamp: newLocation.timestamp,
                    });
                }
            );
        } catch (err) {
            setError(err.message);
            setIsTracking(false);
        }
    };

    const stopTracking = () => {
        if (watchSubscription.current) {
            watchSubscription.current.remove();
            watchSubscription.current = null;
        }
        setIsTracking(false);
    };

    return {
        location,
        error,
        permissionStatus,
        isTracking,
        startTracking,
        stopTracking,
        requestPermission,
    };
};
