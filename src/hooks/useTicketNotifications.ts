import { useState, useEffect, useCallback, useRef } from 'react';
import urls from '@/api/config';

const API_URL = urls['service-requests'];
const TOKEN_KEY = 'dashboard_token';

function hdrs(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) h['X-Dashboard-Token'] = t;
  return h;
}

export interface TicketNotification {
  id: number;
  request_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  request_number: string;
  request_title: string;
}

export function useTicketNotifications(enabled = true) {
  const [notifications, setNotifications] = useState<TicketNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await window.fetch(`${API_URL}?action=notifications`, { headers: hdrs() });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count ?? 0);
    } catch { void 0; }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetch();
    timerRef.current = setInterval(() => fetch(true), 15000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [enabled, fetch]);

  const markRead = useCallback(async (id: number) => {
    try {
      await window.fetch(`${API_URL}?action=notifications`, {
        method: 'PUT',
        headers: hdrs(),
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { void 0; }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await window.fetch(`${API_URL}?action=notifications`, {
        method: 'PUT',
        headers: hdrs(),
        body: JSON.stringify({ mark_all_read: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { void 0; }
  }, []);

  return { notifications, unreadCount, loading, fetch, markRead, markAllRead };
}
