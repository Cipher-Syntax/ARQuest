export const mapHtmlString = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
    <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
    <script src="https://unpkg.com/@turf/turf@6/turf.min.js"></script>
    <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
    <style>
        body { margin: 0; padding: 0; background: #ffffff; overflow: hidden; }
        #map { width: 100vw; height: 100vh; background: #f5f5f5; }
        
        .custom-dept-marker { background: transparent; border: none; }
        .user-marker {
            background-color: #4285f4; border-radius: 50%;
            border: 2px solid #ffffff; box-shadow: 0 0 15px 5px rgba(66, 133, 244, 0.4);
            width: 16px; height: 16px;
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

        .mapboxgl-popup-content {
            padding: 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .mapboxgl-popup-close-button {
            z-index: 10;
            font-size: 20px;
            color: #555;
            padding: 4px;
        }

        .building-label {
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid transparent;
            color: #111827;
            font-weight: 700;
            font-size: 12px;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            padding: 4px 8px;
            border-radius: 4px;
            margin-bottom: 4px;
            text-align: center;
            white-space: nowrap;
        }

        .maintenance-label {
            color: #f97316;
        }

        .model-viewer-container {
            width: 200px;
            height: 200px;
            background: #f8fafc;
            position: relative;
        }
        
        model-viewer {
            width: 100%;
            height: 100%;
            background-color: transparent;
        }
        
        .model-viewer-label {
            position: absolute;
            bottom: 8px;
            left: 0;
            width: 100%;
            text-align: center;
            pointer-events: none;
        }
        
        .model-viewer-label span {
            background: rgba(255, 255, 255, 0.8);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            color: #B21830;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div id="map"></div>

    <script>
        const WMSU_CENTER = [122.0605, 6.9122]; // Lng, Lat
        const wmsuBounds = [
            [122.0575, 6.9095], // SW
            [122.064, 6.9155], // NE
        ];

        let map = null;
        let markers = [];
        let userMarkerObj = null;
        let mapInitialized = false;
        
        let targetBuildingId = null;
        let sourceBuildingId = null;

        function initializeMap(token) {
            if (map) return;
            mapboxgl.accessToken = token;
            
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v12',
                center: WMSU_CENTER,
                zoom: 16,
                minZoom: 15,
                maxBounds: wmsuBounds,
                pitch: 45, // Add 3D pitch
                bearing: 0
            });

            map.addControl(new mapboxgl.NavigationControl(), 'top-right');

            map.on('load', () => {
                mapInitialized = true;
                
                // Add 3D building extrusions if the style supports it
                try {
                    if (map.getSource('composite')) {
                        map.addLayer({
                            'id': '3d-buildings',
                            'source': 'composite',
                            'source-layer': 'building',
                            'filter': ['==', 'extrude', 'true'],
                            'type': 'fill-extrusion',
                            'minzoom': 15,
                            'paint': {
                                'fill-extrusion-color': '#aaa',
                                'fill-extrusion-height': ['get', 'height'],
                                'fill-extrusion-base': ['get', 'min_height'],
                                'fill-extrusion-opacity': 0.6
                            }
                        });
                    }
                } catch (e) {
                    console.log('Skipping 3D buildings layer (not supported by this map style)');
                }

                // Add source and layers for fog of war
                map.addSource('fog', {
                    type: 'geojson',
                    data: getFogGeoJSON([], null)
                });
                
                map.addLayer({
                    id: 'fog-layer',
                    type: 'fill',
                    source: 'fog',
                    paint: {
                        'fill-color': '#ffffff',
                        'fill-opacity': 0.85
                    }
                });

                // Add source and layers for routing
                map.addSource('route', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });

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
                        'line-dasharray': [2, 1]
                    }
                });

                if (window.lastMapData) {
                    processUpdateMap(window.lastMapData);
                }
            });
        }

        function getFogGeoJSON(unlockedCoords, userCoords) {
            const worldPolygon = turf.polygon([[
                [-180, -90],
                [180, -90],
                [180, 90],
                [-180, 90],
                [-180, -90]
            ]]);

            const campusPolygon = turf.polygon([[
                [122.0575, 6.9095], // SW
                [122.064, 6.9095], // SE
                [122.064, 6.9155], // NE
                [122.0575, 6.9155], // NW
                [122.0575, 6.9095], // SW
            ]]);

            let mask = turf.difference(worldPolygon, campusPolygon);

            if (userCoords) {
                const isOutside = userCoords[1] > 6.9155 || userCoords[1] < 6.9095 || userCoords[0] > 122.064 || userCoords[0] < 122.0575;
                if (isOutside) {
                    const userCircle = turf.circle(userCoords, 150, {steps: 64, units: 'meters'});
                    mask = turf.difference(mask, userCircle);
                }
            }
            
            unlockedCoords.forEach(coords => {
                const isOutside = coords[1] > 6.9155 || coords[1] < 6.9095 || coords[0] > 122.064 || coords[0] < 122.0575;
                if (isOutside) {
                    const buildingCircle = turf.circle(coords, 150, {steps: 64, units: 'meters'});
                    if (mask) mask = turf.difference(mask, buildingCircle);
                }
            });

            return mask || turf.featureCollection([]);
        }

        function processUpdateMap(data) {
            if (!mapInitialized) return;
            
            const { buildings, unlockedIds, userLocation } = data;
            
            // Clear existing markers
            markers.forEach(m => m.remove());
            markers = [];

            let unlockedCoords = [];
            let userCoords = null;
            let boundsCoords = [];

            if (userLocation) {
                userCoords = [userLocation.longitude, userLocation.latitude];
                
                if (userMarkerObj) userMarkerObj.remove();
                
                const el = document.createElement('div');
                el.className = 'user-marker';
                
                userMarkerObj = new mapboxgl.Marker({ element: el })
                    .setLngLat(userCoords)
                    .addTo(map);
                
                boundsCoords.push(userCoords);
            }

            buildings.forEach(b => {
                const isUnlocked = unlockedIds.includes(b.id);
                const lng = parseFloat(b.longitude);
                const lat = parseFloat(b.latitude);
                const coords = [lng, lat];
                
                if (isUnlocked) {
                    unlockedCoords.push(coords);
                    boundsCoords.push(coords);
                }

                const bgColor = isUnlocked ? "#FFFFFF" : "rgba(255,255,255,0.8)";
                const borderColor = isUnlocked ? "#B21830" : "#CCCCCC";
                const iconColor = isUnlocked ? "#B21830" : "#888888";

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
                    <div style="width: 16px; height: 16px; background-color: \${iconColor}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>\`;
                }

                el.innerHTML = labelStr + iconHtml;

                const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                    .setLngLat(coords)
                    .addTo(map);

                el.addEventListener('click', (e) => {
                    e.stopPropagation(); // prevent map click
                    if (window.ARBridge) {
                        window.ARBridge.sendMessage("building_click", {
                            buildingId: b.id,
                            isUnlocked: isUnlocked,
                            name: b.name,
                        });
                    } else if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(
                            JSON.stringify({
                                type: "building_click",
                                buildingId: b.id,
                                isUnlocked: isUnlocked,
                                name: b.name,
                            })
                        );
                    }
                });

                markers.push(marker);
            });

            // Update fog
            map.getSource('fog').setData(getFogGeoJSON(unlockedCoords, userCoords));

            // Routing
            let sourceLat = null;
            let sourceLng = null;

            if (sourceBuildingId) {
                const sourceBuilding = buildings.find(b => b.id === sourceBuildingId);
                if (sourceBuilding) {
                    sourceLat = parseFloat(sourceBuilding.latitude);
                    sourceLng = parseFloat(sourceBuilding.longitude);
                }
            } else if (userLocation) {
                sourceLat = userLocation.latitude;
                sourceLng = userLocation.longitude;
            }

            if (targetBuildingId && sourceLat !== null && sourceLng !== null) {
                const targetBuilding = buildings.find(b => b.id === targetBuildingId);
                if (targetBuilding) {
                    const targetLat = parseFloat(targetBuilding.latitude);
                    const targetLng = parseFloat(targetBuilding.longitude);

                    boundsCoords.push([sourceLng, sourceLat]);
                    boundsCoords.push([targetLng, targetLat]);

                    fetch(\`https://api.mapbox.com/directions/v5/mapbox/walking/\${sourceLng},\${sourceLat};\${targetLng},\${targetLat}?geometries=geojson&access_token=\${mapboxgl.accessToken}\`)
                        .then(res => res.json())
                        .then(routeData => {
                            let geojson = { type: 'FeatureCollection', features: [] };
                            if (routeData && routeData.routes && routeData.routes.length > 0) {
                                geojson.features.push({
                                    type: 'Feature',
                                    geometry: routeData.routes[0].geometry
                                });
                            } else {
                                geojson.features.push({
                                    type: 'Feature',
                                    geometry: {
                                        type: 'LineString',
                                        coordinates: [[sourceLng, sourceLat], [targetLng, targetLat]]
                                    }
                                });
                            }
                            map.getSource('route').setData(geojson);
                        })
                        .catch(err => {
                            map.getSource('route').setData({
                                type: 'FeatureCollection',
                                features: [{
                                    type: 'Feature',
                                    geometry: {
                                        type: 'LineString',
                                        coordinates: [[sourceLng, sourceLat], [targetLng, targetLat]]
                                    }
                                }]
                            });
                        });
                }
            } else {
                map.getSource('route').setData({ type: 'FeatureCollection', features: [] });
            }

            if (boundsCoords.length > 0) {
                const bounds = new mapboxgl.LngLatBounds(boundsCoords[0], boundsCoords[0]);
                for (const coord of boundsCoords) {
                    bounds.extend(coord);
                }
                map.fitBounds(bounds, { padding: 50, maxZoom: 18 });
            }
        }

        window.updateMap = function (data) {
            window.lastMapData = data;
            
            if (!map && data.mapboxToken) {
                initializeMap(data.mapboxToken);
            } else if (mapInitialized) {
                processUpdateMap(data);
            }
        };

        const handleRNMessage = (event) => {
            try {
                let data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
                
                // Support new structured payload format
                const payloadData = data.payload ? data.payload : data;

                if (data.type === "init" || data.type === "update") {
                    // Update map with payload
                    window.updateMap(payloadData);
                } else if (data.type === "draw_route") {
                    targetBuildingId = payloadData.buildingId;
                    sourceBuildingId = payloadData.sourceBuildingId || null;
                    if (window.lastMapData) window.updateMap(window.lastMapData);
                } else if (data.type === "clear_route") {
                    targetBuildingId = null;
                    sourceBuildingId = null;
                    if (mapInitialized) {
                        map.getSource('route').setData({ type: 'FeatureCollection', features: [] });
                    }
                }
            } catch (e) {
                console.error("Parse error", e);
            }
        };

        window.addEventListener("message", handleRNMessage);
        document.addEventListener("message", handleRNMessage);
    </script>
</body>
</html>
`;