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

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h2 className="text-2xl font-bold text-gray-900">Overview</h2>
				<p className="text-gray-500 mt-1">
					Welcome back, here's what's happening on campus today.
				</p>
			</div>

			{/* Stats Row */}
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
				{/* Chart Section */}
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

					<div className="h-48 flex items-end justify-between gap-3 px-2">
						{stats.weekly_data.map((data, i) => (
							<div key={i} className="flex-1 flex flex-col items-center gap-3 group">
								<div className="w-full relative">
									<div
										className={`w-full rounded-t-lg transition-all duration-300 ${data.day === 'Sat' ? 'bg-brand' : 'bg-brand-light group-hover:bg-brand/30'}`}
										style={{ height: `${Math.max(data.value * 15, 4)}px` }}
									>
										<div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
											{data.value} unlocks
										</div>
									</div>
								</div>
								<span className="text-[11px] font-bold text-gray-400 uppercase">
									{data.day}
								</span>
							</div>
						))}
					</div>
				</Card>

				{/* Building Status */}
				<Card>
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-bold text-gray-900">Building Status</h3>
						<button className="text-gray-400 hover:text-brand transition-colors">
							<MoreVertical size={18} />
						</button>
					</div>
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
