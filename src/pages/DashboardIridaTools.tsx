import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardAuth } from '@/hooks/useDashboardAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAppSettings } from '@/context/AppSettingsContext';
import DashboardLogin from '@/components/dashboard/DashboardLogin';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import IridaToolsPanel from '@/components/dashboard/panels/IridaToolsPanel';
import type { DashboardTab, IridaToolsTab } from '@/types/dashboard';
import type { DashboardUser } from '@/types/dashboard';

const IRIDA_USER: DashboardUser = {
  id: 'tp-tds',
  name: 'Irida-Tools',
  role: 'irida_tools',
  isActive: true,
};

export default function DashboardIridaTools() {
  const navigate = useNavigate();
  const { error, loading, login, logout, getRoleName } = useDashboardAuth();
  const [iridaUser, setIridaUser] = useState<DashboardUser | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('cities');
  const { settings, updateSettings } = useAppSettings();
  const data = useDashboardData(iridaUser);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.dashboardTheme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    return () => { root.classList.add('dark'); };
  }, [settings.dashboardTheme]);

  const handleLogin = async (id: string, password: string) => {
    const ok = await login(id, password);
    if (ok) navigate('/dashboard');
    return ok;
  };

  const handleIridaToolsLogin = () => {
    setIridaUser(IRIDA_USER);
    setActiveTab('cities');
  };

  const handleLogout = async () => {
    setIridaUser(null);
    await logout();
  };

  const counts = useMemo(() => ({
    messages: 0,
    notifications: 0,
    alerts: 0,
    vehicle_issues: 0,
  }), []);

  const isLight = settings.dashboardTheme === 'light';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#152d52' }}>
        <div className="text-white/60 text-sm">Загрузка...</div>
      </div>
    );
  }

  if (!iridaUser) {
    return (
      <DashboardLogin
        onLogin={handleLogin}
        onIridaToolsLogin={handleIridaToolsLogin}
        onRegularLoginSuccess={() => navigate('/dashboard')}
        error={error}
      />
    );
  }

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden">
      <DashboardSidebar
        user={iridaUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        getRoleName={getRoleName}
        counts={counts}
        isDark={!isLight}
      />
      <main className="flex-1 overflow-auto p-6">
        <IridaToolsPanel tab={activeTab as IridaToolsTab} />
      </main>
    </div>
  );
}