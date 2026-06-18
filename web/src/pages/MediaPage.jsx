import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid3x3, List, Upload, Box, Image as ImageIcon, MoreVertical, Trash2, Edit3, Download, Search, Filter, X } from 'lucide-react'
import { Card, Badge, Button, Input, Modal, ConfirmDeleteModal } from '../components/ui'
import { useCategories } from '../context/CategoryContext'

const INITIAL_ASSETS = [
  { id: 1, name: 'ccs_building_v2.glb', type: '3D Model', building: 'CCS', size: '14.2 MB', status: 'ready', icon: Box },
  { id: 2, name: 'library_model.glb', type: '3D Model', building: 'Library', size: '8.5 MB', status: 'ready', icon: Box },
  { id: 3, name: 'ccs_entrance_360.jpg', type: '360° Panorama', building: 'CCS', size: '6.1 MB', status: 'ready', icon: ImageIcon },
  { id: 4, name: 'ccs_lab_360.jpg', type: '360° Panorama', building: 'CCS', size: '5.3 MB', status: 'ready', icon: ImageIcon },
  { id: 5, name: 'library_hall_360.jpg', type: '360° Panorama', building: 'Library', size: '7.2 MB', status: 'ready', icon: ImageIcon },
]

export default function Media() {
  const navigate = useNavigate()
  const { categories } = useCategories()
  const [assets, setAssets] = useState(INITIAL_ASSETS)
  const [view, setView] = useState('grid')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState(null)
  const [editingAsset, setEditingAsset] = useState(null)
  const [activeMenu, setActiveMenu] = useState(null)
  const [selectedBuilding, setSelectedBuilding] = useState('All Buildings')
  const [searchTerm, setSearchTerm] = useState('')
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('3D Model')
  const [newCategory, setNewCategory] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)
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

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      if (!newName) {
        setNewName(file.name)
      }
    }
  }

  const handleOpenAddModal = () => {
    setEditingAsset(null)
    setNewName('')
    setNewType('3D Model')
    setNewCategory(categories[0]?.name || '')
    setSelectedFile(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (asset) => {
    setEditingAsset(asset)
    setNewName(asset.name)
    setNewType(asset.type)
    setNewCategory(asset.building)
    setSelectedFile(null)
    setIsModalOpen(true)
    setActiveMenu(null)
  }

  const handleSave = () => {
    if (!newName.trim()) return
    
    if (editingAsset) {
      setAssets(prev => prev.map(a => 
        a.id === editingAsset.id ? { 
          ...a, 
          name: newName.trim(), 
          type: newType, 
          building: newCategory,
          icon: newType === '3D Model' ? Box : ImageIcon
        } : a
      ))
    } else {
      setAssets(prev => [...prev, { 
        id: Date.now(), 
        name: newName.trim(), 
        type: newType, 
        building: newCategory, 
        size: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '0.0 MB', 
        status: 'ready',
        icon: newType === '3D Model' ? Box : ImageIcon
      }])
    }
    setIsModalOpen(false)
  }

  const handleDeleteClick = (id) => {
    setAssetToDelete(id)
    setIsDeleteModalOpen(true)
    setActiveMenu(null)
  }

  const handleConfirmDelete = () => {
    if (assetToDelete) {
      setAssets(prev => prev.filter(a => a.id !== assetToDelete))
      setAssetToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBuilding = selectedBuilding === 'All Buildings' || asset.building === selectedBuilding
    return matchesSearch && matchesBuilding
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content & Media</h2>
          <p className="text-gray-500 mt-1">Upload and manage 3D models and 360° panoramic images.</p>
        </div>
        <Button onClick={handleOpenAddModal} className="gap-2 justify-center">
          <Upload size={18} />
          Upload Asset
        </Button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search assets..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1">
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 appearance-none font-bold text-gray-700 shadow-sm cursor-pointer"
            >
              <option value="All Buildings">All Categories</option>
              {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-brand pointer-events-none" size={16} />
          </div>
          <div className="flex items-center justify-center bg-white border border-brand-border rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-brand-light text-brand' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-brand-light text-brand' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => (
            <Card 
              key={asset.id} 
              className={`group overflow-visible ${asset.type === '360° Panorama' ? 'cursor-pointer' : ''}`}
              onClick={() => asset.type === '360° Panorama' && navigate(`/panoramas/${asset.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-brand-light rounded-xl text-brand">
                  <asset.icon size={22} />
                </div>
                <div className="relative" ref={activeMenu === asset.id ? menuRef : null}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveMenu(activeMenu === asset.id ? null : asset.id)
                    }}
                    className="p-2 text-gray-400 hover:text-brand transition-colors rounded-lg hover:bg-brand-light"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {activeMenu === asset.id && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-brand-border z-50 py-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEditModal(asset)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-brand-light hover:text-brand flex items-center gap-2 font-medium"
                      >
                        <Edit3 size={14} /> Edit Asset
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(asset.id)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                      >
                        <Trash2 size={14} /> Delete Asset
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="font-bold text-gray-900 text-sm truncate">{asset.name}</p>
              <p className="text-xs text-gray-400 font-medium mt-0.5">{asset.size}</p>
              <div className="flex items-center justify-between mt-4">
                <Badge variant="brand">{asset.building}</Badge>
                <Badge variant="success">{asset.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card noPadding className="overflow-visible">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Asset</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Building</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredAssets.map((asset) => (
                  <tr 
                    key={asset.id} 
                    className={`hover:bg-brand-light/30 transition-colors group ${asset.type === '360° Panorama' ? 'cursor-pointer' : ''}`}
                    onClick={() => asset.type === '360° Panorama' && navigate(`/panoramas/${asset.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center text-brand shrink-0">
                          <asset.icon size={16} />
                        </div>
                        <p className="font-bold text-gray-900 text-sm">{asset.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 font-medium">{asset.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="brand">{asset.building}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 font-medium">{asset.size}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="success">{asset.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left" ref={activeMenu === asset.id ? menuRef : null}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenu(activeMenu === asset.id ? null : asset.id)
                          }}
                          className="p-2 text-gray-400 hover:text-brand transition-colors rounded-lg hover:bg-brand-light"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {activeMenu === asset.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-brand-border z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(asset.id)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                            >
                              <Trash2 size={14} /> Delete Asset
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Upload/Edit Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{editingAsset ? 'Edit Asset' : 'Upload Asset'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-brand-light rounded-lg text-gray-400 hover:text-brand transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <Input 
                label="Asset Name" 
                placeholder="e.g. ccs_entrance_v1.glb" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Building</label>
                <select 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full border border-brand-border rounded-xl bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold"
                >
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Asset Type</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setNewType('3D Model')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${newType === '3D Model' ? 'bg-brand text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-brand-light'}`}
                  >
                    3D Model
                  </button>
                  <button 
                    onClick={() => setNewType('360° Panorama')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${newType === '360° Panorama' ? 'bg-brand text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-brand-light'}`}
                  >
                    360° Panorama
                  </button>
                </div>
              </div>

              {!editingAsset && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-brand-border rounded-2xl p-8 flex flex-col items-center justify-center gap-2 bg-brand-light/20 hover:bg-brand-light/40 transition-colors cursor-pointer group"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept={newType === '3D Model' ? '.glb,.gltf' : 'image/*'}
                  />
                  <Upload size={24} className={selectedFile ? 'text-brand' : 'text-gray-400 group-hover:text-brand transition-colors'} />
                  <p className="text-xs font-bold text-gray-500 text-center">
                    {selectedFile ? (
                      <span className="text-brand">Selected: {selectedFile.name}</span>
                    ) : (
                      'Click to upload file'
                    )}
                  </p>
                  {selectedFile && (
                    <p className="text-[10px] text-gray-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-brand-border flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="gap-2">
                {editingAsset ? <Edit3 size={16} /> : <Upload size={16} />}
                {editingAsset ? 'Save Changes' : 'Upload Asset'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Asset"
        message="Are you sure you want to move this asset to trash? This will remove the file from the database permanently."
      />
    </div>
  )
}
