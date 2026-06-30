import { useState, useEffect } from 'react'
import { Card, Badge } from '../components/ui'
import { MessageSquare, AlertCircle, CheckCircle, Trash2, Clock } from 'lucide-react'
import { feedbackService } from '../services/feedbackService'

export default function FeedbackPage() {
	const [feedbacks, setFeedbacks] = useState([])
	const [loading, setLoading] = useState(true)
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)

	useEffect(() => {
		fetchFeedbacks()
	}, [page])

	const fetchFeedbacks = async () => {
		setLoading(true)
		try {
			const data = await feedbackService.getFeedbacks(page)
			if (data.results) {
				setFeedbacks(data.results)
				setTotalPages(Math.ceil(data.count / 10))
			} else {
				setFeedbacks(data)
			}
		} catch (error) {
			console.error("Failed to fetch feedback", error)
		} finally {
			setLoading(false)
		}
	}

	const handleStatusChange = async (id, newStatus) => {
		try {
			await feedbackService.updateFeedbackStatus(id, newStatus)
			fetchFeedbacks()
		} catch (error) {
			console.error("Failed to update status", error)
		}
	}

	const handleDelete = async (id) => {
		if (window.confirm('Are you sure you want to delete this feedback?')) {
			try {
				await feedbackService.deleteFeedback(id)
				fetchFeedbacks()
			} catch (error) {
				console.error("Failed to delete feedback", error)
			}
		}
	}

	const getTypeIcon = (type) => {
		switch (type) {
			case 'bug': return <AlertCircle className="text-red-500" size={20} />
			case 'feature': return <CheckCircle className="text-green-500" size={20} />
			default: return <MessageSquare className="text-blue-500" size={20} />
		}
	}

	const getStatusBadge = (status) => {
		switch (status) {
			case 'open': return <Badge variant="warning">Open</Badge>
			case 'in_progress': return <Badge variant="primary">In Progress</Badge>
			case 'resolved': return <Badge variant="success">Resolved</Badge>
			default: return <Badge>{status}</Badge>
		}
	}

	if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-gray-900">User Feedback & Issues</h2>
				<p className="text-gray-500 mt-1">Review and manage bug reports and feature requests from users.</p>
			</div>

			<div className="grid grid-cols-1 gap-4">
				{feedbacks.length === 0 ? (
					<Card>
						<div className="py-12 text-center text-gray-500">
							<MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-3" />
							<p>No feedback reports found.</p>
						</div>
					</Card>
				) : (
					feedbacks.map((item) => (
						<Card key={item.id} className="p-5 flex flex-col sm:flex-row gap-4">
							<div className="flex-shrink-0 mt-1">
								{getTypeIcon(item.type)}
							</div>
							<div className="flex-grow">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
									<div className="flex items-center gap-2">
										<span className="font-bold text-gray-900 capitalize">{item.type}</span>
										{getStatusBadge(item.status)}
									</div>
									<div className="text-xs text-gray-500 flex items-center gap-1">
										<Clock size={12} />
										{new Date(item.created_at).toLocaleString()}
									</div>
								</div>
								
								<p className="text-gray-700 whitespace-pre-wrap mb-4 bg-gray-50 p-3 rounded-md text-sm border border-gray-100">
									{item.message}
								</p>
								
								<div className="flex items-center justify-between pt-3 border-t border-gray-100">
									<div className="text-xs font-medium text-gray-500">
										Reported by: <span className="text-[#8a1538]">{item.username || 'Anonymous'}</span> ({item.role || 'Unknown'})
									</div>
									<div className="flex items-center gap-2">
										<select 
											className="text-xs border border-gray-300 rounded px-2 py-1 bg-white outline-none focus:border-[#8a1538]"
											value={item.status}
											onChange={(e) => handleStatusChange(item.id, e.target.value)}
										>
											<option value="open">Mark as Open</option>
											<option value="in_progress">Mark In Progress</option>
											<option value="resolved">Mark Resolved</option>
										</select>
										<button 
											onClick={() => handleDelete(item.id)}
											className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
											title="Delete feedback"
										>
											<Trash2 size={16} />
										</button>
									</div>
								</div>
							</div>
						</Card>
					))
				)}
			</div>

			{totalPages > 1 && (
				<div className="flex justify-center items-center gap-4 mt-6">
					<button 
						onClick={() => setPage(p => Math.max(1, p - 1))}
						disabled={page === 1}
						className="px-4 py-2 border border-gray-300 rounded text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
					>
						Previous
					</button>
					<span className="text-sm text-gray-600">
						Page {page} of {totalPages}
					</span>
					<button 
						onClick={() => setPage(p => Math.min(totalPages, p + 1))}
						disabled={page === totalPages}
						className="px-4 py-2 border border-gray-300 rounded text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
					>
						Next
					</button>
				</div>
			)}
		</div>
	)
}
