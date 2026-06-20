import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ReactPhotoSphereViewer } from 'react-photo-sphere-viewer'
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin'
import '@photo-sphere-viewer/core/index.css'
import '@photo-sphere-viewer/virtual-tour-plugin/index.css'
import { buildingService } from '../services/buildingService'
import { panoramaService } from '../services/panoramaService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const getFullUrl = (url) => {
	if (!url) return ''
	if (url.startsWith('http')) return url
	return `${API_BASE_URL}${url}`
}

export default function VirtualTourPage() {
	const { id } = useParams()
	const navigate = useNavigate()
	const [building, setBuilding] = useState(null)
	const [nodes, setNodes] = useState([])
	const [loading, setLoading] = useState(true)
	const viewerRef = useRef(null)

	useEffect(() => {
		loadTourData()
	}, [id])

	const loadTourData = async () => {
		try {
			const bData = await buildingService.getBuilding(id)
			setBuilding(bData)

			const scenesData = await panoramaService.getBuildingScenes(id)
			if (!scenesData || scenesData.length === 0) {
				setLoading(false)
				return
			}

			// Load hotspots for all scenes to build the links
			const scenesWithHotspots = await Promise.all(
				scenesData.map(async (scene) => {
					const hs = await panoramaService.getSceneHotspots(scene.id)
					return { ...scene, hotspots: hs || [] }
				})
			)

			// Build nodes array for VirtualTourPlugin
			const tourNodes = scenesWithHotspots.map(scene => ({
				id: scene.id.toString(),
				panorama: getFullUrl(scene.image_url),
				name: scene.title,
				links: scene.hotspots.map(h => ({
					nodeId: h.target_scene.toString(),
					position: { yaw: h.yaw, pitch: h.pitch }
				})),
				defaultYaw: 0,
				defaultPitch: 0
			}))

			setNodes(tourNodes)
		} catch (error) {
			console.error('Failed to load virtual tour:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleReady = (instance) => {
		viewerRef.current = instance
		const vtPlugin = instance.getPlugin(VirtualTourPlugin)
		if (vtPlugin && nodes.length > 0) {
			const startNode = nodes[0].id
			vtPlugin.setNodes(nodes, startNode)
		}
	}

	if (loading) {
		return <div className="p-8 text-center text-gray-500 font-bold">Loading Virtual Tour Environment...</div>
	}

	if (nodes.length === 0) {
		return (
			<div className="p-8 text-center">
				<h2 className="text-2xl font-bold text-gray-800 mb-4">No Panoramas Available</h2>
				<button 
					onClick={() => navigate(`/panoramas/${id}`)}
					className="px-6 py-2 bg-brand text-white rounded-md font-bold"
				>
					Upload Panoramas First
				</button>
			</div>
		)
	}

	return (
		<div className="fixed inset-0 z-50 bg-black flex flex-col">
			<div className="h-16 bg-black/80 text-white flex items-center px-6 border-b border-white/10 shrink-0">
				<button 
					onClick={() => navigate(-1)}
					className="flex items-center gap-2 hover:text-brand transition-colors font-bold"
				>
					<ArrowLeft size={20} />
					Exit Tour
				</button>
				<h1 className="text-xl font-bold ml-auto mr-auto">
					{building?.name} - Virtual Tour
				</h1>
				<div className="w-24"></div> {/* spacer */}
			</div>

			<div className="flex-1 w-full relative">
				<ReactPhotoSphereViewer
					ref={viewerRef}
					src="placeholder" // Handled by plugin
					height="100%"
					width="100%"
					onReady={handleReady}
					plugins={[
						[VirtualTourPlugin, {
							positionMode: 'manual',
							renderMode: '3d',
							nodes: nodes
						}]
					]}
					navbar={['zoom', 'fullscreen']}
				/>
			</div>
		</div>
	)
}
