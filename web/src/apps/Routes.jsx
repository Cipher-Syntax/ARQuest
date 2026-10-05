import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import LoginPage from "../pages/LoginPage";
import LandingPage from "../pages/LandingPage";
import AppLayout from "../layouts/AppLayout";
import DashboardPage from "../pages/DashboardPage";
import BuildingsPage from "../pages/BuildingsPage";
import BuildingEditorPage from "../pages/BuildingEditorPage";
import PanoramaManagerPage from "../pages/PanoramaManagerPage";
import CmsPage from "../pages/CmsPage";
import SettingsPage from "../pages/SettingsPage";
import RecycleBinPage from "../pages/RecycleBinPage";
import FeedbackPage from "../pages/FeedbackPage";
import HistoryPage from "../pages/HistoryPage";
import ModelCompressorPage from "../pages/ModelCompressorPage";
import CampusMapPage from "../pages/CampusMapPage";
import UserManagementPage from "../pages/UserManagementPage";
import NotFound from "../pages/NotFound";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/admin" element={<LoginPage />} />
            <Route path="/" element={<LandingPage />} />
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
                <Route
                    path="buildings/:id"
                    element={<BuildingEditorPage />}
                />
                <Route path="campus-map" element={<CampusMapPage />} />
                <Route
                    path="panoramas/:id"
                    element={<PanoramaManagerPage />}
                />
                <Route path="cms" element={<CmsPage />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="recycle-bin" element={<RecycleBinPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="compressor" element={<ModelCompressorPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AppRoutes;
