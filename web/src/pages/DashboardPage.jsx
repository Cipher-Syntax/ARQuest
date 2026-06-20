import { useState, useEffect } from 'react'
import {
	Building2,
	Users,
	Navigation,
	HelpCircle,
	ArrowUpRight,
	MoreVertical,
	ChevronRight
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
		building_status: []
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

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
		</div>
	)
}
