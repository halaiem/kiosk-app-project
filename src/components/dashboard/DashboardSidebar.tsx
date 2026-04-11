import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import type { DashboardUser, DashboardTab, UserRole, IridaToolsTab, MechanicTab, EngineerTab, ManagerTab } from "@/types/dashboard";
import { useAppSettings } from '@/context/AppSettingsContext';
import { fetchDriverUnread } from '@/api/chatApi';
import NotificationPreferences from "./NotificationPreferences";

function useSidebarLight() {
  const [isLight, setIsLight] = useState(true);
  useEffect(() => {
    const check = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-background').trim();
      // HSL format: "H S% L%"
      const match = raw.match(/(\d+)\s+([\d.]+)%\s+([\d.]+)%/);
      if (match) {
        setIsLight(parseFloat(match[3]) > 50);
      }
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    return () => obs.disconnect();
  }, []);
  return isLight;
}

interface NavItem {
  tab: DashboardTab;
  icon: string;
  label: string;
}

const DISPATCHER_NAV: NavItem[] = [
  { tab: "overview", icon: "LayoutDashboard", label: "Обзор" },
  { tab: "service_requests", icon: "ClipboardList", label: "Заявки" },
  { tab: "dash_messages" as DashboardTab, icon: "MessagesSquare", label: "Мессенджер" },
  { tab: "notifications", icon: "Bell", label: "Уведомления" },
  { tab: "alerts", icon: "AlertTriangle", label: "Тревоги" },
  { tab: "vehicle_issues", icon: "Truck", label: "Проблемы ТС" },
];

const TECHNICIAN_NAV: NavItem[] = [
  { tab: "service_requests", icon: "ClipboardList", label: "Заявки" },
  { tab: "routes", icon: "Route", label: "Маршруты" },
  { tab: "documents", icon: "FileText", label: "Документы" },
  { tab: "admin_vehicles" as DashboardTab, icon: "Truck", label: "Транспортные средства" },
  { tab: "vehicles", icon: "Bus", label: "Транспорт" },
  { tab: "drivers", icon: "Users", label: "Водители" },
  { tab: "schedule", icon: "Calendar", label: "Расписание" },
  { tab: "daily_assignment", icon: "ClipboardList", label: "Наряд на день" },
  { tab: "diagnostics", icon: "Activity", label: "Диагностика" },
  { tab: "notifications", icon: "Bell", label: "Уведомления" },
  { tab: "dash_messages" as DashboardTab, icon: "MessageSquare", label: "Сообщения" },
];

const ADMIN_NAV: NavItem[] = [
  { tab: "users", icon: "Users", label: "Пользователи" },
  { tab: "dash_messages" as DashboardTab, icon: "MessageSquare", label: "Сообщения" },
  { tab: "notifications", icon: "Bell", label: "Уведомления" },
  { tab: "service_requests" as DashboardTab, icon: "ClipboardList", label: "Заявки" },
  { tab: "ticket_archive" as DashboardTab, icon: "Archive", label: "Архив заявок" },
  { tab: "settings", icon: "Settings", label: "Настройки" },
  { tab: "diagnostic_apis", icon: "Plug", label: "API" },
  { tab: "servers", icon: "Server", label: "Серверы" },
  { tab: "logs", icon: "ScrollText", label: "Логи" },
];

const IRIDA_TOOLS_NAV: NavItem[] = [
  { tab: "cities" as IridaToolsTab, icon: "Building2", label: "Города" },
  { tab: "it_settings" as IridaToolsTab, icon: "Settings2", label: "Настройки" },
  { tab: "ui_design" as IridaToolsTab, icon: "Palette", label: "UI-дизайн" },
  { tab: "software" as IridaToolsTab, icon: "Package", label: "ПО" },
  { tab: "connection" as IridaToolsTab, icon: "Wifi", label: "Подключение" },
  { tab: "server" as IridaToolsTab, icon: "Server", label: "Сервер" },
  { tab: "equipment" as IridaToolsTab, icon: "Cpu", label: "Оборудование" },
  { tab: "instructions" as IridaToolsTab, icon: "BookOpen", label: "Инструкции" },
  { tab: "database" as IridaToolsTab, icon: "Database", label: "База данных" },
  { tab: "it_logs" as IridaToolsTab, icon: "ScrollText", label: "Логи" },
  { tab: "code_editor" as IridaToolsTab, icon: "FileCode2", label: "Код" },
  { tab: "terminal" as IridaToolsTab, icon: "TerminalSquare", label: "Терминал" },
];

const MECHANIC_NAV: NavItem[] = [
  { tab: "service_requests" as MechanicTab, icon: "ClipboardList", label: "Заявки" },
  { tab: "auto_diagnostics" as MechanicTab, icon: "Activity", label: "Диагностика" },
  { tab: "service_log" as MechanicTab, icon: "BookOpen", label: "Журнал" },
  { tab: "ts_docs" as MechanicTab, icon: "FolderOpen", label: "Документация ТС" },
  { tab: "email" as MechanicTab, icon: "Mail", label: "Email" },
  { tab: "notifications" as MechanicTab, icon: "Bell", label: "Уведомления" },
  { tab: "dash_messages" as MechanicTab, icon: "MessageSquare", label: "Мессенджер" },
];

const ENGINEER_NAV: NavItem[] = [
  { tab: "service_requests" as EngineerTab, icon: "ClipboardList", label: "Заявки" },
  { tab: "documents" as DashboardTab, icon: "FileText", label: "Документы" },
  { tab: "vehicles" as DashboardTab, icon: "Bus", label: "Транспорт" },
  { tab: "diagnostics" as DashboardTab, icon: "Activity", label: "Диагностика" },
  { tab: "notifications" as DashboardTab, icon: "Bell", label: "Уведомления" },
  { tab: "dash_messages" as DashboardTab, icon: "MessageSquare", label: "Сообщения" },
];

const MANAGER_NAV: NavItem[] = [
  { tab: "service_requests" as ManagerTab, icon: "ClipboardList", label: "Заявки" },
  { tab: "vehicles" as DashboardTab, icon: "Bus", label: "Транспорт" },
  { tab: "drivers" as DashboardTab, icon: "Users", label: "Персонал" },
  { tab: "schedule" as DashboardTab, icon: "Calendar", label: "Расписание" },
  { tab: "notifications" as DashboardTab, icon: "Bell", label: "Уведомления" },
  { tab: "dash_messages" as DashboardTab, icon: "MessageSquare", label: "Сообщения" },
];

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  dispatcher: DISPATCHER_NAV,
  technician: TECHNICIAN_NAV,
  admin: ADMIN_NAV,
  irida_tools: IRIDA_TOOLS_NAV,
  mechanic: MECHANIC_NAV,
  engineer: ENGINEER_NAV,
  manager: MANAGER_NAV,
};

const ROLE_BADGE_BG: Record<UserRole, string> = {
  dispatcher: "bg-black/15",
  technician: "bg-black/15",
  admin: "bg-black/15",
  irida_tools: "bg-black/15",
  mechanic: "bg-black/15",
  engineer: "bg-black/15",
  manager: "bg-black/15",
};

interface DashboardSidebarProps {
  user: DashboardUser;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onLogout: () => void;
  getRoleName: (role: UserRole) => string;
  counts?: Record<string, number>;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onReload?: () => void;
}

export default function DashboardSidebar({
  user,
  activeTab,
  onTabChange,
  onLogout,
  getRoleName,
  counts,
  isDark,
  onToggleTheme,
  onReload,
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [driverUnread, setDriverUnread] = useState(0);
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);

  const handleReload = useCallback(async () => {
    if (!onReload || refreshing) return;
    setRefreshing(true);
    try {
      await onReload();
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  }, [onReload, refreshing]);
  const sidebarIsLight = useSidebarLight();
  const { settings } = useAppSettings();
  const navItems = NAV_BY_ROLE[user.role];

  const canSeeDriverUnread =
    user.role === 'dispatcher' || user.role === 'admin' || user.role === 'technician' || user.role === 'engineer' || user.role === 'manager';

  useEffect(() => {
    if (!canSeeDriverUnread) return;
    let active = true;
    const poll = async () => {
      try {
        const n = await fetchDriverUnread();
        if (active) setDriverUnread(n || 0);
      } catch {
        if (active) setDriverUnread(0);
      }
    };
    poll();
    const iv = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [canSeeDriverUnread]);

  const openMessengerWindow = () => {
    const url = `${window.location.pathname}?messenger=true`;
    window.open(url, 'messenger', 'width=700,height=900,resizable=yes,scrollbars=yes');
  };

  return (
    <>
    <div
      className="h-full flex flex-col shrink-0 transition-all duration-300"
      style={{
        width: collapsed ? "60px" : "240px",
        backgroundColor: "hsl(var(--sidebar-background))",
        color: "hsl(var(--sidebar-foreground))",
      }}
    >
      {/* Header */}
      <div className={`flex items-center pt-4 pb-3 px-3 ${collapsed ? "justify-center" : "justify-between"}`}
        style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
              style={{ backgroundColor: 'hsl(24 88% 49%)' }}>
              {settings.carrierLogo ? (
                <img src={settings.carrierLogo} alt={settings.carrierName} className="w-6 h-6 object-contain" />
              ) : (
                <Icon name="Building2" className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate">{settings.carrierName || 'ИРИДА'}</p>
              {settings.carrierDescription ? (
                <p className="text-[10px] opacity-60 truncate leading-tight">{settings.carrierDescription}</p>
              ) : (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ROLE_BADGE_BG[user.role]} ${sidebarIsLight ? 'text-[#141414]' : 'text-white'}`}>
                  {getRoleName(user.role)}
                </span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity shrink-0"
          style={{ backgroundColor: "hsl(var(--sidebar-accent))" }}
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
        >
          <Icon name={collapsed ? "PanelLeftOpen" : "PanelLeftClose"} className="w-4 h-4" />
        </button>
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 flex items-center gap-2.5 px-3 py-2 rounded-lg"
          style={{ backgroundColor: "hsl(var(--sidebar-accent))" }}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{user.name}</p>
            <p className="text-[10px] opacity-50 truncate">{user.id}</p>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="flex justify-center mt-3 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold"
            title={user.name}>
            {user.name.charAt(0)}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.tab;
          const baseCount = counts?.[item.tab] || 0;
          const isMessenger = item.tab === ('dash_messages' as DashboardTab);
          const extra = isMessenger && canSeeDriverUnread ? driverUnread : 0;
          const count = baseCount + extra;
          return (
            <div key={item.tab} className="relative group">
              <button
                onClick={() => onTabChange(item.tab)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-colors relative
                  ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"}
                  ${isActive ? "text-white" : "opacity-70 hover:opacity-100"}`}
                style={isActive ? { backgroundColor: "hsl(var(--sidebar-primary))" } : undefined}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "hsl(var(--sidebar-accent))"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span className="relative shrink-0">
                  <Icon name={item.icon} className="w-[18px] h-[18px]" />
                  {collapsed && count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5 leading-none">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && count > 0 && (
                  <span className={`ml-auto ${isMessenger ? "mr-7" : ""} bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1`}>
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
              {isMessenger && !collapsed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openMessengerWindow();
                  }}
                  title="Открыть в отдельном окне"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: "hsl(var(--sidebar-accent))" }}
                >
                  <Icon name="ExternalLink" className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </nav>

      {/* Refresh + Logout + theme toggle */}
      <div className="px-2 pb-4 pt-2 space-y-0.5" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
        {onReload && (
          <button
            onClick={handleReload}
            disabled={refreshing}
            title={collapsed ? "Обновить данные" : undefined}
            className={`w-full flex items-center rounded-lg text-sm font-medium opacity-70 hover:opacity-100 transition-colors
              ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"}
              ${refreshing ? "opacity-40 cursor-not-allowed" : ""}`}
            onMouseEnter={(e) => { if (!refreshing) e.currentTarget.style.backgroundColor = "hsl(var(--sidebar-accent))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Icon name="RefreshCw" className={`w-[18px] h-[18px] shrink-0 ${refreshing ? "animate-spin" : ""}`} />
            {!collapsed && <span>{refreshing ? "Обновляю..." : "Обновить"}</span>}
          </button>
        )}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            title={collapsed ? (isDark ? "Светлая тема" : "Тёмная тема") : undefined}
            className={`w-full flex items-center rounded-lg text-sm font-medium opacity-70 hover:opacity-100 transition-colors
              ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"}`}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(var(--sidebar-accent))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Icon name={isDark ? "Sun" : "Moon"} className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>{isDark ? "Светлая тема" : "Тёмная тема"}</span>}
          </button>
        )}
        {["dispatcher", "technician", "admin", "mechanic", "engineer", "manager"].includes(user.role) && (
          <button
            onClick={() => onTabChange("voting" as DashboardTab)}
            title={collapsed ? "Голосование" : undefined}
            className={`w-full flex items-center rounded-lg text-sm font-medium transition-colors relative
              ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"}
              ${activeTab === "voting" ? "text-white" : "opacity-70 hover:opacity-100"}`}
            style={activeTab === "voting" ? { backgroundColor: "hsl(var(--sidebar-primary))" } : undefined}
            onMouseEnter={(e) => { if (activeTab !== "voting") e.currentTarget.style.backgroundColor = "hsl(var(--sidebar-accent))"; }}
            onMouseLeave={(e) => { if (activeTab !== "voting") e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Icon name="Star" className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Голосование</span>}
          </button>
        )}
        <button
          onClick={() => setShowNotifPrefs(true)}
          title={collapsed ? "Настройки уведомлений" : undefined}
          className={`w-full flex items-center rounded-lg text-sm font-medium opacity-70 hover:opacity-100 transition-colors
            ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"}`}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(var(--sidebar-accent))"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <Icon name="BellRing" className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Уведомления</span>}
        </button>
        <button
          onClick={onLogout}
          title={collapsed ? "Выйти" : undefined}
          className={`w-full flex items-center rounded-lg text-sm font-medium opacity-70 hover:opacity-100 transition-colors
            ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"}`}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(var(--sidebar-accent))"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <Icon name="LogOut" className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Выйти</span>}
        </button>
      </div>
    </div>

    {showNotifPrefs && <NotificationPreferences onClose={() => setShowNotifPrefs(false)} />}
    </>
  );
}