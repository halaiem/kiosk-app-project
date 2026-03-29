import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import type {
  AdminTab,
  ServerInfo,
  AuditLog,
  UserRole,
  ServerStatus,
} from "@/types/dashboard";
import { DEMO_USERS } from "@/hooks/useDashboardAuth";

interface AdminPanelProps {
  tab: AdminTab;
  servers: ServerInfo[];
  logs: AuditLog[];
}

function formatDateTime(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month} ${hours}:${mins}`;
}

const ROLE_STYLES: Record<UserRole, string> = {
  dispatcher: "bg-blue-500/15 text-blue-500",
  technician: "bg-green-500/15 text-green-500",
  admin: "bg-red-500/15 text-red-500",
};

const ROLE_LABELS: Record<UserRole, string> = {
  dispatcher: "Диспетчер",
  technician: "Техник",
  admin: "Администратор",
};

const SERVER_STATUS_DOT: Record<ServerStatus, string> = {
  online: "bg-green-500",
  warning: "bg-yellow-500",
  offline: "bg-red-500",
};

const SERVER_STATUS_LABELS: Record<ServerStatus, string> = {
  online: "Онлайн",
  warning: "Внимание",
  offline: "Недоступен",
};

const LOG_ACTION_ICONS: Record<string, string> = {
  login: "LogIn",
  logout: "LogOut",
  message: "MessageSquare",
  document: "FileText",
  password: "Key",
  alert: "AlertTriangle",
  route: "Route",
  server: "Server",
  user: "Users",
  settings: "Settings",
};

type RoleFilter = "all" | UserRole;

function UsersView() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("dispatcher");
  const [newPassword, setNewPassword] = useState("");

  const filtered = useMemo(() => {
    if (roleFilter === "all") return DEMO_USERS;
    return DEMO_USERS.filter((u) => u.user.role === roleFilter);
  }, [roleFilter]);

  const filters: { key: RoleFilter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "dispatcher", label: "Диспетчеры" },
    { key: "technician", label: "Техники" },
    { key: "admin", label: "Администраторы" },
  ];

  const toggleBlock = (id: string) => {
    setBlockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetAddForm = () => {
    setShowAddForm(false);
    setNewName("");
    setNewId("");
    setNewRole("dispatcher");
    setNewPassword("");
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setShowAddForm(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Icon name="UserPlus" className="w-3.5 h-3.5" />
            Добавить
          </button>
        </div>

        {showAddForm && (
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="UserPlus" className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Новый пользователь</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <input
                type="text"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="ID"
                className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Имя"
                className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="dispatcher">Диспетчер</option>
                <option value="technician">Техник</option>
                <option value="admin">Администратор</option>
              </select>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Пароль"
                className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={resetAddForm}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Отмена
              </button>
              <button
                disabled={!newId.trim() || !newName.trim() || !newPassword.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Создать
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-5 py-2.5 font-medium">ID</th>
              <th className="text-left px-3 py-2.5 font-medium">Имя</th>
              <th className="text-left px-3 py-2.5 font-medium">Роль</th>
              <th className="text-left px-3 py-2.5 font-medium">Статус</th>
              <th className="text-right px-5 py-2.5 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const isBlocked = blockedIds.has(entry.id);
              const isEditing = editingUserId === entry.id;
              return (
                <tr
                  key={entry.id}
                  className={`border-b border-border transition-colors ${isBlocked ? "opacity-50" : "hover:bg-muted/30"}`}
                >
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{entry.id}</td>
                  <td className="px-3 py-3 font-medium text-foreground">{entry.user.name}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${ROLE_STYLES[entry.user.role]}`}>
                      {ROLE_LABELS[entry.user.role]}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => toggleBlock(entry.id)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                        isBlocked
                          ? "bg-red-500/15 text-red-500 hover:bg-red-500/25"
                          : "bg-green-500/15 text-green-500 hover:bg-green-500/25"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${isBlocked ? "bg-red-500" : "bg-green-500"}`} />
                      {isBlocked ? "Заблокирован" : "Активен"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Новый пароль"
                            className="h-7 w-32 px-2 rounded border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              setEditingUserId(null);
                              setEditPassword("");
                            }}
                            className="w-7 h-7 rounded-lg bg-green-500/15 text-green-500 hover:bg-green-500/25 flex items-center justify-center transition-colors"
                          >
                            <Icon name="Check" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingUserId(null);
                              setEditPassword("");
                            }}
                            className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                          >
                            <Icon name="X" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingUserId(entry.id);
                              setEditPassword("");
                            }}
                            className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                            title="Изменить пароль"
                          >
                            <Icon name="Key" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                            title="Удалить"
                          >
                            <Icon name="Trash2" className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsView() {
  const [appName, setAppName] = useState("ТрамДиспетч");
  const [editSystem, setEditSystem] = useState(false);
  const [minPassword, setMinPassword] = useState(8);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [twoFactor, setTwoFactor] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [alertSound, setAlertSound] = useState(true);
  const [theme, setTheme] = useState("auto");

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          value ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Settings" className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Система</h3>
          </div>
          <button
            onClick={() => setEditSystem(!editSystem)}
            className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <Icon name={editSystem ? "Check" : "Pencil"} className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Название приложения</label>
            {editSystem ? (
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <p className="text-sm font-medium text-foreground">{appName}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Версия</label>
            <p className="text-sm font-medium text-foreground">2.4.1</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
            <p className="text-sm text-muted-foreground">
              Система управления городским электротранспортом
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Icon name="Shield" className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-foreground">Безопасность</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Мин. длина пароля</label>
            <input
              type="number"
              value={minPassword}
              onChange={(e) => setMinPassword(Number(e.target.value))}
              min={4}
              max={32}
              className="h-8 w-16 px-2 rounded-lg border border-border bg-background text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Таймаут сессии (мин)</label>
            <input
              type="number"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(Number(e.target.value))}
              min={5}
              max={480}
              className="h-8 w-16 px-2 rounded-lg border border-border bg-background text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Двухфакторная аутентификация</label>
            <Toggle value={twoFactor} onChange={setTwoFactor} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Макс. попыток входа</label>
            <input
              type="number"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              min={1}
              max={20}
              className="h-8 w-16 px-2 rounded-lg border border-border bg-background text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Icon name="Bell" className="w-4 h-4 text-yellow-500" />
          <h3 className="text-sm font-semibold text-foreground">Уведомления</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Email-уведомления</label>
            <Toggle value={emailNotif} onChange={setEmailNotif} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">SMS-оповещения</label>
            <Toggle value={smsAlerts} onChange={setSmsAlerts} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Звук тревог</label>
            <Toggle value={alertSound} onChange={setAlertSound} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Icon name="Palette" className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-foreground">Интерфейс</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Тема оформления</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="h-8 px-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="light">Светлая</option>
              <option value="dark">Тёмная</option>
              <option value="auto">Автоматически</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Язык</label>
            <span className="text-sm font-medium text-foreground">Русский</span>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Часовой пояс</label>
            <span className="text-sm font-medium text-foreground">UTC+3 (Москва)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServersView({ servers }: { servers: ServerInfo[] }) {
  const summary = useMemo(() => {
    const s = { total: servers.length, online: 0, warnings: 0 };
    for (const srv of servers) {
      if (srv.status === "online") s.online++;
      if (srv.status === "warning") s.warnings++;
    }
    return s;
  }, [servers]);

  const summaryCards = [
    { icon: "Server", value: summary.total, label: "Всего серверов", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: "CheckCircle", value: summary.online, label: "Онлайн", color: "text-green-500", bg: "bg-green-500/10" },
    { icon: "AlertTriangle", value: summary.warnings, label: "С предупреждениями", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ];

  const ProgressBar = ({
    value,
    color,
    warn,
  }: {
    value: number;
    color: string;
    warn?: boolean;
  }) => (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${warn ? "bg-red-500" : color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
              <Icon name={card.icon} className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {servers.length === 0 ? (
          <div className="col-span-2 bg-card border border-border rounded-2xl flex items-center justify-center py-16">
            <div className="text-center">
              <Icon name="ServerOff" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Нет серверов</p>
            </div>
          </div>
        ) : (
          servers.map((srv) => {
            const isOffline = srv.status === "offline";
            const cpuWarn = srv.cpu > 70;
            const memWarn = srv.memory > 80;
            const diskWarn = srv.disk > 80;
            return (
              <div
                key={srv.id}
                className={`bg-card border border-border rounded-2xl p-5 ${isOffline ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Icon name="Server" className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{srv.name}</p>
                      <p className="text-[11px] text-muted-foreground">Uptime: {srv.uptime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${SERVER_STATUS_DOT[srv.status]} ${
                        srv.status === "online" ? "animate-pulse" : ""
                      }`}
                    />
                    <span
                      className={`text-[11px] font-medium ${
                        srv.status === "online"
                          ? "text-green-500"
                          : srv.status === "warning"
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    >
                      {SERVER_STATUS_LABELS[srv.status]}
                    </span>
                  </div>
                </div>

                {isOffline ? (
                  <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    <Icon name="WifiOff" className="w-4 h-4 mr-2" />
                    Сервер недоступен
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">CPU</span>
                        <span className={`text-xs font-medium ${cpuWarn ? "text-red-500" : "text-foreground"}`}>
                          {srv.cpu}%
                          {cpuWarn && <Icon name="AlertTriangle" className="w-3 h-3 inline ml-1" />}
                        </span>
                      </div>
                      <ProgressBar value={srv.cpu} color="bg-blue-500" warn={cpuWarn} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Память</span>
                        <span className={`text-xs font-medium ${memWarn ? "text-red-500" : "text-foreground"}`}>
                          {srv.memory}%
                          {memWarn && <Icon name="AlertTriangle" className="w-3 h-3 inline ml-1" />}
                        </span>
                      </div>
                      <ProgressBar value={srv.memory} color="bg-yellow-500" warn={memWarn} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Диск</span>
                        <span className={`text-xs font-medium ${diskWarn ? "text-red-500" : "text-foreground"}`}>
                          {srv.disk}%
                          {diskWarn && <Icon name="AlertTriangle" className="w-3 h-3 inline ml-1" />}
                        </span>
                      </div>
                      <ProgressBar value={srv.disk} color="bg-green-500" warn={diskWarn} />
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-border">
                  <span className="text-[10px] text-muted-foreground">
                    Проверка: {formatDateTime(srv.lastCheck)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LogsView({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.userName.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.target.toLowerCase().includes(q) ||
          (l.details && l.details.toLowerCase().includes(q))
      );
    }
    return list;
  }, [logs, search]);

  const getActionIcon = (action: string): string => {
    const lower = action.toLowerCase();
    for (const [key, icon] of Object.entries(LOG_ACTION_ICONS)) {
      if (lower.includes(key)) return icon;
    }
    return "Activity";
  };

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Icon name="Search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по пользователю, действию..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} записей
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-5 py-2.5 font-medium w-[100px]">Время</th>
              <th className="text-left px-3 py-2.5 font-medium">Пользователь</th>
              <th className="text-left px-3 py-2.5 font-medium">Действие</th>
              <th className="text-left px-3 py-2.5 font-medium">Объект</th>
              <th className="text-left px-3 py-2.5 font-medium">Подробности</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Icon name="ScrollText" className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Нет записей</p>
                </td>
              </tr>
            ) : (
              filtered.map((log, idx) => (
                <tr
                  key={log.id}
                  className={`border-b border-border transition-colors ${
                    idx % 2 === 0 ? "" : "bg-muted/20"
                  }`}
                >
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {log.userName.charAt(0)}
                        </span>
                      </div>
                      <span className="text-foreground text-xs font-medium">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Icon name={getActionIcon(log.action)} className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{log.target}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]">
                    {log.details || "---"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPanel({ tab, servers, logs }: AdminPanelProps) {
  if (tab === "users") return <UsersView />;
  if (tab === "settings") return <SettingsView />;
  if (tab === "servers") return <ServersView servers={servers} />;
  if (tab === "logs") return <LogsView logs={logs} />;
  return null;
}
