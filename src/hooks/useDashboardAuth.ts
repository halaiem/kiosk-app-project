import { useState, useCallback, useEffect } from 'react';
import {
  dashboardLogin,
  dashboardLogout,
  dashboardMe,
  getStoredDashboardUser,
  getStoredDashboardToken,
} from '@/api/dashboardApi';
import type { DashboardUser, UserRole } from '@/types/dashboard';

function mapApiUser(raw: Record<string, unknown>): DashboardUser {
  return {
    id: String(raw.employee_id || raw.id),
    name: String(raw.full_name || raw.name || ''),
    role: (raw.role as UserRole) || 'dispatcher',
    isActive: raw.is_active !== false,
    lastLogin: raw.last_login_at ? new Date(raw.last_login_at as string) : undefined,
  };
}

export function useDashboardAuth() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredDashboardToken();
    if (!token) { setLoading(false); return; }
    const cached = getStoredDashboardUser();
    if (cached) setUser(mapApiUser(cached));
    dashboardMe()
      .then((u) => { if (u) setUser(mapApiUser(u)); else setUser(null); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (id: string, password: string): Promise<boolean> => {
    setError('');
    try {
      const data = await dashboardLogin(id, password);
      setUser(mapApiUser(data.user));
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка входа';
      setError(msg);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await dashboardLogout();
    setUser(null);
    setError('');
  }, []);

  const getRoleName = useCallback((role: UserRole) => {
    const names: Record<UserRole, string> = {
      dispatcher: 'Диспетчер',
      technician: 'Техник',
      admin: 'Администратор',
      irida_tools: 'Irida-Tools',
    };
    return names[role];
  }, []);

  return { user, error, loading, login, logout, getRoleName };
}