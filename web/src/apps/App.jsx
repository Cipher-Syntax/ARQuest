import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import ProtectedRoute from '../components/ProtectedRoute';
import LoginPage from '../pages/LoginPage';

// Layouts
import AppLayout from '../layouts/AppLayout';

// Pages
import DashboardPage from '../pages/DashboardPage';
import BuildingsPage from '../pages/BuildingsPage';
import BuildingEditorPage from '../pages/BuildingEditorPage';
import GeofencesPage from '../pages/GeofencesPage';
import PanoramaManagerPage from '../pages/PanoramaManagerPage';
import TriviaPage from '../pages/TriviaPage';
import UsersPage from '../pages/UsersPage';
import SettingsPage from '../pages/SettingsPage';

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
                                <AppLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="buildings" element={<BuildingsPage />} />
                        <Route path="buildings/:id" element={<BuildingEditorPage />} />
                        <Route path="geofences" element={<GeofencesPage />} />
                        <Route path="panoramas/:id" element={<PanoramaManagerPage />} />
                        <Route path="trivia" element={<TriviaPage />} />
                        <Route path="users" element={<UsersPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
