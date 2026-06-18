import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard,
  Building2,
  Users,
  FileVideo,
  Map,
  HelpCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Target,
  MonitorPlay,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/buildings', icon: Building2, label: 'Buildings' },
  { to: '/users', icon: Users, label: 'Users & Leaderboard' },
  { to: '/media', icon: FileVideo, label: 'Content & Media' },
  { to: '/geofences', icon: Map, label: 'Geofences' },
  { to: '/cms', icon: MonitorPlay, label: 'Quests & Trivias' },
  { to: '/settings', icon: Settings, label: 'Settings' }
]

function SidebarContent({ onLogout, onMobileClose, isCollapsed, setIsCollapsed }) {
  return (
    <div className="flex flex-col h-full bg-brand relative transition-all duration-300">
      {/* Logo / Brand */}
      <div
        className={`px-5 py-6 flex items-center transition-all duration-300 border-b border-white/10 ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white text-brand rounded-md flex items-center justify-center shrink-0 p-2 shadow-sm">
            <img src="/logo.png" alt="ARQuest" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in duration-500">
              <p className="font-extrabold text-white text-lg tracking-tight leading-none">
                ARQuest
              </p>
              <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold leading-none mt-1">
                Admin Panel
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button for Desktop */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-8 bg-white border border-gray-200 text-brand hover:bg-brand-light rounded-md p-1.5 shadow-md transition-all lg:flex hidden items-center justify-center z-50 group"
      >
        {isCollapsed ? (
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        ) : (
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto scrollbar-none">
        <p
          className={`text-[10px] font-bold text-white/50 uppercase tracking-wider mb-4 px-3 transition-opacity ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}
        >
          Menu
        </p>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onMobileClose}
            title={isCollapsed ? label : ''}
            className={({ isActive }) =>
              `relative flex items-center rounded-md text-sm font-semibold transition-all duration-200 group
              ${isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3 gap-3'}
              ${
                isActive
                  ? 'bg-white/20 text-white shadow-inner shadow-black/10'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}
                />
                {!isCollapsed && <span className="animate-in fade-in duration-300">{label}</span>}
                {isActive && !isCollapsed && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div
        className={`p-4 border-t border-white/10 transition-all duration-300 ${isCollapsed ? 'flex justify-center' : ''}`}
      >
        <button
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : ''}
          className={`flex items-center text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white rounded-md transition-all duration-200 group
            ${isCollapsed ? 'p-3' : 'w-full px-4 py-3 gap-3'}`}
        >
          <LogOut size={18} className="shrink-0 transition-colors" />
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
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
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
      <aside
        className={`hidden lg:flex flex-col bg-brand h-screen sticky top-0 flex-shrink-0 border-r-4 border-r-brand transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        <SidebarContent
          onLogout={handleLogout}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      </aside>
    </>
  )
}
