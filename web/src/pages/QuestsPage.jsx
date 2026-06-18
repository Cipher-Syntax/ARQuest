import { useState, useEffect } from 'react'
import { Plus, Target, Search, Edit3, Trash2, X } from 'lucide-react'
import { Card, Button, Badge, ConfirmDeleteModal } from '../components/ui'
import { questService } from '../services/questService'
import { buildingService } from '../services/buildingService'

export default function QuestsPage({ hideHeader }) {
	const [searchTerm, setSearchTerm] = useState('')
	const [quests, setQuests] = useState([])
	const [buildingsList, setBuildingsList] = useState([])
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [questToDelete, setQuestToDelete] = useState(null)
	const [editingQuest, setEditingQuest] = useState(null)

	
	const [newTitle, setNewTitle] = useState('')
	const [newHint, setNewHint] = useState('')
	const [newReward, setNewReward] = useState(50)
	const [newBuildingId, setNewBuildingId] = useState('')
	const [isActive, setIsActive] = useState(true)

	useEffect(() => {
		const loadData = async () => {
			try {
				const [buildings, loadedQuests] = await Promise.all([
					buildingService.getBuildings(),
					questService.getQuests()
				])
				setBuildingsList(buildings)
				if (buildings.length > 0) setNewBuildingId(buildings[0].id.toString())
				setQuests(loadedQuests)
			} catch (error) {
				console.error('Failed to load quests data', error)
			}
		}
		loadData()
	}, [])

	const handleOpenAddModal = () => {
		setEditingQuest(null)
		setNewTitle('')
		setNewHint('')
		setNewReward(50)
		setIsActive(true)
		if (buildingsList.length > 0) setNewBuildingId(buildingsList[0].id.toString())
		setIsModalOpen(true)
	}

	const handleOpenEditModal = (quest) => {
		setEditingQuest(quest)
		setNewTitle(quest.title)
		setNewHint(quest.hint)
		setNewReward(quest.reward_points)
		setIsActive(quest.is_active)
		setNewBuildingId(quest.target_building.toString())
		setIsModalOpen(true)
	}

	const handleDeleteClick = (id) => {
		setQuestToDelete(id)
		setIsDeleteModalOpen(true)
	}

	const handleConfirmDelete = async () => {
		if (questToDelete) {
			try {
				await questService.deleteQuest(questToDelete)
				setQuests(quests.filter((q) => q.id !== questToDelete))
				setQuestToDelete(null)
				setIsDeleteModalOpen(false)
			} catch (error) {
				console.error('Failed to delete quest', error)
			}
		}
	}

	const handleSave = async () => {
		if (!newTitle.trim() || !newHint.trim()) return

		const questData = {
			title: newTitle,
			hint: newHint,
			target_building: newBuildingId,
			reward_points: parseInt(newReward, 10),
			is_active: isActive
		}

		try {
			if (editingQuest) {
				const updatedQuest = await questService.updateQuest(editingQuest.id, questData)
				setQuests(quests.map((q) => (q.id === editingQuest.id ? updatedQuest : q)))
			} else {
				const newQuest = await questService.createQuest(questData)
				setQuests([newQuest, ...quests])
			}
			setIsModalOpen(false)
		} catch (error) {
			console.error('Failed to save quest', error)
		}
	}

	const filteredQuests = quests.filter(
		(q) =>
			q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(q.target_building_name &&
				q.target_building_name.toLowerCase().includes(searchTerm.toLowerCase()))
	)

	return (
		<div className="space-y-6">
			{!hideHeader && (
				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
					<div>
						<h2 className="text-2xl font-bold text-gray-900">Quests</h2>
						<p className="text-gray-500 mt-1">
							Manage interactive quests and AR missions.
						</p>
					</div>
					<Button onClick={handleOpenAddModal} className="gap-2 justify-center">
						<Plus size={18} />
						Create Quest
					</Button>
				</div>
			)}
			{hideHeader && (
				<div className="flex justify-end">
					<Button onClick={handleOpenAddModal} className="gap-2 justify-center">
						<Plus size={18} />
						Create Quest
					</Button>
				</div>
			)}

			<div className="flex flex-col md:flex-row items-center gap-4">
				<div className="relative flex-1 w-full">
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
						size={18}
					/>
					<input
						type="text"
						placeholder="Search quests by title or building..."
						className="w-full pl-10 pr-4 py-3 bg-white border border-brand-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
				{filteredQuests.map((quest) => (
					<Card
						key={quest.id}
						className="group hover:border-brand transition-colors flex flex-col h-full"
					>
						<div className="flex items-start justify-between mb-4">
							<div className="w-10 h-10 rounded-md bg-brand-light flex items-center justify-center text-brand shrink-0">
								<Target size={20} />
							</div>
							<Badge variant={quest.is_active ? 'success' : 'gray'}>
								{quest.is_active ? 'Active' : 'Draft'}
							</Badge>
						</div>
						<h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{quest.title}</h3>
						<p className="text-xs font-semibold text-gray-500 mb-2">
							📍 {quest.target_building_name || 'Building'}
						</p>
						<p className="text-sm text-gray-600 mb-4 line-clamp-2">{quest.hint}</p>

						<div className="mt-auto pt-4 border-t border-brand-border flex items-center justify-between">
							<span className="text-xs font-bold text-gray-600">
								Reward: <span className="text-brand">{quest.reward_points} XP</span>
							</span>
							<div className="flex gap-2">
								<Button
									variant="ghost"
									size="xs"
									onClick={() => handleOpenEditModal(quest)}
								>
									<Edit3 size={14} />
								</Button>
								<Button
									variant="ghost"
									size="xs"
									className="text-red-600 hover:text-red-700 hover:bg-red-50"
									onClick={() => handleDeleteClick(quest.id)}
								>
									<Trash2 size={14} />
								</Button>
							</div>
						</div>
					</Card>
				))}
			</div>

			{isModalOpen && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
					<div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
						<div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
							<h3 className="font-bold text-gray-900">
								{editingQuest ? 'Edit Quest' : 'Create Quest'}
							</h3>
							<button
								onClick={() => setIsModalOpen(false)}
								className="p-1 hover:bg-brand-light rounded-lg text-gray-400 hover:text-brand transition-colors"
							>
								<X size={20} />
							</button>
						</div>
						<div className="p-6 space-y-5">
							<div className="space-y-2">
								<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
									Quest Title
								</label>
								<input
									type="text"
									value={newTitle}
									onChange={(e) => setNewTitle(e.target.value)}
									placeholder="E.g. Find the Hidden Lab"
									className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
									Target Building
								</label>
								<select
									value={newBuildingId}
									onChange={(e) => setNewBuildingId(e.target.value)}
									className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold"
								>
									{buildingsList.map((b) => (
										<option key={b.id} value={b.id}>
											{b.name}
										</option>
									))}
								</select>
							</div>
							<div className="space-y-2">
								<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
									Reward (XP)
								</label>
								<input
									type="number"
									value={newReward}
									onChange={(e) => setNewReward(e.target.value)}
									className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
									Hint / Description
								</label>
								<textarea
									value={newHint}
									onChange={(e) => setNewHint(e.target.value)}
									rows={3}
									placeholder="Give players a hint where to look..."
									className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none placeholder-gray-400 font-medium"
								/>
							</div>
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={isActive}
									onChange={(e) => setIsActive(e.target.checked)}
									className="rounded border-gray-300 text-brand focus:ring-brand"
								/>
								<span className="text-sm font-bold text-gray-700">
									Active (Visible to players)
								</span>
							</label>
						</div>
						<div className="px-6 py-4 bg-gray-50 border-t border-brand-border flex justify-end gap-3">
							<Button variant="secondary" onClick={() => setIsModalOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleSave} className="gap-2">
								{editingQuest ? <Edit3 size={16} /> : <Plus size={16} />}
								{editingQuest ? 'Update Quest' : 'Create Quest'}
							</Button>
						</div>
					</div>
				</div>
			)}

			<ConfirmDeleteModal
				isOpen={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				onConfirm={handleConfirmDelete}
				title="Delete Quest"
				message="Are you sure you want to delete this quest? This cannot be undone."
			/>
		</div>
	)
}
