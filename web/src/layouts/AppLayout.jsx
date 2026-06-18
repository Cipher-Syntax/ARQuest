import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useAuth } from '../hooks/useAuth'
import { LayoutDashboard, Building2, Map, Lightbulb, Users } from 'lucide-react'

export default function AppLayout() {
  const { user } = useAuth()
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Building2, label: 'Buildings', path: '/buildings' },
    { icon: Map, label: 'Geofences', path: '/geofences' },
    { icon: Lightbulb, label: 'Trivia Quiz', path: '/trivia' },
    { icon: Users, label: 'Users', path: '/users' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-brand-light">
      <Sidebar navItems={navItems} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
