import { useState, useRef, useEffect } from 'react'
import { Navigation, MapPin, Lock, Unlock, Grid3x3, List, Plus, MoreVertical, Search, Filter, Edit3, Trash2, X } from 'lucide-react'
import { Card, Badge, Toggle, Button, ConfirmDeleteModal } from '../components/ui'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '../utils/leafletConfig'
import { buildingService } from '../services/buildingService'

const parseCoordinate = (coordStr) => {
  if (!coordStr) return 0;
  const match = String(coordStr).match(/([-+]?[0-9]*\.?[0-9]+)/);
  let parsed = match ? parseFloat(match[1]) : 0;
  if (String(coordStr).includes('S') || String(coordStr).includes('W')) {
    parsed = -parsed;
  }
  return parsed;
};

const parseRadius = (radiusStr) => {
  if (!radiusStr) return 50;
  const match = String(radiusStr).match(/([0-9]*\.?[0-9]+)/);
  return match ? parseFloat(match[1]) : 50;
};

export default function Geofences() {
  const [geofences, setGeofences] = useState([])
  const [view, setView] = useState('card')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [geoToDelete, setGeoToDelete] = useState(null)
  const [editingGeo, setEditingGeo] = useState(null)
  const [activeMenu, setActiveMenu] = useState(null)
  const [selectedBuilding, setSelectedBuilding] = useState('All Buildings')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [newName, setNewName] = useState('')
  const [newFullBuilding, setNewFullBuilding] = useState('')
  const [newLat, setNewLat] = useState('')
  const [newLng, setNewLng] = useState('')
  const [newRadius, setNewRadius] = useState('')
  
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
    fetchGeofences()
  }, [])

  const fetchGeofences = async () => {
    try {
      const buildings = await buildingService.getBuildings()
      const formatted = buildings.map(b => ({
        id: b.id,
        name: b.slug || b.code || (b.name ? b.name.substring(0, 4).toUpperCase() : 'BLDG'),
        building: b.name || '',
        fullBuilding: b.description || b.name || '',
        lat: b.latitude ? `${b.latitude}° N` : '0.0000° N',
        lng: b.longitude ? `${b.longitude}° E` : '0.0000° E',
        radius: b.radius ? `${b.radius}m` : '50m',
        active: b.is_active !== undefined ? b.is_active : false
      }))
      setGeofences(formatted)
    } catch (error) {
      console.error("Failed to fetch geofences:", error)
    }
  }

  const handleToggle = async (id) => {
    const geo = geofences.find(g => g.id === id)
    if (!geo) return
    try {
      await buildingService.updateBuilding(id, { is_active: !geo.active })
      setGeofences(prev => prev.map(g => 
        g.id === id ? { ...g, active: !geo.active } : g
      ))
    } catch (error) {
      console.error("Failed to toggle geofence:", error)
    }
  }

  const handleOpenAddModal = () => {
    setEditingGeo(null)
    setNewName('')
    setNewFullBuilding('')
    setNewLat('')
    setNewLng('')
    setNewRadius('50m')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (geo) => {
    setEditingGeo(geo)
    setNewName(geo.name)
    setNewFullBuilding(geo.fullBuilding)
    setNewLat(geo.lat)
    setNewLng(geo.lng)
    setNewRadius(geo.radius)
    setIsModalOpen(true)
    setActiveMenu(null)
  }

  const handleSave = async () => {
    if (!newName.trim()) return
    
    try {
      if (editingGeo) {
        const payload = {
          name: newName.trim(),
          description: newFullBuilding.trim(),
          latitude: parseCoordinate(newLat),
          longitude: parseCoordinate(newLng)
        }
        await buildingService.updateBuilding(editingGeo.id, payload)
        
        setGeofences(prev => prev.map(g => 
          g.id === editingGeo.id ? { 
            ...g, 
            name: newName.trim(), 
            fullBuilding: newFullBuilding.trim(),
            lat: newLat,
            lng: newLng,
            radius: newRadius,
            building: newName.trim()
          } : g
        ))
      } else {
        const payload = {
          name: newName.trim(),
          slug: newName.trim().toLowerCase().replace(/\s+/g, '-'),
          description: newFullBuilding.trim(),
          latitude: parseCoordinate(newLat),
          longitude: parseCoordinate(newLng),
          is_active: false
        }
        const newBuilding = await buildingService.createBuilding(payload)
        
        setGeofences(prev => [...prev, { 
          id: newBuilding.id || Date.now(), 
          name: newName.trim(), 
          fullBuilding: newFullBuilding.trim(),
          lat: newLat || '0.0000° N',
          lng: newLng || '0.0000° E',
          radius: newRadius || '50m',
          building: newName.trim(),
          active: false
        }])
      }
      setIsModalOpen(false)
    } catch (error) {
      console.error("Failed to save geofence:", error)
    }
  }

  const handleDeleteClick = (id) => {
    setGeoToDelete(id)
    setIsDeleteModalOpen(true)
    setActiveMenu(null)
  }

  const handleConfirmDelete = async () => {
    if (geoToDelete) {
      try {
        await buildingService.deleteBuilding(geoToDelete)
        setGeofences(prev => prev.filter(g => g.id !== geoToDelete))
        setGeoToDelete(null)
        setIsDeleteModalOpen(false)
      } catch (error) {
        console.error("Failed to delete geofence:", error)
      }
    }
  }

  const filteredGeofences = geofences.filter(geo => {
    const matchesSearch = geo.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         geo.fullBuilding.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBuilding = selectedBuilding === 'All Buildings' || geo.building === selectedBuilding
    return matchesSearch && matchesBuilding
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Geofence Configuration</h2>
          <p className="text-gray-500 mt-1">View and manage GPS zones for each campus building.</p>
        </div>
        <Button onClick={handleOpenAddModal} variant="primary" className="gap-2 justify-center">
          <Plus size={18} />
          Define Boundary
        </Button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search geofences..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="flex items-center justify-center bg-white border border-brand-border rounded-md p-1 shadow-sm">
            <button
              onClick={() => setView('card')}
              className={`p-2 rounded-lg transition-colors ${view === 'card' ? 'bg-brand-light text-brand' : 'text-gray-400 hover:text-gray-600'}`}
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

      {view === 'card' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Map */}
          <div className="flex flex-col h-[600px] bg-white rounded-lg border border-brand-border overflow-hidden">
            <div className="p-4 border-b border-brand-border flex justify-between items-center z-10 relative bg-white">
              <h3 className="font-bold text-gray-900">Campus Map</h3>
              <Badge variant="brand">Live View</Badge>
            </div>
            <div className="flex-1 relative z-0">
              <MapContainer
                  center={filteredGeofences.length > 0 ? [parseCoordinate(filteredGeofences[0].lat), parseCoordinate(filteredGeofences[0].lng)] : [14.5547, 121.0244]}
                  zoom={17}
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
              >
                  <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  {filteredGeofences.map(geo => {
                    const lat = parseCoordinate(geo.lat);
                    const lng = parseCoordinate(geo.lng);
                    const radius = parseRadius(geo.radius);
                    return (
                      <Circle
                        key={geo.id}
                        center={[lat, lng]}
                        radius={radius}
                        pathOptions={{
                          color: geo.active ? '#10b981' : '#6b7280',
                          fillColor: geo.active ? '#10b981' : '#6b7280',
                          fillOpacity: 0.2
                        }}
                      >
                        <Marker position={[lat, lng]} />
                      </Circle>
                    );
                  })}
              </MapContainer>
            </div>
          </div>

          {/* Right Column: Card List */}
          <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredGeofences.map((geo) => (
              <Card key={geo.id} className="relative overflow-visible group shrink-0">
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${geo.active ? 'bg-brand text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {geo.active ? <Unlock size={16} /> : <Lock size={16} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">{geo.name}</h3>
                          <p className="text-xs text-gray-400">{geo.fullBuilding}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Latitude</p>
                        <p className="text-sm font-mono text-gray-600">{geo.lat}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Longitude</p>
                        <p className="text-sm font-mono text-gray-600">{geo.lng}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Radius</p>
                        <p className="text-sm font-bold text-gray-900">{geo.radius}</p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <Toggle checked={geo.active} label="Enable geofence" onChange={() => handleToggle(geo.id)} />
                      <Badge variant={geo.active ? 'success' : 'gray'}>{geo.active ? 'Active' : 'Locked'}</Badge>
                    </div>
                  </div>
                  <div className="relative z-20" ref={activeMenu === geo.id ? menuRef : null}>
                    <button 
                      onClick={() => setActiveMenu(activeMenu === geo.id ? null : geo.id)}
                      className="p-1 text-gray-400 hover:text-brand transition-colors rounded-lg hover:bg-brand-light"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {activeMenu === geo.id && (
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-md shadow-xl border border-brand-border z-50 py-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <button 
                          onClick={() => handleOpenEditModal(geo)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-brand-light hover:text-brand flex items-center gap-2 font-medium"
                        >
                          <Edit3 size={14} /> Edit Boundary
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(geo.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                        >
                          <Trash2 size={14} /> Delete Boundary
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Background design */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-light/30 rounded-full blur-3xl pointer-events-none" />
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card noPadding className="overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Building</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Coordinates</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Radius</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredGeofences.map((geo) => (
                  <tr key={geo.id} className="hover:bg-brand-light/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center text-brand font-bold text-[10px] shrink-0">
                          {geo.name}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{geo.name}</p>
                          <p className="text-xs text-gray-400">{geo.fullBuilding}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-gray-500">{geo.lat}, {geo.lng}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">{geo.radius}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={geo.active ? 'success' : 'gray'}>{geo.active ? 'Active' : 'Locked'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left" ref={activeMenu === geo.id ? menuRef : null}>
                        <button 
                          onClick={() => setActiveMenu(activeMenu === geo.id ? null : geo.id)}
                          className="p-2 text-gray-400 hover:text-brand transition-colors rounded-lg hover:bg-brand-light"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {activeMenu === geo.id && (
                          <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-md shadow-xl border border-brand-border z-50 py-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <button 
                              onClick={() => handleOpenEditModal(geo)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-brand-light hover:text-brand flex items-center gap-2 font-medium"
                            >
                              <Edit3 size={14} /> Edit Boundary
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(geo.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                            >
                              <Trash2 size={14} /> Delete Boundary
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

      {/* Add/Edit Geofence Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{editingGeo ? 'Edit Boundary' : 'Define Boundary'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-brand-light rounded-lg text-gray-400 hover:text-brand transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Building Code</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. CCS" 
                    className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Radius</label>
                  <input 
                    type="text" 
                    value={newRadius}
                    onChange={(e) => setNewRadius(e.target.value)}
                    placeholder="e.g. 50m" 
                    className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Full Building Name</label>
                <input 
                  type="text" 
                  value={newFullBuilding}
                  onChange={(e) => setNewFullBuilding(e.target.value)}
                  placeholder="e.g. College of Computer Studies" 
                  className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Latitude</label>
                  <input 
                    type="text" 
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    placeholder="14.5547° N" 
                    className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Longitude</label>
                  <input 
                    type="text" 
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    placeholder="121.0244° E" 
                    className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-brand-border flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="gap-2">
                {editingGeo ? <Edit3 size={16} /> : <Plus size={16} />}
                {editingGeo ? 'Save Changes' : 'Define Boundary'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Geofence"
        message="Are you sure you want to move this geofence to trash? Students will no longer be able to trigger events in this area."
      />
    </div>
  )
}
