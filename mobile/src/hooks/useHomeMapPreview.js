import { useEffect, useMemo, useRef, useState } from "react";

import { mapHtmlString } from "../../assets/buildings-map";

/**
 * Drives the Home campus-map preview: injects the Mapbox token/API base into
 * the in-memory HTML string (never a file asset, per the Android cleartext
 * constraint) and pushes the current building payload once the WebView is up.
 */
export function useHomeMapPreview({ buildings, location }) {
    const webViewRef = useRef(null);
    const [webViewReady, setWebViewReady] = useState(false);

    const mapHtml = useMemo(() => {
        const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "";
        const apiBase = process.env.EXPO_PUBLIC_API_URL || "";
        return mapHtmlString
            .replaceAll("__MAPBOX_TOKEN__", token)
            .replaceAll("__ARQUEST_API_BASE__", apiBase)
            .replaceAll("__ARQUEST_AUTH_TOKEN__", "");
    }, []);

    useEffect(() => {
        if (webViewReady && webViewRef.current && buildings.length > 0) {
            const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "";
            const apiBase = process.env.EXPO_PUBLIC_API_URL || "";
            const message = JSON.stringify({
                type: "update",
                buildings: buildings.slice(0, 5), // Just a few for preview
                unlockedIds: buildings.map((b) => b.id), // Pretend all unlocked for preview map
                mapboxToken: token,
                apiBase: apiBase,
                userLocation: location,
            });
            webViewRef.current.postMessage(message);
        }
    }, [webViewReady, buildings, location]);

    return {
        webViewRef,
        webViewReady,
        mapHtml,
        markWebViewReady: () => setWebViewReady(true),
    };
}

export default useHomeMapPreview;
