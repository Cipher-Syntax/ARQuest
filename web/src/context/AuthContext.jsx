import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

const MOCK_USERS = [
  { id: 1, email: 'admin@wmsu.edu.ph', password: 'admin123', name: 'System Admin', role: 'admin', avatar: null },
  { id: 2, email: 'accreditor@wmsu.edu.ph', password: 'accreditor123', name: 'Prof. Rivera', role: 'professional', avatar: null },
  { id: 3, email: 'student@wmsu.edu.ph', password: 'student123', name: 'Juan Dela Cruz', role: 'student', avatar: null },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('arquest_user')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    }
    return null
  })

  const login = async (email, password) => {

   
    await new Promise(r => setTimeout(r, 800))
    const found = MOCK_USERS.find(a => a.email === email && a.password === password)
    
    let safe;
    if (found) {
     
      const { password: _, ...data } = found
      safe = data
    } else {
    
      safe = { 
        id: Date.now(), 
        email: email || 'admin@arquest.edu', 
        name: 'System Admin', 
        role: 'admin', 
        avatar: null 
      }
    }

    setUser(safe)
    localStorage.setItem('arquest_user', JSON.stringify(safe))
    return safe
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('arquest_user')
  }

  const loading = false

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}