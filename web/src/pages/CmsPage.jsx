import React, { useState, useEffect } from 'react'
import { FileText, HelpCircle, Building2, Plus, Edit3, Trash2, X, Target, Lightbulb, Search } from 'lucide-react'
import { buildingService } from '../services/buildingService'
import { questService } from '../services/questService'
import { triviaService } from '../services/triviaService'
import { quizService } from '../services/quizService'
import { settingsService } from '../services/settingsService'
import { Card, Button, Badge } from '../components/ui'
import '@google/model-viewer'

export default function CmsPage() {
	const [buildings, setBuildings] = useState([])
	const [quests, setQuests] = useState([])
	const [trivias, setTrivias] = useState([])
	const [quizzes, setQuizzes] = useState([])
	const [selectedBuilding, setSelectedBuilding] = useState(null)
	const [systemSettings, setSystemSettings] = useState(null)
	
	const [activeTab, setActiveTab] = useState('quests') // 'quests' | 'trivias'
	
	// Form states
	const [isEditing, setIsEditing] = useState(false)
	const [editingItem, setEditingItem] = useState(null)
	const [formTitle, setFormTitle] = useState('')
	const [formHint, setFormHint] = useState('')
	const [formTargetRole, setFormTargetRole] = useState('all')
	const [formReward, setFormReward] = useState(50)
	const [formFact, setFormFact] = useState('')
	const [formExpiresAt, setFormExpiresAt] = useState('')
	
	// Quiz states
	const [formQuestion, setFormQuestion] = useState('')
	const [formOptionA, setFormOptionA] = useState('')
	const [formOptionB, setFormOptionB] = useState('')
	const [formOptionC, setFormOptionC] = useState('')
	const [formOptionD, setFormOptionD] = useState('')
	const [formCorrectOption, setFormCorrectOption] = useState('A')

	const [searchTerm, setSearchTerm] = useState('')

	useEffect(() => {
		loadData()
	}, [])

	useEffect(() => {
		if (!isEditing && systemSettings) {
			setFormReward(systemSettings.default_quest_reward || 50)
		}
	}, [systemSettings, isEditing])

	const loadData = async () => {
		try {
			const [bData, qData, tData, quizData, sData] = await Promise.all([
				buildingService.getBuildings(),
				questService.getQuests(),
				triviaService.getTrivias(),
				quizService.getQuizzes(),
				settingsService.getSettings()
			])
			setBuildings(bData)
			setQuests(qData)
			setTrivias(tData)
			setQuizzes(quizData)
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
				target_role: formTargetRole,
				reward_points: formReward,
				expires_at: formExpiresAt || null,
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

	const handleSaveQuiz = async () => {
		if (!formQuestion || !formOptionA || !formOptionB) return
		try {
			const payload = {
				building: selectedBuilding.id,
				question: formQuestion,
				option_a: formOptionA,
				option_b: formOptionB,
				option_c: formOptionC,
				option_d: formOptionD,
				correct_option: formCorrectOption,
				exp_reward: formReward
			}
			if (editingItem) {
				const updated = await quizService.updateQuiz(editingItem.id, payload)
				setQuizzes(quizzes.map(q => q.id === updated.id ? updated : q))
			} else {
				const created = await quizService.createQuiz(payload)
				setQuizzes([created, ...quizzes])
			}
			resetForm()
		} catch (err) {
			console.error(err)
		}
	}

	const handleDeleteQuiz = async (id) => {
		try {
			await quizService.deleteQuiz(id)
			setQuizzes(quizzes.filter(q => q.id !== id))
		} catch (err) {
			console.error(err)
		}
	}

	const resetForm = () => {
		setIsEditing(false)
		setEditingItem(null)
		setFormTitle('')
		setFormHint('')
		setFormTargetRole('all')
		setFormFact('')
		setFormExpiresAt('')
		setFormQuestion('')
		setFormOptionA('')
		setFormOptionB('')
		setFormOptionC('')
		setFormOptionD('')
		setFormCorrectOption('A')
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
					const bQuizzes = quizzes.filter(q => q.building === b.id)
					return (
						<div 
							key={b.id} 
							onClick={() => setSelectedBuilding(b)}
							className="bg-white rounded-lg border border-brand-border p-4 cursor-pointer hover:shadow-md transition-shadow hover:border-brand flex flex-col justify-between h-36"
						>
							<div className="flex items-start gap-3 mb-3">
								<div className="w-10 h-10 shrink-0 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
									<Building2 size={20} />
								</div>
								<h3 className="font-bold text-gray-900 line-clamp-2 leading-tight text-sm mt-1">{b.name}</h3>
							</div>
							<div className="flex flex-wrap gap-1">
								<Badge variant={bQuests.length > 0 ? 'success' : 'default'} className="text-[9px] py-0.5 px-1.5">
									{bQuests.length} Quests
								</Badge>
								<Badge variant={bTrivias.length > 0 ? 'warning' : 'default'} className="text-[9px] py-0.5 px-1.5">
									{bTrivias.length} Trivias
								</Badge>
								<Badge variant={bQuizzes.length > 0 ? 'blue' : 'default'} className="text-[9px] py-0.5 px-1.5">
									{bQuizzes.length} Quizzes
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
								<button
									onClick={() => { setActiveTab('quizzes'); resetForm(); }}
									className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'quizzes' ? 'border-[#B21830] text-[#B21830]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
								>
									<HelpCircle size={16} className="inline mr-2" /> Quiz
								</button>
							</div>

							<div className="flex-1 overflow-y-auto p-6">
								{isEditing ? (
									<div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm animate-in slide-in-from-bottom-2">
										<div className="flex justify-between items-center mb-4">
											<h3 className="font-bold text-gray-900">{editingItem ? 'Edit' : 'New'} {activeTab === 'quests' ? 'Quest' : 'Trivia'}</h3>
											<button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
										</div>
										
										{activeTab === 'quests' && (
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-semibold mb-1 text-gray-700">Quest Title</label>
													<input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#B21830]/20 focus:border-[#B21830] outline-none" placeholder="e.g. Find the hidden lab" />
												</div>
												<div>
													<label className="block text-sm font-semibold mb-1 text-gray-700">Hint / Instructions</label>
													<textarea value={formHint} onChange={e => setFormHint(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm h-24 focus:ring-2 focus:ring-[#B21830]/20 focus:border-[#B21830] outline-none" placeholder="e.g. Look behind the main staircase on the first floor..." />
												</div>
												<div className="grid grid-cols-2 gap-4">
													<div>
														<label className="block text-sm font-semibold mb-1 text-gray-700">Target Role</label>
														<select value={formTargetRole} onChange={e => setFormTargetRole(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#B21830]/20 focus:border-[#B21830] outline-none">
															<option value="all">All Users</option>
															<option value="student">Students Only</option>
															<option value="visitor">Guests/Visitors Only</option>
															<option value="professional">Professionals Only</option>
														</select>
													</div>
													<div>
														<label className="block text-sm font-semibold mb-1 text-gray-700">Reward Points</label>
														<input type="number" value={formReward} onChange={e => setFormReward(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#B21830]/20 focus:border-[#B21830] outline-none" />
													</div>
												</div>
												<div>
													<label className="block text-sm font-semibold mb-1 text-gray-700">Expires At (Optional)</label>
													<input type="datetime-local" value={formExpiresAt} onChange={e => setFormExpiresAt(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#B21830]/20 focus:border-[#B21830] outline-none" />
													<p className="text-xs text-gray-500 mt-1">If set, this becomes a Limited Challenge.</p>
												</div>
												<div className="flex justify-end pt-2">
													<Button onClick={handleSaveQuest} className="bg-[#B21830] hover:bg-[#8e1326] text-white">Save Quest</Button>
												</div>
											</div>
										)}
										{activeTab === 'trivias' && (
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
										{activeTab === 'quizzes' && (
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-semibold mb-1 text-gray-700">Question</label>
													<textarea value={formQuestion} onChange={e => setFormQuestion(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm h-20 focus:ring-2 focus:ring-[#B21830]/20 focus:border-[#B21830] outline-none resize-none" placeholder="Enter question..." />
												</div>
												<div className="grid grid-cols-2 gap-3">
													<div>
														<label className="block text-xs font-semibold mb-1 text-gray-700">Option A</label>
														<input type="text" value={formOptionA} onChange={e => setFormOptionA(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
													</div>
													<div>
														<label className="block text-xs font-semibold mb-1 text-gray-700">Option B</label>
														<input type="text" value={formOptionB} onChange={e => setFormOptionB(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
													</div>
													<div>
														<label className="block text-xs font-semibold mb-1 text-gray-700">Option C</label>
														<input type="text" value={formOptionC} onChange={e => setFormOptionC(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
													</div>
													<div>
														<label className="block text-xs font-semibold mb-1 text-gray-700">Option D</label>
														<input type="text" value={formOptionD} onChange={e => setFormOptionD(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
													</div>
												</div>
												<div className="flex gap-4">
													<div className="flex-1">
														<label className="block text-xs font-semibold mb-1 text-gray-700">Correct Option</label>
														<select value={formCorrectOption} onChange={e => setFormCorrectOption(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm">
															<option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
														</select>
													</div>
													<div className="flex-1">
														<label className="block text-xs font-semibold mb-1 text-gray-700">EXP Reward</label>
														<input type="number" value={formReward} onChange={e => setFormReward(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
													</div>
												</div>
												<div className="flex justify-end pt-2">
													<Button onClick={handleSaveQuiz} className="bg-[#B21830] hover:bg-[#8e1326] text-white">Save Quiz</Button>
												</div>
											</div>
										)}
									</div>
								) : (
									<>
										<div className="flex justify-end mb-6">
											<Button onClick={() => setIsEditing(true)} className="bg-[#B21830] hover:bg-[#8e1326] text-white shadow-sm border-none">
												<Plus size={16} className="mr-1" /> Add {activeTab === 'quests' ? 'Quest' : activeTab === 'trivias' ? 'Trivia' : 'Quiz'}
											</Button>
										</div>

										<div className="space-y-4">
											{activeTab === 'quests' && quests.filter(q => q.target_building === selectedBuilding.id || q.target_building_name === selectedBuilding.name).map(quest => {
												const isExpired = quest.expires_at && new Date(quest.expires_at) < new Date();
												return (
												<div key={quest.id} className={`bg-white p-4 rounded-lg border-l-4 ${isExpired ? 'border-gray-400 opacity-70' : 'border-[#B21830]'} border-y border-r border-gray-200 shadow-sm flex items-start justify-between gap-4 group hover:border-y-[#B21830]/30 hover:border-r-[#B21830]/30 transition-all`}>
													<div className="flex gap-3">
														<div className={`mt-0.5 p-2 rounded-md shrink-0 ${isExpired ? 'bg-gray-100 text-gray-400' : 'bg-[#B21830]/10 text-[#B21830]'}`}>
															<Target size={20} />
														</div>
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2 mb-1">
																<h4 className={`font-extrabold truncate ${isExpired ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{quest.title}</h4>
																<span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${isExpired ? 'bg-gray-100 text-gray-500' : 'text-[#B21830] bg-[#B21830]/10'}`}>+{quest.reward_points} pts</span>
																{quest.target_role && quest.target_role !== 'all' && (
																	<span className="inline-block text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-gray-200">
																		{quest.target_role}
																	</span>
																)}
																{isExpired && (
																	<span className="inline-block text-[10px] font-bold text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-gray-300">
																		Expired
																	</span>
																)}
															</div>
															<p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{quest.hint}</p>
														</div>
													</div>
													<div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
														<button onClick={() => { 
															setEditingItem(quest); 
															setFormTitle(quest.title); 
															setFormHint(quest.hint); 
															setFormTargetRole(quest.target_role || 'all'); 
															setFormReward(quest.reward_points); 
															setFormExpiresAt(quest.expires_at ? quest.expires_at.slice(0, 16) : '');
															setIsEditing(true); 
														}} className="p-1.5 text-gray-400 hover:text-[#B21830] bg-gray-50 hover:bg-[#B21830]/10 rounded-md transition-colors"><Edit3 size={14}/></button>
														<button onClick={() => handleDeleteQuest(quest.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14}/></button>
													</div>
												</div>
											);
											})}

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

											{activeTab === 'quizzes' && quizzes.filter(q => q.building === selectedBuilding.id).map(quiz => (
												<div key={quiz.id} className="bg-white p-4 rounded-lg border-l-4 border-[#B21830] border-y border-r border-gray-200 shadow-sm flex flex-col gap-3 group hover:border-y-[#B21830]/30 hover:border-r-[#B21830]/30 transition-all">
													<div className="flex justify-between items-start">
														<div className="flex gap-3">
															<div className="mt-0.5 bg-[#B21830]/10 p-2 rounded-md text-[#B21830] shrink-0">
																<HelpCircle size={20} />
															</div>
															<div className="flex-1 min-w-0 pt-0.5">
																<p className="font-bold text-gray-900 leading-tight">{quiz.question}</p>
																<span className="inline-block mt-1 text-[10px] font-bold text-[#B21830] bg-[#B21830]/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">+{quiz.exp_reward} pts</span>
															</div>
														</div>
														<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
															<button onClick={() => { setEditingItem(quiz); setFormQuestion(quiz.question); setFormOptionA(quiz.option_a); setFormOptionB(quiz.option_b); setFormOptionC(quiz.option_c); setFormOptionD(quiz.option_d); setFormCorrectOption(quiz.correct_option); setFormReward(quiz.exp_reward); setIsEditing(true); }} className="p-1.5 text-gray-400 hover:text-[#B21830] bg-gray-50 hover:bg-[#B21830]/10 rounded-md transition-colors"><Edit3 size={14}/></button>
															<button onClick={() => handleDeleteQuiz(quiz.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14}/></button>
														</div>
													</div>
													<div className="grid grid-cols-2 gap-2 text-xs">
														<div className={`px-2 py-1.5 rounded border ${quiz.correct_option === 'A' ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>A: {quiz.option_a}</div>
														<div className={`px-2 py-1.5 rounded border ${quiz.correct_option === 'B' ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>B: {quiz.option_b}</div>
														<div className={`px-2 py-1.5 rounded border ${quiz.correct_option === 'C' ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>C: {quiz.option_c}</div>
														<div className={`px-2 py-1.5 rounded border ${quiz.correct_option === 'D' ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>D: {quiz.option_d}</div>
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

											{activeTab === 'quizzes' && quizzes.filter(q => q.building === selectedBuilding.id).length === 0 && (
												<div className="text-center py-10 bg-white border border-dashed border-gray-300 rounded-xl">
													<HelpCircle size={32} className="mx-auto text-gray-300 mb-2" />
													<p className="text-gray-500 font-medium">No quizzes for this building</p>
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
