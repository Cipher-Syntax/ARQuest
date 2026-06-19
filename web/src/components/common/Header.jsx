import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { theme } from '../../theme'
import { notificationService } from '../../services/notificationService'
import NotificationDrawer from './NotificationDrawer'

const Header = () => {
	const { user, logout } = useAuth()
	const navigate = useNavigate()
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

	const handleLogout = async () => {
		await logout()
		navigate('/login')
	}

	const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.is_read).length : 0

	return (
		<div
			style={{
				height: '64px',
				backgroundColor: theme.colors.surface,
				borderBottom: `1px solid ${theme.colors.border}`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'flex-end',
				padding: `0 ${theme.spacing.lg}`,
				gap: theme.spacing.md
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.lg }}>
				{/* Notification Bell */}
				<div 
					style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
					onClick={(e) => {
						e.stopPropagation();
						console.log("Bell clicked, opening drawer");
						setIsDrawerOpen(true);
					}}
				>
					<Bell size={20} color={theme.colors.text.secondary} />
					{unreadCount > 0 && (
						<div
							style={{
								position: 'absolute',
								top: '-6px',
								right: '-6px',
								backgroundColor: theme.colors.primary,
								color: '#fff',
								fontSize: '10px',
								fontWeight: 'bold',
								minWidth: '16px',
								height: '16px',
								borderRadius: '8px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								padding: '0 4px'
							}}
						>
							{unreadCount}
						</div>
					)}
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, borderLeft: `1px solid ${theme.colors.border}`, paddingLeft: theme.spacing.lg }}>
					<span
						style={{
							fontSize: '14px',
							color: theme.colors.text.secondary
						}}
					>
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
							fontSize: '14px'
						}}
					>
						Logout
					</button>
				</div>
			</div>

			<NotificationDrawer
				isOpen={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				notifications={notifications}
				onNotificationsUpdate={fetchNotifications}
			/>
		</div>
	)
}

export default Header
