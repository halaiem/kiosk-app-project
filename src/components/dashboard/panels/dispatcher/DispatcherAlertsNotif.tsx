import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { Notification, Alert, AlertLevel } from "@/types/dashboard";

// ── Shared constants ──────────────────────────────────────────────────────────
export function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days}д назад`;
}

export const ALERT_TYPE_ICONS: Record<Alert["type"], string> = {
  sos: "Siren",
  breakdown: "Wrench",
  delay: "Clock",
  deviation: "MapPinOff",
  speeding: "Gauge",
};

export const ALERT_TYPE_LABELS: Record<Alert["type"], string> = {
  sos: "SOS",
  breakdown: "Поломка",
  delay: "Задержка",
  deviation: "Отклонение",
  speeding: "Превышение",
};

export const LEVEL_COLORS: Record<AlertLevel, string> = {
  info: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  warning: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  critical: "bg-red-500/15 text-red-500 border-red-500/30",
};

export const LEVEL_BORDER: Record<AlertLevel, string> = {
  info: "border-l-blue-500",
  warning: "border-l-yellow-500",
  critical: "border-l-red-500",
};

export const LEVEL_ICONS: Record<AlertLevel, { name: string; color: string }> = {
  info: { name: "Info", color: "text-blue-500" },
  warning: { name: "AlertTriangle", color: "text-yellow-500" },
  critical: { name: "AlertOctagon", color: "text-red-500" },
};

// ── Notifications View ────────────────────────────────────────────────────────
type NotifFilter = "all" | "unread" | AlertLevel;

export function NotificationsView({
  notifications,
  onMarkNotificationRead,
}: {
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
}) {
  const [filter, setFilter] = useState<NotifFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...notifications].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (filter === "unread") list = list.filter((n) => !n.read);
    else if (filter === "info" || filter === "warning" || filter === "critical")
      list = list.filter((n) => n.level === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
    }
    return list;
  }, [notifications, filter, search]);

  const filters: { key: NotifFilter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "unread", label: "Непрочитанные" },
    { key: "info", label: "Инфо" },
    { key: "warning", label: "Внимание" },
    { key: "critical", label: "Критичные" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..." className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-36" />
          </div>
          <ReportButton filename="notifications" data={notifications} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Icon name="BellOff" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Нет уведомлений</p>
            </div>
          </div>
        ) : (
          filtered.map((notif) => {
            const lvl = LEVEL_ICONS[notif.level];
            return (
              <button
                key={notif.id}
                onClick={() => !notif.read && onMarkNotificationRead(notif.id)}
                className={`w-full text-left px-5 py-4 border-b border-border transition-colors hover:bg-muted/30 ${
                  !notif.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <Icon name={lvl.name} className={`w-5 h-5 ${lvl.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {notif.body}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatTimeAgo(notif.timestamp)}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${LEVEL_COLORS[notif.level]}`}
                      >
                        {notif.level === "info"
                          ? "Инфо"
                          : notif.level === "warning"
                            ? "Внимание"
                            : "Критично"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Alerts View ───────────────────────────────────────────────────────────────
type AlertFilter = "all" | "unresolved" | "resolved";

export function AlertsView({
  alerts,
  onResolveAlert,
  userName,
}: {
  alerts: Alert[];
  onResolveAlert: (id: string, resolverName: string) => void;
  userName: string;
}) {
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...alerts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (filter === "unresolved") list = list.filter((a) => !a.resolved);
    else if (filter === "resolved") list = list.filter((a) => a.resolved);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.driverName.toLowerCase().includes(q) || a.vehicleNumber.includes(q) || a.routeNumber.includes(q) || a.message.toLowerCase().includes(q));
    }
    return list;
  }, [alerts, filter, search]);

  const filterButtons: { key: AlertFilter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "unresolved", label: "Активные" },
    { key: "resolved", label: "Решённые" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        {filterButtons.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {alerts.filter((a) => !a.resolved).length} активных
          </span>
          <div className="relative">
            <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Борт, водитель..." className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-36" />
          </div>
          <ReportButton filename="alerts" data={alerts} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Icon name="ShieldCheck" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Нет тревог</p>
            </div>
          </div>
        ) : (
          filtered.map((alert) => (
            <div
              key={alert.id}
              className={`px-5 py-3.5 border-b border-border flex items-center gap-4 transition-colors ${
                !alert.resolved
                  ? `border-l-[3px] ${LEVEL_BORDER[alert.level]}`
                  : "border-l-[3px] border-l-green-500/40 opacity-70"
              }`}
            >
              <div className="shrink-0">
                {alert.resolved ? (
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Icon name="CheckCircle" className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      alert.level === "critical"
                        ? "bg-red-500/10"
                        : alert.level === "warning"
                          ? "bg-yellow-500/10"
                          : "bg-blue-500/10"
                    }`}
                  >
                    <Icon
                      name={ALERT_TYPE_ICONS[alert.type]}
                      className={`w-4 h-4 ${LEVEL_ICONS[alert.level].color}`}
                    />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${LEVEL_COLORS[alert.level]}`}
                  >
                    {alert.level === "critical"
                      ? "КРИТ"
                      : alert.level === "warning"
                        ? "ВНИМАНИЕ"
                        : "ИНФО"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {ALERT_TYPE_LABELS[alert.type]}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground truncate">
                  {alert.driverName}
                  <span className="text-muted-foreground font-normal">
                    {" "}#{alert.vehicleNumber} / М{alert.routeNumber}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {alert.message}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {formatTimeAgo(alert.timestamp)}
                </p>
                {alert.resolved ? (
                  <p className="text-[10px] text-green-500">
                    {alert.resolvedBy} {alert.resolvedAt && `/ ${formatTimeAgo(alert.resolvedAt)}`}
                  </p>
                ) : (
                  <button
                    onClick={() => onResolveAlert(alert.id, userName)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Решить
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
