import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Image as ImageIcon, ChevronDown } from 'lucide-react'
import { buildingService } from '../services/buildingService'
import { departmentService } from '../services/departmentService'
import GeofenceEditor from '../components/GeofenceEditor'
import DragDropFileUpload from '../components/common/DragDropFileUpload'
import { theme } from '../theme'

const BuildingEditorPage = () => {
	const { id } = useParams()
	const navigate = useNavigate()
	const isNew = id === 'new'
	const [existingBuildings, setExistingBuildings] = useState([])
	const [departments, setDepartments] = useState([])

	const [building, setBuilding] = useState({
		name: '',
		description: '',
		latitude: '',
		longitude: '',
		status: 'DRAFT',
		is_active: true,
		model_file: null,
		model_version: '',
		model_active: false,
		primary_department_id: null,
		department_ids: []
	})

	const [geofence, setGeofence] = useState({
		latitude: '',
		longitude: '',
		radius_meters: 20,
		is_active: true
	})

	const [loading, setLoading] = useState(!isNew)
	const [saving, setSaving] = useState(false)
	const [errors, setErrors] = useState({})
	const [geofenceErrors, setGeofenceErrors] = useState({})
	const [successMessage, setSuccessMessage] = useState('')

	const [deptSearch, setDeptSearch] = useState('')
	const [deptDropdownOpen, setDeptDropdownOpen] = useState(false)
	const deptDropdownRef = useRef(null)

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target)) {
				setDeptDropdownOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	useEffect(() => {
		if (!isNew) {
			loadBuilding()
		}
		loadExistingBuildings()
		loadDepartments()
	}, [id])

	const loadExistingBuildings = async () => {
		try {
			const data = await buildingService.getBuildings()
			setExistingBuildings(data)
		} catch (error) {
			console.error('Failed to load existing buildings', error)
		}
	}

	const loadDepartments = async () => {
		try {
			const data = await departmentService.getDepartments()
			setDepartments(data)
		} catch (error) {
			console.error('Failed to load departments', error)
		}
	}

	const loadBuilding = async () => {
		try {
			const data = await buildingService.getBuilding(id)
			setBuilding({
				...data,
				primary_department_id: data.primary_department?.id ?? null,
				department_ids: data.departments?.map(d => d.id) ?? []
			})
			try {
				const geofenceData = await buildingService.getGeofence(id)
				if (geofenceData) {
					setGeofence(geofenceData)
				}
			} catch (error) {
				console.log('No geofence found')
			}
		} catch (error) {
			setErrors({ submit: 'Failed to load building' })
			navigate('/buildings')
		} finally {
			setLoading(false)
		}
	}

	const handleChange = (e) => {
		const { name, value, type, checked, files } = e.target
		let finalValue = value
		if (type === 'checkbox') finalValue = checked
		if (type === 'file') finalValue = files[0]

		setBuilding((prev) => ({
			...prev,
			[name]: finalValue
		}))

		if (name === 'latitude' || name === 'longitude') {
			setGeofence((prev) => ({
				...prev,
				[name]: finalValue
			}))
		}

		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: null }))
		}
	}

	const validateForm = () => {
		const newErrors = {}
		const newGeofenceErrors = {}

		if (!building.name.trim()) newErrors.name = 'Name is required'
		
		if (building.status !== 'DRAFT') {
			if (!building.latitude) newErrors.latitude = 'Latitude is required to publish'
			if (!building.longitude) newErrors.longitude = 'Longitude is required to publish'

			if (!geofence.latitude || !geofence.longitude) {
				newGeofenceErrors.center = 'Click on map to set geofence center to publish'
			}
			if (!geofence.radius_meters || geofence.radius_meters <= 0) {
				newGeofenceErrors.radius = 'Radius must be greater than 0 to publish'
			}
		}

		if (building.latitude) {
			const lat = parseFloat(building.latitude)
			if (lat < -90 || lat > 90) newErrors.latitude = 'Latitude must be between -90 and 90'
		}
		if (building.longitude) {
			const lon = parseFloat(building.longitude)
			if (lon < -180 || lon > 180) newErrors.longitude = 'Longitude must be between -180 and 180'
		}

		setErrors(newErrors)
		setGeofenceErrors(newGeofenceErrors)

		return Object.keys(newErrors).length === 0 && Object.keys(newGeofenceErrors).length === 0
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		if (!validateForm()) return

		setSaving(true)
		try {
			const generatedSlug = building.name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/(^-|-$)+/g, '')

			const formData = new FormData()
			formData.append('name', building.name)
			formData.append('slug', generatedSlug)
			formData.append('description', building.description || '')
			if (building.latitude) formData.append('latitude', building.latitude)
			if (building.longitude) formData.append('longitude', building.longitude)
			formData.append('status', building.status)
			formData.append('is_active', building.is_active)
			formData.append('model_version', building.model_version || '')
			formData.append('model_active', building.model_active)

			if (building.primary_department_id) {
				formData.append('primary_department_id', building.primary_department_id)
			} else {
				formData.append('primary_department_id', '')
			}

			if (building.department_ids && building.department_ids.length > 0) {
				building.department_ids.forEach(id => {
					formData.append('department_ids', id)
				})
			}

			if (building.model_file instanceof File) {
				formData.append('model_file', building.model_file)
			}

			let formattedGeofenceData = null
			if (geofence.latitude && geofence.longitude) {
				formattedGeofenceData = {
					latitude: parseFloat(geofence.latitude),
					longitude: parseFloat(geofence.longitude),
					radius_meters: parseFloat(geofence.radius_meters || 20),
					is_active: geofence.is_active
				}
			}

			if (isNew) {
				const savedBuilding = await buildingService.createBuilding(formData)
				if (formattedGeofenceData) {
					await buildingService.createGeofence(savedBuilding.id, formattedGeofenceData)
				}

				setSuccessMessage('Building created successfully!')
				setTimeout(() => navigate(`/buildings/${savedBuilding.id}`), 1500)
			} else {
				const savedBuilding = await buildingService.updateBuilding(id, formData)
				setBuilding({
					...savedBuilding,
					primary_department_id: savedBuilding.primary_department?.id ?? null,
					department_ids: savedBuilding.departments?.map(d => d.id) ?? []
				})

				if (formattedGeofenceData) {
					if (geofence.id) {
						await buildingService.updateGeofence(geofence.id, formattedGeofenceData)
					} else {
						await buildingService.createGeofence(id, formattedGeofenceData)
					}
				}

				setSuccessMessage('Building updated successfully!')
				setTimeout(() => setSuccessMessage(''), 3000)
			}
		} catch (error) {
			const apiErrors = error.response?.data?.errors || {}
			setErrors(apiErrors)
		} finally {
			setSaving(false)
		}
	}

	if (loading) return <div>Loading...</div>

	return (
		<div>
			{successMessage && (
				<div
					style={{
						position: 'fixed',
						top: '24px',
						right: '24px',
						backgroundColor: '#10b981',
						color: '#ffffff',
						padding: '16px 24px',
						borderRadius: theme.radius.md,
						boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
						zIndex: 9999,
						display: 'flex',
						alignItems: 'center',
						gap: theme.spacing.sm,
						fontSize: '15px',
						fontWeight: '500',
						animation: 'slideIn 0.3s ease-out'
					}}
				>
					<CheckCircle size={20} />
					{successMessage}
				</div>
			)}

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: theme.spacing.md,
					marginBottom: theme.spacing.lg
				}}
			>
				<button
					onClick={() => navigate('/buildings')}
					style={{
						padding: theme.spacing.sm,
						backgroundColor: theme.colors.surface,
						border: `1px solid ${theme.colors.border}`,
						borderRadius: theme.radius.sm,
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						gap: theme.spacing.xs
					}}
				>
					<ArrowLeft size={20} />
					Back
				</button>
				<h1
					style={{
						fontSize: '28px',
						fontWeight: 'bold',
						color: theme.colors.text.primary,
						margin: 0,
						flex: 1
					}}
				>
					{isNew ? 'New Building' : `Edit: ${building.name}`}
				</h1>

				{}
				{!isNew ? (
					<button
						type="button"
						onClick={() => navigate(`/panoramas/${id}`)}
						style={{
							padding: '8px 16px',
							backgroundColor: theme.colors.primary,
							color: theme.colors.text.inverse,
							border: 'none',
							borderRadius: theme.radius.sm,
							cursor: 'pointer',
							fontWeight: '600',
							display: 'flex',
							alignItems: 'center',
							gap: '8px'
						}}
					>
						<ImageIcon size={18} />
						Manage Panoramas
					</button>
				) : (
					<button
						type="button"
						disabled
						title="Save the building first to enable panorama management"
						style={{
							padding: '8px 16px',
							backgroundColor: theme.colors.surface,
							color: theme.colors.text.muted,
							border: `1px solid ${theme.colors.border}`,
							borderRadius: theme.radius.sm,
							cursor: 'not-allowed',
							fontWeight: '600',
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							opacity: 0.6
						}}
					>
						<ImageIcon size={18} />
						Save to Add Panoramas
					</button>
				)}
			</div>

			<form onSubmit={handleSubmit}>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: theme.spacing.lg,
						marginBottom: theme.spacing.lg
					}}
				>
					<div
						style={{
							backgroundColor: theme.colors.surface,
							padding: theme.spacing.lg,
							borderRadius: theme.radius.md
						}}
					>
						<h2
							style={{
								fontSize: '18px',
								fontWeight: '600',
								marginBottom: theme.spacing.md
							}}
						>
							Building Information
						</h2>

						<div style={{ marginBottom: theme.spacing.md }}>
							<label
								style={{
									display: 'block',
									marginBottom: theme.spacing.xs,
									fontSize: '14px',
									fontWeight: '500'
								}}
							>
								Name *
							</label>
							<input
								type="text"
								name="name"
								value={building.name}
								onChange={handleChange}
								style={{
									width: '100%',
									padding: theme.spacing.sm,
									border: `1px solid ${errors.name ? theme.colors.error : theme.colors.border}`,
									borderRadius: theme.radius.sm,
									fontSize: '14px'
								}}
							/>
							{errors.name && (
								<div
									style={{
										color: theme.colors.error,
										fontSize: '12px',
										marginTop: theme.spacing.xs
									}}
								>
									{errors.name}
								</div>
							)}
						</div>

						<div style={{ marginBottom: theme.spacing.md }}>
							<label
								style={{
									display: 'block',
									marginBottom: theme.spacing.xs,
									fontSize: '14px',
									fontWeight: '500'
								}}
							>
								Description
							</label>
							<textarea
								name="description"
								value={building.description || ''}
								onChange={handleChange}
								rows={8}
								style={{
									width: '100%',
									padding: theme.spacing.sm,
									border: `1px solid ${theme.colors.border}`,
									borderRadius: theme.radius.sm,
									fontSize: '14px',
									fontFamily: 'inherit'
								}}
							/>
						</div>

						<div
							style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: theme.spacing.md,
								marginBottom: theme.spacing.md
							}}
						>
							<div>
								<label
									style={{
										display: 'block',
										marginBottom: theme.spacing.xs,
										fontSize: '14px',
										fontWeight: '500'
									}}
								>
									Latitude {building.status !== 'DRAFT' && '*'}
								</label>
								<input
									type="number"
									name="latitude"
									value={building.latitude}
									onChange={handleChange}
									step="any"
									style={{
										width: '100%',
										padding: theme.spacing.sm,
										border: `1px solid ${errors.latitude ? theme.colors.error : theme.colors.border}`,
										borderRadius: theme.radius.sm,
										fontSize: '14px'
									}}
								/>
								{errors.latitude && (
									<div
										style={{
											color: theme.colors.error,
											fontSize: '12px',
											marginTop: theme.spacing.xs
										}}
									>
										{errors.latitude}
									</div>
								)}
							</div>
							<div>
								<label
									style={{
										display: 'block',
										marginBottom: theme.spacing.xs,
										fontSize: '14px',
										fontWeight: '500'
									}}
								>
									Longitude {building.status !== 'DRAFT' && '*'}
								</label>
								<input
									type="number"
									name="longitude"
									value={building.longitude}
									onChange={handleChange}
									step="any"
									style={{
										width: '100%',
										padding: theme.spacing.sm,
										border: `1px solid ${errors.longitude ? theme.colors.error : theme.colors.border}`,
										borderRadius: theme.radius.sm,
										fontSize: '14px'
									}}
								/>
								{errors.longitude && (
									<div
										style={{
											color: theme.colors.error,
											fontSize: '12px',
											marginTop: theme.spacing.xs
										}}
									>
										{errors.longitude}
									</div>
								)}
							</div>
						</div>

						<div style={{ marginBottom: theme.spacing.md, display: 'flex', gap: theme.spacing.xl }}>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: theme.spacing.xs,
									fontSize: '14px',
									fontWeight: '500'
								}}
							>
								<label>Status</label>
								<select
									name="status"
									value={building.status}
									onChange={handleChange}
									style={{
										padding: theme.spacing.sm,
										border: `1px solid ${theme.colors.border}`,
										borderRadius: theme.radius.sm,
										fontSize: '14px',
										backgroundColor: 'white',
										minWidth: '180px'
									}}
								>
									<option value="DRAFT">Draft (Unpublished)</option>
									<option value="HIDDEN">Published (Hidden)</option>
									<option value="VISIBLE">Published (Visible)</option>
								</select>
							</div>

							<label
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: theme.spacing.sm,
									fontSize: '14px'
								}}
							>
								<input
									type="checkbox"
									name="is_active"
									checked={building.is_active}
									onChange={handleChange}
								/>{' '}
								Active / Open
							</label>
						</div>

						<div style={{ marginBottom: theme.spacing.md }}>
							<label
								style={{
									display: 'block',
									marginBottom: theme.spacing.xs,
									fontSize: '14px',
									fontWeight: '500'
								}}
							>
								Primary College (Map Pin Color)
							</label>
							<div style={{ position: 'relative' }} ref={deptDropdownRef}>
								<div 
									onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
									style={{
										width: '100%',
										padding: theme.spacing.sm,
										border: `1px solid ${theme.colors.border}`,
										borderRadius: theme.radius.sm,
										fontSize: '14px',
										backgroundColor: 'white',
										cursor: 'pointer',
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center'
									}}
								>
									<span>
										{building.primary_department_id 
											? departments.find(d => d.id === building.primary_department_id)?.name || 'Unknown' 
											: '— Default WMSU Red Pin —'}
									</span>
									<ChevronDown size={16} color={theme.colors.textMuted} />
								</div>
								
								{deptDropdownOpen && (
									<div style={{
										position: 'absolute',
										top: '100%',
										left: 0,
										right: 0,
										marginTop: 4,
										backgroundColor: 'white',
										border: `1px solid ${theme.colors.border}`,
										borderRadius: theme.radius.md,
										boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
										zIndex: 50,
										maxHeight: 250,
										display: 'flex',
										flexDirection: 'column'
									}}>
										<div style={{ padding: 8, borderBottom: `1px solid ${theme.colors.border}` }}>
											<input
												type="text"
												placeholder="Search colleges..."
												value={deptSearch}
												onChange={(e) => setDeptSearch(e.target.value)}
												onClick={(e) => e.stopPropagation()}
												style={{
													width: '100%',
													padding: '6px 12px',
													border: `1px solid ${theme.colors.border}`,
													borderRadius: theme.radius.sm,
													fontSize: '13px',
													outline: 'none'
												}}
												autoFocus
											/>
										</div>
										<div style={{ overflowY: 'auto' }}>
											<div 
												onClick={() => {
													setBuilding(prev => ({ ...prev, primary_department_id: null }))
													setDeptDropdownOpen(false)
													setDeptSearch('')
												}}
												style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', backgroundColor: building.primary_department_id === null ? theme.colors.surface : 'transparent' }}
												onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surface}
												onMouseLeave={(e) => e.currentTarget.style.backgroundColor = building.primary_department_id === null ? theme.colors.surface : 'transparent'}
											>
												— Default WMSU Red Pin —
											</div>
											{departments.filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase()) || d.code.toLowerCase().includes(deptSearch.toLowerCase())).map(dept => (
												<div 
													key={dept.id}
													onClick={() => {
														setBuilding(prev => ({ 
															...prev, 
															primary_department_id: dept.id,
															department_ids: prev.department_ids.includes(dept.id) ? prev.department_ids : [...prev.department_ids, dept.id]
														}))
														setDeptDropdownOpen(false)
														setDeptSearch('')
													}}
													style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', backgroundColor: building.primary_department_id === dept.id ? theme.colors.surface : 'transparent' }}
													onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surface}
													onMouseLeave={(e) => e.currentTarget.style.backgroundColor = building.primary_department_id === dept.id ? theme.colors.surface : 'transparent'}
												>
													<div style={{ fontWeight: '500' }}>{dept.name}</div>
													<div style={{ fontSize: '11px', color: theme.colors.textMuted }}>Code: {dept.code}</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>

						<div style={{ marginBottom: theme.spacing.md }}>
							<label
								style={{
									display: 'block',
									marginBottom: theme.spacing.xs,
									fontSize: '14px',
									fontWeight: '500'
								}}
							>
								Associated Colleges (Search Results & Grouping)
							</label>
							<div style={{ 
								display: 'grid', 
								gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
								gap: '8px',
								maxHeight: '150px',
								overflowY: 'auto',
								padding: theme.spacing.sm,
								border: `1px solid ${theme.colors.border}`,
								borderRadius: theme.radius.sm,
								backgroundColor: 'white'
							}}>
								{departments.map(dept => (
									<label key={dept.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
										<input
											type="checkbox"
											checked={building.department_ids.includes(dept.id)}
											onChange={(e) => {
												const checked = e.target.checked;
												setBuilding(prev => {
													let newIds = prev.department_ids.filter(id => id !== dept.id);
													if (checked) newIds.push(dept.id);
													
													let newPrimary = prev.primary_department_id;
													if (!checked && newPrimary === dept.id) {
														newPrimary = null;
													}
													
													return {
														...prev,
														department_ids: newIds,
														primary_department_id: newPrimary
													};
												});
											}}
										/>
										<span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept.name}</span>
									</label>
								))}
								{departments.length === 0 && <span style={{ fontSize: '13px', color: theme.colors.textMuted }}>No colleges found</span>}
							</div>
						</div>

						<h2
							style={{
								fontSize: '18px',
								fontWeight: '600',
								marginTop: theme.spacing.xl,
								marginBottom: theme.spacing.md,
								paddingTop: theme.spacing.md,
								borderTop: `1px solid ${theme.colors.border}`
							}}
						>
							3D Model Configuration
						</h2>

						<div style={{ marginBottom: theme.spacing.md }}>
							<label
								style={{
									display: 'block',
									marginBottom: theme.spacing.xs,
									fontSize: '14px',
									fontWeight: '500'
								}}
							>
								3D Model File (.glb)
							</label>
							<DragDropFileUpload
								accept=".glb,.gltf"
								value={building.model_file instanceof File ? building.model_file : null}
								onChange={(file) =>
									setBuilding((prev) => ({ ...prev, model_file: file }))
								}
								placeholder="Drag & drop 3D model here or click to browse"
							/>
							{building.model_url && !(building.model_file instanceof File) && (
								<div
									style={{
										fontSize: '12px',
										color: theme.colors.primary,
										marginTop: theme.spacing.xs,
										padding: '8px',
										backgroundColor: 'rgba(0, 229, 255, 0.1)',
										borderRadius: '4px',
										fontWeight: 'bold'
									}}
								>
									✓ Current model uploaded. Drop a new file above to replace it.
								</div>
							)}
						</div>

						<div style={{ marginBottom: theme.spacing.md }}>
							<label
								style={{
									display: 'block',
									marginBottom: theme.spacing.xs,
									fontSize: '14px',
									fontWeight: '500'
								}}
							>
								3D Model Version
							</label>
							<input
								type="text"
								name="model_version"
								value={building.model_version || ''}
								onChange={handleChange}
								placeholder="e.g. v1.0"
								style={{
									width: '100%',
									padding: theme.spacing.sm,
									border: `1px solid ${theme.colors.border}`,
									borderRadius: theme.radius.sm,
									fontSize: '14px'
								}}
							/>
						</div>

						<div style={{ marginBottom: theme.spacing.md }}>
							<label
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: theme.spacing.sm,
									fontSize: '14px'
								}}
							>
								<input
									type="checkbox"
									name="model_active"
									checked={building.model_active}
									onChange={handleChange}
								/>{' '}
								3D Model Active
							</label>
						</div>
					</div>

					<div
						style={{
							backgroundColor: theme.colors.surface,
							padding: theme.spacing.lg,
							borderRadius: theme.radius.md
						}}
					>
						<h2
							style={{
								fontSize: '18px',
								fontWeight: '600',
								marginBottom: theme.spacing.md
							}}
						>
							Geofence Configuration
						</h2>
						<GeofenceEditor
							value={geofence}
							onChange={(newValue) => {
								setGeofence(newValue)

								if (
									newValue.latitude !== geofence.latitude ||
									newValue.longitude !== geofence.longitude
								) {
									setBuilding((prev) => ({
										...prev,
										latitude: newValue.latitude,
										longitude: newValue.longitude
									}))
									setErrors((prev) => ({
										...prev,
										latitude: null,
										longitude: null
									}))
								}

								if (geofenceErrors.center)
									setGeofenceErrors((prev) => ({ ...prev, center: null }))
							}}
							errors={geofenceErrors}
							existingBuildings={existingBuildings}
							currentBuildingId={id !== 'new' ? id : null}
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={saving}
					style={{
						width: '100%',
						padding: theme.spacing.md,
						backgroundColor: theme.colors.primary,
						color: theme.colors.text.inverse,
						border: 'none',
						borderRadius: theme.radius.sm,
						cursor: saving ? 'not-allowed' : 'pointer',
						fontSize: '16px',
						fontWeight: '600',
						opacity: saving ? 0.6 : 1
					}}
				>
					{saving ? 'Saving...' : 'Save All Changes'}
				</button>
			</form>
		</div>
	)
}

export default BuildingEditorPage
