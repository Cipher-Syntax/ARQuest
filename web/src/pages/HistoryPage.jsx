import React, { useState, useEffect } from 'react';
import { Activity, Bell, CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '../components/ui';
import api from '../services/api';

export default function HistoryPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('desc');

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/api/notifications/?page=${page}&read_status=${filter}&sort=${sortOrder}`);
            if (response.data.results) {
                setNotifications(response.data.results);
                setTotalPages(Math.ceil(response.data.count / 5)); // Assuming page size 5
            } else {
                // Fallback if pagination is missing
                setNotifications(response.data);
                setTotalPages(1);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [page, filter, sortOrder]);

    const handleMarkAsRead = async (id) => {
        try {
            await api.post(`/api/notifications/${id}/read/`);
            fetchHistory();
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">History & Logs</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        View system notifications, alerts, and historical events.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            setPage(1);
                        }}
                        className="bg-white border border-brand-border text-gray-700 text-sm rounded-lg focus:ring-brand focus:border-brand block p-2 outline-none"
                    >
                        <option value="all">All Notifications</option>
                        <option value="unread">Unread</option>
                        <option value="read">Read</option>
                    </select>
                    <select
                        value={sortOrder}
                        onChange={(e) => {
                            setSortOrder(e.target.value);
                            setPage(1);
                        }}
                        className="bg-white border border-brand-border text-gray-700 text-sm rounded-lg focus:ring-brand focus:border-brand block p-2 outline-none"
                    >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-brand-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading history...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No history found.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((item) => (
                            <div
                                key={item.id}
                                className={`p-4 flex items-start gap-4 transition-colors ${!item.is_read ? 'bg-brand-light/20' : 'hover:bg-gray-50'}`}
                            >
                                <div className={`p-2 rounded-full mt-1 ${!item.is_read ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-gray-500'}`}>
                                    <Bell size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`text-sm font-semibold ${!item.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                                                    {item.title}
                                                </h3>
                                                {item.type && (
                                                    <Badge 
                                                        variant={
                                                            item.type === 'PROFESSIONAL' ? 'brand' :
                                                            item.type === 'BUILDING' ? 'warning' :
                                                            item.type === 'FEEDBACK' ? 'error' : 'secondary'
                                                        }
                                                    >
                                                        {item.type.replace('_', ' ')}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className="text-xs text-gray-400">
                                                {new Date(item.created_at).toLocaleString()}
                                            </span>
                                            {!item.is_read ? (
                                                <button
                                                    onClick={() => handleMarkAsRead(item.id)}
                                                    className="flex items-center gap-1 text-xs text-brand hover:text-brand-dark font-medium"
                                                >
                                                    <Circle size={12} className="fill-brand" />
                                                    Mark as read
                                                </button>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                                    <CheckCircle2 size={12} />
                                                    Read
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center pt-4">
                    <span className="text-sm text-gray-500">
                        Page {page} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="px-4 py-2 border border-brand-border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                            className="px-4 py-2 border border-brand-border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
