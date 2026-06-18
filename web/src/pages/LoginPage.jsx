import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../theme';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, logout } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await login(username, password);

            // Extract the role, checking both flat and nested structures
            const role = data?.user?.role || data?.role;

            if (role !== 'admin') {
                await logout();
                setError('Access denied. Only admin users can access this dashboard. Please contact an administrator to upgrade your account.');
                setLoading(false);
                return;
            }
            navigate('/dashboard');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Invalid username or password';
            setError(errorMessage);
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.background,
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                padding: theme.spacing.xl,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: theme.colors.primary,
                    marginBottom: theme.spacing.lg,
                    textAlign: 'center',
                }}>ARQuest Admin</h1>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: theme.spacing.md }}>
                        <label style={{
                            display: 'block',
                            marginBottom: theme.spacing.xs,
                            color: theme.colors.text.primary,
                            fontSize: '14px',
                        }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: theme.spacing.sm,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radius.sm,
                                fontSize: '14px',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: theme.spacing.md }}>
                        <label style={{
                            display: 'block',
                            marginBottom: theme.spacing.xs,
                            color: theme.colors.text.primary,
                            fontSize: '14px',
                        }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: theme.spacing.sm,
                                    paddingRight: '40px',
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.radius.sm,
                                    fontSize: '14px',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: theme.colors.text.secondary,
                                }}
                            >
                                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            padding: theme.spacing.sm,
                            backgroundColor: '#ffebee',
                            color: theme.colors.error,
                            borderRadius: theme.radius.sm,
                            marginBottom: theme.spacing.md,
                            fontSize: '14px',
                        }}>{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: theme.spacing.md,
                            backgroundColor: theme.colors.primary,
                            color: theme.colors.text.inverse,
                            border: 'none',
                            borderRadius: theme.radius.sm,
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
