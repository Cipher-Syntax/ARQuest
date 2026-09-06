export const mapHtmlString = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
    <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
    <style>
        * { box-sizing: border-box; }
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: #f3f4f6;
            overflow: hidden;
            -webkit-user-select: none;
            user-select: none;
        }
        #map {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
        }
        
        .custom-dept-marker { background: transparent; border: none; }
        .user-marker-container {
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.4s ease-out;
            pointer-events: none;
        }
        .user-marker-pulse {
            position: absolute;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: rgba(66, 133, 244, 0.35);
            animation: userPulse 2s infinite ease-out;
        }
        .user-marker-dot {
            position: absolute;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background-color: #1A73E8;
            border: 2.5px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            z-index: 2;
        }
        .user-marker-heading {
            position: absolute;
            top: -6px;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 8px solid #1A73E8;
            z-index: 1;
            transition: transform 0.2s ease-out;
        }
        @keyframes userPulse {
            0% { transform: scale(0.6); opacity: 0.9; }
            70% { transform: scale(1.6); opacity: 0; }
            100% { transform: scale(1.6); opacity: 0; }
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: .5; transform: scale(1.1); }
        }

        .maintenance-icon {
            background-color: #f97316; width: 32px; height: 32px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            border: 2px solid white; box-shadow: 0 0 15px rgba(249, 115, 22, 0.8);
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .building-label {
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid rgba(0, 0, 0, 0.08);
            color: #111827;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-weight: 700;
            font-size: 11px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
            padding: 3px 8px;
            border-radius: 6px;
            margin-bottom: 4px;
            text-align: center;
            white-space: nowrap;
        }

        .maintenance-label {
            color: #f97316;
        }

        .mapboxgl-ctrl-top-right {
            top: 75px !important;
            right: 12px !important;
        }
    </style>
</head>
<body>
    <div id="map"></div>

    <script>
        const DEFAULT_MAPBOX_TOKEN = "__MAPBOX_TOKEN__";
        const WMSU_CENTER = [122.0605, 6.9122]; // Lng, Lat

        let map = null;
        let markers = [];
        let userMarkerObj = null;
        let mapInitialized = false;
        let hasInitialCentered = false;
        
        let targetBuildingId = null;
        let sourceBuildingId = null;
        let activeFullRouteCoords = null;
        let activeTargetId = null;
        let shouldRefitRoute = false;

        // Bridge logging helper
        function sendBridgeLog(level, message) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: "log",
                    payload: { level: level, message: message },
                    correlationId: "log_" + Date.now(),
                    source: "WEBVIEW"
                }));
            }
        }

        window.onerror = function(msg, url, line, col, error) {
            sendBridgeLog("error", msg + " (" + url + ":" + line + ":" + col + ")");
        };

        function sliceRouteFromUser(coords, userCoords) {
            if (!coords || coords.length < 2) return coords;
            var px = userCoords[0], py = userCoords[1];
            var bestDist2 = Infinity;
            var bestIdx = 0;
            var bestQ = coords[0];
            var bestT = 0;

            for (var i = 0; i < coords.length - 1; i++) {
                var ax = coords[i][0], ay = coords[i][1];
                var bx = coords[i + 1][0], by = coords[i + 1][1];
                var dx = bx - ax, dy = by - ay;
                var ab2 = dx * dx + dy * dy;
                var t = 0;
                if (ab2 > 0) {
                    t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / ab2));
                }
                var qx = ax + t * dx, qy = ay + t * dy;
                var dist2 = (px - qx) * (px - qx) + (py - qy) * (py - qy);
                if (dist2 < bestDist2) {
                    bestDist2 = dist2;
                    bestIdx = i;
                    bestQ = [qx, qy];
                    bestT = t;
                }
            }

            var approxDistMeters = Math.sqrt(bestDist2) * 111000;
            if (approxDistMeters > 45) {
                return null;
            }

            var remaining = [userCoords];
            if (bestT < 0.95) {
                remaining.push(bestQ);
            }
            for (var j = bestIdx + 1; j < coords.length; j++) {
                remaining.push(coords[j]);
            }
            return remaining;
        }

        function initializeMap(token) {
            if (map) return;
            const activeToken = token || DEFAULT_MAPBOX_TOKEN;
            mapboxgl.accessToken = activeToken;
            
            try {
                map = new mapboxgl.Map({
                    container: 'map',
                    style: 'mapbox://styles/mapbox/streets-v12',
                    center: WMSU_CENTER,
                    zoom: 16.5,
                    pitch: 45,
                    bearing: -15,
                    attributionControl: false
                });

                map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
                map.addControl(new mapboxgl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');

                map.on('load', () => {
                    mapInitialized = true;
                    sendBridgeLog("info", "Mapbox map loaded successfully");
                    
                    // Add 3D building extrusions
                    try {
                        const layers = map.getStyle().layers;
                        const labelLayerId = layers && layers.find(
                            (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
                        )?.id;

                        if (map.getSource('composite')) {
                            map.addLayer(
                                {
                                    'id': '3d-buildings',
                                    'source': 'composite',
                                    'source-layer': 'building',
                                    'filter': ['==', 'extrude', 'true'],
                                    'type': 'fill-extrusion',
                                    'minzoom': 15,
                                    'paint': {
                                        'fill-extrusion-color': '#d1d5db',
                                        'fill-extrusion-height': [
                                            'interpolate',
                                            ['linear'],
                                            ['zoom'],
                                            15,
                                            0,
                                            15.05,
                                            ['get', 'height']
                                        ],
                                        'fill-extrusion-base': [
                                            'interpolate',
                                            ['linear'],
                                            ['zoom'],
                                            15,
                                            0,
                                            15.05,
                                            ['get', 'min_height']
                                        ],
                                        'fill-extrusion-opacity': 0.65
                                    }
                                },
                                labelLayerId
                            );
                        }
                    } catch (e) {
                        console.log('3D buildings layer notice:', e);
                    }

                    // Add route sources and layers
                    if (!map.getSource('route')) {
                        map.addSource('route', {
                            type: 'geojson',
                            data: { type: 'FeatureCollection', features: [] }
                        });
                    }

                    if (!map.getLayer('route-line-casing')) {
                        map.addLayer({
                            id: 'route-line-casing',
                            type: 'line',
                            source: 'route',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round'
                            },
                            paint: {
                                'line-color': '#FFFFFF',
                                'line-width': 8,
                            }
                        });
                    }

                    if (!map.getLayer('route-line')) {
                        map.addLayer({
                            id: 'route-line',
                            type: 'line',
                            source: 'route',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round'
                            },
                            paint: {
                                'line-color': '#B21830',
                                'line-width': 5,
                            }
                        });
                    }

                    // Notify React Native that map is ready to receive data
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: "map_ready",
                            payload: {},
                            correlationId: "map_load_" + Date.now(),
                            source: "WEBVIEW"
                        }));
                    }

                    if (window.lastMapData) {
                        processUpdateMap(window.lastMapData);
                    }
                });

                map.on('error', (e) => {
                    sendBridgeLog("error", "Mapbox internal error: " + (e.error ? e.error.message : JSON.stringify(e)));
                });
            } catch (err) {
                sendBridgeLog("error", "Failed to construct mapboxgl.Map: " + err.message);
            }
        }

        function processUpdateMap(data) {
            if (!mapInitialized || !map) return;
            
            const buildings = data.buildings || [];
            const unlockedIds = data.unlockedIds || [];
            const userLocation = data.userLocation || null;
            
            // Clear existing markers
            markers.forEach(m => m.remove());
            markers = [];

            let boundsCoords = [];

            if (userLocation) {
                const uLat = (userLocation.latitude !== undefined && userLocation.latitude !== null)
                    ? parseFloat(userLocation.latitude)
                    : (userLocation.coords && parseFloat(userLocation.coords.latitude));
                const uLng = (userLocation.longitude !== undefined && userLocation.longitude !== null)
                    ? parseFloat(userLocation.longitude)
                    : (userLocation.coords && parseFloat(userLocation.coords.longitude));

                if (!isNaN(uLat) && !isNaN(uLng)) {
                    const userCoords = [uLng, uLat];
                    
                    if (!userMarkerObj) {
                        const el = document.createElement('div');
                        el.className = 'user-marker-container';
                        el.innerHTML = '<div class="user-marker-pulse"></div><div class="user-marker-dot"></div><div class="user-marker-heading" style="display:none;"></div>';
                        
                        userMarkerObj = new mapboxgl.Marker({ element: el, anchor: 'center' })
                            .setLngLat(userCoords)
                            .addTo(map);
                    } else {
                        userMarkerObj.setLngLat(userCoords);
                    }

                    const heading = userLocation.coords ? userLocation.coords.heading : userLocation.heading;
                    if (heading !== undefined && heading !== null && heading >= 0) {
                        const headingEl = userMarkerObj.getElement().querySelector('.user-marker-heading');
                        if (headingEl) {
                            headingEl.style.display = 'block';
                            headingEl.style.transformOrigin = 'center 16px';
                            headingEl.style.transform = 'rotate(' + heading + 'deg)';
                        }
                    }

                    boundsCoords.push(userCoords);
                }
            }

            buildings.forEach(b => {
                const isUnlocked = unlockedIds.includes(b.id);
                const lng = parseFloat(b.longitude);
                const lat = parseFloat(b.latitude);
                if (isNaN(lng) || isNaN(lat)) return;
                
                const coords = [lng, lat];
                if (isUnlocked) {
                    boundsCoords.push(coords);
                }

                const iconColor = isUnlocked ? "#B21830" : "#6B7280";

                const el = document.createElement('div');
                el.style.display = 'flex';
                el.style.flexDirection = 'column';
                el.style.alignItems = 'center';
                el.style.cursor = 'pointer';

                let labelClassName = "building-label";
                if (b.status === 'MAINTENANCE') {
                    labelClassName += " maintenance-label";
                }
                
                const labelStr = \`<div class="\${labelClassName}">\${b.name}</div>\`;
                
                let iconHtml = '';
                if (b.status === 'MAINTENANCE') {
                    iconHtml = \`
                    <div class="maintenance-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    </div>\`;
                } else {
                    iconHtml = \`
                    <div style="width: 16px; height: 16px; background-color: \${iconColor}; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.35);"></div>\`;
                }

                el.innerHTML = labelStr + iconHtml;

                const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                    .setLngLat(coords)
                    .addTo(map);

                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.ARBridge && window.ARBridge.sendMessage) {
                        window.ARBridge.sendMessage("building_click", {
                            buildingId: b.id,
                            isUnlocked: isUnlocked,
                            name: b.name,
                        });
                    } else if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(
                            JSON.stringify({
                                type: "building_click",
                                payload: {
                                    buildingId: b.id,
                                    isUnlocked: isUnlocked,
                                    name: b.name,
                                },
                                correlationId: "map_marker_" + Date.now(),
                                source: "WEBVIEW"
                            })
                        );
                    }
                });

                markers.push(marker);
            });

            // Routing
            let sourceLat = null;
            let sourceLng = null;

            if (sourceBuildingId) {
                const sourceBuilding = buildings.find(b => b.id == sourceBuildingId);
                if (sourceBuilding) {
                    sourceLat = parseFloat(sourceBuilding.latitude);
                    sourceLng = parseFloat(sourceBuilding.longitude);
                }
            } else if (userLocation) {
                sourceLat = (userLocation.latitude !== undefined && userLocation.latitude !== null)
                    ? parseFloat(userLocation.latitude)
                    : (userLocation.coords && parseFloat(userLocation.coords.latitude));
                sourceLng = (userLocation.longitude !== undefined && userLocation.longitude !== null)
                    ? parseFloat(userLocation.longitude)
                    : (userLocation.coords && parseFloat(userLocation.coords.longitude));
            }

            // Fallback: If userLocation is not locked yet, default to campus center so route is ALWAYS visible
            if ((sourceLat === null || isNaN(sourceLat)) && targetBuildingId) {
                sourceLng = WMSU_CENTER[0];
                sourceLat = WMSU_CENTER[1];
            }

            if (targetBuildingId && sourceLat !== null && sourceLng !== null && !isNaN(sourceLat) && !isNaN(sourceLng)) {
                const targetBuilding = buildings.find(b => b.id == targetBuildingId);
                if (targetBuilding) {
                    const targetLat = parseFloat(targetBuilding.latitude);
                    const targetLng = parseFloat(targetBuilding.longitude);

                    let slicedCoords = null;
                    if (activeFullRouteCoords && activeTargetId == targetBuildingId && !sourceBuildingId) {
                        slicedCoords = sliceRouteFromUser(activeFullRouteCoords, [sourceLng, sourceLat]);
                    }

                    if (slicedCoords && slicedCoords.length >= 2) {
                        if (map.getSource('route')) {
                            map.getSource('route').setData({
                                type: 'FeatureCollection',
                                features: [{
                                    type: 'Feature',
                                    properties: {},
                                    geometry: {
                                        type: 'LineString',
                                        coordinates: slicedCoords
                                    }
                                }]
                            });
                        }
                    } else {
                        // Fetch walking route from Mapbox Directions API
                        fetch('https://api.mapbox.com/directions/v5/mapbox/walking/' + sourceLng + ',' + sourceLat + ';' + targetLng + ',' + targetLat + '?geometries=geojson&access_token=' + mapboxgl.accessToken)
                            .then(res => res.json())
                            .then(routeData => {
                                let geojson = { type: 'FeatureCollection', features: [] };
                                if (routeData && routeData.routes && routeData.routes.length > 0) {
                                    activeFullRouteCoords = routeData.routes[0].geometry.coordinates;
                                    activeTargetId = targetBuildingId;
                                    
                                    const initialSlice = !sourceBuildingId ? sliceRouteFromUser(activeFullRouteCoords, [sourceLng, sourceLat]) : null;
                                    const coordsToRender = (initialSlice && initialSlice.length >= 2) ? initialSlice : activeFullRouteCoords;

                                    geojson.features.push({
                                        type: 'Feature',
                                        properties: {},
                                        geometry: {
                                            type: 'LineString',
                                            coordinates: coordsToRender
                                        }
                                    });

                                    if (shouldRefitRoute) {
                                        shouldRefitRoute = false;
                                        const routeBounds = new mapboxgl.LngLatBounds();
                                        activeFullRouteCoords.forEach(c => routeBounds.extend(c));
                                        map.fitBounds(routeBounds, {
                                            padding: { top: 140, bottom: 140, left: 40, right: 40 },
                                            maxZoom: 17,
                                            duration: 600
                                        });
                                    }
                                } else {
                                    activeFullRouteCoords = null;
                                    geojson.features.push({
                                        type: 'Feature',
                                        properties: {},
                                        geometry: {
                                            type: 'LineString',
                                            coordinates: [[sourceLng, sourceLat], [targetLng, targetLat]]
                                        }
                                    });

                                    if (shouldRefitRoute) {
                                        shouldRefitRoute = false;
                                        const routeBounds = new mapboxgl.LngLatBounds([sourceLng, sourceLat], [sourceLng, sourceLat]);
                                        routeBounds.extend([targetLng, targetLat]);
                                        map.fitBounds(routeBounds, {
                                            padding: { top: 140, bottom: 140, left: 40, right: 40 },
                                            maxZoom: 17,
                                            duration: 600
                                        });
                                    }
                                }
                                if (map.getSource('route')) {
                                    map.getSource('route').setData(geojson);
                                }
                            })
                            .catch(err => {
                                console.error('Route fetch error:', err);
                                if (map.getSource('route')) {
                                    map.getSource('route').setData({
                                        type: 'FeatureCollection',
                                        features: [{
                                            type: 'Feature',
                                            properties: {},
                                            geometry: {
                                                type: 'LineString',
                                                coordinates: [[sourceLng, sourceLat], [targetLng, targetLat]]
                                            }
                                        }]
                                    });
                                }
                            });
                    }

                    // If route was already cached and slicedCoords was used, fit once
                    if (shouldRefitRoute && (slicedCoords || activeFullRouteCoords)) {
                        shouldRefitRoute = false;
                        const coords = slicedCoords || activeFullRouteCoords;
                        const routeBounds = new mapboxgl.LngLatBounds();
                        coords.forEach(c => routeBounds.extend(c));
                        map.fitBounds(routeBounds, {
                            padding: { top: 140, bottom: 140, left: 40, right: 40 },
                            maxZoom: 17,
                            duration: 600
                        });
                    }
                }
            } else {
                if (map.getSource('route')) {
                    map.getSource('route').setData({ type: 'FeatureCollection', features: [] });
                }
                if (!hasInitialCentered && boundsCoords.length > 0) {
                    hasInitialCentered = true;
                    const bounds = new mapboxgl.LngLatBounds(boundsCoords[0], boundsCoords[0]);
                    for (const coord of boundsCoords) bounds.extend(coord);
                    map.fitBounds(bounds, { padding: 60, maxZoom: 17.5 });
                }
            }
        }

        window.updateMap = function (data) {
            window.lastMapData = data;
            
            if (data && data.mapboxToken && mapboxgl && mapboxgl.accessToken !== data.mapboxToken) {
                mapboxgl.accessToken = data.mapboxToken;
            }

            if (!map) {
                initializeMap((data && data.mapboxToken) || DEFAULT_MAPBOX_TOKEN);
            } else if (mapInitialized) {
                processUpdateMap(data || {});
            }
        };

        const handleRNMessage = (event) => {
            try {
                let data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
                const payloadData = (data && data.payload) ? data.payload : data;

                if (!data) return;

                if (data.type === "init" || data.type === "update") {
                    window.updateMap(payloadData);
                } else if (data.type === "draw_route") {
                    if (targetBuildingId != payloadData.buildingId || sourceBuildingId != payloadData.sourceBuildingId) {
                        activeFullRouteCoords = null;
                        activeTargetId = null;
                    }
                    targetBuildingId = payloadData.buildingId;
                    sourceBuildingId = payloadData.sourceBuildingId || null;
                    shouldRefitRoute = true;
                    if (window.lastMapData) processUpdateMap(window.lastMapData);
                } else if (data.type === "clear_route") {
                    targetBuildingId = null;
                    sourceBuildingId = null;
                    activeFullRouteCoords = null;
                    activeTargetId = null;
                    shouldRefitRoute = false;
                    if (mapInitialized && map && map.getSource('route')) {
                        map.getSource('route').setData({ type: 'FeatureCollection', features: [] });
                    }
                }
            } catch (e) {
                console.error("Parse error", e);
                sendBridgeLog("error", "Failed to handle RN message: " + e.message);
            }
        };

        window.addEventListener("message", handleRNMessage);
        document.addEventListener("message", handleRNMessage);

        // Immediate map start
        if (typeof mapboxgl !== 'undefined') {
            initializeMap(DEFAULT_MAPBOX_TOKEN);
        } else {
            window.addEventListener('DOMContentLoaded', () => {
                if (typeof mapboxgl !== 'undefined') {
                    initializeMap(DEFAULT_MAPBOX_TOKEN);
                }
            });
        }
    </script>
</body>
</html>
`;