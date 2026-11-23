import React, { useMemo, useRef, useState } from "react";
import { Image, PanResponder, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { ChevronDown, ChevronUp } from "lucide-react-native";

import { useThemeColors } from "../../context/ThemeContext";
import { useArStyles } from "./arStyles";
import ARBottomControls from "./ARBottomControls";

const EXPANDED_MAP_HEIGHT = 190;
const MAP_PADDING = 12;
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "";

function mercatorPoint([longitude, latitude]) {
    const clampedLatitude = Math.max(-85.0511, Math.min(85.0511, latitude));
    const latitudeRadians = (clampedLatitude * Math.PI) / 180;
    return {
        x: (longitude + 180) / 360,
        y: (1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2,
    };
}

function inverseMercatorLatitude(y) {
    return (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
}

function isCoordinatePair(value) {
    return (
        Array.isArray(value) &&
        value.length >= 2 &&
        Number.isFinite(Number(value[0])) &&
        Number.isFinite(Number(value[1]))
    );
}

// Mirrors the Maps tab's route-following behavior: project the live user onto
// the full authored route, then display only the untraveled section.
function sliceRemainingRoute(route, current) {
    if (!current || route.length < 2) return route;

    const [userLng, userLat] = current;
    let bestDistanceSquared = Infinity;
    let bestIndex = 0;
    let bestT = 0;
    let bestPoint = route[0];

    for (let index = 0; index < route.length - 1; index += 1) {
        const [startLng, startLat] = route[index];
        const [endLng, endLat] = route[index + 1];
        const dx = endLng - startLng;
        const dy = endLat - startLat;
        const segmentLengthSquared = dx * dx + dy * dy;
        const t = segmentLengthSquared > 0
            ? Math.max(0, Math.min(1, ((userLng - startLng) * dx + (userLat - startLat) * dy) / segmentLengthSquared))
            : 0;
        const point = [startLng + t * dx, startLat + t * dy];
        const distanceSquared = (userLng - point[0]) ** 2 + (userLat - point[1]) ** 2;

        if (distanceSquared < bestDistanceSquared) {
            bestDistanceSquared = distanceSquared;
            bestIndex = index;
            bestT = t;
            bestPoint = point;
        }
    }

    // Match the Maps tab's 45m snap tolerance. If GPS is far off route, retain
    // the full route rather than making the guide disappear.
    if (Math.sqrt(bestDistanceSquared) * 111000 > 45) return route;

    const remaining = [current];
    if (bestT < 0.95) remaining.push(bestPoint);
    for (let index = bestIndex + 1; index < route.length; index += 1) {
        remaining.push(route[index]);
    }
    return remaining.length >= 2 ? remaining : [current, route[route.length - 1]];
}

/** Swipeable distance and route sheet over the AR camera. */
export default function ARRouteMiniMap({
    coordinates = [],
    campusPerimeter,
    currentLongitude,
    currentLatitude,
    targetLongitude,
    targetLatitude,
    buildingName,
    originName,
    distanceMeters,
    isScanningQr,
    capturing,
    onToggleQr,
    onCapture,
    showQr,
    showCapture,
}) {
    const colors = useThemeColors();
    const styles = useArStyles();
    const { width: screenWidth } = useWindowDimensions();
    const mapWidth = Math.max(240, Math.round(screenWidth - 32));
    const [isExpanded, setIsExpanded] = useState(false);
    const dragStartExpanded = useRef(false);

    const toggleExpanded = () => setIsExpanded((expanded) => !expanded);
    const sheetPanResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
            dragStartExpanded.current = isExpanded;
        },
        onPanResponderRelease: (_event, gesture) => {
            if (gesture.dy < -35) setIsExpanded(true);
            else if (gesture.dy > 35) setIsExpanded(false);
            else setIsExpanded(dragStartExpanded.current);
        },
    })).current;

    const mapGeometry = useMemo(() => {
        // Keep one fixed basemap frame for the whole trip. GPS only updates the
        // native SVG overlays, so the Static Images URL does not change every fix.
        const mapHeight = EXPANDED_MAP_HEIGHT;
        const hasCurrent = currentLongitude != null && currentLatitude != null &&
            Number.isFinite(Number(currentLongitude)) && Number.isFinite(Number(currentLatitude));
        const hasTarget = targetLongitude != null && targetLatitude != null &&
            Number.isFinite(Number(targetLongitude)) && Number.isFinite(Number(targetLatitude));
        const current = hasCurrent ? [Number(currentLongitude), Number(currentLatitude)] : null;
        const target = hasTarget ? [Number(targetLongitude), Number(targetLatitude)] : null;
        const route = Array.isArray(coordinates)
            ? coordinates.filter(isCoordinatePair).map(([lng, lat]) => [Number(lng), Number(lat)])
            : [];
        const perimeter = Array.isArray(campusPerimeter?.coordinates)
            ? campusPerimeter.coordinates.filter(isCoordinatePair).map(([lng, lat]) => [Number(lng), Number(lat)])
            : [];
        const displayRoute = route.length >= 2
            ? route
            : (current && target ? [current, target] : []);

        const points = [...displayRoute, current, target].filter(Boolean);
        if (points.length === 0) return null;

        const remainingRoute = sliceRemainingRoute(displayRoute, current);
        // Keep the image and route projection framed to the selected From/To
        // route. The red SVG path itself still trims forward with live GPS.
        // Without backend route geometry, anchor the basemap to the destination
        // instead of changing its URL every time the GPS position changes.
        const fitPoints = perimeter.length >= 3
            ? [...perimeter, ...route]
            : (route.length >= 2 ? route : (target ? [target] : points));
        const projected = fitPoints.map(mercatorPoint);
        const minX = Math.min(...projected.map(({ x }) => x));
        const maxX = Math.max(...projected.map(({ x }) => x));
        const minY = Math.min(...projected.map(({ y }) => y));
        const maxY = Math.max(...projected.map(({ y }) => y));
        const spanX = Math.max(maxX - minX, 1e-8);
        const spanY = Math.max(maxY - minY, 1e-8);
        const zoomX = Math.log2((mapWidth - MAP_PADDING * 2) / (512 * spanX));
        const zoomY = Math.log2((mapHeight - MAP_PADDING * 2) / (512 * spanY));
        const zoom = fitPoints.length >= 2
            ? Math.max(12, Math.min(19, Math.min(zoomX, zoomY)))
            : 16;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerLongitude = centerX * 360 - 180;
        const centerLatitude = inverseMercatorLatitude(centerY);
        const mapUrl = MAPBOX_TOKEN
            ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${centerLongitude.toFixed(6)},${centerLatitude.toFixed(6)},${zoom.toFixed(2)},0,0/${mapWidth}x${mapHeight}@2x?access_token=${encodeURIComponent(MAPBOX_TOKEN)}`
            : null;

        const worldSize = 512 * 2 ** zoom;
        const project = (coordinate) => {
            const point = mercatorPoint(coordinate);
            return {
                x: mapWidth / 2 + (point.x - centerX) * worldSize,
                y: mapHeight / 2 + (point.y - centerY) * worldSize,
            };
        };
        const routePoints = remainingRoute.map(project);
        const toPath = routePoints.length > 1
            ? routePoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")
            : "";
        const perimeterPoints = perimeter.map(project);
        const perimeterPath = perimeterPoints.length >= 3
            ? `${perimeterPoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")} Z`
            : "";
        const campusMaskPath = perimeterPath
            ? `M0,0H${mapWidth}V${mapHeight}H0Z ${perimeterPath}`
            : "";

        return {
            path: toPath,
            perimeterPath,
            campusMaskPath,
            current: current ? project(current) : null,
            target: target ? project(target) : null,
            mapUrl,
        };
    }, [coordinates, campusPerimeter, currentLongitude, currentLatitude, targetLongitude, targetLatitude, mapWidth]);

    if (!mapGeometry) return null;

    return (
        <View style={styles.routeMiniMap}>
            <View {...sheetPanResponder.panHandlers} style={styles.routeSheetDragArea}>
                <View style={styles.routeSheetHandle} />
                <View style={styles.routeSheetHeader}>
                    <View style={styles.routeDistanceBlock}>
                        <Text style={styles.routeDistanceValue} numberOfLines={1}>
                            {distanceMeters == null
                                ? "—"
                                : `${Math.max(0, Math.round(distanceMeters))} meters`}
                        </Text>
                        <Text style={styles.routeMiniMapEyebrow}>METERS TO GO</Text>
                    </View>
                <ARBottomControls
                        layout="inline"
                        isScanningQr={isScanningQr}
                        capturing={capturing}
                        onToggleQr={onToggleQr}
                        onCapture={onCapture}
                        showQr={showQr}
                        showCapture={showCapture}
                    />
                    <TouchableOpacity
                        style={styles.routeExpandButton}
                        onPress={toggleExpanded}
                        accessibilityRole="button"
                        accessibilityLabel={isExpanded ? "Collapse route map" : "Expand route map"}
                        activeOpacity={0.8}
                    >
                        {isExpanded
                            ? <ChevronDown size={22} color={colors.primary} />
                            : <ChevronUp size={22} color={colors.primary} />}
                    </TouchableOpacity>
                </View>
                <Text style={styles.routeMiniMapDestination} numberOfLines={1}>
                    {originName || "YOUR LOCATION"}  →  {buildingName || "DESTINATION"}
                </Text>
            </View>
            <View style={[styles.routeMiniMapCanvas, { height: isExpanded ? EXPANDED_MAP_HEIGHT : 0 }]}>
                    {mapGeometry.mapUrl && (
                        <Image
                            source={{ uri: mapGeometry.mapUrl }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                        />
                    )}
                    <Svg
                        width="100%"
                        height={EXPANDED_MAP_HEIGHT}
                        viewBox={`0 0 ${mapWidth} ${EXPANDED_MAP_HEIGHT}`}
                        preserveAspectRatio="none"
                    >
                        {mapGeometry.campusMaskPath ? (
                            <Path
                                d={mapGeometry.campusMaskPath}
                                fill={campusPerimeter?.fill_color || "#111827"}
                                fillOpacity={Math.min(0.65, Math.max(0.12, Number(campusPerimeter?.fill_opacity ?? 0.4)))}
                                fillRule="evenodd"
                            />
                        ) : null}
                        {mapGeometry.perimeterPath ? (
                            <Path
                                d={mapGeometry.perimeterPath}
                                fill="none"
                                stroke={campusPerimeter?.stroke_color || colors.primary}
                                strokeWidth={Math.max(1, Number(campusPerimeter?.stroke_width || 2.5))}
                                strokeDasharray="5 4"
                            />
                        ) : null}
                        {mapGeometry.path ? (
                            <>
                                <Path d={mapGeometry.path} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
                                <Path d={mapGeometry.path} fill="none" stroke={colors.primary} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                            </>
                        ) : null}
                        {mapGeometry.current && (
                            <>
                                <Circle cx={mapGeometry.current.x} cy={mapGeometry.current.y} r={8} fill="rgba(255,255,255,0.9)" />
                                <Circle cx={mapGeometry.current.x} cy={mapGeometry.current.y} r={4.5} fill={colors.primary} stroke="#FFFFFF" strokeWidth={2.5} />
                            </>
                        )}
                        {mapGeometry.target && <Circle cx={mapGeometry.target.x} cy={mapGeometry.target.y} r={5} fill="#E8B923" stroke="#FFFFFF" strokeWidth={2} />}
                    </Svg>
            </View>
        </View>
    );
}
