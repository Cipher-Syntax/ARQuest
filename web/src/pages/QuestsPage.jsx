import { useState } from 'react';
import { Plus, Target, Search, Filter } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';

export default function QuestsPage({ hideHeader }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Placeholder data for now
  const quests = [
    { id: 1, title: 'Freshman Campus Tour', type: 'Scavenger Hunt', status: 'Active', reward: '100 XP' },
    { id: 2, title: 'Find the Library Secret', type: 'AR Puzzle', status: 'Draft', reward: '50 XP' },
  ];

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quests</h2>
            <p className="text-gray-500 mt-1">Manage interactive quests and AR missions.</p>
          </div>
          <Button className="gap-2 justify-center">
            <Plus size={18} />
            Create Quest
          </Button>
        </div>
      )}
      {hideHeader && (
        <div className="flex justify-end">
          <Button className="gap-2 justify-center">
            <Plus size={18} />
            Create Quest
          </Button>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search quests..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-brand-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {quests.map(quest => (
          <Card key={quest.id} className="group hover:border-brand transition-colors cursor-pointer flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-md bg-brand-light flex items-center justify-center text-brand shrink-0">
                <Target size={20} />
              </div>
              <Badge variant={quest.status === 'Active' ? 'success' : 'gray'}>
                {quest.status}
              </Badge>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{quest.title}</h3>
            <p className="text-xs font-semibold text-gray-500 mb-4">{quest.type}</p>
            
            <div className="mt-auto pt-4 border-t border-brand-border flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">Reward: <span className="text-brand">{quest.reward}</span></span>
              <Button variant="ghost" size="xs">Edit</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
