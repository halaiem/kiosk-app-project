import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSettings } from '@/context/AppSettingsContext';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import IridaToolsPanel from '@/components/dashboard/panels/IridaToolsPanel';
import Icon from '@/components/ui/icon';
import { useDashboardAuth } from '@/hooks/useDashboardAuth';
import type { DashboardTab, IridaToolsTab } from '@/types/dashboard';
import type { DashboardUser } from '@/types/dashboard';

const IRIDA_USER: DashboardUser = {
  id: 'tp-tds',
  name: 'Irida-Tools',
  role: 'irida_tools',
  isActive: true,
};

const SESSION_KEY = 'irida_tools_auth';

export default function DashboardIridaTools() {
  const navigate = useNavigate();
  const { logout, getRoleName } = useDashboardAuth();
  const { settings, updateSettings } = useAppSettings();
  const [activeTab, setActiveTab] = useState<DashboardTab>('cities');
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === '1';
    setAuthorized(ok);
    if (!ok) {
      const timer = setTimeout(() => navigate('/dashboard'), 3000);
      return () => clearTimeout(timer);
    }
  }, [navigate]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.dashboardTheme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    return () => { root.classList.add('dark'); };
  }, [settings.dashboardTheme]);

  const handleLogout = async () => {
    sessionStorage.removeItem(SESSION_KEY);
    await logout();
    navigate('/dashboard');
  };

  const toggleTheme = () => {
    updateSettings({ dashboardTheme: settings.dashboardTheme === 'dark' ? 'light' : 'dark' });
  };

  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#152d52' }}>
        <div className="text-white/40 text-sm">Проверка доступа...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#152d52' }}>
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-500/20">
            <Icon name="ShieldOff" className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <p className="text-white text-lg font-semibold">Доступ запрещён</p>
            <p className="text-white/50 text-sm mt-1">Войдите через страницу авторизации</p>
          </div>
          <div className="text-white/30 text-xs">Перенаправление через 3 секунды...</div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
          >
            Перейти на вход
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden">
      <DashboardSidebar
        user={IRIDA_USER}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        getRoleName={getRoleName}
        counts={{ messages: 0, notifications: 0, alerts: 0, vehicle_issues: 0 }}
        isDark={settings.dashboardTheme !== 'light'}
        onToggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-auto p-6">
        <IridaToolsPanel tab={activeTab as IridaToolsTab} />
      </main>
    </div>
  );
}
