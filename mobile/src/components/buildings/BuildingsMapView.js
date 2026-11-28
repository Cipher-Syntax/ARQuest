import React from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import { ErrorBoundary } from "../../components/ui/ErrorBoundary";

/**
 * Map View: Mapbox WebView + search terminal (FROM/TO) + map legend + route nav card.
 * All WebView bridge messaging is handled by the useBuildingsMap hook.
 */
export function BuildingsMapView({
    // Map hook
    webViewRef,
    webViewReady,
    setWebViewReady,
    mapHtml,
    allBuildings,
    isLoadingAll,
    campusPerimeter,
    handleMessage,
    // Routing hook
    routeTarget,
    routeOrigin,
    searchQuery,
    setSearchQuery,
    originQuery,
    setOriginQuery,
    isSearchFocused,
    setIsSearchFocused,
    isOriginFocused,
    setIsOriginFocused,
    isRouteActive,
    calculatedRoute,
    isRouteLoading,
    routeDistance,
    filteredTargetBuildings,
    filteredOriginBuildings,
    handleSelectRouteTarget,
    handleSelectRouteOrigin,
    handleClearOrigin,
    handleClearRoute,
    handleStartRoute,
    handleStopRoute,
    turnHUD,
    // View mode
    viewMode,
    // Detail modal trigger
    onBuildingClick,
    role,
    // Map style
    mapStyle,
    setMapStyle,
    // Styles
    styles,
    colors,
}) {
    const showMap = viewMode === "map";

    if (!showMap) {
        return null;
    }

    // Map legend labels depend on role
    const unlockedLabel = role === "professional" ? "Visited" : "Unlocked";
    const lockedLabel = role === "professional" ? "Unvisited" : "Locked";

    return (
        <View style={{ flex: 1 }}>
            {(isLoadingAll || !webViewReady) && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading Map...</Text>
                </View>
            )}

            <ErrorBoundary
                title="Map View Interrupted"
                message="The 3D campus map encountered an error. Tap retry to reload the map."
                onReset={() => {
                    setWebViewReady(false);
                    if (webViewRef.current) {
                        webViewRef.current.reload();
                    }
                }}
            >
                <WebView
                    ref={webViewRef}
                    source={{ html: mapHtml, baseUrl: "https://api.mapbox.com/" }}
                    style={styles.webview}
                    onMessage={handleMessage}
                    onLoadEnd={() => {
                        setWebViewReady(true);
                    }}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.warn("[WebView] WebView error: ", nativeEvent);
                    }}
                    onHttpError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.warn("[WebView] HTTP error: ", nativeEvent);
                    }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowFileAccess={true}
                    allowFileAccessFromFileURLs={true}
                    allowUniversalAccessFromFileURLs={true}
                    originWhitelist={["*"]}
                    mixedContentMode="always"
                />
            </ErrorBoundary>

            {/* Routing Search Overlay */}
            <LinearGradient
                colors={[
                    "rgba(255,255,255,1)",
                    "rgba(255,255,255,0.95)",
                    "rgba(255,255,255,0.8)",
                ]}
                style={styles.searchTerminal}
                pointerEvents="box-none"
            >
                <Text style={styles.terminalHeader}>Map Navigation</Text>

                <View style={styles.terminalInputContainer}>
                    {/* FROM input */}
                    <View style={styles.terminalInputRow}>
                        <Text style={styles.terminalInputLabel}>FROM</Text>
                        <TextInput
                            style={[
                                styles.terminalInput,
                                !routeOrigin && {
                                    color: colors.success,
                                    fontWeight: "bold",
                                },
                            ]}
                            placeholder="Your Location"
                            placeholderTextColor={
                                !routeOrigin ? colors.success : "#999999"
                            }
                            value={originQuery}
                            onChangeText={setOriginQuery}
                            onFocus={() => {
                                setIsOriginFocused(true);
                                setIsSearchFocused(false);
                            }}
                            onBlur={() =>
                                setTimeout(() => setIsOriginFocused(false), 200)
                            }
                        />
                        {routeOrigin && (
                            <TouchableOpacity
                                onPress={handleClearOrigin}
                                style={styles.clearRouteBtn}
                            >
                                <Ionicons name="close" color={colors.textMuted} size={18} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {isOriginFocused && originQuery.length > 0 && (
                        <View style={styles.searchResultsContainer}>
                            <ScrollView
                                style={styles.searchResultsList}
                                keyboardShouldPersistTaps="handled"
                                nestedScrollEnabled
                            >
                                {filteredOriginBuildings.map((b) => (
                                    <TouchableOpacity
                                        key={`origin-${b.id}`}
                                        style={styles.searchResultItem}
                                        onPress={() => handleSelectRouteOrigin(b)}
                                    >
                                        <View
                                            style={[
                                                styles.searchResultItemInner,
                                                b.primary_department && {
                                                    borderLeftWidth: 4,
                                                    borderLeftColor: b.primary_department.color_hex || colors.primary,
                                                    paddingLeft: 8,
                                                },
                                            ]}
                                        >
                                            <Text style={styles.searchResultName}>{b.name}</Text>
                                            <Text
                                                style={[
                                                    styles.searchResultStatus,
                                                    b.is_active === false && styles.searchResultStatusInactive,
                                                ]}
                                            >
                                                {b.primary_department ? `${b.primary_department.name} • ` : ""}
                                                {b.is_active === false ? "CLOSED / INACTIVE" : "AVAILABLE"}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                {filteredOriginBuildings.length === 0 && (
                                    <Text style={styles.searchNoResult}>No buildings found.</Text>
                                )}
                            </ScrollView>
                        </View>
                    )}

                    {/* TO input */}
                    <View style={styles.terminalInputRowActive}>
                        <Text style={styles.terminalInputLabel}>TO</Text>
                        <View style={styles.toInputWrapper}>
                            <TextInput
                                style={styles.terminalInputActive}
                                placeholder="Search Destination"
                                placeholderTextColor="#999999"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onFocus={() => {
                                    setIsSearchFocused(true);
                                    setIsOriginFocused(false);
                                }}
                                onBlur={() =>
                                    setTimeout(() => setIsSearchFocused(false), 200)
                                }
                            />
                            {routeTarget && routeDistance !== null && (
                                <View style={styles.distanceCornerBadge} pointerEvents="none">
                                    <Text style={styles.distanceCornerBadgeText}>
                                        {routeDistance}m
                                    </Text>
                                </View>
                            )}
                        </View>
                        {routeTarget && (
                            <TouchableOpacity
                                onPress={handleClearRoute}
                                style={styles.clearRouteBtn}
                            >
                                <Ionicons name="close" color={colors.textMuted} size={18} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {isSearchFocused && searchQuery.length > 0 && (
                        <View style={styles.searchResultsContainer}>
                            <ScrollView
                                style={styles.searchResultsList}
                                keyboardShouldPersistTaps="handled"
                                nestedScrollEnabled
                            >
                                {filteredTargetBuildings.map((b) => (
                                    <TouchableOpacity
                                        key={`target-${b.id}`}
                                        style={styles.searchResultItem}
                                        onPress={() => handleSelectRouteTarget(b)}
                                    >
                                        <View
                                            style={[
                                                styles.searchResultItemInner,
                                                b.primary_department && {
                                                    borderLeftWidth: 4,
                                                    borderLeftColor: b.primary_department.color_hex || colors.primary,
                                                    paddingLeft: 8,
                                                },
                                            ]}
                                        >
                                            <Text style={styles.searchResultName}>{b.name}</Text>
                                            <Text
                                                style={[
                                                    styles.searchResultStatus,
                                                    b.is_active === false && styles.searchResultStatusInactive,
                                                ]}
                                            >
                                                {b.primary_department ? `${b.primary_department.name} • ` : ""}
                                                {b.is_active === false ? "CLOSED / INACTIVE" : "AVAILABLE"}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                {filteredTargetBuildings.length === 0 && (
                                    <Text style={styles.searchNoResult}>No buildings found.</Text>
                                )}
                            </ScrollView>
                        </View>
                    )}
                </View>

                </LinearGradient>

            {/* Map Legend with Map Style Toggle (hidden while route is being planned or navigated) */}
            {!routeTarget && (
                <View style={styles.mapLegend}>
                    <Text style={styles.legendTitle}>MAP LEGEND</Text>
                    <View style={styles.legendRow}>
                        <View
                            style={[
                                styles.legendDot,
                                {
                                    backgroundColor: "#4285F4",
                                    borderWidth: 2,
                                    borderColor: "#FFFFFF",
                                },
                            ]}
                        />
                        <Text style={styles.legendText}>Your Location</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View
                            style={[
                                styles.legendDot,
                                {
                                    backgroundColor: colors.primaryDark,
                                    borderWidth: 2,
                                    borderColor: "#FFFFFF",
                                },
                            ]}
                        />
                        <Text style={styles.legendText}>
                            {unlockedLabel} Location
                        </Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View
                            style={[
                                styles.legendDot,
                                {
                                    backgroundColor: "#6b7280",
                                    borderWidth: 2,
                                    borderColor: "#FFFFFF",
                                },
                            ]}
                        />
                        <Text style={styles.legendText}>
                            {lockedLabel} Location
                        </Text>
                    </View>

                    {/* Map Style Toggle integrated in legend */}
                    <View style={styles.mapStyleToggleLegend}>
                        <TouchableOpacity
                            style={styles.mapStyleBtnLegend}
                            onPress={() => setMapStyle("streets")}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.mapStyleBtnTextLegend,
                                mapStyle === "streets" && styles.mapStyleBtnTextActiveLegend,
                            ]}>Streets</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.mapStyleBtnLegend}
                            onPress={() => setMapStyle("satellite")}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.mapStyleBtnTextLegend,
                                mapStyle === "satellite" && styles.mapStyleBtnTextActiveLegend,
                            ]}>Satellite</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Google Maps Style Route Navigation Card */}
            {routeTarget && (
                <View style={styles.routeNavCard}>
                    <View style={styles.routeNavHeader}>
                        <View style={styles.routeNavInfo}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                {isRouteActive && <View style={styles.pulseLiveDot} />}
                                <Text style={styles.routeNavTitle} numberOfLines={1}>
                                    {routeTarget.name}
                                </Text>
                            </View>
                            <Text style={styles.routeNavSubtitle}>
                                {routeDistance !== null
                                    ? `${routeDistance}m • ~${Math.max(1, Math.round(routeDistance / 75))} min walk`
                                    : routeOrigin
                                    ? `From ${routeOrigin.name}`
                                    : "From Your Location (GPS)"}
                            </Text>
                        </View>

                        {/* Actions: Start vs Exit / AR */}
                        {!isRouteActive ? (
                            <TouchableOpacity
                                style={styles.startNavBtn}
                                onPress={handleStartRoute}
                                activeOpacity={0.8}
                                disabled={isRouteLoading}
                            >
                                {isRouteLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Ionicons name="navigate" size={18} color="#FFFFFF" />
                                        <Text style={styles.startNavBtnText}>Start</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <TouchableOpacity
                                    style={styles.arQuickBtn}
                                    onPress={() => {
                                        // Navigation to AR tab handled by parent
                                        if (onBuildingClick) {
                                            onBuildingClick({
                                                buildingId: routeTarget.id,
                                                name: routeTarget.name,
                                                isUnlocked: true,
                                                navigateToAR: true,
                                            });
                                        }
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="cube-outline" size={16} color={colors.primary} />
                                    <Text style={styles.arQuickBtnText}>AR</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.exitNavBtn}
                                    onPress={handleStopRoute}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="close" size={18} color="#FFFFFF" />
                                    <Text style={styles.exitNavBtnText}>Exit</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            )}

        </View>
    );
}

export default BuildingsMapView;