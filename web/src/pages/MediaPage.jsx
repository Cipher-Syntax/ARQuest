import React, { useState, useEffect } from 'react'
import { Box, Image as ImageIcon, X } from 'lucide-react'
import { Card } from '../components/ui'
import { buildingService } from '../services/buildingService'
import { panoramaService } from '../services/panoramaService'
import '@google/model-viewer'
import { ReactPhotoSphereViewer } from 'react-photo-sphere-viewer'
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin'
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin'
import '@photo-sphere-viewer/core/index.css'
import '@photo-sphere-viewer/virtual-tour-plugin/index.css'
import '@photo-sphere-viewer/markers-plugin/index.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const getFullUrl = (url) => {
	if (!url) return ''
	if (url.startsWith('http')) return url
	return `${API_BASE_URL}${url}`
}

export default function Media() {
	const [buildings, setBuildings] = useState([])
	const [viewTab, setViewTab] = useState('3d') 
	const [loading, setLoading] = useState(true)

	
	const [activeModel, setActiveModel] = useState(null) 
	const [activePanorama, setActivePanorama] = useState(null) 
	const [panoScenes, setPanoScenes] = useState([])

	useEffect(() => {
		loadData()
	}, [])

	const loadData = async () => {
		try {
			const data = await buildingService.getBuildings()
			const buildingsWithScenes = await Promise.all(
				data.map(async (b) => {
					try {
						const scenes = await panoramaService.getBuildingScenes(b.id)
						return { ...b, scenes: scenes || [] }
					} catch (e) {
						return { ...b, scenes: [] }
					}
				})
			)
			setBuildings(buildingsWithScenes)
		} catch (error) {
			console.error('Error loading buildings:', error)
		} finally {
			setLoading(false)
		}
	}

	const open3DViewer = (building) => {
		setActiveModel(building)
	}

	const openPanoramaViewer = (building) => {
		if (building.scenes && building.scenes.length > 0) {
			setPanoScenes(building.scenes)
			setActivePanorama(building)
		}
	}

	const closeViewer = () => {
		setActiveModel(null)
		setActivePanorama(null)
		setPanoScenes([])
	}

	const has3DModel = (b) => !!b.model_url

	const handlePanoReady = (instance) => {
		const vtPlugin = instance.getPlugin(VirtualTourPlugin)
		if (!vtPlugin || panoScenes.length === 0) return

		const startScene = panoScenes.find((s) => s.is_start_scene) || panoScenes[0]

		const nodes = panoScenes.map((scene) => ({
			id: scene.id.toString(),
			panorama: getFullUrl(scene.image_url),
			name: scene.title,
			links: (scene.hotspots || []).map((h) => ({
				nodeId: h.target_scene_id.toString(),
				position: { pitch: h.pitch * Math.PI / 180, yaw: h.yaw * Math.PI / 180 },
				name: h.label || h.target_scene_title
			}))
		}))

		vtPlugin.setNodes(nodes, startScene.id.toString())
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-black text-gray-900">Content & Media Viewer</h1>
					<p className="text-gray-500 mt-1">
						Interact with 3D models and panorama walkthroughs.
					</p>
				</div>
				<div className="flex bg-white p-1 rounded-lg border border-brand-border shadow-sm">
					<button
						onClick={() => setViewTab('3d')}
						className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${
							viewTab === '3d'
								? 'bg-brand text-white shadow-md'
								: 'text-gray-500 hover:bg-gray-50'
						}`}
					>
						<Box size={16} /> 3D Models
					</button>
					<button
						onClick={() => setViewTab('panorama')}
						className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${
							viewTab === 'panorama'
								? 'bg-brand text-white shadow-md'
								: 'text-gray-500 hover:bg-gray-50'
						}`}
					>
						<ImageIcon size={16} /> Panorama Walkthroughs
					</button>
				</div>
			</div>

			{loading ? (
				<div className="h-64 flex items-center justify-center">
					<div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{buildings.map((b) => {
						const is3D = viewTab === '3d'
						const hasModel = has3DModel(b)
						const hasPanoramas = b.scenes && b.scenes.length > 0
						const hasContent = is3D ? hasModel : hasPanoramas

						return (
							<Card
								key={b.id}
								className={`group transition-all duration-300 ${hasContent ? 'cursor-pointer hover:border-brand hover:shadow-xl' : 'opacity-70'}`}
								onClick={() => {
									if (is3D && hasModel) open3DViewer(b)
									if (!is3D && hasPanoramas) openPanoramaViewer(b)
								}}
							>
								<div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
									{is3D ? (
										hasModel ? (
											<div className="w-full h-full pointer-events-none">
												<model-viewer
													src={getFullUrl(b.model_url)}
													auto-rotate="true"
													camera-controls="false"
													interaction-prompt="none"
													shadow-intensity="1"
													style={{
														width: '100%',
														height: '100%',
														backgroundColor: '#f3f4f6'
													}}
												/>
											</div>
										) : (
											<div className="text-gray-400 flex flex-col items-center">
												<Box size={32} className="mb-2 opacity-50" />
												<span className="text-xs font-bold uppercase tracking-wider">
													No 3D Model
												</span>
											</div>
										)
									) : hasPanoramas ? (
										<div className="w-full h-full">
											<img
												src={getFullUrl(b.scenes[0].image_url)}
												alt={b.name}
												className="w-full h-full object-cover"
											/>
										</div>
									) : (
										<div className="text-gray-400 flex flex-col items-center">
											<ImageIcon size={32} className="mb-2 opacity-50" />
											<span className="text-xs font-bold uppercase tracking-wider">
												No Panoramas
											</span>
										</div>
									)}

									{hasContent && (
										<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center pointer-events-none">
											<div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm text-brand font-bold text-sm px-4 py-2 rounded-full transition-all transform translate-y-4 group-hover:translate-y-0 shadow-lg">
												{is3D ? 'Interact in 3D' : 'View Panoramas'}
											</div>
										</div>
									)}
								</div>
								<div>
									<h3 className="font-bold text-gray-900 truncate">{b.name}</h3>
									<p className="text-xs text-gray-500 mt-1 line-clamp-2">
										{b.description || 'No description available'}
									</p>
								</div>
							</Card>
						)
					})}
				</div>
			)}

			{}
			{(activeModel || activePanorama) && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/90 backdrop-blur-sm animate-in fade-in duration-200 p-4">
					<div className="relative w-full max-w-6xl h-[85vh] bg-black rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col">
						<div className="absolute top-4 right-4 z-50 flex gap-2">
							<div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white font-bold text-sm flex items-center gap-2">
								{activeModel ? <Box size={16} /> : <ImageIcon size={16} />}
								{(activeModel || activePanorama).name}
							</div>
							<button
								onClick={closeViewer}
								className="bg-black/50 backdrop-blur-md p-2 rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
							>
								<X size={20} />
							</button>
						</div>
						<div className="flex-1 w-full h-full relative">
							{activeModel && (
								<model-viewer
									src={getFullUrl(activeModel.model_url)}
									auto-rotate="true"
									camera-controls="true"
									ar="true"
									shadow-intensity="1"
									style={{
										width: '100%',
										height: '100%',
										backgroundColor: '#111'
									}}
								/>
							)}

							{activePanorama && panoScenes.length > 0 && (
								<ReactPhotoSphereViewer
									src={getFullUrl(
										(panoScenes.find((s) => s.is_start_scene) || panoScenes[0])
											.image_url
									)}
									height={'100%'}
									width={'100%'}
									littlePlanet={true}
									plugins={[
										[MarkersPlugin, {}],
										[
											VirtualTourPlugin,
											{
												positionMode: 'manual',
												renderMode: '3d'
											}
										]
									]}
									onReady={handlePanoReady}
								/>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
