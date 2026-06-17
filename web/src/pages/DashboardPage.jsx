import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { buildingService } from '../services/buildingService';
import { theme } from '../theme';

const DashboardPage = () => {
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadStats = async () => {
            try {
                const buildings = await buildingService.getBuildings();
                setStats({
                    total: buildings.length,
                    active: buildings.filter(b => b.is_active).length,
                    inactive: buildings.filter(b => !b.is_active).length,
                });
            } catch (error) {
                console.error('Failed to load stats:', error);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const statCards = [
        { label: 'Total Buildings', value: stats.total, color: theme.colors.primary },
        { label: 'Active Buildings', value: stats.active, color: theme.colors.success },
        { label: 'Inactive Buildings', value: stats.inactive, color: theme.colors.text.secondary },
    ];

    return (
        <div>
            <h1 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: theme.colors.text.primary,
                marginBottom: theme.spacing.lg,
            }}>Dashboard</h1>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: theme.spacing.lg,
                    marginBottom: theme.spacing.xl,
                }}>
                    {statCards.map((card, index) => (
                        <div key={index} style={{
                            padding: theme.spacing.lg,
                            backgroundColor: theme.colors.surface,
                            borderRadius: theme.radius.md,
                            borderLeft: `4px solid ${card.color}`,
                        }}>
                            <div style={{
                                fontSize: '32px',
                                fontWeight: 'bold',
                                color: card.color,
                                marginBottom: theme.spacing.xs,
                            }}>{card.value}</div>
                            <div style={{
                                fontSize: '14px',
                                color: theme.colors.text.secondary,
                            }}>{card.label}</div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: theme.spacing.lg,
            }}>
                <button
                    onClick={() => navigate('/buildings')}
                    style={{
                        padding: theme.spacing.xl,
                        backgroundColor: theme.colors.surface,
                        border: `2px solid ${theme.colors.border}`,
                        borderRadius: theme.radius.md,
                        cursor: 'pointer',
                        textAlign: 'left',
                    }}
                >
                    <Building2 size={32} color={theme.colors.primary} style={{ marginBottom: theme.spacing.sm }} />
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: theme.colors.text.primary,
                        marginBottom: theme.spacing.xs,
                    }}>Manage Buildings</h3>
                    <p style={{
                        fontSize: '14px',
                        color: theme.colors.text.secondary,
                        margin: 0,
                    }}>Create and manage campus buildings and geofences</p>
                </button>
            </div>
        </div>
    );
};

export default DashboardPage;
