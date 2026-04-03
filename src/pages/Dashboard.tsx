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
  const { user, error, loading, login, logout, getRoleName } = useDashboardAuth();
  const data = useDashboardData(user);
  const { settings, updateSettings } = useAppSettings();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  useEffect(() => {
    const root = document.documentElement;
    if (settings.dashboardTheme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    return () => { root.classList.add('dark'); };
  }, [settings.dashboardTheme]);

  useEffect(() => {
    if (user?.role) {
      setActiveTab(DEFAULT_TABS[user.role] || 'overview');
    }
  }, [user?.role]);

  const handleLogin = async (id: string, password: string) => {
    const success = await login(id, password);
    return success;
  };

  const handleLogout = async () => {
    await logout();
    setActiveTab('overview');
  };

  const toggleTheme = () => {
    updateSettings({ dashboardTheme: settings.dashboardTheme === 'dark' ? 'light' : 'dark' });
  };

  const counts = useMemo(() => ({
    messages: data.messages.filter((m) => !m.read && m.direction === 'incoming').length,
    notifications: data.notifications.filter((n) => !n.read).length,
    alerts: data.alerts.filter((a) => !a.resolved).length,
    vehicle_issues: data.issueReports.filter((r) => r.reportStatus === 'new').length,
  }), [data.messages, data.notifications, data.alerts, data.issueReports]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#152d52" }}>
        <div className="text-white/60 text-sm">Загрузка...</div>
      </div>
    );
  }

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
        isDark={!isLight}
        onToggleTheme={toggleTheme}
        onReload={data.reload}
      />
      <main className="flex-1 overflow-auto p-6 relative">
        {/* Theme toggle */}
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
            issueReports={data.issueReports}
            onSendMessage={data.sendMessage}
            onMarkMessageRead={data.markMessageRead}
            onResolveAlert={data.resolveAlert}
            onMarkNotificationRead={data.markNotificationRead}
            onResolveIssue={data.resolveIssue}
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
            onReload={data.reload}
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