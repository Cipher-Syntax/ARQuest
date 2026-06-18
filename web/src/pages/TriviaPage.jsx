import { useState, useRef, useEffect } from 'react'
import { Plus, X, Search, Filter, MoreVertical, Edit3, Trash2, Lightbulb } from 'lucide-react'
import { Card, Badge, Button, Input, ConfirmDeleteModal } from '../components/ui'
import { useCategories } from '../context/CategoryContext'

const INITIAL_FACTS = [
  { id: 1, building: 'CCS', fact: 'The CCS building was established in 2000, making it one of the newer academic facilities on campus.' },
  { id: 2, building: 'CCS', fact: 'It houses 10 fully-equipped computer laboratories with high-performance workstations and dual-monitor setups.' },
  { id: 3, building: 'CCS', fact: 'The department offers programs in Computer Science, IT, and Information Systems — accredited by CHED.' },
]

export default function Trivia() {
  const { categories } = useCategories()
  const [facts, setFacts] = useState(INITIAL_FACTS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [factToDelete, setFactToDelete] = useState(null)
  const [editingFact, setEditingFact] = useState(null)
  const [activeMenu, setActiveMenu] = useState(null)
  const [newBuilding, setNewBuilding] = useState('CCS')
  const [newFact, setNewFact] = useState('')
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

  const handleOpenAddModal = () => {
    setEditingFact(null)
    setNewFact('')
    setNewBuilding(categories[0]?.name || 'CCS')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (item) => {
    setEditingFact(item)
    setNewFact(item.fact)
    setNewBuilding(item.building)
    setIsModalOpen(true)
    setActiveMenu(null)
  }

  const handleSave = () => {
    if (!newFact.trim()) return
    
    if (editingFact) {
      setFacts(prev => prev.map(f => 
        f.id === editingFact.id ? { ...f, building: newBuilding, fact: newFact.trim() } : f
      ))
    } else {
      setFacts(prev => [...prev, { id: Date.now(), building: newBuilding, fact: newFact.trim() }])
    }
    
    setNewFact('')
    setIsModalOpen(false)
  }

  const handleDeleteClick = (id) => {
    setFactToDelete(id)
    setIsDeleteModalOpen(true)
    setActiveMenu(null)
  }

  const handleConfirmDelete = () => {
    if (factToDelete) {
      setFacts(prev => prev.filter(f => f.id !== factToDelete))
      setFactToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const filteredFacts = facts.filter(item => {
    const matchesSearch = item.fact.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBuilding = selectedBuilding === 'All Buildings' || item.building === selectedBuilding
    return matchesSearch && matchesBuilding
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trivia</h2>
          <p className="text-gray-500 mt-1">Manage building-based trivia facts for students.</p>
        </div>
        <Button onClick={handleOpenAddModal} className="gap-2 justify-center">
          <Plus size={18} />
          Add Fact
        </Button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search trivia..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative w-full md:w-48">
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="w-full pl-4 pr-10 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 appearance-none font-bold text-gray-700 shadow-sm cursor-pointer"
          >
            <option value="All Buildings">All Categories</option>
            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-brand pointer-events-none" size={16} />
        </div>
      </div>

      <div className="space-y-3">
        {filteredFacts.map((item) => (
          <Card key={item.id} className="p-0 overflow-visible">
            <div className="flex items-start p-5 gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand shrink-0">
                <Lightbulb size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="brand" className="text-[9px] px-1.5">{item.building}</Badge>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed font-medium">{item.fact}</p>
              </div>
              
              <div className="relative shrink-0" ref={activeMenu === item.id ? menuRef : null}>
                <button 
                  onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                  className="p-2 text-gray-400 hover:text-brand transition-colors rounded-lg hover:bg-brand-light"
                >
                  <MoreVertical size={18} />
                </button>
                
                {activeMenu === item.id && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-brand-border z-50 py-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <button 
                      onClick={() => handleOpenEditModal(item)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-brand-light hover:text-brand flex items-center gap-2 font-medium"
                    >
                      <Edit3 size={14} /> Edit Fact
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(item.id)}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                    >
                      <Trash2 size={14} /> Delete Fact
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Fact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{editingFact ? 'Edit Trivia Fact' : 'Add Trivia Fact'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-brand-light rounded-lg text-gray-400 hover:text-brand transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Building</label>
                <select
                  value={newBuilding}
                  onChange={(e) => setNewBuilding(e.target.value)}
                  className="w-full border border-brand-border rounded-xl bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold"
                >
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Trivia Fact</label>
                <textarea
                  value={newFact}
                  onChange={(e) => setNewFact(e.target.value)}
                  rows={4}
                  placeholder="Enter an interesting fact about this building..."
                  className="w-full border border-brand-border rounded-xl bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none placeholder-gray-400 font-medium"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-brand-border flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="gap-2">
                {editingFact ? <Edit3 size={16} /> : <Plus size={16} />}
                {editingFact ? 'Update Fact' : 'Add Fact'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Trivia Fact"
        message="Are you sure you want to move this trivia fact to trash?"
      />
    </div>
  )
}
