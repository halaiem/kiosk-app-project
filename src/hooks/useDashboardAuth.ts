import { useState, useCallback } from 'react';
import type { DashboardUser, UserRole } from '@/types/dashboard';

const DEMO_USERS: Array<{ id: string; password: string; user: DashboardUser }> = [
  {
    id: 'D001',
    password: 'disp123',
    user: { id: 'D001', name: 'Смирнова Елена', role: 'dispatcher', isActive: true },
  },
  {
    id: 'D002',
    password: 'disp123',
    user: { id: 'D002', name: 'Козлов Артём', role: 'dispatcher', isActive: true },
  },
  {
    id: 'T001',
    password: 'tech123',
    user: { id: 'T001', name: 'Васильев Олег', role: 'technician', isActive: true },
  },
  {
    id: 'T002',
    password: 'tech123',
    user: { id: 'T002', name: 'Морозова Анна', role: 'technician', isActive: true },
  },
  {
    id: 'A001',
    password: 'admin123',
    user: { id: 'A001', name: 'Петров Максим', role: 'admin', isActive: true },
  },
];

export function useDashboardAuth() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [error, setError] = useState('');

  const login = useCallback((id: string, password: string) => {
    setError('');
    const found = DEMO_USERS.find((u) => u.id === id && u.password === password);
    if (!found) {
      setError('Неверный ID или пароль');
      return false;
    }
    setUser({ ...found.user, lastLogin: new Date() });
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError('');
  }, []);

  const getRoleName = useCallback((role: UserRole) => {
    const names: Record<UserRole, string> = {
      dispatcher: 'Диспетчер',
      technician: 'Техник',
      admin: 'Администратор',
    };
    return names[role];
  }, []);

  return { user, error, login, logout, getRoleName };
}

export { DEMO_USERS };
