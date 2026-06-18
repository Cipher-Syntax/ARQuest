import React from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import { theme } from '../theme';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletConfig';

const WMSU_CENTER = { lat: 6.9122, lng: 122.0605 };
const WMSU_BOUNDS = [
    [6.9095, 122.0575],
    [6.9155, 122.0640],
];

const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({
        click: (e) => {
            onMapClick(e.latlng);
        },
    });
    return null;
};

const GeofenceEditor = ({ value, onChange, errors }) => {
    const center = {
        lat: value?.latitude || WMSU_CENTER.lat,
        lng: value?.longitude || WMSU_CENTER.lng,
    };

    const handleMapClick = (latlng) => {
        // Round to 6 decimal places for cleaner text input fields
        const lat = latlng.lat.toFixed(6);
        const lng = latlng.lng.toFixed(6);
        onChange({ ...value, latitude: lat, longitude: lng });
    };

    return (
        <div>
            <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: '14px',
                    fontWeight: '500',
                }}>Radius (meters) *</label>
                <input
                    type="number"
                    value={value?.radius_meters || ''}
                    onChange={(e) => onChange({ ...value, radius_meters: e.target.value })}
                    min="1"
                    style={{
                        width: '100%',
                        padding: theme.spacing.sm,
                        border: `1px solid ${errors?.radius ? theme.colors.error : theme.colors.border}`,
                        borderRadius: theme.radius.sm,
                        fontSize: '14px',
                    }}
                />
                {errors?.radius && <div style={{ color: theme.colors.error, fontSize: '12px', marginTop: theme.spacing.xs }}>{errors.radius}</div>}
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    fontSize: '14px',
                }}>
                    <input
                        type="checkbox"
                        checked={value?.is_active !== false}
                        onChange={(e) => onChange({ ...value, is_active: e.target.checked })}
                    />
                    Active
                </label>
            </div>

            <div style={{
                marginBottom: theme.spacing.md,
                height: '400px',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.sm,
                overflow: 'hidden',
            }}>
                <MapContainer
                    center={[center.lat, center.lng]}
                    zoom={17}
                    style={{ height: '100%', width: '100%' }}
                    maxBounds={WMSU_BOUNDS}
                    maxBoundsViscosity={1.0}
                    minZoom={16}
                    maxZoom={19}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <MapClickHandler onMapClick={handleMapClick} />
                    {value?.latitude && value?.longitude && (
                        <>
                            <Marker position={[value.latitude, value.longitude]} />
                            <Circle
                                center={[value.latitude, value.longitude]}
                                radius={parseFloat(value.radius_meters) || 0}
                                pathOptions={{
                                    color: theme.colors.primary,
                                    fillColor: theme.colors.primary,
                                    fillOpacity: 0.2,
                                }}
                            />
                        </>
                    )}
                </MapContainer>
            </div>

            <div style={{
                padding: theme.spacing.sm,
                backgroundColor: '#e3f2fd',
                borderRadius: theme.radius.sm,
                fontSize: '12px',
                marginBottom: theme.spacing.md,
            }}>
                Click on the map to set geofence center. The circle shows the geofence coverage area.
            </div>

            {errors?.center && <div style={{ color: theme.colors.error, fontSize: '12px', marginBottom: theme.spacing.md }}>{errors.center}</div>}
        </div>
    );
};

export default GeofenceEditor;
