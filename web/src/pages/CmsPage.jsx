import React, { useState, useEffect } from 'react'
import { FileText, HelpCircle, Building2, Plus, Edit3, Trash2, X, Target, Lightbulb, Search } from 'lucide-react'
import { buildingService } from '../services/buildingService'
import { questService } from '../services/questService'
import { triviaService } from '../services/triviaService'
import { settingsService } from '../services/settingsService'
import { Card, Button, Badge } from '../components/ui'
import '@google/model-viewer'

export default function CmsPage() {
	const [buildings, setBuildings] = useState([])
	const [quests, setQuests] = useState([])
	const [trivias, setTrivias] = useState([])
	const [selectedBuilding, setSelectedBuilding] = useState(null)
	const [systemSettings, setSystemSettings] = useState(null)
	
	const [activeTab, setActiveTab] = useState('quests') // 'quests' | 'trivias'
	
	// Form states
	const [isEditing, setIsEditing] = useState(false)
	const [editingItem, setEditingItem] = useState(null)
	const [formTitle, setFormTitle] = useState('')
	const [formHint, setFormHint] = useState('')
	const [formReward, setFormReward] = useState(50)
	const [formFact, setFormFact] = useState('')
	const [searchTerm, setSearchTerm] = useState('')

	useEffect(() => {
		loadData()
	}, [])

	const loadData = async () => {
		try {
			const [bData, qData, tData, sData] = await Promise.all([
				buildingService.getBuildings(),
				questService.getQuests(),
				triviaService.getTrivias(),
				settingsService.getSettings()
			])
			setBuildings(bData)
			setQuests(qData)
			setTrivias(tData)
			setSystemSettings(sData)
		} catch (error) {
			console.error('Failed to load CMS data', error)
		}
	}

	const handleSaveQuest = async () => {
		if (!formTitle || !formHint) return
		try {
			const payload = {
				title: formTitle,
				hint: formHint,
				target_building: selectedBuilding.id,
				reward_points: formReward,
				is_active: true
			}
			if (editingItem) {
				const updated = await questService.updateQuest(editingItem.id, payload)
				setQuests(quests.map(q => q.id === updated.id ? updated : q))
			} else {
				const created = await questService.createQuest(payload)
				setQuests([created, ...quests])
			}
			resetForm()
		} catch (err) {
			console.error(err)
		}
	}

	const handleDeleteQuest = async (id) => {
		try {
			await questService.deleteQuest(id)
			setQuests(quests.filter(q => q.id !== id))
		} catch (err) {
			console.error(err)
		}
	}

	const handleSaveTrivia = async () => {
		if (!formFact) return
		try {
			const payload = {
				building: selectedBuilding.id,
				fact: formFact,
				is_active: true
			}
			if (editingItem) {
				const updated = await triviaService.updateTrivia(editingItem.id, payload)
				setTrivias(trivias.map(t => t.id === updated.id ? updated : t))
			} else {
				const created = await triviaService.createTrivia(payload)
				setTrivias([created, ...trivias])
			}
			resetForm()
		} catch (err) {
			console.error(err)
		}
	}

	const handleDeleteTrivia = async (id) => {
		try {
			await triviaService.deleteTrivia(id)
			setTrivias(trivias.filter(t => t.id !== id))
		} catch (err) {
			console.error(err)
		}
	}

	const resetForm = () => {
		setIsEditing(false)
		setEditingItem(null)
		setFormTitle('')
		setFormHint('')
		setFormFact('')
		setFormReward(systemSettings?.default_quest_reward || 50)
	}

	const filteredBuildings = buildings.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))

	return (
		<div className="space-y-6 pb-20">
			<div>
				<h2 className="text-2xl font-bold text-gray-900">Game Content</h2>
				<p className="text-gray-500 mt-1">Select a building to manage its Quests and Trivia Facts.</p>
			</div>

			<div className="bg-white p-4 rounded-xl border border-brand-border shadow-sm flex items-center gap-3">
				<Search size={20} className="text-gray-400" />
				<input
					type="text"
					placeholder="Search buildings..."
					className="flex-1 bg-transparent outline-none text-sm"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
				/>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
				{filteredBuildings.map(b => {
					const bQuests = quests.filter(q => q.target_building === b.id || q.target_building_name === b.name)
					const bTrivias = trivias.filter(t => t.building === b.id || t.building_name === b.name)
					return (
						<div 
							key={b.id} 
							onClick={() => setSelectedBuilding(b)}
							className="bg-white rounded-lg border border-brand-border p-4 cursor-pointer hover:shadow-md transition-shadow hover:border-brand flex flex-col justify-between h-32"
						>
							<div className="flex items-start gap-3 mb-3">
								<div className="w-10 h-10 shrink-0 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
									<Building2 size={20} />
								</div>
								<h3 className="font-bold text-gray-900 line-clamp-2 leading-tight text-sm mt-1">{b.name}</h3>
							</div>
							<div className="flex gap-2">
								<Badge variant={bQuests.length > 0 ? 'success' : 'default'} className="text-[10px] py-0.5 px-2">
									{bQuests.length} Quests
								</Badge>
								<Badge variant={bTrivias.length > 0 ? 'warning' : 'default'} className="text-[10px] py-0.5 px-2">
									{bTrivias.length} Trivias
								</Badge>
							</div>
						</div>
					)
				})}
			</div>

			{selectedBuilding && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm animate-in fade-in">
					<div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95">
						
						{/* LEFT SIDE: 3D Preview */}
						<div className="hidden md:flex w-1/2 bg-gray-900 relative flex-col items-center justify-center p-8 overflow-hidden">
							<div className="absolute top-8 left-8 right-16 z-20">
								<div className="inline-block px-3 py-1 bg-white/10 text-white text-[10px] font-bold tracking-widest uppercase rounded-full mb-2 backdrop-blur-md border border-white/20">3D PREVIEW</div>
								<h2 className="text-3xl font-extrabold text-white leading-tight drop-shadow-lg">{selectedBuilding.name}</h2>
								{selectedBuilding.primary_department && (
									<p className="text-white/80 font-medium mt-1 drop-shadow-md flex items-center gap-2">
										<span className="w-3 h-3 rounded-full shadow-lg" style={{backgroundColor: selectedBuilding.primary_department.color_hex || '#B21830'}}></span>
										{selectedBuilding.primary_department.name}
									</p>
								)}
							</div>

							{selectedBuilding.model_url && selectedBuilding.model_active ? (
								<div className="w-full h-full pt-16 relative z-10">
									<model-viewer
										src={selectedBuilding.model_url}
										auto-rotate
										camera-controls
										shadow-intensity="1"
										style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
										exposure="1.2"
										interaction-prompt="none"
									></model-viewer>
								</div>
							) : (
								<div className="text-center z-10">
									<div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
										<Building2 size={40} className="text-white/20" />
									</div>
									<p className="text-white/50 font-medium">No 3D model available</p>
									<p className="text-white/30 text-sm mt-1">Upload a GLB file in the Buildings editor</p>
								</div>
							)}
							
							<div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none z-10" />
						</div>

						{/* RIGHT SIDE: Content Management */}
						<div className="w-full md:w-1/2 h-full flex flex-col border-l border-gray-100 bg-gray-50/50 relative">
							<button 
								onClick={() => { setSelectedBuilding(null); resetForm(); }}
								className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors z-20 hidden md:block"
							>
								<X size={20} />
							</button>

							<div className="px-6 py-4 border-b border-gray-100 bg-white flex justify-between items-center shrink-0 pr-16">
								<div>
									<h2 className="text-lg font-bold text-gray-900">Content Manager</h2>
									<p className="text-sm text-gray-500 line-clamp-1">{selectedBuilding.name}</p>
								</div>
								<button onClick={() => { setSelectedBuilding(null); resetForm(); }} className="md:hidden p-2 bg-gray-100 rounded-full hover:bg-gray-200">
									<X size={18} />
								</button>
							</div>

							<div className="flex border-b border-gray-200 bg-white shrink-0">
								<button
									onClick={() => { setActiveTab('quests'); resetForm(); }}
									className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'quests' ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
								>
									<Target size={16} className="inline mr-2" /> Quests
								</button>
								<button
									onClick={() => { setActiveTab('trivias'); resetForm(); }}
									className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'trivias' ? 'border-[#B21830] text-[#B21830]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
								>
									<Lightbulb size={16} className="inline mr-2" /> Trivia Facts
								</button>
							</div>

							<div className="flex-1 overflow-y-auto p-6">
								{isEditing ? (
									<div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm animate-in slide-in-from-bottom-2">
										<div className="flex justify-between items-center mb-4">
											<h3 className="font-bold text-gray-900">{editingItem ? 'Edit' : 'New'} {activeTab === 'quests' ? 'Quest' : 'Trivia'}</h3>
											<button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
										</div>
										
										{activeTab === 'quests' ? (
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-semibold mb-1 text-gray-700">Quest Title</label>
													<input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#B21830]/20 focus:border-[#B21830] outline-none" placeholder="e.g. Find the hidden lab" />
												</div>
												<div>
													<label className="block text-sm font-semibold mb-1 text-gray-700">Hint / Instructions</label>
													<textarea value={formHint} onChange={e => setFormHint(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm h-24 focus:ring-2 focus:ring-[#B21830]/20 focus:border-[#B21830] outline-none" placeholder="e.g. Look behind the main staircase on the first floor..." />
												</div>
												<div>
													<label className="block text-sm font-semibold mb-1 text-gray-700">Reward Points</label>
													<input type="number" value={formReward} onChange={e => setFormReward(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#B21830]/20 focus:border-[#B21830] outline-none" />
												</div>
												<div className="flex justify-end pt-2">
													<Button onClick={handleSaveQuest} className="bg-[#B21830] hover:bg-[#8e1326] text-white">Save Quest</Button>
												</div>
											</div>
										) : (
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-semibold mb-1 text-gray-700">Trivia Fact</label>
													<textarea value={formFact} onChange={e => setFormFact(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm h-32 focus:ring-2 focus:ring-[#B21830]/20 focus:border-[#B21830] outline-none" placeholder="e.g. This building was constructed in 1980..." />
												</div>
												<div className="flex justify-end pt-2">
													<Button onClick={handleSaveTrivia} className="bg-[#B21830] hover:bg-[#8e1326] text-white">Save Trivia</Button>
												</div>
											</div>
										)}
									</div>
								) : (
									<>
										<div className="flex justify-end mb-6">
											<Button onClick={() => setIsEditing(true)} className="bg-[#B21830] hover:bg-[#8e1326] text-white shadow-sm border-none">
												<Plus size={16} className="mr-1" /> Add {activeTab === 'quests' ? 'Quest' : 'Trivia'}
											</Button>
										</div>

										<div className="space-y-4">
											{activeTab === 'quests' && quests.filter(q => q.target_building === selectedBuilding.id || q.target_building_name === selectedBuilding.name).map(quest => (
												<div key={quest.id} className="bg-white p-4 rounded-lg border-l-4 border-[#B21830] border-y border-r border-gray-200 shadow-sm flex items-start justify-between gap-4 group hover:border-y-[#B21830]/30 hover:border-r-[#B21830]/30 transition-all">
													<div className="flex gap-3">
														<div className="mt-0.5 bg-[#B21830]/10 p-2 rounded-md text-[#B21830] shrink-0">
															<Target size={20} />
														</div>
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2 mb-1">
																<h4 className="font-extrabold text-gray-900 truncate">{quest.title}</h4>
																<span className="inline-block text-[10px] font-bold text-[#B21830] bg-[#B21830]/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">+{quest.reward_points} pts</span>
															</div>
															<p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{quest.hint}</p>
														</div>
													</div>
													<div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
														<button onClick={() => { setEditingItem(quest); setFormTitle(quest.title); setFormHint(quest.hint); setFormReward(quest.reward_points); setIsEditing(true); }} className="p-1.5 text-gray-400 hover:text-[#B21830] bg-gray-50 hover:bg-[#B21830]/10 rounded-md transition-colors"><Edit3 size={14}/></button>
														<button onClick={() => handleDeleteQuest(quest.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14}/></button>
													</div>
												</div>
											))}

											{activeTab === 'trivias' && trivias.filter(t => t.building === selectedBuilding.id || t.building_name === selectedBuilding.name).map(trivia => (
												<div key={trivia.id} className="bg-white p-4 rounded-lg border-l-4 border-[#B21830] border-y border-r border-gray-200 shadow-sm flex items-start justify-between gap-4 group hover:border-y-[#B21830]/30 hover:border-r-[#B21830]/30 transition-all">
													<div className="flex gap-3">
														<div className="mt-0.5 bg-[#B21830]/10 p-2 rounded-md text-[#B21830] shrink-0">
															<Lightbulb size={20} />
														</div>
														<div className="flex-1 min-w-0 pt-0.5">
															<p className="text-sm text-gray-800 leading-relaxed italic">"{trivia.fact}"</p>
														</div>
													</div>
													<div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
														<button onClick={() => { setEditingItem(trivia); setFormFact(trivia.fact); setIsEditing(true); }} className="p-1.5 text-gray-400 hover:text-[#B21830] bg-gray-50 hover:bg-[#B21830]/10 rounded-md transition-colors"><Edit3 size={14}/></button>
														<button onClick={() => handleDeleteTrivia(trivia.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14}/></button>
													</div>
												</div>
											))}

											{activeTab === 'quests' && quests.filter(q => q.target_building === selectedBuilding.id || q.target_building_name === selectedBuilding.name).length === 0 && (
												<div className="text-center py-10 bg-white border border-dashed border-gray-300 rounded-xl">
													<Target size={32} className="mx-auto text-gray-300 mb-2" />
													<p className="text-gray-500 font-medium">No quests assigned to this building</p>
												</div>
											)}

											{activeTab === 'trivias' && trivias.filter(t => t.building === selectedBuilding.id || t.building_name === selectedBuilding.name).length === 0 && (
												<div className="text-center py-10 bg-white border border-dashed border-gray-300 rounded-xl">
													<Lightbulb size={32} className="mx-auto text-gray-300 mb-2" />
													<p className="text-gray-500 font-medium">No trivia facts for this building</p>
												</div>
											)}
										</div>
									</>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
