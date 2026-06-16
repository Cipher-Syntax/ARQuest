import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Button, ScrollView, ActivityIndicator } from "react-native";
import theme from "../../theme/tokens";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useUnlockedBuildings } from "../../hooks/useUnlockedBuildings";
import { GeoStatusIndicator } from "../../components/GeoStatusIndicator";
import { geofencingService } from "../../services/geofencingService";

export default function ExploreScreen() {
    const {
        location,
        error,
        permissionStatus,
        isTracking,
        startTracking,
        stopTracking,
        requestPermission,
    } = useLocationTracking();

    const { attemptUnlock } = useUnlockedBuildings();
    const [validationResult, setValidationResult] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [lastUnlockAttempt, setLastUnlockAttempt] = useState(null);

    useEffect(() => {
        if (location) {
            validateLocation();
        }
    }, [location]);

    const validateLocation = async () => {
        if (!location) return;
        
        setIsValidating(true);
        try {
            const result = await geofencingService.validateLocation(
                location.latitude,
                location.longitude,
                location.accuracy || 10
            );
            setValidationResult(result);

            if (result.status === 'inside' && result.building) {
                const buildingId = result.building.id;
                if (lastUnlockAttempt !== buildingId) {
                    try {
                        await attemptUnlock(location.latitude, location.longitude, location.accuracy || 10);
                        setLastUnlockAttempt(buildingId);
                    } catch (err) {
                        console.log('Unlock attempt:', err);
                    }
                }
            }
        } catch (err) {
            console.error('Validation error:', err);
        } finally {
            setIsValidating(false);
        }
    };

    const handleStartTracking = async () => {
        if (permissionStatus !== 'granted') {
            await requestPermission();
        }
        startTracking();
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>GPS Location Tracking</Text>
                
                {permissionStatus === 'denied' && (
                    <Text style={styles.errorText}>
                        Location permission denied. Enable it in settings.
                    </Text>
                )}

                {!isTracking && permissionStatus !== 'denied' && (
                    <Button title="Start GPS Tracking" onPress={handleStartTracking} />
                )}

                {isTracking && (
                    <Button title="Stop GPS Tracking" onPress={stopTracking} color="#dc2626" />
                )}

                {error && (
                    <Text style={styles.errorText}>{error}</Text>
                )}
            </View>

            {location && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Location</Text>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>Lat: {location.latitude.toFixed(6)}</Text>
                        <Text style={styles.infoText}>Lon: {location.longitude.toFixed(6)}</Text>
                        <Text style={styles.infoText}>Accuracy: ±{location.accuracy?.toFixed(1)}m</Text>
                    </View>
                </View>
            )}

            {isValidating && (
                <View style={styles.section}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.infoText}>Checking geofence...</Text>
                </View>
            )}

            {validationResult && (
                <View style={styles.section}>
                    <GeoStatusIndicator
                        status={validationResult.status}
                        buildingName={validationResult.building?.name}
                        permissionDenied={permissionStatus === 'denied'}
                    />

                    {validationResult.building && (
                        <View style={[styles.infoBox, styles.buildingBox]}>
                            <Text style={styles.buildingName}>{validationResult.building.name}</Text>
                            <Text style={styles.infoText}>
                                Distance: {validationResult.distance_meters}m away
                            </Text>
                        </View>
                    )}

                    {validationResult.status === 'outside' && (
                        <Text style={styles.infoText}>No buildings nearby</Text>
                    )}
                </View>
            )}

            {!isTracking && !location && (
                <View style={styles.placeholderContainer}>
                    <Text style={styles.placeholderText}>
                        Start GPS tracking to detect nearby campus buildings
                    </Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgPrimary,
    },
    section: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    sectionTitle: {
        color: theme.colors.textPrimary,
        fontSize: theme.typography.lg,
        fontWeight: "bold",
        marginBottom: theme.spacing.sm,
    },
    infoBox: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.sm,
        borderRadius: theme.radius.md,
        marginTop: theme.spacing.sm,
    },
    infoText: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.sm,
        marginVertical: 2,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.typography.sm,
        marginVertical: theme.spacing.sm,
    },
    buildingBox: {
        backgroundColor: theme.colors.primary,
        marginTop: theme.spacing.md,
    },
    buildingName: {
        color: theme.colors.white,
        fontSize: theme.typography.lg,
        fontWeight: "bold",
        marginBottom: theme.spacing.xs,
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.xl,
        marginTop: theme.spacing.xxl,
    },
    placeholderText: {
        color: theme.colors.textMuted,
        fontSize: theme.typography.md,
        textAlign: "center",
    },
});
