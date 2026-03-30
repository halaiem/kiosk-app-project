import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { DashboardUser, DashboardTab, UserRole } from "@/types/dashboard";

interface NavItem {
  tab: DashboardTab;
  icon: string;
  label: string;
}

const DISPATCHER_NAV: NavItem[] = [
  { tab: "overview", icon: "LayoutDashboard", label: "Обзор" },
  { tab: "messages", icon: "MessageSquare", label: "Сообщения" },
  { tab: "notifications", icon: "Bell", label: "Уведомления" },
  { tab: "alerts", icon: "AlertTriangle", label: "Тревоги" },
];

const TECHNICIAN_NAV: NavItem[] = [
  { tab: "routes", icon: "Route", label: "Маршруты" },
  { tab: "documents", icon: "FileText", label: "Документы" },
  { tab: "vehicles", icon: "Bus", label: "Транспорт" },
  { tab: "drivers", icon: "Users", label: "Водители" },
  { tab: "schedule", icon: "Calendar", label: "Расписание" },
];

const ADMIN_NAV: NavItem[] = [
  { tab: "users", icon: "Users", label: "Пользователи" },
  { tab: "settings", icon: "Settings", label: "Настройки" },
  { tab: "servers", icon: "Server", label: "Серверы" },
  { tab: "logs", icon: "ScrollText", label: "Логи" },
];

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  dispatcher: DISPATCHER_NAV,
  technician: TECHNICIAN_NAV,
  admin: ADMIN_NAV,
};

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  dispatcher: "bg-blue-500/20 text-blue-400",
  technician: "bg-green-500/20 text-green-400",
  admin: "bg-red-500/20 text-red-400",
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
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navItems = NAV_BY_ROLE[user.role];

  return (
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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "hsl(var(--sidebar-primary) / 0.15)" }}>
              <Icon name="TramFront" className="w-4 h-4" style={{ color: "hsl(var(--sidebar-primary))" }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate">ТрамДиспетч</p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ROLE_BADGE_COLORS[user.role]}`}>
                {getRoleName(user.role)}
              </span>
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
          const count = counts?.[item.tab];
          return (
            <button
              key={item.tab}
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
                {collapsed && count != null && count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5 leading-none">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && count != null && count > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout + theme toggle */}
      <div className="px-2 pb-4 pt-2 space-y-0.5" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
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
  );
}