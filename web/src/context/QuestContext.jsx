import { createContext, useContext, useState } from 'react'

const QuestContext = createContext(null)

const INITIAL_QUESTS = [
	{
		id: 1,
		title: 'CCS Building Explorer',
		location: 'College of Computing Studies',
		type: 'Exploration',
		xp: 150,
		status: 'active',
		completions: 124,
		description: 'Explore the home of tech innovators. Discover labs and faculty offices.',
		lat: 6.9118,
		lng: 122.0634,
		panoramaUrl:
			'https://images.unsplash.com/photo-1592595825381-080537482f3c?auto=format&fit=crop&q=80&w=2070',
		qrCode: 'WMSU-CCS-001',
		trivia: [
			{
				question: 'What does CCS stand for?',
				options: [
					'College of Computer Science',
					'College of Computing Studies',
					'Center for Computer Systems'
				],
				answer: 1
			},
			{
				question: 'When was the CCS building inaugurated?',
				options: ['2005', '2010', '2015'],
				answer: 1
			}
		]
	},
	{
		id: 2,
		title: 'Main Library Quest',
		location: 'WMSU Library',
		type: 'Knowledge',
		xp: 200,
		status: 'active',
		completions: 89,
		description: 'The heart of knowledge. Find rare collections and digital resources.',
		lat: 6.9125,
		lng: 122.0645,
		panoramaUrl:
			'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=2070',
		qrCode: 'WMSU-LIB-001',
		trivia: [
			{
				question: 'How many volumes does the library house?',
				options: ['50k+', '100k+', '200k+'],
				answer: 1
			}
		]
	},
	{
		id: 3,
		title: 'Admin Building Tour',
		location: 'Executive Building',
		type: 'History',
		xp: 300,
		status: 'active',
		completions: 45,
		description: 'Visit the historic administration building and learn about WMSU heritage.',
		lat: 6.911,
		lng: 122.062,
		panoramaUrl:
			'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=2070',
		qrCode: 'WMSU-ADM-001',
		trivia: [
			{
				question: 'Who is the current university president?',
				options: ['Dr. Ma. Carla Ochotorena', 'Dr. Milabel Ho', 'Dr. Eldigario Gonzales'],
				answer: 0
			}
		]
	}
]

export function QuestProvider({ children }) {
	const [quests, setQuests] = useState(INITIAL_QUESTS)

	const addQuest = (quest) => {
		setQuests((prev) => [...prev, { ...quest, id: Date.now(), completions: 0 }])
	}

	const updateQuest = (id, updates) => {
		setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)))
	}

	const deleteQuest = (id) => {
		setQuests((prev) => prev.filter((q) => q.id !== id))
	}

	return (
		<QuestContext.Provider value={{ quests, addQuest, updateQuest, deleteQuest }}>
			{children}
		</QuestContext.Provider>
	)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useQuests() {
	const ctx = useContext(QuestContext)
	if (!ctx) throw new Error('useQuests must be used within QuestProvider')
	return ctx
}
