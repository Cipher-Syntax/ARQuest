import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../hooks/useAuth'
import ProtectedRoute from '../components/ProtectedRoute'
import LoginPage from '../pages/LoginPage'


import AppLayout from '../layouts/AppLayout'


import DashboardPage from '../pages/DashboardPage'
import BuildingsPage from '../pages/BuildingsPage'
import BuildingEditorPage from '../pages/BuildingEditorPage'
import GeofencesPage from '../pages/GeofencesPage'
import MediaPage from '../pages/MediaPage'
import PanoramasPage from '../pages/PanoramasPage'
import PanoramaManagerPage from '../pages/PanoramaManagerPage'
import CmsPage from '../pages/CmsPage'
import UsersContainer from '../pages/UsersContainer'
import ProfessionalsPage from '../pages/ProfessionalsPage'
import SettingsPage from '../pages/SettingsPage'
import DepartmentsPage from '../pages/DepartmentsPage'
import ArchivePage from '../pages/ArchivePage'
import FeedbackPage from '../pages/FeedbackPage'

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
						<Route path="departments" element={<DepartmentsPage />} />
						<Route path="buildings" element={<BuildingsPage />} />
						<Route path="buildings/:id" element={<BuildingEditorPage />} />
						<Route path="geofences" element={<GeofencesPage />} />
						<Route path="media" element={<MediaPage />} />
						<Route path="panoramas" element={<PanoramasPage />} />
						<Route path="panoramas/:id" element={<PanoramaManagerPage />} />
						<Route path="cms" element={<CmsPage />} />
						<Route path="users" element={<UsersContainer />} />
						<Route path="professionals" element={<ProfessionalsPage />} />
						<Route path="settings" element={<SettingsPage />} />
						<Route path="archives" element={<ArchivePage />} />
						<Route path="feedback" element={<FeedbackPage />} />
					</Route>
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	)
}

export default App
