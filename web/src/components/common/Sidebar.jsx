import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Camera } from 'lucide-react';
import { theme } from '../../theme';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/buildings', label: 'Buildings', icon: Building2 },
        { path: '/panoramas', label: 'Panoramas', icon: Camera },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div style={{
            width: '240px',
            height: '100vh',
            backgroundColor: theme.colors.primary,
            color: theme.colors.text.inverse,
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            left: 0,
            top: 0,
        }}>
            <div style={{
                padding: theme.spacing.lg,
                borderBottom: `1px solid rgba(255,255,255,0.1)`,
            }}>
                <h2 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    margin: 0,
                }}>ARQuest Admin</h2>
            </div>

            <nav style={{ flex: 1, padding: theme.spacing.md }}>
                {menuItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing.sm,
                                padding: theme.spacing.md,
                                backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: theme.colors.text.inverse,
                                border: 'none',
                                borderRadius: theme.radius.sm,
                                cursor: 'pointer',
                                fontSize: '14px',
                                marginBottom: theme.spacing.xs,
                                textAlign: 'left',
                            }}
                        >
                            <IconComponent size={20} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default Sidebar;
