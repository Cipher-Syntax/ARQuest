import { useState, useEffect } from 'react'
import { Card, Badge } from '../components/ui'
import { Trophy, Medal, Search } from 'lucide-react'
import { userService } from '../services/userService'

export default function LeaderboardPage({ hideHeader }) {
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await userService.getLeaderboard()
        setUsers(data)
      } catch (error) {
        console.error('Failed to load leaderboard', error)
      }
    }
    fetchLeaderboard()
  }, [])

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase()
    return (
      (user.first_name && user.first_name.toLowerCase().includes(term)) ||
      (user.last_name && user.last_name.toLowerCase().includes(term)) ||
      (user.username && user.username.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leaderboard</h2>
          <p className="text-gray-500 mt-1">
            Student rankings based on exploration points from quests.
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center gap-4 mt-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search students..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-brand-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-brand-border">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-20 text-center">
                  Rank
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredUsers.map((user, index) => (
                <tr key={user.id} className="hover:bg-brand-light/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      {index === 0 ? (
                        <Trophy className="text-yellow-500" size={24} />
                      ) : index === 1 ? (
                        <Medal className="text-gray-400" size={24} />
                      ) : index === 2 ? (
                        <Medal className="text-amber-600" size={24} />
                      ) : (
                        <span className="font-bold text-gray-500 text-lg">#{index + 1}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-light border border-brand-border flex items-center justify-center text-brand font-bold text-xs shrink-0">
                        {user.first_name
                          ? user.first_name.charAt(0).toUpperCase()
                          : user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">
                          {user.first_name || user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.username}
                        </p>
                        <p className="text-xs text-gray-500">Student</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Badge variant="brand" className="text-sm px-3 py-1">
                      {user.exploration_points} XP
                    </Badge>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan="3"
                    className="px-6 py-8 text-center text-gray-500 text-sm font-medium"
                  >
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
