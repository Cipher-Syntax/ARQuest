import { useState, useEffect } from 'react'
import { Search, Filter } from 'lucide-react'
import { Card, Badge } from '../components/ui'
import { userService } from '../services/userService'

export default function UserManagement({ hideHeader }) {
	const [users, setUsers] = useState([])
	const [searchTerm, setSearchTerm] = useState('')
	const [roleFilter, setRoleFilter] = useState('All Roles')

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				const data = await userService.getUsers()
				setUsers(data)
			} catch (error) {
				console.error('Failed to load users', error)
			}
		}
		fetchUsers()
	}, [])

	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			(user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
			(user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
			(user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
			user.email.toLowerCase().includes(searchTerm.toLowerCase())

		// Normalize role string for comparison (e.g., 'Student' vs 'student')
		const userRoleStr = user.role.charAt(0).toUpperCase() + user.role.slice(1)
		const matchesRole = roleFilter === 'All Roles' || userRoleStr === roleFilter
		return matchesSearch && matchesRole
	})

	return (
		<div className="space-y-6">
			{!hideHeader && (
				<div>
					<h2 className="text-2xl font-bold text-gray-900">User Management</h2>
					<p className="text-gray-500 mt-1">
						Manage platform access for students, admins, and accreditors.
					</p>
				</div>
			)}

			<div className="flex flex-col md:flex-row items-center gap-4 mt-4">
				<div className="relative flex-1 w-full">
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
						size={18}
					/>
					<input
						type="text"
						placeholder="Search by name or email..."
						className="w-full pl-10 pr-4 py-3 bg-white border border-brand-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
				<div className="relative w-full md:w-48">
					<select
						className="w-full pl-4 pr-10 py-3 bg-white border border-brand-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 appearance-none font-bold text-gray-700 shadow-sm cursor-pointer"
						value={roleFilter}
						onChange={(e) => setRoleFilter(e.target.value)}
					>
						<option>All Roles</option>
						<option>Student</option>
						<option>Admin</option>
						<option>Professional</option>
						<option>Visitor</option>
					</select>
					<Filter
						className="absolute right-3 top-1/2 -translate-y-1/2 text-brand pointer-events-none"
						size={16}
					/>
				</div>
			</div>

			<Card noPadding>
				<div className="overflow-x-auto scrollbar-thin">
					<table className="w-full text-left min-w-[700px]">
						<thead>
							<tr className="bg-gray-50/50 border-b border-brand-border">
								<th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
									User
								</th>
								<th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
									Email
								</th>
								<th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
									Role
								</th>
								<th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">
									Status
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-brand-border">
							{filteredUsers.map((user) => (
								<tr
									key={user.id}
									className="hover:bg-brand-light/30 transition-colors"
								>
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-brand-light border border-brand-border flex items-center justify-center text-brand font-bold text-xs shrink-0">
												{user.first_name
													? user.first_name.charAt(0).toUpperCase()
													: user.username.charAt(0).toUpperCase()}
											</div>
											<p className="font-bold text-gray-900 text-sm">
												{user.first_name || user.last_name
													? `${user.first_name} ${user.last_name}`
													: user.username}
											</p>
										</div>
									</td>
									<td className="px-6 py-4">
										<span className="text-sm text-gray-600 font-medium">
											{user.email}
										</span>
									</td>
									<td className="px-6 py-4">
										<Badge
											variant={
												user.role === 'admin'
													? 'brand'
													: user.role === 'professional'
														? 'warning'
														: 'gray'
											}
										>
											{user.role.charAt(0).toUpperCase() + user.role.slice(1)}
										</Badge>
									</td>
									<td className="px-6 py-4 text-right">
										<div className="flex items-center justify-end gap-2">
											<div
												className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}
											/>
											<span
												className={`text-sm font-medium ${user.is_active ? 'text-green-600' : 'text-gray-400'}`}
											>
												{user.is_active ? 'Active' : 'Inactive'}
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
