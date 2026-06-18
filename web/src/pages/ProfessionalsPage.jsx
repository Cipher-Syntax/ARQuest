import { useState, useEffect } from 'react'
import { Search, Plus, X } from 'lucide-react'
import { Card, Badge, Button } from '../components/ui'
import { userService } from '../services/userService'

function CreateProfessionalModal({ isOpen, onClose, onSuccess }) {
	const [formData, setFormData] = useState({
		username: '',
		email: '',
		password: '',
		first_name: '',
		last_name: ''
	})
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')

	if (!isOpen) return null

	const handleChange = (e) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		setIsLoading(true)

		try {
			await userService.createProfessional(formData)
			onSuccess()
			onClose()
		} catch (err) {
			console.error(err)
			setError(err.response?.data?.message || 'Failed to create account')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
			<div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
				<div className="flex items-center justify-between p-4 border-b border-brand-border bg-gray-50/50">
					<h3 className="font-bold text-lg text-gray-900">Create Professional Account</h3>
					<button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
					{error && (
						<div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
							{error}
						</div>
					)}
					
					<div className="space-y-1">
						<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Username *</label>
						<input
							type="text"
							name="username"
							required
							value={formData.username}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-brand-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 text-sm"
							placeholder="johndoe123"
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email *</label>
						<input
							type="email"
							name="email"
							required
							value={formData.email}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-brand-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 text-sm"
							placeholder="john@example.com"
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password *</label>
						<input
							type="password"
							name="password"
							required
							minLength={8}
							value={formData.password}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-brand-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 text-sm"
							placeholder="••••••••"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">First Name</label>
							<input
								type="text"
								name="first_name"
								value={formData.first_name}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-brand-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 text-sm"
								placeholder="John"
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Last Name</label>
							<input
								type="text"
								name="last_name"
								value={formData.last_name}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-brand-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 text-sm"
								placeholder="Doe"
							/>
						</div>
					</div>

					<div className="pt-4 flex justify-end gap-3">
						<Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? 'Creating...' : 'Create Account'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	)
}


export default function ProfessionalsPage() {
	const [users, setUsers] = useState([])
	const [searchTerm, setSearchTerm] = useState('')
	const [isModalOpen, setIsModalOpen] = useState(false)

	const loadUsers = async () => {
		try {
			const data = await userService.getUsers()
			// Filter to show only professionals
			setUsers(data.filter(u => u.role === 'professional'))
		} catch (error) {
			console.error('Failed to load users', error)
		}
	}

	useEffect(() => {
		loadUsers()
	}, [])

	const filteredUsers = users.filter((user) => {
		return (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
			(user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
			(user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
			user.email.toLowerCase().includes(searchTerm.toLowerCase())
	})

	return (
		<div className="space-y-6">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-gray-900">Professional Accounts</h2>
					<p className="text-gray-500 mt-1">
						Manage access for professors, staff, and accreditors.
					</p>
				</div>
				<Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
					<Plus size={18} />
					Create Account
				</Button>
			</div>

			<div className="flex flex-col md:flex-row items-center gap-4 mt-4">
				<div className="relative flex-1 w-full max-w-md">
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
						size={18}
					/>
					<input
						type="text"
						placeholder="Search professionals by name or email..."
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
								<th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
									Professional
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
							{filteredUsers.length === 0 ? (
								<tr>
									<td colSpan="4" className="px-6 py-8 text-center text-gray-500 font-medium">
										No professional accounts found.
									</td>
								</tr>
							) : filteredUsers.map((user) => (
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
										<Badge variant="warning">
											Professional
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

			<CreateProfessionalModal 
				isOpen={isModalOpen} 
				onClose={() => setIsModalOpen(false)} 
				onSuccess={loadUsers} 
			/>
		</div>
	)
}
