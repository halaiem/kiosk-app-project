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
}

export default function DashboardSidebar({
  user,
  activeTab,
  onTabChange,
  onLogout,
  getRoleName,
  counts,
}: DashboardSidebarProps) {
  const navItems = NAV_BY_ROLE[user.role];

  return (
    <div
      className="w-64 h-full flex flex-col shrink-0"
      style={{
        backgroundColor: "hsl(var(--sidebar-background))",
        color: "hsl(var(--sidebar-foreground))",
      }}
    >
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(var(--sidebar-primary) / 0.15)" }}>
            <Icon name="TramFront" className="w-5 h-5" style={{ color: "hsl(var(--sidebar-primary))" }} />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">ТрамДиспетч</h1>
            <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 ${ROLE_BADGE_COLORS[user.role]}`}>
              {getRoleName(user.role)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ backgroundColor: "hsl(var(--sidebar-accent))" }}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-[11px] opacity-50 truncate">{user.id}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.tab;
          const count = counts?.[item.tab];
          return (
            <button
              key={item.tab}
              onClick={() => onTabChange(item.tab)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                isActive
                  ? "text-white"
                  : "opacity-70 hover:opacity-100"
              }`}
              style={
                isActive
                  ? { backgroundColor: "hsl(var(--sidebar-primary))" }
                  : undefined
              }
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "hsl(var(--sidebar-accent))";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Icon name={item.icon} className="w-[18px] h-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
              {count != null && count > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-2" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium opacity-70 hover:opacity-100 transition-colors"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "hsl(var(--sidebar-accent))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <Icon name="LogOut" className="w-[18px] h-[18px] shrink-0" />
          <span>Выйти</span>
        </button>
      </div>
    </div>
  );
}
