import { Plus, Edit3 } from 'lucide-react'
import { Button, Modal } from '../ui'

export default function GeofenceModal({
  isOpen,
  onClose,
  onSave,
  editingGeo,
  newName,
  setNewName,
  newRadius,
  setNewRadius,
  newFullBuilding,
  setNewFullBuilding,
  newLat,
  setNewLat,
  newLng,
  setNewLng
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingGeo ? 'Edit Boundary' : 'Define Boundary'}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} className="gap-2">
            {editingGeo ? <Edit3 size={16} /> : <Plus size={16} />}
            {editingGeo ? 'Save Changes' : 'Define Boundary'}
          </Button>
        </>
      )}
    >
      <div className="space-y-5">
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
    </Modal>
  )
}
