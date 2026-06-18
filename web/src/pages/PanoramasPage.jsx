import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Plus } from 'lucide-react'
import { buildingService } from '../services/buildingService'
import { theme } from '../theme'

const PanoramasPage = () => {
	const navigate = useNavigate()
	const [buildings, setBuildings] = useState([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		loadBuildings()
	}, [])

	const loadBuildings = async () => {
		try {
			const data = await buildingService.getBuildings()
			setBuildings(data)
		} catch (error) {
			console.error('Failed to load buildings:', error)
		} finally {
			setLoading(false)
		}
	}

	if (loading) {
		return <div style={{ padding: '24px' }}>Loading buildings...</div>
	}

	return (
		<div>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: theme.spacing.lg
				}}
			>
				<div>
					<h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
						Panorama Management
					</h1>
					<p style={{ color: theme.colors.text.secondary, marginTop: '8px' }}>
						Manage 360° panorama scenes and hotspots for each building
					</p>
				</div>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
					gap: theme.spacing.md
				}}
			>
				{buildings.map((building) => (
					<div
						key={building.id}
						style={{
							backgroundColor: '#fff',
							border: `1px solid ${theme.colors.border}`,
							borderRadius: theme.radius.md,
							padding: theme.spacing.lg,
							cursor: 'pointer',
							transition: 'all 0.2s'
						}}
						onClick={() => navigate(`/panoramas/${building.id}`)}
						onMouseEnter={(e) => {
							e.currentTarget.style.borderColor = theme.colors.primary
							e.currentTarget.style.boxShadow = '0 2px 8px rgba(138, 21, 56, 0.1)'
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.borderColor = theme.colors.border
							e.currentTarget.style.boxShadow = 'none'
						}}
					>
						<div
							style={{ display: 'flex', alignItems: 'start', gap: theme.spacing.md }}
						>
							<div
								style={{
									width: '48px',
									height: '48px',
									backgroundColor: theme.colors.surfaceSoft,
									borderRadius: theme.radius.sm,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flexShrink: 0
								}}
							>
								<Camera size={24} color={theme.colors.primary} />
							</div>
							<div style={{ flex: 1 }}>
								<h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
									{building.name}
								</h3>
								<p
									style={{
										fontSize: '14px',
										color: theme.colors.text.secondary,
										marginTop: '4px'
									}}
								>
									{building.description || 'No description'}
								</p>
								<div
									style={{
										marginTop: theme.spacing.sm,
										fontSize: '12px',
										color: theme.colors.text.muted
									}}
								>
									Click to manage panoramas
								</div>
							</div>
						</div>
					</div>
				))}
			</div>

			{buildings.length === 0 && (
				<div
					style={{
						textAlign: 'center',
						padding: '48px',
						color: theme.colors.text.secondary
					}}
				>
					<Camera size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
					<p>No buildings found. Create buildings first before adding panoramas.</p>
				</div>
			)}
		</div>
	)
}

export default PanoramasPage
