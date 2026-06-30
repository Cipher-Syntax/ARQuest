import { useState, useRef, useEffect } from 'react'
import { Plus, X, Search, Filter, MoreVertical, Edit3, Trash2, HelpCircle } from 'lucide-react'
import { Card, Badge, Button, ConfirmDeleteModal } from '../components/ui'
import { buildingService } from '../services/buildingService'
import { quizService } from '../services/quizService'

export default function QuizPage() {
    const [buildingsList, setBuildingsList] = useState([])
    const [questions, setQuestions] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [questionToDelete, setQuestionToDelete] = useState(null)
    const [editingQuestion, setEditingQuestion] = useState(null)
    const [activeMenu, setActiveMenu] = useState(null)
    
    // Form State
    const [newBuildingId, setNewBuildingId] = useState('')
    const [newQuestion, setNewQuestion] = useState('')
    const [optionA, setOptionA] = useState('')
    const [optionB, setOptionB] = useState('')
    const [optionC, setOptionC] = useState('')
    const [optionD, setOptionD] = useState('')
    const [correctOption, setCorrectOption] = useState('A')
    const [expReward, setExpReward] = useState(10)
    
    const [selectedBuilding, setSelectedBuilding] = useState('All Buildings')
    const [searchTerm, setSearchTerm] = useState('')
    const menuRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenu(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const loadData = async () => {
            try {
                const [buildings, quizzes] = await Promise.all([
                    buildingService.getBuildings(),
                    quizService.getQuizzes()
                ])
                setBuildingsList(buildings)
                if (buildings.length > 0) {
                    setNewBuildingId(buildings[0].id.toString())
                }
                setQuestions(quizzes)
            } catch (error) {
                console.error('Failed to load data', error)
            }
        }
        loadData()
    }, [])

    const handleOpenAddModal = () => {
        setEditingQuestion(null)
        setNewQuestion('')
        setOptionA('')
        setOptionB('')
        setOptionC('')
        setOptionD('')
        setCorrectOption('A')
        setExpReward(10)
        if (buildingsList.length > 0) setNewBuildingId(buildingsList[0].id.toString())
        setIsModalOpen(true)
    }

    const handleOpenEditModal = (item) => {
        setEditingQuestion(item)
        setNewBuildingId(item.building.toString())
        setNewQuestion(item.question)
        setOptionA(item.option_a)
        setOptionB(item.option_b)
        setOptionC(item.option_c)
        setOptionD(item.option_d)
        setCorrectOption(item.correct_option)
        setExpReward(item.exp_reward)
        setActiveMenu(null)
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!newQuestion.trim() || !optionA.trim() || !optionB.trim()) return

        const payload = {
            building: newBuildingId,
            question: newQuestion,
            option_a: optionA,
            option_b: optionB,
            option_c: optionC,
            option_d: optionD,
            correct_option: correctOption,
            exp_reward: expReward
        }

        try {
            if (editingQuestion) {
                const updatedQuiz = await quizService.updateQuiz(editingQuestion.id, payload)
                setQuestions(questions.map((q) => (q.id === editingQuestion.id ? updatedQuiz : q)))
            } else {
                const newQuiz = await quizService.createQuiz(payload)
                setQuestions([newQuiz, ...questions])
            }
            setIsModalOpen(false)
        } catch (error) {
            console.error('Failed to save quiz', error)
        }
    }

    const handleDeleteClick = (id) => {
        setQuestionToDelete(id)
        setActiveMenu(null)
        setIsDeleteModalOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (questionToDelete) {
            try {
                await quizService.deleteQuiz(questionToDelete)
                setQuestions(questions.filter((q) => q.id !== questionToDelete))
                setQuestionToDelete(null)
                setIsDeleteModalOpen(false)
            } catch (error) {
                console.error('Failed to delete quiz', error)
            }
        }
    }

    const filteredQuestions = questions.filter((q) => {
        const matchesSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase())
        const buildingObj = buildingsList.find((b) => b.id.toString() === q.building.toString())
        const buildingName = buildingObj ? buildingObj.name : 'Unknown'
        const matchesBuilding = selectedBuilding === 'All Buildings' || buildingName === selectedBuilding
        return matchesSearch && matchesBuilding
    })

    const uniqueBuildings = ['All Buildings', ...new Set(buildingsList.map((b) => b.name))]

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <HelpCircle className="w-6 h-6 text-brand" />
                        Quiz Management
                    </h1>
                    <p className="text-gray-500 mt-1">Manage interactive trivia questions for buildings.</p>
                </div>
                <Button onClick={handleOpenAddModal} className="flex items-center gap-2">
                    <Plus size={18} />
                    <span>Add Question</span>
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                        />
                    </div>
                    <div className="w-full md:w-64 relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <select
                            value={selectedBuilding}
                            onChange={(e) => setSelectedBuilding(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                        >
                            {uniqueBuildings.map((building) => (
                                <option key={building} value={building}>
                                    {building}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Questions List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredQuestions.map((q) => {
                    const buildingObj = buildingsList.find((b) => b.id.toString() === q.building.toString())
                    const buildingName = buildingObj ? buildingObj.name : 'Unknown Building'

                    return (
                        <Card key={q.id} className="p-5 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <Badge variant="blue" className="mb-2">
                                        {buildingName}
                                    </Badge>
                                    <div className="relative" ref={activeMenu === q.id ? menuRef : null}>
                                        <button
                                            onClick={() => setActiveMenu(activeMenu === q.id ? null : q.id)}
                                            className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                                        >
                                            <MoreVertical size={16} />
                                        </button>

                                        {activeMenu === q.id && (
                                            <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10 animate-in fade-in zoom-in duration-200">
                                                <button
                                                    onClick={() => handleOpenEditModal(q)}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    <Edit3 size={14} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(q.id)}
                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-gray-900 font-semibold mb-4 leading-relaxed">{q.question}</h3>
                                
                                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                                    <div className={`p-2 rounded border ${q.correct_option === 'A' ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>A: {q.option_a}</div>
                                    <div className={`p-2 rounded border ${q.correct_option === 'B' ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>B: {q.option_b}</div>
                                    <div className={`p-2 rounded border ${q.correct_option === 'C' ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>C: {q.option_c}</div>
                                    <div className={`p-2 rounded border ${q.correct_option === 'D' ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>D: {q.option_d}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-brand font-bold text-sm">
                                +{q.exp_reward} EXP
                            </div>
                        </Card>
                    )
                })}

                {filteredQuestions.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                        <HelpCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-lg font-medium text-gray-900">No questions found</p>
                        <p className="text-sm">Try adjusting your filters or add a new question.</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg p-0 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingQuestion ? 'Edit Question' : 'Add New Question'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="p-5 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Building</label>
                                <select
                                    value={newBuildingId}
                                    onChange={(e) => setNewBuildingId(e.target.value)}
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                                >
                                    {buildingsList.map((building) => (
                                        <option key={building.id} value={building.id.toString()}>
                                            {building.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                                <textarea
                                    value={newQuestion}
                                    onChange={(e) => setNewQuestion(e.target.value)}
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                                    rows="2"
                                    placeholder="Enter the quiz question..."
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Option A</label>
                                    <input type="text" value={optionA} onChange={(e) => setOptionA(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Option B</label>
                                    <input type="text" value={optionB} onChange={(e) => setOptionB(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Option C</label>
                                    <input type="text" value={optionC} onChange={(e) => setOptionC(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Option D</label>
                                    <input type="text" value={optionD} onChange={(e) => setOptionD(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg" />
                                </div>
                            </div>
                            
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Option</label>
                                    <select value={correctOption} onChange={(e) => setCorrectOption(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg">
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">EXP Reward</label>
                                    <input type="number" value={expReward} onChange={(e) => setExpReward(Number(e.target.value))} className="w-full p-2 border border-gray-200 rounded-lg" />
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 mt-auto">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={!newQuestion.trim() || !optionA.trim() || !optionB.trim()}
                            >
                                {editingQuestion ? 'Save Changes' : 'Add Question'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false)
                    setQuestionToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Question"
                message="Are you sure you want to delete this question? This action cannot be undone."
            />
        </div>
    )
}
