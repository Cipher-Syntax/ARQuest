import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children, requireAdmin = true }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Handle both flat and nested user objects from the API
    const role = user?.user?.role || user?.role;

    if (requireAdmin && role !== 'admin') {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <h2>Access Denied</h2>
                <p>You do not have permission to access this page.</p>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
