import { Search, Filter, Plus, MoreVertical, Building2, Edit3, Trash2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Button, ConfirmDeleteModal } from '../components/ui'
import { buildingService } from '../services/buildingService'

export default function BuildingsPage() {
	const [buildings, setBuildings] = useState([])
	const [loading, setLoading] = useState(true)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [buildingToDelete, setBuildingToDelete] = useState(null)
	const [editingBuilding, setEditBuilding] = useState(null)
	const [searchTerm, setSearchTerm] = useState('')
	const [statusFilter, setStatusFilter] = useState('all')
	const [openMenu, setOpenMenu] = useState(null)
	const menuRef = useRef(null)

	// Building Form State
	const [formData, setFormData] = useState({
		name: '',
		code: '',
		department: 'Uncategorized',
		lat: '',
		lng: '',
		status: 'active'
	})

	const navigate = useNavigate()

	useEffect(() => {
		loadBuildings()
	}, [])

	const loadBuildings = async () => {
		setLoading(true)
		try {
			const data = await buildingService.getBuildings()
			// Map backend fields to UI fields
			const mapped = data.map((b) => ({
				id: b.id,
				name: b.name,
				code: b.slug,
				department: b.department || 'Uncategorized',
				lat: b.latitude,
				lng: b.longitude,
				status: b.is_active ? 'active' : 'inactive',
				models: b.model_file ? 1 : 0,
				panos: 0
			}))
			setBuildings(mapped)
		} catch (err) {
			console.error('Failed to load buildings', err)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (menuRef.current && !menuRef.current.contains(event.target)) {
				setOpenMenu(null)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	const handleAddClick = () => {
		navigate('/buildings/new')
	}

	const handleEditClick = (building) => {
		navigate(`/buildings/${building.id}`)
	}

	const handleDeleteClick = (id) => {
		setBuildingToDelete(id)
		setIsDeleteModalOpen(true)
		setOpenMenu(null)
	}

	const handleConfirmDelete = async () => {
		if (buildingToDelete) {
			try {
				await buildingService.deleteBuilding(buildingToDelete)
				setIsDeleteModalOpen(false)
				setBuildingToDelete(null)
				await loadBuildings()
			} catch (err) {
				console.error('Failed to delete building', err)
				alert('Failed to delete building.')
			}
		}
	}

	const filteredBuildings = buildings.filter((b) => {
		const matchesSearch =
			b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			b.code.toLowerCase().includes(searchTerm.toLowerCase())
		const matchesStatus = statusFilter === 'all' || b.status === statusFilter
		return matchesSearch && matchesStatus
	})

	return (
		<div className="space-y-6">
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-gray-900">Buildings</h2>
					<p className="text-gray-500 mt-1">
						Manage campus buildings, coordinates, and content.
					</p>
				</div>
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
					<Button onClick={handleAddClick} className="gap-2 justify-center">
						<Plus size={18} />
						Add Building
					</Button>
				</div>
			</div>

			<Card noPadding className="overflow-visible">
				<div className="p-4 border-b border-brand-border flex flex-col md:flex-row gap-4">
					<div className="relative flex-1">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							size={18}
						/>
						<input
							type="text"
							placeholder="Search buildings..."
							className="w-full pl-10 pr-4 py-2 bg-brand-light/30 border border-brand-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand transition-all font-medium"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
					<div className="relative w-full md:w-48">
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="w-full pl-4 pr-10 py-2 bg-white border border-brand-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand appearance-none font-bold text-gray-700 shadow-sm cursor-pointer"
						>
							<option value="all">All Status</option>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
						</select>
						<Filter
							className="absolute right-3 top-1/2 -translate-y-1/2 text-brand pointer-events-none"
							size={16}
						/>
					</div>
				</div>

				{loading ? (
					<div className="p-8 text-center text-gray-500 font-medium">
						Loading buildings...
					</div>
				) : (
					<div className="overflow-x-auto scrollbar-thin">
						<table className="w-full text-left min-w-200">
							<thead>
								<tr className="bg-brand-light/20">
									<th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
										Building
									</th>
									<th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
										Coordinates
									</th>
									<th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
										Status
									</th>
									<th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-brand-border/50">
								{filteredBuildings.map((b) => (
									<tr
										key={b.id}
										className="hover:bg-brand-light/30 transition-colors group"
									>
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-md bg-brand-light flex items-center justify-center text-brand shrink-0">
													<Building2 size={18} />
												</div>
												<div>
													<p className="font-bold text-gray-900 text-sm group-hover:text-brand transition-colors">
														{b.name}
													</p>
												</div>
											</div>
										</td>
										<td className="px-6 py-4">
											<span className="text-xs font-mono text-gray-500">
												{b.lat}, {b.lng}
											</span>
										</td>
										<td className="px-6 py-4">
											<Badge
												variant={b.status === 'active' ? 'success' : 'gray'}
											>
												{b.status === 'active' ? 'Active' : 'Inactive'}
											</Badge>
										</td>
										<td className="px-6 py-4 text-right">
											<div
												className="relative inline-block text-left"
												ref={openMenu === b.id ? menuRef : null}
											>
												<button
													onClick={() =>
														setOpenMenu(openMenu === b.id ? null : b.id)
													}
													className="p-2 text-gray-400 hover:text-brand transition-colors rounded-lg hover:bg-brand-light"
												>
													<MoreVertical size={18} />
												</button>

												{openMenu === b.id && (
													<div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-xl border border-brand-border z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
														<button
															onClick={() => {
																handleEditClick(b)
																setOpenMenu(null)
															}}
															className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-brand-light hover:text-brand flex items-center gap-2 font-medium"
														>
															<Edit3 size={14} /> Edit Building
														</button>
														<button
															onClick={() => handleDeleteClick(b.id)}
															className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
														>
															<Trash2 size={14} /> Delete Building
														</button>
													</div>
												)}
											</div>
										</td>
									</tr>
								))}
								{filteredBuildings.length === 0 && (
									<tr>
										<td
											colSpan="5"
											className="px-6 py-8 text-center text-gray-500"
										>
											No buildings found. Add a building to get started.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				)}
				<div className="h-20" />
			</Card>

			<ConfirmDeleteModal
				isOpen={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				onConfirm={handleConfirmDelete}
				title="Delete Building"
				message="Are you sure you want to move this building to trash? This will remove its coordinates and association from the system."
			/>
		</div>
	)
}
