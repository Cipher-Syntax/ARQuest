import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { Card, Badge } from '../components/ui'

const USERS = [
  { id: 1, name: 'Maria Santos', email: 'maria.santos@email.com', role: 'Student', status: 'active' },
  { id: 2, name: 'Juan Dela Cruz', email: 'juan.dc@email.com', role: 'Admin', status: 'active' },
  { id: 3, name: 'Elena Reyes', email: 'elena.r@email.com', role: 'Accreditor', status: 'inactive' },
]

export default function Users() {
  const [users] = useState(USERS)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <p className="text-gray-500 mt-1">Manage platform access for students, admins, and accreditors.</p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative w-full md:w-48">
          <select 
            className="w-full pl-4 pr-10 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 appearance-none font-bold text-gray-700 shadow-sm cursor-pointer"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option>All Roles</option>
            <option>Student</option>
            <option>Admin</option>
            <option>Accreditor</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-brand pointer-events-none" size={16} />
        </div>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-brand-border">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-brand-light/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-light border border-brand-border flex items-center justify-center text-brand font-bold text-xs shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 font-medium">{user.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.role === 'Admin' ? 'brand' : user.role === 'Accreditor' ? 'warning' : 'gray'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                      <span className={`text-sm font-medium ${user.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
