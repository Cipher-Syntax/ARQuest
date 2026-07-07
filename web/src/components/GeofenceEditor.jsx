import React, { useState, useMemo, useEffect } from "react";
import Map, { Marker, Source, Layer, Popup, NavigationControl } from "react-map-gl";
import circle from "@turf/circle";
import { theme } from "../theme";
import "mapbox-gl/dist/mapbox-gl.css";
import "@google/model-viewer";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const WMSU_CENTER = { lat: 6.9122, lng: 122.0605 };
const WMSU_BOUNDS = [
    [122.0575, 6.9095],
    [122.064, 6.9155],
];

const MaintenanceIcon = () => (
    <div style={{
        backgroundColor: "#f97316", width: "32px", height: "32px", borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "2px solid white", boxShadow: "0 0 15px rgba(249, 115, 22, 0.8)",
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
    }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    </div>
);

const DefaultIcon = ({ color = "#ef4444" }) => (
    <div style={{
        backgroundColor: color, width: "24px", height: "24px", borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "2px solid white", boxShadow: "0 0 10px rgba(0,0,0,0.3)"
    }}>
        <div style={{ width: "8px", height: "8px", backgroundColor: "white", borderRadius: "50%" }} />
    </div>
);

const GeofenceEditor = ({
    value,
    onChange,
    errors,
    existingBuildings = [],
    currentBuildingId = null,
    buildingName = "",
    buildingStatus = "DRAFT",
}) => {
    const center = {
        lat: value?.latitude ? parseFloat(value.latitude) : WMSU_CENTER.lat,
        lng: value?.longitude ? parseFloat(value.longitude) : WMSU_CENTER.lng,
    };

    const [viewState, setViewState] = useState({
        longitude: center.lng,
        latitude: center.lat,
        zoom: 17,
        pitch: 45,
        bearing: 0
    });

    useEffect(() => {
        if (value?.latitude && value?.longitude) {
            setViewState(prev => ({
                ...prev,
                longitude: parseFloat(value.longitude),
                latitude: parseFloat(value.latitude)
            }));
        }
    }, [value?.latitude, value?.longitude]);

    const [hoveredBuilding, setHoveredBuilding] = useState(null);

    const handleMapClick = (e) => {
        const lat = e.lngLat.lat.toFixed(6);
        const lng = e.lngLat.lng.toFixed(6);
        onChange({ ...value, latitude: lat, longitude: lng });
    };

    const currentCircleGeoJSON = useMemo(() => {
        if (!value?.latitude || !value?.longitude) return null;
        const radius = parseFloat(value.radius_meters) || 0;
        if (radius <= 0) return null;
        return circle([parseFloat(value.longitude), parseFloat(value.latitude)], radius / 1000, { steps: 64, units: 'kilometers' });
    }, [value?.latitude, value?.longitude, value?.radius_meters]);

    const existingCirclesData = useMemo(() => {
        const features = [];
        existingBuildings.forEach(b => {
            if (currentBuildingId && b.id === currentBuildingId) return;
            if (!b.lat && !b.latitude) return;
            const lat = parseFloat(b.lat || b.latitude);
            const lng = parseFloat(b.lng || b.longitude);
            const radius = b.geofences && b.geofences.length > 0 ? parseFloat(b.geofences[0].radius_meters) : 20;
            if (radius > 0) {
                const c = circle([lng, lat], radius / 1000, { steps: 64, units: 'kilometers' });
                features.push(c);
            }
        });
        return {
            type: 'FeatureCollection',
            features: features
        };
    }, [existingBuildings, currentBuildingId]);

    return (
        <div>
            <style>
                {\
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: .7; transform: scale(1.1); }
                }
                \}
            </style>
            <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: "block", marginBottom: theme.spacing.xs, fontSize: "14px", fontWeight: "500" }}>
                    Radius (meters) *
                </label>
                <input
                    type="number"
                    value={value?.radius_meters || ""}
                    onChange={(e) => onChange({ ...value, radius_meters: e.target.value })}
                    min="1"
                    style={{
                        width: "100%", padding: theme.spacing.sm,
                        border: \1px solid \\,
                        borderRadius: theme.radius.sm, fontSize: "14px",
                    }}
                />
                {errors?.radius && (
                    <div style={{ color: theme.colors.error, fontSize: "12px", marginTop: theme.spacing.xs }}>{errors.radius}</div>
                )}
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm, fontSize: "14px" }}>
                    <input type="checkbox" checked={value?.is_active !== false} onChange={(e) => onChange({ ...value, is_active: e.target.checked })} />
                    Active
                </label>
            </div>

            <div style={{ marginBottom: theme.spacing.md, height: "400px", border: \1px solid \\, borderRadius: theme.radius.sm, overflow: "hidden" }}>
                <Map
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    onClick={handleMapClick}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    maxBounds={WMSU_BOUNDS}
                    minZoom={16}
                    maxZoom={20}
                >
                    <NavigationControl position="top-right" />

                    <Layer
                        id="3d-buildings"
                        source="composite"
                        source-layer="building"
                        filter={['==', 'extrude', 'true']}
                        type="fill-extrusion"
                        minzoom={15}
                        paint={{
                            'fill-extrusion-color': '#aaa',
                            'fill-extrusion-height': ['get', 'height'],
                            'fill-extrusion-base': ['get', 'min_height'],
                            'fill-extrusion-opacity': 0.6
                        }}
                    />

                    <Source id="existing-geofences" type="geojson" data={existingCirclesData}>
                        <Layer
                            id="existing-geofences-fill"
                            type="fill"
                            paint={{
                                'fill-color': '#ef4444',
                                'fill-opacity': 0.15
                            }}
                        />
                        <Layer
                            id="existing-geofences-line"
                            type="line"
                            paint={{
                                'line-color': '#ef4444',
                                'line-width': 2,
                                'line-dasharray': [2, 2]
                            }}
                        />
                    </Source>

                    {currentCircleGeoJSON && (
                        <Source id="current-geofence" type="geojson" data={currentCircleGeoJSON}>
                            <Layer
                                id="current-geofence-fill"
                                type="fill"
                                paint={{
                                    'fill-color': theme.colors.primary,
                                    'fill-opacity': 0.2
                                }}
                            />
                            <Layer
                                id="current-geofence-line"
                                type="line"
                                paint={{
                                    'line-color': theme.colors.primary,
                                    'line-width': 2
                                }}
                            />
                        </Source>
                    )}

                    {existingBuildings.map((b) => {
                        if (currentBuildingId && b.id === currentBuildingId) return null;
                        if (!b.lat && !b.latitude) return null;
                        const lat = parseFloat(b.lat || b.latitude);
                        const lng = parseFloat(b.lng || b.longitude);
                        const bldgName = b.name || "Building";

                        return (
                            <Marker
                                key={b.id}
                                longitude={lng}
                                latitude={lat}
                                anchor="bottom"
                                onClick={(e) => {
                                    e.originalEvent.stopPropagation();
                                    setHoveredBuilding(b);
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div className="text-[10px] font-bold text-red-600 shadow-sm border-0 bg-white/80 px-1 rounded mb-1 whitespace-nowrap">
                                        {bldgName}
                                    </div>
                                    {b.status === 'MAINTENANCE' ? <MaintenanceIcon /> : <DefaultIcon />}
                                </div>
                            </Marker>
                        );
                    })}

                    {value?.latitude && value?.longitude && (
                        <Marker
                            longitude={parseFloat(value.longitude)}
                            latitude={parseFloat(value.latitude)}
                            anchor="bottom"
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div className={\	ext-[10px] font-bold \ shadow-sm border-0 bg-white/80 px-1 rounded mb-1 whitespace-nowrap\}>
                                    {buildingName || "Current Building"}
                                </div>
                                {buildingStatus === 'MAINTENANCE' ? <MaintenanceIcon /> : <DefaultIcon color={theme.colors.primary} />}
                            </div>
                        </Marker>
                    )}

                    {hoveredBuilding && hoveredBuilding.model_url && (
                        <Popup
                            longitude={parseFloat(hoveredBuilding.lng || hoveredBuilding.latitude)}
                            latitude={parseFloat(hoveredBuilding.lat || hoveredBuilding.latitude)}
                            anchor="top"
                            onClose={() => setHoveredBuilding(null)}
                            closeButton={true}
                            closeOnClick={false}
                            className="z-50"
                        >
                            <div style={{ width: "220px", height: "220px", background: "#f8fafc", position: "relative" }}>
                                <model-viewer
                                    src={hoveredBuilding.model_url}
                                    auto-rotate
                                    rotation-per-second="45deg"
                                    camera-controls
                                    style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
                                ></model-viewer>
                                <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none">
                                    <span className="bg-white/80 px-2 py-1 rounded text-[10px] font-bold text-red-600 uppercase tracking-wider shadow-sm">
                                        {hoveredBuilding.name || "Building"} 3D Model
                                    </span>
                                </div>
                            </div>
                        </Popup>
                    )}
                </Map>
            </div>

            <div style={{ padding: theme.spacing.sm, backgroundColor: "#e3f2fd", borderRadius: theme.radius.sm, fontSize: "12px", marginBottom: theme.spacing.md }}>
                Click on the map to set geofence center. The circle shows the geofence coverage area.
            </div>

            {errors?.center && (
                <div style={{ color: theme.colors.error, fontSize: "12px", marginBottom: theme.spacing.md }}>
                    {errors.center}
                </div>
            )}
        </div>
    );
};

export default GeofenceEditor;
