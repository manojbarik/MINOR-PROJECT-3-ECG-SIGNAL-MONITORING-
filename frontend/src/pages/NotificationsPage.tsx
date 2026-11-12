import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Calendar, MessageSquare, FileText, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { AppNotification } from '../types';

interface NotificationsPageProps {
  onNavigate?: (tab: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (e: any) {
      console.error('Error fetching notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'appointment':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'emergency':
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'report':
        return <FileText className="w-4 h-4 text-teal-500" />;
      default:
        return <Bell className="w-4 h-4 text-amber-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">URGENT</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Notice</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">Info</span>;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold mb-2">
            <Bell className="w-3.5 h-3.5 text-teal-400" />
            CLINICAL NOTIFICATION DISPATCHER
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Clinical Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Real-time reminders for scheduled consultations, uploaded diagnostic reports, doctor communications, and clinical triage updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 font-bold py-2 px-4 rounded-xl text-xs transition flex items-center gap-2 shrink-0"
          >
            <Check className="w-4 h-4" />
            <span>Mark All As Read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="glass-panel bg-slate-900/90 rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-white font-mono">Notification Feed</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold rounded-full font-mono">
                {unreadCount} unread
              </span>
            )}
          </div>
          <button
            onClick={fetchNotifications}
            className="text-xs text-teal-400 hover:underline font-semibold font-mono"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-xs font-mono">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-mono">
            <Bell className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            No notifications in your inbox.
          </div>
        ) : (
          <div className="divide-y divide-slate-800 text-xs">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-3 transition ${
                  n.is_read ? 'bg-slate-900/40 hover:bg-slate-800/40' : 'bg-teal-950/30 hover:bg-teal-950/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(n.category)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${n.is_read ? 'text-slate-300' : 'text-white'}`}>
                        {n.title}
                      </span>
                      {getPriorityBadge(n.priority)}
                      {!n.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-sm shadow-teal-400"></span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-teal-400" />
                      <span>{new Date(n.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      title="Mark as read"
                      className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    title="Delete notification"
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

