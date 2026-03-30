import { useState, useMemo, useEffect } from "react";
import Icon from "@/components/ui/icon";
import CriticalAlertPopup from "@/components/dashboard/CriticalAlertPopup";
import MapControls from "@/components/dashboard/MapControls";
import MapVehicleCard from "@/components/dashboard/MapVehicleCard";
import type { MapVehicleInfo } from "@/components/dashboard/MapVehicleCard";
import { generateMapVehicles } from "@/hooks/useDashboardData";
import { DriverEventsBlock, DispatcherMap } from "./DispatcherOverviewMap";
import { MiniMessenger, MsgStatus } from "./DispatcherMessages";
import type {
  DispatchMessage,
  Alert,
  DriverInfo,
  DashboardStats,
} from "@/types/dashboard";

const ALL_MAP_VEHICLES: MapVehicleInfo[] = generateMapVehicles();

// Stat widget popup
interface StatPopupData {
  title: string;
  items: { label: string; value: string; sub?: string; color?: string }[];
}

function StatPopup({ data, onClose }: { data: StatPopupData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">{data.title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <Icon name="X" className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-80">
          {data.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                {item.sub && <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>}
              </div>
              <span className={`text-sm font-bold ${item.color ?? "text-foreground"}`}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OverviewView({
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
  const [selectedVehicle, setSelectedVehicle] = useState<MapVehicleInfo | null>(null);
  const [filteredVehicles, setFilteredVehicles] = useState<MapVehicleInfo[]>(ALL_MAP_VEHICLES);
  const [miniInput, setMiniInput] = useState("");
  const [miniSelectedThread, setMiniSelectedThread] = useState<string | null>(null);
  const [activePopup, setActivePopup] = useState<StatPopupData | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const clockTime = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const clockDate = now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });

  const onlineDrivers = drivers.filter((d) => d.status === "on_shift" || d.status === "break");
  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const onTimeDrivers = drivers.filter((d) => d.status === "on_shift");

  const statCards = [
    {
      icon: "Users",
      value: stats.activeDrivers,
      label: "Водителей на линии",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      popup: {
        title: "Водители на линии",
        items: onlineDrivers.length > 0
          ? onlineDrivers.map((d) => ({
              label: d.name,
              value: d.status === "on_shift" ? "На смене" : "Перерыв",
              sub: `Борт #${d.vehicleNumber} · М${d.routeNumber}`,
              color: d.status === "on_shift" ? "text-green-500" : "text-yellow-500",
            }))
          : [{ label: "Нет водителей на линии", value: "—" }],
      } as StatPopupData,
    },
    {
      icon: "Route",
      value: stats.activeRoutes,
      label: "Активных маршрутов",
      color: "text-green-500",
      bg: "bg-green-500/10",
      popup: {
        title: "Активные маршруты",
        items: Array.from(new Set(drivers.filter((d) => d.status === "on_shift").map((d) => d.routeNumber)))
          .sort()
          .map((rn) => {
            const cnt = drivers.filter((d) => d.routeNumber === rn && d.status === "on_shift").length;
            return { label: `Маршрут №${rn}`, value: `${cnt} борт${cnt === 1 ? "" : cnt < 5 ? "а" : "ов"}`, color: "text-green-500" };
          }),
      } as StatPopupData,
    },
    {
      icon: "AlertTriangle",
      value: stats.unresolvedAlerts,
      label: "Нерешённых тревог",
      color: stats.unresolvedAlerts > 0 ? "text-red-500" : "text-yellow-500",
      bg: stats.unresolvedAlerts > 0 ? "bg-red-500/10" : "bg-yellow-500/10",
      popup: {
        title: "Нерешённые тревоги",
        items: unresolvedAlerts.length > 0
          ? unresolvedAlerts.map((a) => ({
              label: a.driverName,
              value: a.level === "critical" ? "Критично" : a.level === "warning" ? "Внимание" : "Инфо",
              sub: `Борт #${a.vehicleNumber} · ${a.message}`,
              color: a.level === "critical" ? "text-red-500" : "text-yellow-500",
            }))
          : [{ label: "Активных тревог нет", value: "✓", color: "text-green-500" }],
      } as StatPopupData,
    },
    {
      icon: "TrendingUp",
      value: `${stats.onTimePercent}%`,
      label: "Вовремя",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      popup: {
        title: "Точность расписания",
        items: [
          { label: "Едут вовремя", value: `${onTimeDrivers.length}`, color: "text-green-500" },
          { label: "С задержкой", value: `${drivers.filter((d) => d.status === "on_shift").length - onTimeDrivers.length}`, color: "text-yellow-500" },
          { label: "Итого на линии", value: `${stats.activeDrivers}` },
          { label: "% вовремя", value: `${stats.onTimePercent}%`, color: stats.onTimePercent >= 80 ? "text-green-500" : "text-red-500" },
        ],
      } as StatPopupData,
    },
  ];

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
    return [...map.values()]
      .sort(
        (a, b) =>
          new Date(b.lastMessage.timestamp).getTime() -
          new Date(a.lastMessage.timestamp).getTime()
      )
      .slice(0, 5);
  }, [messages]);

  const totalUnread = threads.reduce((s, t) => s + t.unreadCount, 0);

  return (
    <>
    {activePopup && <StatPopup data={activePopup} onClose={() => setActivePopup(null)} />}
    <CriticalAlertPopup
      messages={messages}
      alerts={alerts}
      onResolveAlert={onResolveAlert}
      onMarkMessageRead={onMarkMessageRead}
      onSendReply={onSendMessage}
      userName={userName}
    />
    <div className="space-y-4">
      {/* Driver events + stat widgets in one row: 2 + 4 + 1 = 7 cols */}
      <div className="grid gap-4 items-start" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {/* Events block spans 2 cols */}
        <div style={{ gridColumn: "span 2" }}>
          <DriverEventsBlock drivers={drivers} />
        </div>

        {/* 4 stat cards */}
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={() => setActivePopup(card.popup)}
            className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 hover:border-primary/50 hover:bg-muted/30 transition-all text-left group active:scale-[0.98]"
          >
            <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
              <Icon name={card.icon} className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
            <Icon name="ChevronRight" className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground mt-1 shrink-0 transition-colors" />
          </button>
        ))}

        {/* Clock widget */}
        <div className="rounded-2xl p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
            <Icon name="Clock" className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{clockTime}</p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{clockDate}</p>
          </div>
        </div>
      </div>

      {/* MAP — full width, Leaflet + SPb tiles */}
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
            <h3 className="text-sm font-semibold text-foreground">Карта транспорта — Санкт-Петербург</h3>
            <span className="ml-1 text-xs text-muted-foreground">{filteredVehicles.length} / {ALL_MAP_VEHICLES.length} ТС</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Норма</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Внимание</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Критично</span>
          </div>
        </div>
        <div className="relative overflow-hidden" style={{ height: "26rem", isolation: "isolate" }}>
          <DispatcherMap
            filteredVehicles={filteredVehicles}
            onVehicleClick={(v) => setSelectedVehicle(v)}
          />
          <div className="absolute top-2 right-2 z-[1000]">
            <MapControls vehicles={ALL_MAP_VEHICLES} onFilterChange={setFilteredVehicles} />
          </div>
        </div>
      </div>

      {/* MINI MESSENGER */}
      <MiniMessenger
        messages={messages}
        threads={threads}
        totalUnread={totalUnread}
        miniInput={miniInput}
        setMiniInput={setMiniInput}
        miniSelectedThread={miniSelectedThread}
        setMiniSelectedThread={setMiniSelectedThread}
        onSendMessage={onSendMessage}
        onOpenMessages={onOpenMessages}
        MsgStatusComponent={MsgStatus}
      />
    </div>
    </>
  );
}
