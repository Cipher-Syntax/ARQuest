import { createContext, useContext, useState, useEffect } from 'react'

const CategoryContext = createContext(null)

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'CCS', description: 'College of Computing Studies' },
  { id: 2, name: 'Library', description: 'University Main Library' },
  { id: 3, name: 'ADMIN', description: 'Administration Building' },
  { id: 4, name: 'SEH', description: 'Science & Engineering Hall' },
]

export function CategoryProvider({ children }) {
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('arquest_categories')
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES
  })

  useEffect(() => {
    localStorage.setItem('arquest_categories', JSON.stringify(categories))
  }, [categories])

  const addCategory = (category) => {
    setCategories(prev => [...prev, { ...category, id: Date.now() }])
  }

  const updateCategory = (id, newName) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c))
  }

  const deleteCategory = (id) => {
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  return (
    <CategoryContext.Provider value={{ categories, addCategory, updateCategory, deleteCategory }}>
      {children}
    </CategoryContext.Provider>
  )
}

export function useCategories() {
  const ctx = useContext(CategoryContext)
  if (!ctx) throw new Error('useCategories must be used within CategoryProvider')
  return ctx
}
