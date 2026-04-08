import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSettings } from '@/context/AppSettingsContext';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import IridaToolsPanel from '@/components/dashboard/panels/IridaToolsPanel';
import { useDashboardAuth } from '@/hooks/useDashboardAuth';
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
  const { logout, getRoleName } = useDashboardAuth();
  const { settings, updateSettings } = useAppSettings();
  const [activeTab, setActiveTab] = useState<DashboardTab>('cities');

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
    await logout();
    navigate('/dashboard');
  };

  const toggleTheme = () => {
    updateSettings({ dashboardTheme: settings.dashboardTheme === 'dark' ? 'light' : 'dark' });
  };

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