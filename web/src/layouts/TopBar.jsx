import React, { useState, useEffect } from 'react'
import { Bell, Search, User } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { notificationService } from '../services/notificationService'
import NotificationDrawer from '../components/common/NotificationDrawer'

export default function TopBar({ user }) {
	const location = useLocation()
	const [isDrawerOpen, setIsDrawerOpen] = useState(false)
	const [notifications, setNotifications] = useState([])

	const fetchNotifications = async () => {
		try {
			const data = await notificationService.getNotifications()
			if (Array.isArray(data)) {
				setNotifications(data)
			} else {
				console.error('API returned non-array:', data)
				setNotifications([])
			}
		} catch (error) {
			console.error('Failed to fetch notifications:', error)
		}
	}

	useEffect(() => {
		fetchNotifications()
		const interval = setInterval(fetchNotifications, 30000)
		return () => clearInterval(interval)
	}, [])

	const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.is_read).length : 0

	return (
		<header className="h-16 bg-brand-light border-b border-brand-border px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10">
			<div className="flex items-center gap-6 flex-1">
				{}
				<div className="w-12 lg:hidden" />
			</div>

			<div className="flex items-center gap-3 lg:gap-6">
				<button 
					className="relative p-2 text-gray-500 hover:text-brand transition-colors bg-white rounded-full border border-brand-border shadow-sm"
					onClick={() => setIsDrawerOpen(true)}
				>
					<Bell size={18} />
					{unreadCount > 0 && (
						<span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-brand rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white px-1">
							{unreadCount}
						</span>
					)}
				</button>

				<div className="flex items-center gap-3 pl-4 border-l border-brand-border">
					<div className="text-right hidden sm:block">
						<p className="text-sm font-bold text-gray-900 leading-none">
							{user?.name || 'Admin User'}
						</p>
						<p className="text-[10px] font-bold text-brand mt-1 uppercase tracking-wider">
							{user?.role || 'Administrator'}
						</p>
					</div>
					<div className="w-10 h-10 rounded-full bg-white border border-brand-border flex items-center justify-center text-brand shadow-sm">
						<User size={20} />
					</div>
				</div>
			</div>
			
			<NotificationDrawer
				isOpen={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				notifications={notifications}
				onNotificationsUpdate={fetchNotifications}
			/>
		</header>
	)
}
