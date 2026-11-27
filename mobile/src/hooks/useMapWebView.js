import { useEffect, useMemo, useRef, useState } from "react";

import { mapHtmlString } from "../../assets/buildings-map";

/**
 * Shared Mapbox WebView driver used by Home (preview), Explore, and Buildings.
 * The HTML string lives in-memory (assets/buildings-map.js) — never a file asset.
 */
export function useMapWebView({
    buildings = [],
    unlockedIds = [],
    location,
    authToken = "",
    perimeter = null,
    missionBuildingIds = [],
}) {
    const webViewRef = useRef(null);
    const [webViewReady, setWebViewReady] = useState(false);

    const mapHtml = useMemo(() => {
        const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "";
        const apiBase = process.env.EXPO_PUBLIC_API_URL || "";
        return mapHtmlString
            .replaceAll("__MAPBOX_TOKEN__", token)
            .replaceAll("__ARQUEST_API_BASE__", apiBase)
            .replaceAll("__ARQUEST_AUTH_TOKEN__", authToken);
    }, [authToken]);

    // Push the full payload once the WebView signals readiness
    useEffect(() => {
        if (webViewReady && webViewRef.current && buildings.length > 0) {
            const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "";
            const apiBase = process.env.EXPO_PUBLIC_API_URL || "";
            const message = JSON.stringify({
                type: "update",
                buildings,
                unlockedIds,
                missionBuildingIds,
                mapboxToken: token,
                apiBase,
                authToken,
                userLocation: location,
                perimeter,
            });
            webViewRef.current.postMessage(message);
        }
    }, [webViewReady, buildings, unlockedIds, missionBuildingIds, location, authToken, perimeter]);

    const markReady = useCallback(() => setWebViewReady(true), []);

    return {
        webViewRef,
        webViewReady,
        mapHtml,
        markReady,
    };
}

export default useMapWebView;