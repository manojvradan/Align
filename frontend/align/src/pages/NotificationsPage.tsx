import React, { useEffect, useState, useCallback } from 'react';
import { FiBell, FiMail, FiTrash2, FiCheck } from 'react-icons/fi';
import Icon from '../components/Icon';
import apiClient from '../api/axiosConfig';
import { getCached, isFresh, setCached, TTL } from '../api/cache';

const PREFS_KEY = '/users/me/notification-preferences';
const NOTIFS_KEY = '/users/me/notifications';

interface NotificationPrefs {
  id: number;
  student_id: number;
  in_app_enabled: boolean;
  email_enabled: boolean;
}

interface Notification {
  id: number;
  title: string;
  message: string | null;
  is_read: boolean;
  internship_id: number | null;
  created_at: string;
}

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
      transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
      ${checked ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-white/20'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
        transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

const NotificationsPage: React.FC = () => {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(
    () => getCached<NotificationPrefs>(PREFS_KEY)
  );
  const [notifications, setNotifications] = useState<Notification[]>(
    () => getCached<Notification[]>(NOTIFS_KEY) ?? []
  );
  const [isLoading, setIsLoading] = useState(() => getCached(NOTIFS_KEY) === null);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  const fetchAll = useCallback(async () => {
    if (isFresh(PREFS_KEY, TTL.LONG) && isFresh(NOTIFS_KEY, TTL.SHORT)) {
      setIsLoading(false);
      return;
    }
    if (getCached(NOTIFS_KEY) === null) setIsLoading(true);
    try {
      const [prefsRes, notifsRes] = await Promise.all([
        apiClient.get(PREFS_KEY),
        apiClient.get(NOTIFS_KEY),
      ]);
      setCached(PREFS_KEY, prefsRes.data);
      setCached(NOTIFS_KEY, notifsRes.data);
      setPrefs(prefsRes.data);
      setNotifications(notifsRes.data);
    } catch (err) {
      console.error('Failed to load notifications data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updatePref = async (key: keyof Pick<NotificationPrefs, 'in_app_enabled' | 'email_enabled'>, value: boolean) => {
    if (!prefs || savingKeys.has(key)) return;
    // Optimistically update UI immediately
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value });
    setSavingKeys((s) => new Set(s).add(key));
    try {
      const res = await apiClient.put('/users/me/notification-preferences', { [key]: value });
      setPrefs(res.data);
    } catch (err) {
      // Revert on failure
      setPrefs(previous);
      console.error('Failed to update preference', err);
    } finally {
      setSavingKeys((s) => { const next = new Set(s); next.delete(key); return next; });
    }
  };

  const markRead = async (id: number) => {
    try {
      await apiClient.post(`/users/me/notifications/${id}/read`);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        setCached(NOTIFS_KEY, updated);
        return updated;
      });
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const deleteNotif = async (id: number) => {
    try {
      await apiClient.delete(`/users/me/notifications/${id}`);
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        setCached(NOTIFS_KEY, updated);
        return updated;
      });
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const markAllRead = async () => {
    try {
      await apiClient.post('/users/me/notifications/read-all');
      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, is_read: true }));
        setCached(NOTIFS_KEY, updated);
        return updated;
      });
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto w-full space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-white/10 rounded-lg" />
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="space-y-1.5">
                <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded" />
                <div className="h-3 w-56 bg-slate-200 dark:bg-white/10 rounded" />
              </div>
              <div className="h-6 w-11 bg-slate-200 dark:bg-white/10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Notifications</h1>
        <p className="text-slate-500 dark:text-white/40 mt-1 text-sm">
          Manage how and when you're notified about new job matches.
        </p>
      </div>

      {/* Preferences card */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-5">Notification Settings</h2>

        {/* In-app notifications */}
        <div className="flex items-start justify-between gap-4 py-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
              <Icon as={FiBell} className="text-indigo-500 text-base" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-white text-sm">In-App Notifications</p>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                Show a badge and alert in the top bar when new matching jobs are found.
              </p>
            </div>
          </div>
          <Toggle
            checked={prefs?.in_app_enabled ?? true}
            onChange={(v) => updatePref('in_app_enabled', v)}
            disabled={savingKeys.has('in_app_enabled')}
          />
        </div>

        {/* Email notifications */}
        <div className="flex items-start justify-between gap-4 pt-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center shrink-0">
              <Icon as={FiMail} className="text-violet-500 text-base" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-white text-sm">Email Notifications</p>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                Get an email summary whenever new internships that match your role are posted.
              </p>
            </div>
          </div>
          <Toggle
            checked={prefs?.email_enabled ?? false}
            onChange={(v) => updatePref('email_enabled', v)}
            disabled={savingKeys.has('email_enabled')}
          />
        </div>
      </div>

      {/* Notification history */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            Notification History
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500 text-white">
                {unreadCount}
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              <Icon as={FiCheck} className="text-sm" />
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-3">
              <Icon as={FiBell} className="text-slate-400 dark:text-white/30 text-xl" />
            </div>
            <p className="text-slate-500 dark:text-white/40 text-sm">
              No notifications yet. We'll let you know when a great match is found!
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((notif) => (
              <li
                key={notif.id}
                className={`flex items-start gap-3 p-4 rounded-xl transition-colors ${
                  notif.is_read
                    ? 'bg-transparent'
                    : 'bg-indigo-50 dark:bg-indigo-500/10'
                }`}
              >
                {/* Unread dot */}
                <div className="mt-1.5 shrink-0">
                  {notif.is_read ? (
                    <div className="w-2 h-2 rounded-full bg-transparent" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-snug ${notif.is_read ? 'text-slate-600 dark:text-white/50' : 'text-slate-800 dark:text-white'}`}>
                    {notif.title}
                  </p>
                  {notif.message && (
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">{notif.message}</p>
                  )}
                  <p className="text-xs text-slate-400 dark:text-white/25 mt-1">{formatDate(notif.created_at)}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!notif.is_read && (
                    <button
                      onClick={() => markRead(notif.id)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                    >
                      <Icon as={FiCheck} className="text-sm" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotif(notif.id)}
                    title="Delete"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Icon as={FiTrash2} className="text-sm" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
