import { useState, useMemo, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import CriticalAlertPopup from "@/components/dashboard/CriticalAlertPopup";
import MapControls from "@/components/dashboard/MapControls";
import MapVehicleCard from "@/components/dashboard/MapVehicleCard";
import ReportButton from "@/components/dashboard/ReportButton";
import type { MapVehicleInfo } from "@/components/dashboard/MapVehicleCard";
import { generateMapVehicles } from "@/hooks/useDashboardData";
import type {
  DispatcherTab,
  DispatchMessage,
  Notification,
  Alert,
  DriverInfo,
  DashboardStats,
  AlertLevel,
} from "@/types/dashboard";

const ALL_MAP_VEHICLES: MapVehicleInfo[] = generateMapVehicles();

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
  onOpenMessages?: () => void;
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
  messages,
  drivers,
  alerts,
  onOpenMessages,
  onSendMessage,
  onMarkMessageRead,
  onResolveAlert,
  userName,
}: {
  stats: DashboardStats;
  alerts: Alert[];
  messages: DispatchMessage[];
  drivers: DriverInfo[];
  onOpenMessages?: () => void;
  onSendMessage: (driverId: string, text: string) => void;
  onMarkMessageRead: (id: string) => void;
  onResolveAlert: (id: string, resolverName: string) => void;
  userName: string;
}) {
  const [hoveredVehicle, setHoveredVehicle] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<MapVehicleInfo | null>(null);
  const [filteredVehicles, setFilteredVehicles] = useState<MapVehicleInfo[]>(ALL_MAP_VEHICLES);
  const [miniInput, setMiniInput] = useState("");
  const [miniSelectedThread, setMiniSelectedThread] = useState<string | null>(null);

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

  const threads = useMemo(() => {
    const map = new Map<
      string,
      {
        driverId: string;
        driverName: string;
        vehicleNumber: string;
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
        lastMessage: msg,
        unreadCount: unread,
      });
    }
    return [...map.values()]
      .sort(
        (a, b) =>
          new Date(b.lastMessage.timestamp).getTime() -
          new Date(a.lastMessage.timestamp).getTime()
      )
      .slice(0, 5);
  }, [messages]);

  const totalUnread = threads.reduce((s, t) => s + t.unreadCount, 0);

  const okCount = ALL_MAP_VEHICLES.filter((v) => v.status === "ok").length;
  const warningCount = ALL_MAP_VEHICLES.filter((v) => v.status === "warning").length;
  const criticalCount = ALL_MAP_VEHICLES.filter((v) => v.status === "critical").length;

  return (
    <>
    <CriticalAlertPopup
      messages={messages}
      alerts={alerts}
      onResolveAlert={onResolveAlert}
      onMarkMessageRead={onMarkMessageRead}
      onSendReply={onSendMessage}
      userName={userName}
    />
    <div className="space-y-4">
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

      {/* MAP — full width */}
      {selectedVehicle && (
        <MapVehicleCard
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onContact={(_num, _id) => { setMiniSelectedThread(_id); }}
        />
      )}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="MapPin" className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Карта транспорта</h3>
            <span className="ml-1 text-xs text-muted-foreground">{filteredVehicles.length} / {ALL_MAP_VEHICLES.length} ТС</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Норма ({okCount})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Внимание ({warningCount})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Критично ({criticalCount})</span>
          </div>
        </div>
        <div className="map-container h-72 relative">
          <div className="map-grid" />
          <div className="absolute h-px bg-white/10" style={{ top: "20%", left: 0, right: 0 }} />
          <div className="absolute h-px bg-white/10" style={{ top: "45%", left: 0, right: 0 }} />
          <div className="absolute h-px bg-white/10" style={{ top: "70%", left: 0, right: 0 }} />
          <div className="absolute h-px bg-white/10" style={{ top: "88%", left: 0, right: 0 }} />
          <div className="absolute w-px bg-white/10" style={{ left: "25%", top: 0, bottom: 0 }} />
          <div className="absolute w-px bg-white/10" style={{ left: "50%", top: 0, bottom: 0 }} />
          <div className="absolute w-px bg-white/10" style={{ left: "72%", top: 0, bottom: 0 }} />
          <div className="absolute w-px bg-white/10" style={{ left: "88%", top: 0, bottom: 0 }} />
          <MapControls vehicles={ALL_MAP_VEHICLES} onFilterChange={setFilteredVehicles} />
          {filteredVehicles.map((v) => (
            <div key={v.id} className="absolute" style={{ left: `${v.x}%`, top: `${v.y}%`, transform: "translate(-50%, -50%)" }}
              onMouseEnter={() => setHoveredVehicle(v.id)} onMouseLeave={() => setHoveredVehicle(null)}
              onClick={() => setSelectedVehicle(v)}>
              <div className="relative">
                {v.status === "critical" && (
                  <span className="absolute inset-0 rounded-full bg-red-500/40 animate-pulse scale-[2.2]" />
                )}
                <div className={`w-3.5 h-3.5 rounded-full relative z-10 cursor-pointer hover:scale-125 transition-transform ${v.status === "ok" ? "bg-green-500" : v.status === "warning" ? "bg-yellow-400" : "bg-red-500"}`} />
                {hoveredVehicle === v.id && (
                  <div className={`absolute z-20 bg-popover text-popover-foreground text-[11px] rounded-lg px-2 py-1.5 shadow-lg whitespace-nowrap pointer-events-none border border-border ${v.x > 60 ? "right-5 top-0" : "left-5 top-0"}`}>
                    <span className="font-bold">Борт {v.number}</span> · М{v.route} · {v.label}
                    <p className="text-[10px] text-muted-foreground mt-0.5">Нажмите для подробностей</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MINI MESSENGER — below the map */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Icon name="MessageSquare" className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Сообщения</h3>
          {totalUnread > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
              {totalUnread}
            </span>
          )}
          <button onClick={onOpenMessages} className="ml-auto text-[11px] text-primary hover:underline font-medium">
            Открыть все →
          </button>
        </div>
        <div className="flex">
          {/* thread list */}
          <div className="w-64 shrink-0 border-r border-border overflow-y-auto max-h-48">
            {threads.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Нет чатов</p>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.driverId}
                  onClick={() => setMiniSelectedThread(thread.driverId)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors ${miniSelectedThread === thread.driverId ? "bg-primary/10" : "hover:bg-muted/50"}`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${thread.unreadCount > 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {thread.vehicleNumber.slice(-2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">#{thread.vehicleNumber}</span>
                        {thread.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5 shrink-0">{thread.unreadCount}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-primary font-medium">М{thread.lastMessage.routeNumber}</p>
                      <p className="text-[10px] text-muted-foreground font-light truncate">{thread.driverName}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          {/* quick reply */}
          <div className="flex-1 flex flex-col justify-between px-3 py-2.5 min-h-[12rem]">
            {miniSelectedThread ? (
              <>
                <div className="flex-1 overflow-y-auto space-y-1.5 mb-2 max-h-24">
                  {messages
                    .filter((m) => m.driverId === miniSelectedThread)
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 3)
                    .reverse()
                    .map((m) => (
                      <div key={m.id} className={`flex ${m.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] px-2.5 py-1.5 rounded-xl text-[11px] ${m.direction === "outgoing" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={miniInput}
                    onChange={(e) => setMiniInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && miniInput.trim()) setMiniInput(""); }}
                    placeholder="Ответить..."
                    className="flex-1 h-8 px-2.5 rounded-lg bg-muted text-foreground text-xs placeholder:text-muted-foreground focus:outline-none min-w-0"
                  />
                  <button
                    disabled={!miniInput.trim()}
                    onClick={() => setMiniInput("")}
                    className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0"
                  >
                    <Icon name="Send" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Выберите чат слева</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
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
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceMessages, setVoiceMessages] = useState<
    { id: string; driverId: string; duration: number; timestamp: Date }[]
  >([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }
    const interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

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

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.toLowerCase();
    return threads.filter(
      (t) =>
        t.driverName.toLowerCase().includes(q) ||
        t.vehicleNumber.toLowerCase().includes(q) ||
        t.routeNumber.toLowerCase().includes(q)
    );
  }, [threads, search]);

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
  }, [conversation.length, voiceMessages.length]);

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
    setReplyTo(null);
  };

  const handleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      if (selectedDriverId) {
        setVoiceMessages((prev) => [
          ...prev,
          {
            id: `vm-${Date.now()}`,
            driverId: selectedDriverId,
            duration: recordingSeconds,
            timestamp: new Date(),
          },
        ]);
      }
      setRecordingSeconds(0);
    } else {
      setIsRecording(true);
    }
  };

  const selectedThread = threads.find((t) => t.driverId === selectedDriverId);

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  const formatMsgTime = (date: Date) => {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const driverStatusOnline =
    selectedDriver?.status === "on_shift" || selectedDriver?.status === "break";

  const convVoiceMessages = voiceMessages.filter(
    (vm) => vm.driverId === selectedDriverId
  );

  type ChatItem =
    | { kind: "msg"; msg: DispatchMessage }
    | { kind: "voice"; vm: { id: string; driverId: string; duration: number; timestamp: Date } };

  const chatItems: ChatItem[] = [
    ...conversation.map((msg) => ({ kind: "msg" as const, msg })),
    ...convVoiceMessages.map((vm) => ({ kind: "voice" as const, vm })),
  ].sort((a, b) => {
    const ta =
      a.kind === "msg"
        ? new Date(a.msg.timestamp).getTime()
        : new Date(a.vm.timestamp).getTime();
    const tb =
      b.kind === "msg"
        ? new Date(b.msg.timestamp).getTime()
        : new Date(b.vm.timestamp).getTime();
    return ta - tb;
  });

  const QUICK_REPLIES = [
    "Принято, выполняю",
    "Задержка на маршруте",
    "Подтвердите остановку",
    "Выезжайте на маршрут",
    "Возвращайтесь в депо",
    "Свяжитесь с диспетчером",
  ];

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-4 bg-transparent">
      {/* LEFT: Chat area */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl overflow-hidden min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
          <h3 className="text-sm font-semibold text-foreground flex-1">
            {selectedDriverId && selectedThread ? (
              <span className="flex items-center gap-2">
                <span className="font-bold">Борт #{selectedThread.vehicleNumber}</span>
                <span className="text-primary font-medium text-xs">М{selectedThread.routeNumber}</span>
                <span className="text-muted-foreground font-light text-xs">{selectedThread.driverName}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${driverStatusOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
              </span>
            ) : (
              "Мессенджер"
            )}
          </h3>
          <button
            onClick={() => setShowNewChat(true)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            + Новый чат
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {!selectedDriverId ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Icon name="MessageSquare" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Выберите борт из списка справа</p>
              </div>
            </div>
          ) : (
            chatItems.map((item) => {
              if (item.kind === "voice") {
                return (
                  <div key={item.vm.id} className="flex justify-end">
                    <div className="bg-primary/15 rounded-xl px-3 py-2 flex items-center gap-3 max-w-[220px]">
                      <Icon name="Mic" className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Голосовое</p>
                        <p className="text-[10px] text-muted-foreground">{formatDuration(item.vm.duration)}</p>
                      </div>
                    </div>
                  </div>
                );
              }
              const msg = item.msg;
              return (
                <div key={msg.id} className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"} group`}>
                  <div className="relative">
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${msg.direction === "outgoing" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                      <p>{msg.text}</p>
                      <div className={`flex items-center gap-1 mt-1 ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[10px] ${msg.direction === "outgoing" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatMsgTime(msg.timestamp)}</span>
                        {msg.direction === "outgoing" && (
                          <Icon name={msg.type === "urgent" ? "CheckCheck" : "Check"} className={`w-3 h-3 ${msg.type === "urgent" ? "text-green-400" : "text-primary-foreground/50"}`} />
                        )}
                      </div>
                    </div>
                    {msg.direction === "incoming" && (
                      <button onClick={() => setReplyTo(msg.text)} className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded flex items-center justify-center bg-muted hover:bg-muted/80">
                        <Icon name="Quote" className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick replies */}
        {selectedDriverId && (
          <div className="px-4 py-2 border-t border-border flex flex-wrap gap-1.5 shrink-0">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr}
                onClick={() => { onSendMessage(selectedDriverId, qr); }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors border border-border"
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          {replyTo && (
            <div className="bg-muted rounded-lg px-3 py-1.5 mb-2 text-xs flex items-center gap-2">
              <Icon name="Quote" className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate flex-1 text-muted-foreground">{replyTo}</span>
              <button onClick={() => setReplyTo(null)} className="shrink-0 text-muted-foreground hover:text-foreground">
                <Icon name="X" className="w-3 h-3" />
              </button>
            </div>
          )}
          {isRecording && (
            <div className="flex items-center gap-2 text-xs text-red-500 animate-pulse mb-2">
              <span>●</span><span>Запись... {recordingSeconds}с</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleVoice}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isRecording ? "bg-red-500/20 text-red-500" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}
            >
              <Icon name={isRecording ? "MicOff" : "Mic"} className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isRecording ? "Идёт запись..." : selectedDriverId ? "Написать сообщение..." : "Выберите борт..."}
              disabled={isRecording || !selectedDriverId}
              className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || isRecording || !selectedDriverId}
              className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Icon name="Send" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Vehicle list */}
      <div className="w-64 shrink-0 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
          <Icon name="Bus" className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground flex-1">Транспорт</h3>
          <span className="text-xs text-muted-foreground">{drivers.length} ТС</span>
        </div>
        <div className="px-3 py-2 border-b border-border shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Борт / маршрут / ФИО..."
            className="w-full h-8 px-3 rounded-lg bg-muted text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide border-b border-border">
              Активные чаты
            </div>
          )}
          {filteredThreads.map((thread) => (
            <button
              key={thread.driverId}
              onClick={() => setSelectedDriverId(thread.driverId)}
              className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors ${selectedDriverId === thread.driverId ? "bg-primary/10" : "hover:bg-muted/50"}`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${selectedDriverId === thread.driverId ? "bg-primary text-primary-foreground" : thread.unreadCount > 0 ? "bg-red-500/15 text-red-500" : "bg-muted text-muted-foreground"}`}>
                  {thread.vehicleNumber.slice(-3)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">#{thread.vehicleNumber}</span>
                    {thread.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5 shrink-0">{thread.unreadCount}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-primary font-semibold">М{thread.routeNumber}</p>
                  <p className="text-[10px] text-muted-foreground font-light truncate">{thread.driverName}</p>
                </div>
              </div>
            </button>
          ))}

          {drivers.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide border-b border-border mt-1">
              Все водители
            </div>
          )}
          {drivers
            .filter((d) => !filteredThreads.find((t) => t.driverId === d.id))
            .map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDriverId(d.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors ${selectedDriverId === d.id ? "bg-primary/10" : "hover:bg-muted/50"}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    d.status === "on_shift" ? "bg-green-500/15 text-green-600"
                    : d.status === "break" ? "bg-yellow-500/15 text-yellow-600"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {d.vehicleNumber.slice(-3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-foreground">#{d.vehicleNumber}</span>
                    <p className="text-[11px] text-primary font-semibold">М{d.routeNumber}</p>
                    <p className="text-[10px] text-muted-foreground font-light truncate">{d.name}</p>
                  </div>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${
                    d.status === "on_shift" ? "bg-green-500/15 text-green-600"
                    : d.status === "break" ? "bg-yellow-500/15 text-yellow-600"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {d.status === "on_shift" ? "Смена" : d.status === "break" ? "Пер." : d.status === "off_shift" ? "Вых." : "Б/л"}
                  </span>
                </div>
              </button>
            ))}
        </div>
      </div>

      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-5 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Новый чат</h3>
              <button onClick={() => setShowNewChat(false)} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {drivers.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDriverId(d.id);
                    setShowNewChat(false);
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground text-xs font-bold shrink-0">
                    {d.vehicleNumber.slice(-3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">#{d.vehicleNumber}</p>
                    <p className="text-[11px] text-primary font-semibold">М{d.routeNumber}</p>
                    <p className="text-[10px] text-muted-foreground font-light truncate">{d.name}</p>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      d.status === "on_shift"
                        ? "bg-green-500/15 text-green-600"
                        : d.status === "break"
                        ? "bg-yellow-500/15 text-yellow-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {d.status === "on_shift" ? "На смене" : d.status === "break" ? "Перерыв" : d.status === "off_shift" ? "Выходной" : "Больн."}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
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
          <span className="text-xs text-muted-foreground">{filtered.length} записей</span>
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
  onOpenMessages,
}: DispatcherPanelProps) {
  if (tab === "overview") {
    return (
      <OverviewView
        stats={stats}
        alerts={alerts}
        messages={messages}
        drivers={drivers}
        onOpenMessages={onOpenMessages}
        onSendMessage={onSendMessage}
        onMarkMessageRead={onMarkMessageRead}
        onResolveAlert={onResolveAlert}
        userName={userName}
      />
    );
  }
  const criticalPopup = (
    <CriticalAlertPopup
      messages={messages}
      alerts={alerts}
      onResolveAlert={onResolveAlert}
      onMarkMessageRead={onMarkMessageRead}
      onSendReply={onSendMessage}
      userName={userName}
    />
  );

  if (tab === "messages") {
    return (<>{criticalPopup}<MessagesView messages={messages} drivers={drivers} onSendMessage={onSendMessage} onMarkMessageRead={onMarkMessageRead} /></>);
  }
  if (tab === "notifications") {
    return (<>{criticalPopup}<NotificationsView notifications={notifications} onMarkNotificationRead={onMarkNotificationRead} /></>);
  }
  if (tab === "alerts") {
    return (<>{criticalPopup}<AlertsView alerts={alerts} onResolveAlert={onResolveAlert} userName={userName} /></>);
  }
  return null;
}