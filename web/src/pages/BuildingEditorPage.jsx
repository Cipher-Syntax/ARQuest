import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { buildingService } from '../services/buildingService';
import GeofenceEditor from '../components/GeofenceEditor';
import DragDropFileUpload from '../components/common/DragDropFileUpload';
import { theme } from '../theme';

const BuildingEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [building, setBuilding] = useState({
        name: '',
        description: '',
        latitude: '',
        longitude: '',
        is_active: true,
        model_file: null,
        model_version: '',
        model_active: false,
    });

    const [geofence, setGeofence] = useState({
        latitude: '',
        longitude: '',
        radius_meters: 50,
        is_active: true,
    });

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [geofenceErrors, setGeofenceErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!isNew) {
            loadBuilding();
        }
    }, [id]);

    const loadBuilding = async () => {
        try {
            const data = await buildingService.getBuilding(id);
            setBuilding(data);
            try {
                const geofenceData = await buildingService.getGeofence(id);
                if (geofenceData) {
                    setGeofence(geofenceData);
                }
            } catch (error) {
                console.log('No geofence found');
            }
        } catch (error) {
            setErrors({ submit: 'Failed to load building' });
            navigate('/buildings');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        let finalValue = value;
        if (type === 'checkbox') finalValue = checked;
        if (type === 'file') finalValue = files[0];

        setBuilding(prev => ({
            ...prev,
            [name]: finalValue,
        }));

        if (name === 'latitude' || name === 'longitude') {
            setGeofence(prev => ({
                ...prev,
                [name]: finalValue
            }));
        }

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        const newGeofenceErrors = {};

        if (!building.name.trim()) newErrors.name = 'Name is required';
        if (!building.latitude) newErrors.latitude = 'Latitude is required';
        if (!building.longitude) newErrors.longitude = 'Longitude is required';

        const lat = parseFloat(building.latitude);
        const lon = parseFloat(building.longitude);
        if (lat < -90 || lat > 90) newErrors.latitude = 'Latitude must be between -90 and 90';
        if (lon < -180 || lon > 180) newErrors.longitude = 'Longitude must be between -180 and 180';

        if (!geofence.latitude || !geofence.longitude) {
            newGeofenceErrors.center = 'Click on map to set geofence center';
        }
        if (!geofence.radius_meters || geofence.radius_meters <= 0) {
            newGeofenceErrors.radius = 'Radius must be greater than 0';
        }

        setErrors(newErrors);
        setGeofenceErrors(newGeofenceErrors);

        return Object.keys(newErrors).length === 0 && Object.keys(newGeofenceErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSaving(true);
        try {
            const generatedSlug = building.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

            const formData = new FormData();
            formData.append('name', building.name);
            formData.append('slug', generatedSlug);
            formData.append('description', building.description || '');
            formData.append('latitude', building.latitude);
            formData.append('longitude', building.longitude);
            formData.append('is_active', building.is_active);
            formData.append('model_version', building.model_version || '');
            formData.append('model_active', building.model_active);

            if (building.model_file instanceof File) {
                formData.append('model_file', building.model_file);
            }

            const formattedGeofenceData = {
                latitude: parseFloat(geofence.latitude),
                longitude: parseFloat(geofence.longitude),
                radius_meters: parseFloat(geofence.radius_meters),
                is_active: geofence.is_active,
            };

            if (isNew) {
                const savedBuilding = await buildingService.createBuilding(formData);
                await buildingService.createGeofence(savedBuilding.id, formattedGeofenceData);

                setSuccessMessage('Building and Geofence created successfully!');
                setTimeout(() => navigate('/buildings'), 1500);
            } else {
                const savedBuilding = await buildingService.updateBuilding(id, formData);
                setBuilding(savedBuilding);

                if (geofence.id) {
                    await buildingService.updateGeofence(geofence.id, formattedGeofenceData);
                } else {
                    await buildingService.createGeofence(id, formattedGeofenceData);
                }

                setSuccessMessage('Building and Geofence updated successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (error) {
            const apiErrors = error.response?.data?.errors || {};
            setErrors(apiErrors);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            {successMessage && (
                <div style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    padding: '16px 24px',
                    borderRadius: theme.radius.md,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    fontSize: '15px',
                    fontWeight: '500',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <CheckCircle size={20} />
                    {successMessage}
                </div>
            )}

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.md,
                marginBottom: theme.spacing.lg,
            }}>
                <button
                    onClick={() => navigate('/buildings')}
                    style={{
                        padding: theme.spacing.sm,
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radius.sm,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.xs,
                    }}
                >
                    <ArrowLeft size={20} />
                    Back
                </button>
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: theme.colors.text.primary,
                    margin: 0,
                    flex: 1,
                }}>
                    {isNew ? 'New Building' : `Edit: ${building.name}`}
                </h1>

                {/* Dedicated button added here to link to PanoramaManagerPage */}
                {!isNew && (
                    <button
                        type="button"
                        onClick={() => navigate(`/panoramas/${id}`)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: theme.colors.primary,
                            color: theme.colors.text.inverse,
                            border: 'none',
                            borderRadius: theme.radius.sm,
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <ImageIcon size={18} />
                        Manage Panoramas
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: theme.spacing.lg,
                    marginBottom: theme.spacing.lg,
                }}>
                    <div style={{
                        backgroundColor: theme.colors.surface,
                        padding: theme.spacing.lg,
                        borderRadius: theme.radius.md,
                    }}>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            marginBottom: theme.spacing.md,
                        }}>Building Information</h2>

                        <div style={{ marginBottom: theme.spacing.md }}>
                            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: '500' }}>Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={building.name}
                                onChange={handleChange}
                                style={{ width: '100%', padding: theme.spacing.sm, border: `1px solid ${errors.name ? theme.colors.error : theme.colors.border}`, borderRadius: theme.radius.sm, fontSize: '14px' }}
                            />
                            {errors.name && <div style={{ color: theme.colors.error, fontSize: '12px', marginTop: theme.spacing.xs }}>{errors.name}</div>}
                        </div>

                        <div style={{ marginBottom: theme.spacing.md }}>
                            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: '500' }}>Description</label>
                            <textarea
                                name="description"
                                value={building.description || ''}
                                onChange={handleChange}
                                rows={3}
                                style={{ width: '100%', padding: theme.spacing.sm, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.sm, fontSize: '14px', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: '500' }}>Latitude *</label>
                                <input
                                    type="number"
                                    name="latitude"
                                    value={building.latitude}
                                    onChange={handleChange}
                                    step="any"
                                    style={{ width: '100%', padding: theme.spacing.sm, border: `1px solid ${errors.latitude ? theme.colors.error : theme.colors.border}`, borderRadius: theme.radius.sm, fontSize: '14px' }}
                                />
                                {errors.latitude && <div style={{ color: theme.colors.error, fontSize: '12px', marginTop: theme.spacing.xs }}>{errors.latitude}</div>}
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: '500' }}>Longitude *</label>
                                <input
                                    type="number"
                                    name="longitude"
                                    value={building.longitude}
                                    onChange={handleChange}
                                    step="any"
                                    style={{ width: '100%', padding: theme.spacing.sm, border: `1px solid ${errors.longitude ? theme.colors.error : theme.colors.border}`, borderRadius: theme.radius.sm, fontSize: '14px' }}
                                />
                                {errors.longitude && <div style={{ color: theme.colors.error, fontSize: '12px', marginTop: theme.spacing.xs }}>{errors.longitude}</div>}
                            </div>
                        </div>

                        <div style={{ marginBottom: theme.spacing.md }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, fontSize: '14px' }}>
                                <input type="checkbox" name="is_active" checked={building.is_active} onChange={handleChange} /> Active
                            </label>
                        </div>

                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            marginTop: theme.spacing.xl,
                            marginBottom: theme.spacing.md,
                            paddingTop: theme.spacing.md,
                            borderTop: `1px solid ${theme.colors.border}`,
                        }}>3D Model Configuration</h2>

                        <div style={{ marginBottom: theme.spacing.md }}>
                            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: '500' }}>3D Model File (.glb)</label>
                            <DragDropFileUpload
                                accept=".glb,.gltf"
                                value={building.model_file}
                                onChange={(file) => setBuilding(prev => ({ ...prev, model_file: file }))}
                                placeholder="Drag & drop 3D model here or click to browse"
                            />
                            {building.model_url && !building.model_file && (
                                <div style={{ fontSize: '12px', color: theme.colors.text.secondary, marginTop: theme.spacing.xs }}>
                                    Current model uploaded. Select a new file to replace it.
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: theme.spacing.md }}>
                            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: '500' }}>3D Model Version</label>
                            <input
                                type="text"
                                name="model_version"
                                value={building.model_version || ''}
                                onChange={handleChange}
                                placeholder="e.g. v1.0"
                                style={{ width: '100%', padding: theme.spacing.sm, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.sm, fontSize: '14px' }}
                            />
                        </div>

                        <div style={{ marginBottom: theme.spacing.md }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, fontSize: '14px' }}>
                                <input type="checkbox" name="model_active" checked={building.model_active} onChange={handleChange} /> 3D Model Active
                            </label>
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: theme.colors.surface,
                        padding: theme.spacing.lg,
                        borderRadius: theme.radius.md,
                    }}>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            marginBottom: theme.spacing.md,
                        }}>Geofence Configuration</h2>
                        <GeofenceEditor
                            value={geofence}
                            onChange={(newValue) => {
                                setGeofence(newValue);

                                if (newValue.latitude !== geofence.latitude || newValue.longitude !== geofence.longitude) {
                                    setBuilding(prev => ({
                                        ...prev,
                                        latitude: newValue.latitude,
                                        longitude: newValue.longitude
                                    }));
                                    setErrors(prev => ({ ...prev, latitude: null, longitude: null }));
                                }

                                if (geofenceErrors.center) setGeofenceErrors(prev => ({ ...prev, center: null }));
                            }}
                            errors={geofenceErrors}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    style={{
                        width: '100%',
                        padding: theme.spacing.md,
                        backgroundColor: theme.colors.primary,
                        color: theme.colors.text.inverse,
                        border: 'none',
                        borderRadius: theme.radius.sm,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: '600',
                        opacity: saving ? 0.6 : 1,
                    }}
                >
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </form>
        </div>
    );
};

export default BuildingEditorPage;