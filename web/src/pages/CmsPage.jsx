import React, { useState } from 'react'
import TriviaPage from './TriviaPage'
import QuestsPage from './QuestsPage'
import { FileText, HelpCircle } from 'lucide-react'

export default function CmsPage() {
  const [activeTab, setActiveTab] = useState('quests')

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quests & Trivias</h2>
          <p className="text-gray-500 mt-1">
            Manage interactive content, learning challenges, and building trivia.
          </p>
        </div>
      </div>

      <div className="flex border-b border-brand-border">
        <button
          onClick={() => setActiveTab('quests')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors relative ${activeTab === 'quests' ? 'text-brand' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <FileText size={18} />
          Manage Quests
          {activeTab === 'quests' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('trivias')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors relative ${activeTab === 'trivias' ? 'text-brand' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <HelpCircle size={18} />
          Manage Trivias
          {activeTab === 'trivias' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand rounded-t-full" />
          )}
        </button>
      </div>

      <div className="pt-2">
        {activeTab === 'quests' && <QuestsPage hideHeader={true} />}
        {activeTab === 'trivias' && <TriviaPage hideHeader={true} />}
      </div>
    </div>
  )
}
