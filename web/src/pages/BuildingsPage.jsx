import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildingService } from '../services/buildingService';
import { theme } from '../theme';

const BuildingsPage = () => {
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadBuildings();
    }, []);

    const loadBuildings = async () => {
        try {
            const data = await buildingService.getBuildings();
            setBuildings(data);
        } catch (error) {
            console.error('Failed to load buildings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this building?')) return;
        try {
            await buildingService.deleteBuilding(id);
            await loadBuildings();
        } catch (error) {
            alert('Failed to delete building');
        }
    };

    return (
        <div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.lg,
            }}>
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: theme.colors.text.primary,
                    margin: 0,
                }}>Buildings</h1>
                <button
                    onClick={() => navigate('/buildings/new')}
                    style={{
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        backgroundColor: theme.colors.primary,
                        color: theme.colors.text.inverse,
                        border: 'none',
                        borderRadius: theme.radius.sm,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                    }}
                >
                    + Add Building
                </button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : buildings.length === 0 ? (
                <div style={{
                    padding: theme.spacing.xl,
                    textAlign: 'center',
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.md,
                    color: theme.colors.text.secondary,
                }}>
                    No buildings found. Create your first building.
                </div>
            ) : (
                <div style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.md,
                    overflow: 'hidden',
                }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                    }}>
                        <thead>
                            <tr style={{
                                backgroundColor: theme.colors.primary,
                                color: theme.colors.text.inverse,
                            }}>
                                <th style={{ padding: theme.spacing.md, textAlign: 'left' }}>Name</th>
                                <th style={{ padding: theme.spacing.md, textAlign: 'left' }}>Description</th>
                                <th style={{ padding: theme.spacing.md, textAlign: 'center' }}>Status</th>
                                <th style={{ padding: theme.spacing.md, textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {buildings.map((building) => (
                                <tr key={building.id} style={{
                                    borderBottom: `1px solid ${theme.colors.border}`,
                                }}>
                                    <td style={{
                                        padding: theme.spacing.md,
                                        fontWeight: '600',
                                        color: theme.colors.text.primary,
                                    }}>{building.name}</td>
                                    <td style={{
                                        padding: theme.spacing.md,
                                        color: theme.colors.text.secondary,
                                        maxWidth: '300px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>{building.description || '-'}</td>
                                    <td style={{
                                        padding: theme.spacing.md,
                                        textAlign: 'center',
                                    }}>
                                        <span style={{
                                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                            backgroundColor: building.is_active ? '#e8f5e9' : '#ffebee',
                                            color: building.is_active ? theme.colors.success : theme.colors.error,
                                            borderRadius: theme.radius.sm,
                                            fontSize: '12px',
                                            fontWeight: '600',
                                        }}>
                                            {building.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{
                                        padding: theme.spacing.md,
                                        textAlign: 'center',
                                    }}>
                                        <button
                                            onClick={() => navigate(`/buildings/${building.id}`)}
                                            style={{
                                                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                                backgroundColor: theme.colors.accent,
                                                color: theme.colors.text.primary,
                                                border: 'none',
                                                borderRadius: theme.radius.sm,
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                marginRight: theme.spacing.xs,
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(building.id)}
                                            style={{
                                                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                                backgroundColor: theme.colors.error,
                                                color: theme.colors.text.inverse,
                                                border: 'none',
                                                borderRadius: theme.radius.sm,
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default BuildingsPage;
