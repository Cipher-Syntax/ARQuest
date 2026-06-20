import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useAuth } from '../hooks/useAuth'
import { settingsService } from '../services/settingsService'
import { AlertTriangle } from 'lucide-react'

export default function AppLayout() {
	const { user } = useAuth()
	const [maintenance, setMaintenance] = useState(false)

	useEffect(() => {
		settingsService.getSettings()
			.then(data => setMaintenance(data.maintenance_mode))
			.catch(err => console.error(err))
	}, [])

	return (
		<div className="flex h-screen overflow-hidden bg-brand-light">
			<Sidebar />
			<div className="flex-1 flex flex-col min-w-0">
				{maintenance && (
					<div className="bg-red-600 text-white px-4 py-2.5 text-center text-sm font-bold flex items-center justify-center gap-2 z-50 shadow-sm border-b border-red-700">
						<AlertTriangle size={18} />
						MAINTENANCE MODE IS ACTIVE: Students currently cannot access the mobile app.
					</div>
				)}
				<TopBar user={user} />
				<main className="flex-1 overflow-y-auto">
					<div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	)
}
