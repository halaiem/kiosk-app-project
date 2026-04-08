import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardAuth } from '@/hooks/useDashboardAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNewMessageNotifier } from '@/hooks/useNewMessageNotifier';
import { useAppSettings } from '@/context/AppSettingsContext';
import DashboardLogin from '@/components/dashboard/DashboardLogin';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DispatcherPanel from '@/components/dashboard/panels/DispatcherPanel';
import TechnicianPanel from '@/components/dashboard/panels/TechnicianPanel';
import AdminPanel from '@/components/dashboard/panels/AdminPanel';
import IridaToolsPanel from '@/components/dashboard/panels/IridaToolsPanel';
import Icon from '@/components/ui/icon';
import type { DashboardTab, DispatcherTab, TechnicianTab, AdminTab, IridaToolsTab } from '@/types/dashboard';

const DEFAULT_TABS: Record<string, DashboardTab> = {
  dispatcher: 'overview',
  technician: 'routes',
  admin: 'settings',
  irida_tools: 'cities',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, error, loading, login, logout, getRoleName } = useDashboardAuth();
  const activeUser = user;
  const data = useDashboardData(activeUser);
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
    if (activeUser?.role) {
      setActiveTab(DEFAULT_TABS[activeUser.role] || 'overview');
    }
  }, [activeUser?.role]);

  const handleLogin = async (id: string, password: string) => {
    const success = await login(id, password);
    return success;
  };

  const handleIridaToolsLogin = () => {
    navigate('/dashboard-irida-tools');
  };

  const handleLogout = async () => {
    await logout();
    setActiveTab('overview');
  };

  const toggleTheme = () => {
    updateSettings({ dashboardTheme: settings.dashboardTheme === 'dark' ? 'light' : 'dark' });
  };

  useNewMessageNotifier(activeUser?.role === 'dispatcher' ? data.messages : []);

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

  if (!activeUser) {
    return <DashboardLogin onLogin={handleLogin} onIridaToolsLogin={handleIridaToolsLogin} error={error} />;
  }

  const isLight = settings.dashboardTheme === 'light';

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden">
      <DashboardSidebar
        user={activeUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        getRoleName={getRoleName}
        counts={counts}
        isDark={!isLight}
        onToggleTheme={toggleTheme}
        onReload={activeUser.role !== 'irida_tools' ? data.reload : undefined}
      />
      <main className="flex-1 overflow-auto p-6 relative">
        {activeUser.role !== 'irida_tools' && (
          <button
            onClick={toggleTheme}
            title={isLight ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
            className="fixed top-4 right-4 z-50 w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-md border border-border bg-card text-foreground hover:bg-muted"
          >
            <Icon name={isLight ? 'Moon' : 'Sun'} className="w-4 h-4" />
          </button>
        )}

        {activeUser.role === 'dispatcher' && (
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
            userName={activeUser.name}
            onOpenMessages={() => setActiveTab('messages')}
          />
        )}
        {activeUser.role === 'technician' && (
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
        {activeUser.role === 'admin' && (
          <AdminPanel
            tab={activeTab as AdminTab}
            servers={data.servers}
            logs={data.logs}
          />
        )}
        {activeUser.role === 'irida_tools' && (
          <IridaToolsPanel tab={activeTab as IridaToolsTab} />
        )}
      </main>
    </div>
  );
}