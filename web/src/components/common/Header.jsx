import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { theme } from '../../theme';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div style={{
            height: '64px',
            backgroundColor: theme.colors.surface,
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: `0 ${theme.spacing.lg}`,
            gap: theme.spacing.md,
        }}>
            <span style={{
                fontSize: '14px',
                color: theme.colors.text.secondary,
            }}>
                {user?.email}
            </span>
            <button
                onClick={handleLogout}
                style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.text.inverse,
                    border: 'none',
                    borderRadius: theme.radius.sm,
                    cursor: 'pointer',
                    fontSize: '14px',
                }}
            >
                Logout
            </button>
        </div>
    );
};

export default Header;
