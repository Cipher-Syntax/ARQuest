import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import ProtectedRoute from '../components/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import DashboardLayout from '../layouts/DashboardLayout';
import DashboardPage from '../pages/DashboardPage';
import BuildingsPage from '../pages/BuildingsPage';
import BuildingEditorPage from '../pages/BuildingEditorPage';
import PanoramasPage from '../pages/PanoramasPage';
import PanoramaManagerPage from '../pages/PanoramaManagerPage';


const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <DashboardLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="buildings" element={<BuildingsPage />} />
                        <Route path="buildings/:id" element={<BuildingEditorPage />} />
                        <Route path="panoramas" element={<PanoramasPage />} />
                        <Route path="panoramas/:id" element={<PanoramaManagerPage />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;