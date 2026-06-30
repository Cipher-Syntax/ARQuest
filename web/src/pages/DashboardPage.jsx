import { useState, useEffect } from 'react'
import {
	Building2,
	Users,
	Navigation,
	HelpCircle,
	ArrowUpRight,
	MoreVertical,
	ChevronRight,
	Target,
	TrendingUp,
	TrendingDown
} from 'lucide-react'
import { Card, Badge } from '../components/ui'
import { dashboardService } from '../services/dashboardService'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function Dashboard() {
	const [stats, setStats] = useState({
		total_buildings: 0,
		active_students: 0,
		trivia_facts: 0,
		gps_unlocks_today: 0,
		weekly_data: [],
		building_status: [],
		most_visited: [],
		least_visited: [],
		quest_completion_rate: 0,
		total_quests_completed: 0
	})

	useEffect(() => {
		const fetchStats = async () => {
			try {
				const data = await dashboardService.getStats()
				setStats(data)
			} catch (error) {
				console.error('Failed to load dashboard stats', error)
			}
		}
		fetchStats()
	}, [])

	const STATS = [
		{
			label: 'Total Buildings',
			value: stats.total_buildings,
			icon: Building2,
			trend: 'Total Live',
			color: 'bg-brand-light text-brand'
		},
		{
			label: 'Active Students',
			value: stats.active_students,
			icon: Users,
			trend: 'Enrolled',
			color: 'bg-brand-light text-brand'
		},
		{
			label: 'GPS Unlocks Today',
			value: stats.gps_unlocks_today,
			icon: Navigation,
			trend: 'Today',
			color: 'bg-brand-light text-brand'
		},
		{
			label: 'Trivia Facts',
			value: stats.trivia_facts,
			icon: HelpCircle,
			trend: 'Live',
			color: 'bg-brand-light text-brand'
		},
		{
			label: 'Quests Completed',
			value: stats.total_quests_completed,
			icon: Target,
			trend: `${stats.quest_completion_rate}% Rate`,
			color: 'bg-green-100 text-green-700'
		}
	]

	const statusCounts = stats.building_status.reduce((acc, b) => {
		acc[b.status] = (acc[b.status] || 0) + 1
		return acc
	}, {})
	
	const statusData = Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] }))
	const STATUS_COLORS = { 'Live': '#10B981', 'Draft': '#9CA3AF', 'Hidden': '#EF4444' }

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-gray-900">Overview</h2>
				<p className="text-gray-500 mt-1">
					Welcome back, here's what's happening on campus today.
				</p>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
				{STATS.map((stat, i) => (
					<Card key={i} className="relative overflow-hidden">
						<div className="flex items-start justify-between">
							<div className={`p-2.5 rounded-md ${stat.color}`}>
								<stat.icon size={18} />
							</div>
							<Badge variant="success">{stat.trend}</Badge>
						</div>
						<div className="mt-3">
							<h3 className="text-2xl font-bold text-gray-900 tracking-tight">
								{stat.value}
							</h3>
							<p className="text-xs font-medium text-gray-500 mt-0.5">{stat.label}</p>
						</div>
					</Card>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-2">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="font-bold text-gray-900">Weekly GPS Unlocks</h3>
							<p className="text-xs text-gray-500 mt-0.5">
								Building unlocks recorded this week
							</p>
						</div>
						<button className="text-[11px] font-bold text-brand uppercase tracking-wider flex items-center gap-1 hover:underline">
							7D View
							<ChevronRight size={12} />
						</button>
					</div>

					<div className="h-48 mt-4">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={stats.weekly_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
								<XAxis 
									dataKey="day" 
									axisLine={false} 
									tickLine={false} 
									tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 'bold' }} 
									dy={10}
								/>
								<Tooltip 
									cursor={{ fill: 'rgba(138, 21, 56, 0.05)' }}
									contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
									labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
								/>
								<Bar 
									dataKey="value" 
									fill="#8A1538" 
									radius={[4, 4, 0, 0]} 
									barSize={32}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</Card>

				<Card>
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-bold text-gray-900">Building Status</h3>
						<button className="text-gray-400 hover:text-brand transition-colors">
							<MoreVertical size={18} />
						</button>
					</div>

					{statusData.length > 0 && (
						<div className="h-40 mb-6">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie 
										data={statusData} 
										innerRadius={45} 
										outerRadius={70} 
										paddingAngle={2}
										dataKey="value"
									>
										{statusData.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#8A1538'} />
										))}
									</Pie>
									<Tooltip 
										contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
									/>
								</PieChart>
							</ResponsiveContainer>
						</div>
					)}

					<div className="space-y-1">
						{stats.building_status.map((b, i) => (
							<div
								key={i}
								className="flex items-center justify-between py-2.5 border-b border-brand-border last:border-0"
							>
								<div className="flex items-center gap-3">
									<div className="w-9 h-9 rounded-md bg-brand-light flex items-center justify-center text-brand font-bold text-[10px] shrink-0">
										{b.code}
									</div>
									<p className="text-sm font-semibold text-gray-700 leading-tight">
										{b.name}
									</p>
								</div>
								<Badge variant={b.status === 'Live' ? 'success' : 'warning'}>
									{b.status}
									{b.status === 'Live' && (
										<ArrowUpRight size={10} className="ml-1 inline" />
									)}
								</Badge>
							</div>
						))}
					</div>
				</Card>
			</div>

			{/* Advanced Analytics Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
				<Card>
					<div className="flex items-center justify-between mb-4">
						<div>
							<h3 className="font-bold text-gray-900 flex items-center gap-2">
								<TrendingUp size={18} className="text-green-600" />
								Most Visited Buildings
							</h3>
							<p className="text-xs text-gray-500 mt-0.5">
								Top 5 buildings by physical visits
							</p>
						</div>
					</div>
					<div className="space-y-3">
						{stats.most_visited.map((b, i) => (
							<div key={i} className="flex items-center justify-between">
								<div className="flex items-center gap-3 w-full">
									<div className="w-6 text-sm font-bold text-gray-400">#{i + 1}</div>
									<div className="flex-1">
										<div className="flex justify-between mb-1">
											<span className="text-sm font-semibold text-gray-700">{b.name}</span>
											<span className="text-sm font-bold text-gray-900">{b.unlock_count}</span>
										</div>
										<div className="w-full bg-gray-100 rounded-full h-1.5">
											<div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (b.unlock_count / (stats.most_visited[0]?.unlock_count || 1)) * 100)}%` }}></div>
										</div>
									</div>
								</div>
							</div>
						))}
						{stats.most_visited.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No visits recorded yet</p>}
					</div>
				</Card>

				<Card>
					<div className="flex items-center justify-between mb-4">
						<div>
							<h3 className="font-bold text-gray-900 flex items-center gap-2">
								<TrendingDown size={18} className="text-red-600" />
								Least Visited Buildings
							</h3>
							<p className="text-xs text-gray-500 mt-0.5">
								Bottom 5 buildings needing attention
							</p>
						</div>
					</div>
					<div className="space-y-3">
						{stats.least_visited.map((b, i) => (
							<div key={i} className="flex items-center justify-between">
								<div className="flex items-center gap-3 w-full">
									<div className="w-6 text-sm font-bold text-gray-400">#{i + 1}</div>
									<div className="flex-1">
										<div className="flex justify-between mb-1">
											<span className="text-sm font-semibold text-gray-700">{b.name}</span>
											<span className="text-sm font-bold text-gray-900">{b.unlock_count}</span>
										</div>
										<div className="w-full bg-gray-100 rounded-full h-1.5">
											<div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${Math.max(2, Math.min(100, (b.unlock_count / (stats.most_visited[0]?.unlock_count || 1)) * 100))}%` }}></div>
										</div>
									</div>
								</div>
							</div>
						))}
						{stats.least_visited.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No visits recorded yet</p>}
					</div>
				</Card>
			</div>
		</div>
	)
}
