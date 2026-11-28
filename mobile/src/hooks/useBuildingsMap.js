import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "../services";
import { mapHtmlString } from "../../assets/buildings-map";
import { createBridgeMessage, parseBridgeMessage } from "../utils/WebViewBridge";

/**
 * Owns the Buildings screen's Mapbox WebView lifecycle:
 * - building catalogue (`allBuildings`)
 * - campus perimeter fetch
 * - WebView ref, readiness, HTML token injection
 * - `sendMapUpdate` bridge message builder
 * - `handleMessage` for map_ready, turn_instruction, building_click, log
 * - `setMapStyle` to switch between Streets/Satellite/Satellite-Streets
 *
 * Presentation stays in components/buildings/BuildingsMapView.js
 */
export function useBuildingsMap({
    unlockedBuildings,
    role,
    authToken,
    location,
    missionBuildingIds,
    onBuildingClick,
    onTurnInstruction,
    onTurnClear,
}) {
    const [allBuildings, setAllBuildings] = useState([]);
    const [isLoadingAll, setIsLoadingAll] = useState(true);
    const [campusPerimeter, setCampusPerimeter] = useState(null);
    const [mapStyle, setMapStyle] = useState("satellite"); // streets | satellite

    const webViewRef = useRef(null);
    const [webViewReady, setWebViewReady] = useState(false);

    // Fetch campus perimeter
    useEffect(() => {
        let isMounted = true;
        api.get("/api/navigation/perimeter/")
            .then((res) => {
                if (isMounted && res.data?.success && res.data?.data) {
                    setCampusPerimeter(res.data.data);
                }
            })
            .catch((err) => {
                console.log("[useBuildingsMap] Perimeter fetch notice:", err?.message);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    // Fetch building catalogue
    useEffect(() => {
        let isMounted = true;
        const fetchBuildings = async () => {
            try {
                const res = await api.get("/api/buildings/");
                if (isMounted && res.data.success) {
                    setAllBuildings(res.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch all buildings:", err);
            } finally {
                if (isMounted) setIsLoadingAll(false);
            }
        };
        fetchBuildings();
        return () => {
            isMounted = false;
        };
    }, []);

    // Map HTML with token injection
    const mapHtml = useMemo(() => {
        const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "";
        const apiBase = process.env.EXPO_PUBLIC_API_URL || "";
        return mapHtmlString
            .replaceAll("__MAPBOX_TOKEN__", token)
            .replaceAll("__ARQUEST_API_BASE__", apiBase)
            .replaceAll("__ARQUEST_AUTH_TOKEN__", authToken || "");
    }, [authToken]);

    // Send building payload to WebView
    const sendMapUpdate = useCallback(() => {
        if (webViewRef.current) {
            const unlockedIds =
                role === "visitor"
                    ? allBuildings.map((b) => b.id)
                    : unlockedBuildings.map((b) => b.id);
            const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "";
            const apiBase = process.env.EXPO_PUBLIC_API_URL || "";
            const message = createBridgeMessage("update", {
                buildings: allBuildings,
                unlockedIds: unlockedIds,
                missionBuildingIds: missionBuildingIds,
                mapboxToken: token,
                apiBase: apiBase,
                authToken: authToken,
                userLocation: location,
                perimeter: campusPerimeter,
            });
            webViewRef.current.postMessage(message);
        }
    }, [allBuildings, unlockedBuildings, missionBuildingIds, location, authToken, role, campusPerimeter]);

    // WebView message handler
    const handleMessage = useCallback(
        (event) => {
            const result = parseBridgeMessage(event.nativeEvent.data);
            if (!result.success) {
                console.error("WebView bridge parsing error", result.error);
                return;
            }

            const { type, payload } = result.data;

            if (type === "map_ready") {
                setWebViewReady(true);
                sendMapUpdate();
                return;
            }

            if (type === "log") {
                console.log("[Map WebView]", payload?.level, payload?.message);
                return;
            }

            if (type === "turn_instruction") {
                onTurnInstruction?.({
                    turnType: payload.turn || "STRAIGHT",
                    distance: payload.distance || 10,
                    instruction: payload.instruction || "",
                    turn: payload.turn,
                });
                return;
            }

            if (type === "turn_clear") {
                onTurnClear?.();
                return;
            }

            if (type === "building_click") {
                onBuildingClick?.({
                    buildingId: payload.buildingId,
                    name: payload.name,
                    isUnlocked: payload.isUnlocked,
                });
                return;
            }
        },
        [sendMapUpdate, onBuildingClick, onTurnInstruction, onTurnClear],
    );

    // Push update when WebView becomes ready
    useEffect(() => {
        if (webViewReady && webViewRef.current) {
            sendMapUpdate();
        }
    }, [webViewReady, sendMapUpdate]);

    // Change map style
    const changeMapStyle = useCallback((style) => {
        if (webViewRef.current) {
            const message = createBridgeMessage("set_style", { style });
            webViewRef.current.postMessage(message);
            setMapStyle(style);
        }
    }, []);

    return {
        webViewRef,
        webViewReady,
        setWebViewReady,
        mapHtml,
        allBuildings,
        isLoadingAll,
        campusPerimeter,
        sendMapUpdate,
        handleMessage,
        mapStyle,
        setMapStyle: changeMapStyle,
    };
}

export default useBuildingsMap;