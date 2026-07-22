import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function NotificationDropdown() {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/api/notifications/?read_status=unread');
            if (response.data.results) {
                setNotifications(response.data.results);
                setUnreadCount(response.data.count);
            } else {
                setNotifications(response.data);
                setUnreadCount(response.data.length);
            }
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        
        // Poll for new notifications every 15 seconds
        const interval = setInterval(() => {
            fetchNotifications();
        }, 15000);
        
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            clearInterval(interval);
        };
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            await api.post(`/api/notifications/${id}/read/`);
            setNotifications(notifications.map(n => 
                n.id === id ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.post('/api/notifications/read-all/');
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-brand transition-colors bg-white rounded-full border border-brand-border shadow-sm"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-brand rounded-full border border-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-brand-border z-50 overflow-hidden">
                    <div className="flex justify-between items-center p-3 border-b border-brand-border bg-gray-50">
                        <h3 className="font-semibold text-gray-700">Notifications</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-brand hover:text-brand-dark flex items-center gap-1"
                            >
                                <CheckCircle2 size={14} />
                                Mark all as read
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                        ) : (
                            notifications.map(notification => (
                                <div 
                                    key={notification.id} 
                                    className={`p-3 border-b border-gray-100 flex flex-col gap-1 transition-colors ${!notification.is_read ? 'bg-brand-light/20' : 'bg-white hover:bg-gray-50'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="font-medium text-sm text-gray-800">{notification.title}</span>
                                        {!notification.is_read && (
                                            <button 
                                                onClick={() => handleMarkAsRead(notification.id)}
                                                className="text-gray-400 hover:text-brand"
                                                title="Mark as read"
                                            >
                                                <Check size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600">{notification.message}</p>
                                    <span className="text-[10px] text-gray-400 mt-1">
                                        {new Date(notification.created_at).toLocaleString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-2 border-t border-brand-border bg-gray-50 text-center">
                        <Link to="/history" onClick={() => setIsOpen(false)} className="text-sm font-medium text-brand hover:text-brand-dark">
                            View all history
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
