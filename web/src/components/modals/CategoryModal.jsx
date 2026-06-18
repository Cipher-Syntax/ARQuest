import { Plus, Edit3, Trash2 } from 'lucide-react'
import { Button, Input, Modal } from '../ui'

export default function CategoryModal({
  isOpen,
  onClose,
  categories,
  newCat,
  setNewCat,
  handleAddCategory,
  editingCatId,
  setEditingCatId,
  editCatValue,
  setEditCatValue,
  handleUpdateCategory,
  handleDeleteCategory
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Categories"
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div className="space-y-6">
        <div className="flex gap-2">
          <Input 
            placeholder="New Category (e.g. CCS)" 
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
          />
          <Button onClick={handleAddCategory} className="shrink-0"><Plus size={18} /></Button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-3 bg-brand-light/20 rounded-xl border border-brand-border/50 group transition-all">
              {editingCatId === cat.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    autoFocus
                    value={editCatValue}
                    onChange={(e) => setEditCatValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(cat.id, cat.name)}
                    className="flex-1 bg-white border border-brand px-2 py-1 rounded text-sm font-bold focus:outline-none"
                  />
                  <button onClick={() => handleUpdateCategory(cat.id, cat.name)} className="text-green-600 font-bold text-xs uppercase text-[10px]">Save</button>
                  <button onClick={() => setEditingCatId(null)} className="text-gray-400 font-bold text-xs uppercase text-[10px]">Cancel</button>
                </div>
              ) : (
                <>
                  <span className="font-bold text-gray-700 text-sm">{cat.name}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => { setEditingCatId(cat.id); setEditCatValue(cat.name); }}
                      className="p-1.5 text-gray-400 hover:text-brand transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
