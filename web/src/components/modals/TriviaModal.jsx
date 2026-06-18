import { Plus, Edit3 } from 'lucide-react'
import { Button, Modal } from '../ui'

export default function TriviaModal({
  isOpen,
  onClose,
  onSave,
  editingFact,
  newBuilding,
  setNewBuilding,
  newFact,
  setNewFact,
  categories
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingFact ? 'Edit Trivia Fact' : 'Add Trivia Fact'}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} className="gap-2">
            {editingFact ? <Edit3 size={16} /> : <Plus size={16} />}
            {editingFact ? 'Update Fact' : 'Add Fact'}
          </Button>
        </>
      )}
    >
      <div className="space-y-5">
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
    </Modal>
  )
}
