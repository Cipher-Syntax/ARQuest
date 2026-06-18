import { createContext, useContext, useState } from 'react'

const StudentContext = createContext(null)

const INITIAL_STUDENTS = [
  {
    id: 1,
    name: 'Maria Santos',
    studentId: '2021-00123',
    email: 'maria@wmsu.edu.ph',
    level: 12,
    xp: 3400,
    badges: 8,
    quests: 15,
    status: 'active',
    joinedAt: '2024-08-15'
  },
  {
    id: 2,
    name: 'Juan dela Cruz',
    studentId: '2021-00456',
    email: 'juan@wmsu.edu.ph',
    level: 9,
    xp: 2200,
    badges: 5,
    quests: 10,
    status: 'active',
    joinedAt: '2024-08-20'
  },
  {
    id: 3,
    name: 'Ana Reyes',
    studentId: '2022-00789',
    email: 'ana@wmsu.edu.ph',
    level: 15,
    xp: 4800,
    badges: 12,
    quests: 22,
    status: 'active',
    joinedAt: '2024-08-10'
  },
  {
    id: 4,
    name: 'Carlo Mendoza',
    studentId: '2022-01001',
    email: 'carlo@wmsu.edu.ph',
    level: 7,
    xp: 1600,
    badges: 3,
    quests: 7,
    status: 'active',
    joinedAt: '2024-09-01'
  },
  {
    id: 5,
    name: 'Lea Gomez',
    studentId: '2023-00234',
    email: 'lea@wmsu.edu.ph',
    level: 4,
    xp: 800,
    badges: 2,
    quests: 4,
    status: 'inactive',
    joinedAt: '2024-09-05'
  },
  {
    id: 6,
    name: 'Rex Villanueva',
    studentId: '2023-00567',
    email: 'rex@wmsu.edu.ph',
    level: 11,
    xp: 2900,
    badges: 7,
    quests: 13,
    status: 'active',
    joinedAt: '2024-08-22'
  },
  {
    id: 7,
    name: 'Sofia Lim',
    studentId: '2021-00890',
    email: 'sofia@wmsu.edu.ph',
    level: 18,
    xp: 6200,
    badges: 16,
    quests: 30,
    status: 'active',
    joinedAt: '2024-08-08'
  },
  {
    id: 8,
    name: 'Mark Bautista',
    studentId: '2022-00112',
    email: 'mark@wmsu.edu.ph',
    level: 6,
    xp: 1300,
    badges: 2,
    quests: 6,
    status: 'suspended',
    joinedAt: '2024-09-10'
  }
]

export function StudentProvider({ children }) {
  const [students, setStudents] = useState(INITIAL_STUDENTS)

  const updateStudent = (id, updates) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const deleteStudent = (id) => {
    setStudents((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <StudentContext.Provider value={{ students, updateStudent, deleteStudent }}>
      {children}
    </StudentContext.Provider>
  )
}

export function useStudents() {
  const ctx = useContext(StudentContext)
  if (!ctx) throw new Error('useStudents must be used within StudentProvider')
  return ctx
}
