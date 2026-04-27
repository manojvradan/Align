import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FiBell, FiSun, FiMoon, FiCheck, FiSettings } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../api/axiosConfig';

interface Notification {
  id: number;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

const Header: React.FC = () => {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0];
  const { isDark, toggleTheme } = useTheme();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [notifsRes, countRes] = await Promise.all([
        apiClient.get('/users/me/notifications'),
        apiClient.get('/users/me/notifications/unread-count'),
      ]);
      setNotifications(notifsRes.data.slice(0, 6));
      setUnreadCount(countRes.data);
    } catch {
      // silently fail
    }
  }, [user?.id]);

  const hasCheckedRef = useRef(false);

  // Check for new matches once per session (not on every navigation).
  // fetchNotifications is called afterward to refresh the list.
  useEffect(() => {
    if (!user?.id || hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    apiClient
      .post('/users/me/notifications/check')
      .finally(fetchNotifications);
  }, [user?.id, fetchNotifications]);

  const markRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/users/me/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {/* ignore */}
  };

  const markAllRead = async () => {
    try {
      await apiClient.post('/users/me/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {/* ignore */}
  };

  const formatRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(1, mins)}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <header className="relative z-[100] bg-white/80 dark:bg-[#0d0d1a]/80 backdrop-blur-sm border-b border-slate-200 dark:border-white/10 px-6 py-4 flex justify-end items-center w-full transition-colors duration-300 overflow-visible">
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white transition-all"
        >
          <Icon as={isDark ? FiSun : FiMoon} className="text-lg" />
        </button>

        {/* Notifications bell */}
        <div className="relative z-[100]" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Notifications"
            className="relative p-2 rounded-lg text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white transition-all"
          >
            <Icon as={FiBell} className="text-lg" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#0d0d1a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/30 dark:shadow-black/70 z-[200] overflow-hidden"
              style={{ backdropFilter: 'none', isolation: 'isolate' }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/10">
                <span className="font-bold text-sm text-slate-800 dark:text-white">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white">
                      {unreadCount}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <Link
                    to="/notifications"
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    title="Notification settings"
                  >
                    <Icon as={FiSettings} className="text-sm" />
                  </Link>
                </div>
              </div>

              {/* Notification list */}
              <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                {notifications.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-slate-400 dark:text-white/30">
                    No notifications yet
                  </li>
                ) : (
                  notifications.map((notif) => (
                    <li
                      key={notif.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                        notif.is_read ? '' : 'bg-indigo-50/60 dark:bg-indigo-500/10'
                      }`}
                    >
                      <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full">
                        {!notif.is_read && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold leading-snug ${notif.is_read ? 'text-slate-500 dark:text-white/40' : 'text-slate-800 dark:text-white'}`}>
                          {notif.title}
                        </p>
                        {notif.message && (
                          <p className="text-xs text-slate-400 dark:text-white/30 mt-0.5 truncate">{notif.message}</p>
                        )}
                        <p className="text-[10px] text-slate-300 dark:text-white/20 mt-0.5">{formatRelative(notif.created_at)}</p>
                      </div>
                      {!notif.is_read && (
                        <button
                          onClick={(e) => markRead(notif.id, e)}
                          title="Mark as read"
                          className="shrink-0 p-1 rounded-md text-slate-300 hover:text-indigo-500 transition-colors"
                        >
                          <Icon as={FiCheck} className="text-xs" />
                        </button>
                      )}
                    </li>
                  ))
                )}
              </ul>

              {/* Footer link */}
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/10">
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  className="block text-center text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
                >
                  View all &amp; manage settings →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-white/10" />

        {/* User — click to go to edit profile */}
        <Link to="/profile" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9">
            {user?.profile_picture_url ? (
              <img
                src={user.profile_picture_url}
                alt="User"
                className="w-9 h-9 rounded-full object-cover border-2 border-indigo-400 dark:border-indigo-500 shadow-sm"
              />
            ) : (
              /* Clean purple placeholder with ring outline */
              <div className="w-9 h-9 rounded-full border-2 border-dashed border-indigo-400 dark:border-indigo-500 flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 group-hover:border-indigo-500 dark:group-hover:border-indigo-400 transition-colors">
                <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7" aria-hidden="true">
                  <circle cx="18" cy="14" r="6" fill="#a78bfa" />
                  <ellipse cx="18" cy="27" rx="10" ry="6" fill="#a78bfa" opacity="0.7" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <div className="font-semibold text-slate-800 dark:text-white text-sm leading-tight group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
              {firstName || '...'}
            </div>
            <div className="text-xs text-slate-400 dark:text-white/40">Student</div>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;
