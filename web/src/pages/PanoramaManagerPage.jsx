import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Edit2, CheckCircle, X, Play } from 'lucide-react'
import { buildingService } from '../services/buildingService'
import { panoramaService } from '../services/panoramaService'
import DragDropFileUpload from '../components/common/DragDropFileUpload'
import { theme } from '../theme'
import { validateForm, validateString, validateRequired, validateNumber } from '../utils/validation'

const PanoramaManagerPage = () => {
	const { id } = useParams()
	const navigate = useNavigate()

	const [building, setBuilding] = useState(null)
	const [scenes, setScenes] = useState([])
	const [selectedScene, setSelectedScene] = useState(null)
	const [hotspots, setHotspots] = useState([])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [successMessage, setSuccessMessage] = useState('')
	const [errors, setErrors] = useState({})
	const [hotspotErrors, setHotspotErrors] = useState({})
	const [sceneToDelete, setSceneToDelete] = useState(null)
	const [hotspotToDelete, setHotspotToDelete] = useState(null)

	const [newScene, setNewScene] = useState({
		title: '',
		image: null,
		is_start_scene: false,
		sort_order: 1,
		is_active: true
	})

	const [editingHotspot, setEditingHotspot] = useState(null)
	const [newHotspot, setNewHotspot] = useState({
		target_scene: '',
		label: '',
		yaw: 0,
		pitch: 0,
		is_active: true
	})

	useEffect(() => {
		loadData()
	}, [id])

	useEffect(() => {
		if (selectedScene) {
			loadHotspots(selectedScene.id)
		}
	}, [selectedScene])

	const loadData = async () => {
		try {
			const buildingData = await buildingService.getBuilding(id)
			setBuilding(buildingData)

			const scenesData = await panoramaService.getBuildingScenes(id)
			setScenes(scenesData || [])
			if (scenesData && scenesData.length > 0) {
				setSelectedScene(scenesData[0])
			}
		} catch (error) {
			console.error('Failed to load panorama data', error)
			navigate('/panoramas')
		} finally {
			setLoading(false)
		}
	}

	const loadHotspots = async (sceneId) => {
		try {
			const hotspotsData = await panoramaService.getSceneHotspots(sceneId)
			setHotspots(hotspotsData || [])
		} catch (error) {
			console.error('Failed to load hotspots:', error)
			setHotspots([])
		}
	}

	const showSuccess = (message) => {
		setSuccessMessage(message)
		setTimeout(() => setSuccessMessage(''), 3000)
	}

	const handleCreateScene = async (e) => {
		e.preventDefault()
		setErrors({})

		const schema = {
			title: (val) => validateString(val, 1),
			image: (val) => validateRequired(val)
		}

		const validationErrors = validateForm(newScene, schema)
		if (Object.keys(validationErrors).length > 0) {
			return setErrors(validationErrors)
		}

		setSaving(true)
		try {
			const formData = new FormData()
			formData.append('title', newScene.title)
			formData.append('image', newScene.image)
			formData.append('is_start_scene', newScene.is_start_scene)
			formData.append('sort_order', newScene.sort_order)
			formData.append('is_active', newScene.is_active)

			await panoramaService.createScene(id, formData)
			showSuccess('Scene created successfully!')
			setNewScene({
				title: '',
				image: null,
				is_start_scene: false,
				sort_order: scenes.length + 2,
				is_active: true
			})
			loadData()
		} catch (error) {
			setErrors(error.response?.data?.errors || { form: 'Failed to create scene' })
		} finally {
			setSaving(false)
		}
	}

	const requestDeleteScene = (sceneId) => {
		setSceneToDelete(sceneId)
	}

	const confirmDeleteScene = async () => {
		if (!sceneToDelete) return
		try {
			await panoramaService.deleteScene(sceneToDelete)
			showSuccess('Scene deleted')
			loadData()
		} catch (error) {
			console.error('Failed to delete scene', error)
		} finally {
			setSceneToDelete(null)
		}
	}

	const handleCreateHotspot = async (e) => {
		e.preventDefault()
		if (!selectedScene) return

		setHotspotErrors({})
		
		const schema = {
			label: (val) => validateString(val, 1),
			target_scene: (val) => validateRequired(val),
			yaw: (val) => validateNumber(val),
			pitch: (val) => validateNumber(val)
		}

		const validationErrors = validateForm(newHotspot, schema)
		if (Object.keys(validationErrors).length > 0) {
			return setHotspotErrors(validationErrors)
		}

		try {
			const yawVal = parseFloat(newHotspot.yaw);
			const pitchVal = parseFloat(newHotspot.pitch);

			const hotspotData = {
				...newHotspot,
				target_scene: newHotspot.target_scene,
				yaw: isNaN(yawVal) ? 0 : yawVal,
				pitch: isNaN(pitchVal) ? 0 : pitchVal
			}
			await panoramaService.createHotspot(selectedScene.id, hotspotData)
			showSuccess('Hotspot created!')
			setNewHotspot({ target_scene: '', label: '', yaw: 0, pitch: 0, is_active: true })
			setHotspotErrors({})
			loadHotspots(selectedScene.id)
		} catch (error) {
			console.error('Failed to create hotspot', error)
			setHotspotErrors(error.response?.data || { form: 'Failed to create hotspot' })
		}
	}

	const handleUpdateHotspot = async (hotspotId, data) => {
		try {
			await panoramaService.updateHotspot(hotspotId, data)
			showSuccess('Hotspot updated!')
			setEditingHotspot(null)
			loadHotspots(selectedScene.id)
		} catch (error) {
			console.error('Failed to update hotspot', error)
		}
	}

	const requestDeleteHotspot = (hotspotId) => {
		setHotspotToDelete(hotspotId)
	}

	const confirmDeleteHotspot = async () => {
		if (!hotspotToDelete) return
		try {
			await panoramaService.deleteHotspot(hotspotToDelete)
			showSuccess('Hotspot deleted')
			loadHotspots(selectedScene.id)
		} catch (error) {
			console.error('Failed to delete hotspot', error)
		} finally {
			setHotspotToDelete(null)
		}
	}

	if (loading) return <div style={{ padding: '24px' }}>Loading...</div>

	return (
		<div>
			{successMessage && (
				<div
					style={{
						position: 'fixed',
						top: '24px',
						right: '24px',
						backgroundColor: '#10b981',
						color: '#fff',
						padding: '16px 24px',
						borderRadius: theme.radius.md,
						zIndex: 9999,
						display: 'flex',
						gap: '8px'
					}}
				>
					<CheckCircle size={20} /> {successMessage}
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
					onClick={() => navigate('/panoramas')}
					style={{
						padding: '8px 12px',
						border: '1px solid crimson',
						borderRadius: theme.radius.sm,
						display: 'flex',
						alignItems: 'center',
						gap: '4px',
						cursor: 'pointer',
						background: '#fff'
					}}
				>
					<ArrowLeft size={20} /> Back
				</button>
				<h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
					Panoramas: {building?.name}
				</h1>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '300px 1fr 400px',
					gap: theme.spacing.lg,
					height: 'calc(100vh - 200px)'
				}}
			>
				{}
				<ScenesList
					scenes={scenes}
					selectedScene={selectedScene}
					setSelectedScene={setSelectedScene}
					onDeleteScene={requestDeleteScene}
					newScene={newScene}
					setNewScene={setNewScene}
					onCreateScene={handleCreateScene}
					saving={saving}
					errors={errors}
				/>

				{}
				<ScenePreview selectedScene={selectedScene} />

				{}
				<HotspotsPanel
					hotspots={hotspots}
					scenes={scenes}
					selectedScene={selectedScene}
					newHotspot={newHotspot}
					setNewHotspot={setNewHotspot}
					editingHotspot={editingHotspot}
					setEditingHotspot={setEditingHotspot}
					onCreateHotspot={handleCreateHotspot}
					onUpdateHotspot={handleUpdateHotspot}
					onDeleteHotspot={requestDeleteHotspot}
					errors={hotspotErrors}
				/>
			</div>

			{/* Delete Scene Modal */}
			{sceneToDelete && (
				<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
					<div style={{ backgroundColor: '#fff', padding: theme.spacing.xl, borderRadius: theme.radius.md, maxWidth: '400px', width: '100%' }}>
						<h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: theme.spacing.md }}>Delete Scene</h3>
						<p style={{ marginBottom: theme.spacing.lg, color: theme.colors.text.secondary }}>Are you sure you want to delete this scene? All hotspots associated with it will also be removed. This action cannot be undone.</p>
						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
							<button onClick={() => setSceneToDelete(null)} style={{ padding: '8px 16px', borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.border}`, background: '#fff', cursor: 'pointer' }}>Cancel</button>
							<button onClick={confirmDeleteScene} style={{ padding: '8px 16px', borderRadius: theme.radius.sm, border: 'none', background: theme.colors.error, color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Hotspot Modal */}
			{hotspotToDelete && (
				<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
					<div style={{ backgroundColor: '#fff', padding: theme.spacing.xl, borderRadius: theme.radius.md, maxWidth: '400px', width: '100%' }}>
						<h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: theme.spacing.md }}>Delete Hotspot</h3>
						<p style={{ marginBottom: theme.spacing.lg, color: theme.colors.text.secondary }}>Are you sure you want to delete this hotspot? This action cannot be undone.</p>
						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
							<button onClick={() => setHotspotToDelete(null)} style={{ padding: '8px 16px', borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.border}`, background: '#fff', cursor: 'pointer' }}>Cancel</button>
							<button onClick={confirmDeleteHotspot} style={{ padding: '8px 16px', borderRadius: theme.radius.sm, border: 'none', background: theme.colors.error, color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default PanoramaManagerPage

const ScenesList = ({
	scenes,
	selectedScene,
	setSelectedScene,
	onDeleteScene,
	newScene,
	setNewScene,
	onCreateScene,
	saving,
	errors
}) => {
	const [searchQuery, setSearchQuery] = useState('');

	const filteredScenes = scenes
		.filter((scene) => scene.title.toLowerCase().includes(searchQuery.toLowerCase()))
		.sort((a, b) => {
			if (a.is_start_scene && !b.is_start_scene) return -1;
			if (!a.is_start_scene && b.is_start_scene) return 1;
			return 0;
		});

	return (
		<div
			style={{
				backgroundColor: '#fff',
				borderRadius: theme.radius.md,
				padding: theme.spacing.md,
				overflowY: 'auto'
			}}
		>
			<div style={{ marginBottom: theme.spacing.lg }}>
				<h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: theme.spacing.sm }}>
					New Scene
				</h3>
				<form onSubmit={onCreateScene}>
					<input
						type="text"
						placeholder="Scene Title"
						value={newScene.title}
						onChange={(e) => {
							setNewScene({ ...newScene, title: e.target.value })
							if (errors.title) setErrors({ ...errors, title: null })
						}}
						style={{
							width: '100%',
							padding: '8px',
							marginBottom: '8px',
							borderRadius: '4px',
							border: `1px solid ${errors.title ? theme.colors.error : '#ccc'}`
						}}
					/>
					{errors.title && <div style={{ color: theme.colors.error, fontSize: '12px', marginBottom: '8px' }}>{errors.title}</div>}
					<div style={{ marginBottom: '8px' }}>
						<div style={{ border: errors.image ? `1px solid ${theme.colors.error}` : 'none', borderRadius: '4px' }}>
							<DragDropFileUpload
								accept="image/jpeg,image/png,image/jpg"
								value={newScene.image}
								onChange={(file) => {
									setNewScene({ ...newScene, image: file })
									if (errors.image) setErrors({ ...errors, image: null })
								}}
								placeholder="Drag & drop 360° image here or click to browse"
							/>
						</div>
						{errors.image && <div style={{ color: theme.colors.error, fontSize: '12px', marginTop: '4px' }}>{errors.image}</div>}
					</div>
					<label
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							fontSize: '12px',
							marginBottom: '8px'
						}}
					>
						<input
							type="checkbox"
							checked={newScene.is_start_scene}
							onChange={(e) =>
								setNewScene({ ...newScene, is_start_scene: e.target.checked })
							}
						/>
						Start Scene
					</label>
					<button
						type="submit"
						disabled={saving}
						style={{
							width: '100%',
							padding: '8px',
							background: theme.colors.primary,
							color: 'white',
							border: 'none',
							borderRadius: '4px',
							cursor: saving ? 'not-allowed' : 'pointer',
							fontSize: '14px',
							fontWeight: '600'
						}}
					>
						{saving ? 'Uploading...' : 'Create Scene'}
					</button>
				</form>
			</div>

			<div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: theme.spacing.md }}>
				<h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: theme.spacing.md }}>
					Scenes
				</h2>
				
				<input
					type="text"
					placeholder="Search scenes..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					style={{
						width: '100%',
						padding: '8px',
						marginBottom: theme.spacing.md,
						borderRadius: '4px',
						border: '1px solid #ccc',
						fontSize: '14px'
					}}
				/>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: theme.spacing.xs,
						marginBottom: theme.spacing.md
					}}
				>
					{filteredScenes.length === 0 && (
						<div style={{ textAlign: 'center', padding: '10px', color: '#666', fontSize: '14px' }}>
							No scenes found
						</div>
					)}
					{filteredScenes.map((scene) => (
						<div
							key={scene.id}
							onClick={() => setSelectedScene(scene)}
							style={{
								padding: theme.spacing.sm,
								border: `1px solid ${selectedScene?.id === scene.id ? theme.colors.primary : theme.colors.border}`,
								borderRadius: theme.radius.sm,
								cursor: 'pointer',
								backgroundColor:
									selectedScene?.id === scene.id ? 'rgba(138, 21, 56, 0.05)' : '#fff',
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center'
							}}
						>
							<div>
								<div style={{ fontSize: '14px', fontWeight: '500' }}>{scene.title}</div>
								{scene.is_start_scene && (
									<span
										style={{
											fontSize: '12px',
											color: theme.colors.primary,
											display: 'flex',
											alignItems: 'center',
											gap: '4px',
											marginTop: '2px'
										}}
									>
										<Play size={12} fill={theme.colors.primary} /> Start Scene
									</span>
								)}
							</div>
							<button
								onClick={(e) => {
									e.stopPropagation()
									onDeleteScene(scene.id)
								}}
								style={{
									color: theme.colors.error,
									background: 'none',
									border: 'none',
									cursor: 'pointer',
									padding: '4px'
								}}
							>
								<Trash2 size={16} />
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

const ScenePreview = ({ selectedScene }) => (
	<div
		style={{
			backgroundColor: '#fff',
			borderRadius: theme.radius.md,
			padding: theme.spacing.md,
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center'
		}}
	>
		{selectedScene ? (
			<>
				<h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: theme.spacing.md }}>
					{selectedScene.title}
				</h2>
				<img
					src={selectedScene.image_url}
					alt={selectedScene.title}
					style={{
						width: '100%',
						maxHeight: '400px',
						objectFit: 'contain',
						borderRadius: theme.radius.sm
					}}
				/>
			</>
		) : (
			<div style={{ textAlign: 'center', color: theme.colors.text.secondary }}>
				<p>Select a scene to preview</p>
			</div>
		)}
	</div>
)

const HotspotsPanel = ({
	hotspots,
	scenes,
	selectedScene,
	newHotspot,
	setNewHotspot,
	editingHotspot,
	setEditingHotspot,
	onCreateHotspot,
	onUpdateHotspot,
	onDeleteHotspot,
	errors
}) => (
	<div
		style={{
			backgroundColor: '#fff',
			borderRadius: theme.radius.md,
			padding: theme.spacing.md,
			overflowY: 'auto'
		}}
	>
		<h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: theme.spacing.md }}>
			Hotspots
		</h2>

		{!selectedScene ? (
			<p style={{ fontSize: '14px', color: theme.colors.text.secondary }}>
				Select a scene to manage hotspots
			</p>
		) : (
			<>
				<div style={{ marginBottom: theme.spacing.md }}>
					{hotspots.map((hotspot) => (
						<div
							key={hotspot.id}
							style={{
								padding: theme.spacing.sm,
								border: `1px solid ${theme.colors.border}`,
								borderRadius: theme.radius.sm,
								marginBottom: theme.spacing.xs
							}}
						>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'start'
								}}
							>
								<div style={{ flex: 1 }}>
									<div style={{ fontSize: '14px', fontWeight: '500' }}>
										{hotspot.label}
									</div>
									<div
										style={{
											fontSize: '12px',
											color: theme.colors.text.secondary
										}}
									>
										→ {hotspot.target_scene_title}
									</div>
									<div
										style={{ fontSize: '12px', color: theme.colors.text.muted }}
									>
										Yaw: {hotspot.yaw}°, Pitch: {hotspot.pitch}°
									</div>
								</div>
								<button
									onClick={() => onDeleteHotspot(hotspot.id)}
									style={{
										color: theme.colors.error,
										background: 'none',
										border: 'none',
										cursor: 'pointer',
										padding: '4px'
									}}
								>
									<Trash2 size={16} />
								</button>
							</div>
						</div>
					))}
				</div>

				<div
					style={{
						borderTop: `1px solid ${theme.colors.border}`,
						paddingTop: theme.spacing.md
					}}
				>
					<h3
						style={{
							fontSize: '14px',
							fontWeight: '600',
							marginBottom: theme.spacing.sm
						}}
					>
						New Hotspot
					</h3>
					<form onSubmit={onCreateHotspot}>
						{errors?.form && (
							<div style={{ color: theme.colors.error, fontSize: '12px', marginBottom: '8px' }}>
								{typeof errors.form === 'string' ? errors.form : JSON.stringify(errors.form)}
							</div>
						)}
						<div style={{ marginBottom: '8px' }}>
							<label
								style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}
							>
								Label
							</label>
							<input
								type="text"
								placeholder="e.g. Go to Entrance"
								value={newHotspot.label}
								onChange={(e) => {
									setNewHotspot({ ...newHotspot, label: e.target.value })
									if (errors?.label) {
										const newErrs = { ...errors };
										delete newErrs.label;
										errors.form ? null : setEditingHotspot ? null : null; // Hack to use some props, wait, let's just use form
									}
								}}
								style={{
									width: '100%',
									padding: '8px',
									borderRadius: '4px',
									border: `1px solid ${errors?.label ? theme.colors.error : '#ccc'}`,
									fontSize: '14px'
								}}
							/>
							{errors?.label && (
								<div style={{ color: theme.colors.error, fontSize: '12px', marginTop: '4px' }}>
									{errors.label}
								</div>
							)}
						</div>
						<div style={{ marginBottom: '8px' }}>
							<label
								style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}
							>
								Target Scene
							</label>
							<select
								value={newHotspot.target_scene}
								onChange={(e) =>
									setNewHotspot({ ...newHotspot, target_scene: e.target.value })
								}
								style={{
									width: '100%',
									padding: '8px',
									borderRadius: '4px',
									border: `1px solid ${errors?.target_scene ? theme.colors.error : '#ccc'}`,
									fontSize: '14px'
								}}
							>
								<option value="">Select Target Scene</option>
								{scenes
									.filter((s) => s.id !== selectedScene?.id)
									.map((scene) => (
										<option key={scene.id} value={scene.id}>
											{scene.title}
										</option>
									))}
							</select>
							{errors?.target_scene && (
								<div style={{ color: theme.colors.error, fontSize: '12px', marginTop: '4px' }}>
									{errors.target_scene}
								</div>
							)}
						</div>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: '8px',
								marginBottom: '8px'
							}}
						>
							<div>
								<label
									style={{
										display: 'block',
										fontSize: '12px',
										marginBottom: '4px'
									}}
								>
									Yaw (°)
								</label>
								<input
									type="number"
									placeholder="0"
									value={newHotspot.yaw}
									onChange={(e) =>
										setNewHotspot({
											...newHotspot,
											yaw: e.target.value
										})
									}
									style={{
										width: '100%',
										padding: '8px',
										borderRadius: '4px',
										border: `1px solid ${errors?.yaw ? theme.colors.error : '#ccc'}`,
										fontSize: '14px'
									}}
								/>
								{errors?.yaw && (
									<div style={{ color: theme.colors.error, fontSize: '12px', marginTop: '4px' }}>
										{errors.yaw}
									</div>
								)}
							</div>
							<div>
								<label
									style={{
										display: 'block',
										fontSize: '12px',
										marginBottom: '4px'
									}}
								>
									Pitch (°)
								</label>
								<input
									type="number"
									placeholder="0"
									value={newHotspot.pitch}
									onChange={(e) =>
										setNewHotspot({
											...newHotspot,
											pitch: e.target.value
										})
									}
									style={{
										width: '100%',
										padding: '8px',
										borderRadius: '4px',
										border: `1px solid ${errors?.pitch ? theme.colors.error : '#ccc'}`,
										fontSize: '14px'
									}}
								/>
								{errors?.pitch && (
									<div style={{ color: theme.colors.error, fontSize: '12px', marginTop: '4px' }}>
										{errors.pitch}
									</div>
								)}
							</div>
						</div>
						<button
							type="submit"
							style={{
								width: '100%',
								padding: '8px',
								background: theme.colors.primary,
								color: 'white',
								border: 'none',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '14px',
								fontWeight: '600'
							}}
						>
							Create Hotspot
						</button>
					</form>
				</div>
			</>
		)}
	</div>
)
