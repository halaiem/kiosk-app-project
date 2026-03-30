import { useState, useMemo, useEffect } from 'react';
import { useDashboardAuth } from '@/hooks/useDashboardAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAppSettings } from '@/context/AppSettingsContext';
import DashboardLogin from '@/components/dashboard/DashboardLogin';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DispatcherPanel from '@/components/dashboard/panels/DispatcherPanel';
import TechnicianPanel from '@/components/dashboard/panels/TechnicianPanel';
import AdminPanel from '@/components/dashboard/panels/AdminPanel';
import Icon from '@/components/ui/icon';
import type { DashboardTab, DispatcherTab, TechnicianTab, AdminTab } from '@/types/dashboard';

const DEFAULT_TABS: Record<string, DashboardTab> = {
  dispatcher: 'overview',
  technician: 'routes',
  admin: 'settings',
};

export default function Dashboard() {
  const { user, error, login, logout, getRoleName } = useDashboardAuth();
  const data = useDashboardData();
  const { settings, updateSettings } = useAppSettings();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Apply dashboard theme to <html> element (separate from kiosk dark mode)
  useEffect(() => {
    const root = document.documentElement;
    if (settings.dashboardTheme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    return () => {
      // Restore dark on unmount (kiosk manages its own)
      root.classList.add('dark');
    };
  }, [settings.dashboardTheme]);

  const handleLogin = (id: string, password: string) => {
    const success = login(id, password);
    if (success) {
      const found = ['dispatcher', 'technician', 'admin'].find((r) => id.startsWith(r[0].toUpperCase()));
      if (found) setActiveTab(DEFAULT_TABS[found]);
    }
    return success;
  };

  const handleLogout = () => {
    logout();
    setActiveTab('overview');
  };

  const toggleTheme = () => {
    updateSettings({ dashboardTheme: settings.dashboardTheme === 'dark' ? 'light' : 'dark' });
  };

  const counts = useMemo(() => ({
    messages: data.messages.filter((m) => !m.read && m.direction === 'incoming').length,
    notifications: data.notifications.filter((n) => !n.read).length,
    alerts: data.alerts.filter((a) => !a.resolved).length,
  }), [data.messages, data.notifications, data.alerts]);

  if (!user) {
    return <DashboardLogin onLogin={handleLogin} error={error} />;
  }

  const isLight = settings.dashboardTheme === 'light';

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden">
      <DashboardSidebar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        getRoleName={getRoleName}
        counts={counts}
      />
      <main className="flex-1 overflow-auto p-6 relative">
        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          title={isLight ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
          className="fixed top-4 right-4 z-50 w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-md border border-border bg-card text-foreground hover:bg-muted"
        >
          <Icon name={isLight ? 'Moon' : 'Sun'} className="w-4 h-4" />
        </button>

        {user.role === 'dispatcher' && (
          <DispatcherPanel
            tab={activeTab as DispatcherTab}
            messages={data.messages}
            notifications={data.notifications}
            alerts={data.alerts}
            drivers={data.drivers}
            stats={data.stats}
            onSendMessage={data.sendMessage}
            onMarkMessageRead={data.markMessageRead}
            onResolveAlert={data.resolveAlert}
            onMarkNotificationRead={data.markNotificationRead}
            userName={user.name}
            onOpenMessages={() => setActiveTab('messages')}
          />
        )}
        {user.role === 'technician' && (
          <TechnicianPanel
            tab={activeTab as TechnicianTab}
            routes={data.routes}
            documents={data.documents}
            vehicles={data.vehicles}
            drivers={data.drivers}
            schedule={data.schedule}
            onUpdateDocumentStatus={data.updateDocumentStatus}
          />
        )}
        {user.role === 'admin' && (
          <AdminPanel
            tab={activeTab as AdminTab}
            servers={data.servers}
            logs={data.logs}
          />
        )}
      </main>
    </div>
  );
}
