import React from 'react'
import { X, AlertCircle, Info } from 'lucide-react'
import { theme } from '../../theme'
import { notificationService } from '../../services/notificationService'

const NotificationDrawer = ({ isOpen, onClose, notifications, onNotificationsUpdate }) => {
	if (!isOpen) return null

	const [isMarking, setIsMarking] = React.useState(false)
	const [errorMsg, setErrorMsg] = React.useState(null)

	const handleMarkAsRead = async (id) => {
		setErrorMsg(null)
		try {
			await notificationService.markAsRead(id)
			onNotificationsUpdate()
		} catch (error) {
			console.error('Failed to mark notification as read:', error)
			setErrorMsg('Failed to mark as read: ' + error.message)
		}
	}

	const handleMarkAllAsRead = async () => {
		setErrorMsg(null)
		setIsMarking(true)
		try {
			await notificationService.clearAllNotifications()
			await onNotificationsUpdate()
			onClose() // Auto-close drawer on success
		} catch (error) {
			console.error('Failed to mark all as read:', error)
			setErrorMsg('Error marking all as read: ' + error.message)
		} finally {
			setIsMarking(false)
		}
	}

	const unreadNotifications = Array.isArray(notifications) ? notifications.filter(n => !n.is_read) : []
	const unreadCount = unreadNotifications.length;

	return (
		<>
			{/* Backdrop */}
			<div
				onClick={onClose}
				style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: 'rgba(0, 0, 0, 0.4)',
					zIndex: 9998
				}}
			/>

			{/* Drawer */}
			<div
				style={{
					position: 'fixed',
					top: 0,
					right: 0,
					width: '360px',
					height: '100vh',
					backgroundColor: theme.colors.surface,
					boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
					zIndex: 9999,
					display: 'flex',
					flexDirection: 'column'
				}}
			>
				{/* Header */}
				<div
					style={{
						padding: theme.spacing.lg,
						borderBottom: `1px solid ${theme.colors.border}`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between'
					}}
				>
					<h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Notifications</h2>
					<button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
						<X size={20} color={theme.colors.text.secondary} />
					</button>
				</div>

				{/* Actions */}
				{unreadCount > 0 && (
					<div style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
						<button
							onClick={handleMarkAllAsRead}
							disabled={isMarking}
							style={{
								background: theme.colors.surface,
								border: `1px solid ${theme.colors.border}`,
								padding: '6px 12px',
								borderRadius: '4px',
								color: theme.colors.primary,
								fontSize: '13px',
								fontWeight: 'bold',
								cursor: isMarking ? 'wait' : 'pointer',
								opacity: isMarking ? 0.7 : 1,
								boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
							}}
						>
							{isMarking ? 'Marking...' : 'Mark all as read'}
						</button>
						{errorMsg && (
							<div style={{ color: theme.colors.error, fontSize: '12px', textAlign: 'right' }}>
								{errorMsg}
							</div>
						)}
					</div>
				)}

				{/* List */}
				<div style={{ flex: 1, overflowY: 'auto' }}>
					{unreadNotifications.length === 0 ? (
						<div style={{ padding: theme.spacing.xl, textAlign: 'center', color: theme.colors.text.secondary }}>
							<p>No new notifications</p>
						</div>
					) : (
						unreadNotifications.map((notif) => (
							<div
								key={notif.id}
								onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
								style={{
									padding: theme.spacing.lg,
									borderBottom: `1px solid ${theme.colors.border}`,
									backgroundColor: notif.is_read ? theme.colors.surface : '#FFF5F7',
									cursor: notif.is_read ? 'default' : 'pointer',
									transition: 'background-color 0.2s'
								}}
							>
								<div style={{ display: 'flex', gap: theme.spacing.md }}>
									<div style={{ marginTop: '2px' }}>
										{notif.notification_type === 'SYSTEM' ? (
											<AlertCircle size={18} color={theme.colors.error} />
										) : (
											<Info size={18} color={theme.colors.info || '#3B82F6'} />
										)}
									</div>
									<div style={{ flex: 1 }}>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
											<h4 style={{ margin: 0, fontSize: '14px', fontWeight: notif.is_read ? 'normal' : 'bold', color: theme.colors.text.primary }}>
												{notif.title}
											</h4>
											{!notif.is_read && (
												<div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: theme.colors.primary, marginTop: '4px' }} />
											)}
										</div>
										<p style={{ margin: `${theme.spacing.xs} 0 0`, fontSize: '13px', color: theme.colors.text.secondary, lineHeight: 1.4 }}>
											{notif.message}
										</p>
										<span style={{ display: 'block', marginTop: theme.spacing.sm, fontSize: '11px', color: theme.colors.text.tertiary }}>
											{new Date(notif.created_at).toLocaleString()}
										</span>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</>
	)
}

export default NotificationDrawer
