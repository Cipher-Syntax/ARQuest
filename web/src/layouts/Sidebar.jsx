import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, Building2, Users, FileVideo, Map, 
  HelpCircle, Settings, LogOut, Menu, X, Target, MonitorPlay,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/buildings', icon: Building2, label: 'Buildings' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/geofences', icon: Map, label: 'Geofences' },
  { to: '/trivia', icon: HelpCircle, label: 'Trivia' },
  { to: '/cms', icon: MonitorPlay, label: 'CMS' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function SidebarContent({ onLogout, onMobileClose, isCollapsed, setIsCollapsed }) {
  return (
    <div className="flex flex-col h-full bg-brand">
      
      {/* Logo / Brand - white header */}
      <div className={`px-6 py-6 flex items-center bg-white transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 p-1 shadow-sm border border-gray-100">
            <img src="/logo.png" alt="ARQuest Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in duration-500">
              <p className="font-bold text-gray-900 text-base tracking-tight leading-tight">ARQuest</p>
              <p className="text-[10px] uppercase tracking-widest text-brand font-semibold leading-none mt-0.5">Admin Panel</p>
            </div>
          )}
        </div>
        
        {/* Toggle Button - always at the right side of the header area when expanded, or center when collapsed */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`text-gray-400 hover:text-brand hover:bg-brand-light rounded-lg transition-all lg:block hidden ${isCollapsed ? 'p-1 mt-2' : 'p-1.5'}`}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto mt-4">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onMobileClose}
            title={isCollapsed ? label : ''}
            className={({ isActive }) =>
              `relative flex items-center rounded-lg text-sm font-medium transition-all duration-200
              ${isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-2.5 gap-3'}
              ${isActive
                ? 'bg-white text-brand'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {!isCollapsed && <span className="animate-in fade-in duration-300">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Logout - white footer */}
      <div className={`px-3 py-4 bg-white transition-all duration-300 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : ''}
          className={`flex items-center text-sm font-medium text-brand hover:bg-brand-light rounded-lg transition-all duration-200
            ${isCollapsed ? 'p-2' : 'w-full px-4 py-2.5 gap-3'}`}
        >
          <LogOut size={18} className="shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-4 z-40 p-2 bg-white rounded-lg border border-brand-border shadow-sm text-brand active:scale-95 transition-all"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full shadow-2xl border-r-4 border-r-brand">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-white/10 rounded-lg transition-colors z-10"
            >
              <X size={20} />
            </button>
            <SidebarContent 
              onLogout={handleLogout} 
              onMobileClose={() => setMobileOpen(false)} 
              isCollapsed={false}
              setIsCollapsed={() => {}}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-brand h-screen sticky top-0 flex-shrink-0 border-r-4 border-r-brand transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <SidebarContent 
          onLogout={handleLogout} 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
        />
      </aside>
    </>
  )
}
