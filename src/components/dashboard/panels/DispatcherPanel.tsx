import { useState, useMemo, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import type {
  DispatcherTab,
  DispatchMessage,
  Notification,
  Alert,
  DriverInfo,
  DashboardStats,
  AlertLevel,
} from "@/types/dashboard";

interface DispatcherPanelProps {
  tab: DispatcherTab;
  messages: DispatchMessage[];
  notifications: Notification[];
  alerts: Alert[];
  drivers: DriverInfo[];
  stats: DashboardStats;
  onSendMessage: (driverId: string, text: string) => void;
  onMarkMessageRead: (id: string) => void;
  onResolveAlert: (id: string, resolverName: string) => void;
  onMarkNotificationRead: (id: string) => void;
  userName: string;
}

function formatTimeAgo(date: Date): string {
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

const ALERT_TYPE_ICONS: Record<Alert["type"], string> = {
  sos: "Siren",
  breakdown: "Wrench",
  delay: "Clock",
  deviation: "MapPinOff",
  speeding: "Gauge",
};

const ALERT_TYPE_LABELS: Record<Alert["type"], string> = {
  sos: "SOS",
  breakdown: "Поломка",
  delay: "Задержка",
  deviation: "Отклонение",
  speeding: "Превышение",
};

const LEVEL_COLORS: Record<AlertLevel, string> = {
  info: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  warning: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  critical: "bg-red-500/15 text-red-500 border-red-500/30",
};

const LEVEL_BORDER: Record<AlertLevel, string> = {
  info: "border-l-blue-500",
  warning: "border-l-yellow-500",
  critical: "border-l-red-500",
};

const LEVEL_ICONS: Record<AlertLevel, { name: string; color: string }> = {
  info: { name: "Info", color: "text-blue-500" },
  warning: { name: "AlertTriangle", color: "text-yellow-500" },
  critical: { name: "AlertOctagon", color: "text-red-500" },
};

function OverviewView({
  stats,
  alerts,
  messages,
}: {
  stats: DashboardStats;
  alerts: Alert[];
  messages: DispatchMessage[];
}) {
  const recentAlerts = useMemo(
    () =>
      [...alerts]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5),
    [alerts]
  );

  const recentMessages = useMemo(
    () =>
      [...messages]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5),
    [messages]
  );

  const statCards = [
    {
      icon: "Users",
      value: stats.activeDrivers,
      label: "Водителей на линии",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: "Route",
      value: stats.activeRoutes,
      label: "Активных маршрутов",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      icon: "AlertTriangle",
      value: stats.unresolvedAlerts,
      label: "Нерешённых тревог",
      color: stats.unresolvedAlerts > 0 ? "text-red-500" : "text-yellow-500",
      bg: stats.unresolvedAlerts > 0 ? "bg-red-500/10" : "bg-yellow-500/10",
    },
    {
      icon: "TrendingUp",
      value: `${stats.onTimePercent}%`,
      label: "Вовремя",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4"
          >
            <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
              <Icon name={card.icon} className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="AlertTriangle" className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-foreground">Последние тревоги</h3>
          </div>
          {recentAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Нет тревог</p>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-l-[3px] ${LEVEL_BORDER[alert.level]} bg-muted/40`}
                >
                  <Icon
                    name={ALERT_TYPE_ICONS[alert.type]}
                    className={`w-4 h-4 shrink-0 ${LEVEL_ICONS[alert.level].color}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {alert.driverName} — {ALERT_TYPE_LABELS[alert.type]}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{alert.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatTimeAgo(alert.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="MessageSquare" className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">Последние сообщения</h3>
          </div>
          {recentMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Нет сообщений</p>
          ) : (
            <div className="space-y-2">
              {recentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/40"
                >
                  <Icon
                    name={msg.direction === "incoming" ? "ArrowDownLeft" : "ArrowUpRight"}
                    className={`w-4 h-4 shrink-0 ${msg.direction === "incoming" ? "text-blue-500" : "text-green-500"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {msg.driverName}
                      <span className="text-muted-foreground font-normal"> #{msg.vehicleNumber}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{msg.text}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {msg.type === "urgent" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-500">
                        СРОЧ
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatTimeAgo(msg.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessagesView({
  messages,
  drivers,
  onSendMessage,
  onMarkMessageRead,
}: {
  messages: DispatchMessage[];
  drivers: DriverInfo[];
  onSendMessage: (driverId: string, text: string) => void;
  onMarkMessageRead: (id: string) => void;
}) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const threads = useMemo(() => {
    const map = new Map<
      string,
      {
        driverId: string;
        driverName: string;
        vehicleNumber: string;
        routeNumber: string;
        lastMessage: DispatchMessage;
        unreadCount: number;
      }
    >();
    const sorted = [...messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    for (const msg of sorted) {
      const existing = map.get(msg.driverId);
      const unread =
        (existing?.unreadCount ?? 0) +
        (msg.direction === "incoming" && !msg.read ? 1 : 0);
      map.set(msg.driverId, {
        driverId: msg.driverId,
        driverName: msg.driverName,
        vehicleNumber: msg.vehicleNumber,
        routeNumber: msg.routeNumber,
        lastMessage: msg,
        unreadCount: unread,
      });
    }
    return [...map.values()].sort(
      (a, b) =>
        new Date(b.lastMessage.timestamp).getTime() -
        new Date(a.lastMessage.timestamp).getTime()
    );
  }, [messages]);

  const conversation = useMemo(() => {
    if (!selectedDriverId) return [];
    return [...messages]
      .filter((m) => m.driverId === selectedDriverId)
      .sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [messages, selectedDriverId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.length]);

  useEffect(() => {
    if (selectedDriverId) {
      conversation
        .filter((m) => m.direction === "incoming" && !m.read)
        .forEach((m) => onMarkMessageRead(m.id));
    }
  }, [selectedDriverId, conversation, onMarkMessageRead]);

  const handleSend = () => {
    if (!selectedDriverId || !newMessage.trim()) return;
    onSendMessage(selectedDriverId, newMessage.trim());
    setNewMessage("");
  };

  const selectedThread = threads.find((t) => t.driverId === selectedDriverId);

  return (
    <div className="flex h-full gap-4">
      <div className="w-80 shrink-0 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Диалоги</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Нет сообщений</p>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.driverId}
                onClick={() => setSelectedDriverId(thread.driverId)}
                className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                  selectedDriverId === thread.driverId
                    ? "bg-primary/10"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-foreground truncate">
                    {thread.driverName}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {formatTimeAgo(thread.lastMessage.timestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    #{thread.vehicleNumber} / М{thread.routeNumber}
                  </span>
                  {thread.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {thread.lastMessage.direction === "outgoing" && (
                    <span className="text-muted-foreground/60">Вы: </span>
                  )}
                  {thread.lastMessage.text}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
        {!selectedDriverId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Icon name="MessageSquare" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Выберите диалог</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {selectedThread?.driverName.charAt(0) ?? "?"}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {selectedThread?.driverName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  #{selectedThread?.vehicleNumber} / Маршрут {selectedThread?.routeNumber}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {conversation.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm ${
                      msg.direction === "outgoing"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.direction === "outgoing"
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatTimeAgo(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="px-4 py-3 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Написать сообщение..."
                  className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                  className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Icon name="Send" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type NotifFilter = "all" | "unread" | AlertLevel;

function NotificationsView({
  notifications,
  onMarkNotificationRead,
}: {
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
}) {
  const [filter, setFilter] = useState<NotifFilter>("all");

  const filtered = useMemo(() => {
    let list = [...notifications].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (filter === "unread") list = list.filter((n) => !n.read);
    else if (filter === "info" || filter === "warning" || filter === "critical")
      list = list.filter((n) => n.level === filter);
    return list;
  }, [notifications, filter]);

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

type AlertFilter = "all" | "unresolved" | "resolved";

function AlertsView({
  alerts,
  onResolveAlert,
  userName,
}: {
  alerts: Alert[];
  onResolveAlert: (id: string, resolverName: string) => void;
  userName: string;
}) {
  const [filter, setFilter] = useState<AlertFilter>("all");

  const filtered = useMemo(() => {
    let list = [...alerts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (filter === "unresolved") list = list.filter((a) => !a.resolved);
    else if (filter === "resolved") list = list.filter((a) => a.resolved);
    return list;
  }, [alerts, filter]);

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
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} записей
        </span>
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

export default function DispatcherPanel({
  tab,
  messages,
  notifications,
  alerts,
  drivers,
  stats,
  onSendMessage,
  onMarkMessageRead,
  onResolveAlert,
  onMarkNotificationRead,
  userName,
}: DispatcherPanelProps) {
  if (tab === "overview") {
    return <OverviewView stats={stats} alerts={alerts} messages={messages} />;
  }
  if (tab === "messages") {
    return (
      <MessagesView
        messages={messages}
        drivers={drivers}
        onSendMessage={onSendMessage}
        onMarkMessageRead={onMarkMessageRead}
      />
    );
  }
  if (tab === "notifications") {
    return (
      <NotificationsView
        notifications={notifications}
        onMarkNotificationRead={onMarkNotificationRead}
      />
    );
  }
  if (tab === "alerts") {
    return (
      <AlertsView
        alerts={alerts}
        onResolveAlert={onResolveAlert}
        userName={userName}
      />
    );
  }
  return null;
}
