import { useState, useRef, useEffect } from "react";
import L from "leaflet";
import Icon from "@/components/ui/icon";
import type { MapVehicleInfo } from "@/components/dashboard/MapVehicleCard";
import type { DriverInfo } from "@/types/dashboard";

// ── Driver event types ───────────────────────────────────────────────────────
export type DriverEventType = "shift_start" | "shift_end" | "break" | "online" | "offline" | "gibdd";

export interface DriverEvent {
  id: string;
  type: DriverEventType;
  driverName: string;
  vehicleNumber: string;
  routeNumber: string;
  timestamp: Date;
}

export const EVENT_CONFIG: Record<DriverEventType, { label: string; icon: string; color: string; bg: string; border: string }> = {
  shift_start: { label: "Начало смены",   icon: "PlayCircle",    color: "text-green-600",  bg: "bg-green-500/10",  border: "border-green-500/30" },
  shift_end:   { label: "Смена завершена",icon: "StopCircle",    color: "text-gray-500",   bg: "bg-gray-500/10",   border: "border-gray-400/30"  },
  break:       { label: "Перерыв",        icon: "Coffee",        color: "text-yellow-600", bg: "bg-yellow-500/10", border: "border-yellow-500/30"},
  online:      { label: "В сети",         icon: "Wifi",          color: "text-blue-500",   bg: "bg-blue-500/10",   border: "border-blue-500/30"  },
  offline:     { label: "Офлайн",         icon: "WifiOff",       color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/30"   },
  gibdd:       { label: "ГИБДД",          icon: "Shield",        color: "text-purple-600", bg: "bg-purple-500/10", border: "border-purple-500/30"},
};

export function fmtEventTime(d: Date) {
  return new Date(d).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

// Auto-popup for offline/online events
export function ConnectionEventPopup({ event, onClose }: { event: DriverEvent; onClose: () => void }) {
  const [secs, setSecs] = useState(30);
  const cfg = EVENT_CONFIG[event.type];

  useEffect(() => {
    if (secs <= 0) { onClose(); return; }
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs, onClose]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none">
      <div className={`pointer-events-auto bg-card border-2 ${cfg.border} rounded-2xl shadow-2xl px-6 py-5 w-80 animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
            <Icon name={cfg.icon} className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div>
            <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
            <p className="text-xs text-muted-foreground">{event.driverName}</p>
          </div>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center">
            <Icon name="X" className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Борт: <span className="text-foreground font-medium">#{event.vehicleNumber}</span></p>
          <p>Маршрут: <span className="text-foreground font-medium">М{event.routeNumber}</span></p>
          <p>Время: <span className="text-foreground font-medium">{fmtEventTime(event.timestamp)}</span></p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div className={`h-full ${event.type === "offline" ? "bg-red-500" : event.type === "gibdd" ? "bg-purple-500" : "bg-blue-500"} transition-all duration-1000`} style={{ width: `${(secs / 30) * 100}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">{secs}с</span>
        </div>
      </div>
    </div>
  );
}

// Driver events scrolling block
export function DriverEventsBlock({ drivers }: { drivers: DriverInfo[] }) {
  const [events, setEvents] = useState<DriverEvent[]>(() => {
    return drivers.slice(0, 12).map((d, i) => {
      const type = d.status === "on_shift" ? "shift_start"
        : d.status === "break" ? "break"
        : d.status === "off_shift" ? "shift_end"
        : "offline";
      const t = new Date();
      t.setMinutes(t.getMinutes() - i * 4 - Math.floor(Math.random() * 3));
      return { id: `init-${d.id}`, type, driverName: d.name, vehicleNumber: d.vehicleNumber, routeNumber: d.routeNumber, timestamp: t };
    });
  });

  const [autoPopup, setAutoPopup] = useState<DriverEvent | null>(null);
  const [showEventsModal, setShowEventsModal] = useState(false);
  const prevStatuses = useRef<Record<string, DriverInfo["status"]>>({});
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newEvents: DriverEvent[] = [];
    for (const d of drivers) {
      const prev = prevStatuses.current[d.id];
      if (prev !== undefined && prev !== d.status) {
        const type: DriverEventType =
          d.status === "on_shift" ? "online"
          : d.status === "break" ? "break"
          : d.status === "off_shift" ? "shift_end"
          : "offline";
        const ev: DriverEvent = { id: `${d.id}-${Date.now()}`, type, driverName: d.name, vehicleNumber: d.vehicleNumber, routeNumber: d.routeNumber, timestamp: new Date() };
        newEvents.push(ev);
        if (type === "offline" || type === "online" || type === "gibdd") setAutoPopup(ev);
      }
      prevStatuses.current[d.id] = d.status;
    }
    if (newEvents.length > 0) {
      setEvents(prev => [...newEvents, ...prev].slice(0, 50));
    }
  }, [drivers]);

  useEffect(() => {
    if (drivers.length === 0) return;
    const DEMO_EVENTS: { type: DriverEventType; suffix: string }[] = [
      { type: "online", suffix: "вернулся в сеть" },
      { type: "break", suffix: "ушёл на перерыв" },
      { type: "shift_start", suffix: "начал смену" },
      { type: "offline", suffix: "потерял связь" },
      { type: "gibdd", suffix: "остановлен ГИБДД" },
      { type: "shift_end", suffix: "завершил смену" },
    ];
    const t = setInterval(() => {
      const d = drivers[Math.floor(Math.random() * drivers.length)];
      const e = DEMO_EVENTS[Math.floor(Math.random() * DEMO_EVENTS.length)];
      const ev: DriverEvent = { id: `demo-${Date.now()}`, type: e.type, driverName: d.name, vehicleNumber: d.vehicleNumber, routeNumber: d.routeNumber, timestamp: new Date() };
      setEvents(prev => [ev, ...prev].slice(0, 50));
      if (e.type === "offline" || e.type === "online" || e.type === "gibdd") setAutoPopup(ev);
    }, 20000);
    return () => clearInterval(t);
  }, [drivers]);

  return (
    <>
      {autoPopup && <ConnectionEventPopup event={autoPopup} onClose={() => setAutoPopup(null)} />}

      <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
          <Icon name="Activity" className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">События транспорта</h3>
          <span className="ml-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{events.length}</span>
          <div className="ml-auto flex items-center gap-1.5">
            {(["online","offline","break","shift_start","shift_end","gibdd"] as DriverEventType[]).map(type => (
              <span key={type} className={`w-2 h-2 rounded-full ${EVENT_CONFIG[type].bg.replace('/10','').replace('bg-','bg-')}`}
                style={{ backgroundColor: type === "online" ? "#3b82f6" : type === "offline" ? "#ef4444" : type === "break" ? "#eab308" : type === "shift_start" ? "#22c55e" : type === "shift_end" ? "#9ca3af" : "#9333ea" }}
                title={EVENT_CONFIG[type].label}
              />
            ))}
            <button onClick={() => setShowEventsModal(true)} className="ml-2 w-6 h-6 rounded-lg hover:bg-muted flex items-center justify-center transition-colors" title="Развернуть">
              <Icon name="Maximize2" className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div ref={listRef} className="overflow-y-auto flex-1" style={{ maxHeight: "5.8rem" }}>
          {events.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <Icon name="Activity" className="w-5 h-5 mr-2 opacity-30" />
              Нет событий
            </div>
          ) : events.map((ev) => {
            const cfg = EVENT_CONFIG[ev.type];
            return (
              <div key={ev.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors`}>
                <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                  <Icon name={cfg.icon} className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{cfg.label}</span>
                    <span className="text-xs font-medium text-foreground truncate">{ev.driverName}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Борт #{ev.vehicleNumber} · М{ev.routeNumber}</p>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{fmtEventTime(ev.timestamp)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showEventsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEventsModal(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Icon name="Activity" className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Все события транспорта</h3>
                <span className="ml-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{events.length}</span>
              </div>
              <button onClick={() => setShowEventsModal(false)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[70vh]">
              {events.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  <Icon name="Activity" className="w-5 h-5 mr-2 opacity-30" />
                  Нет событий
                </div>
              ) : events.map((ev) => {
                const cfg = EVENT_CONFIG[ev.type];
                return (
                  <div key={ev.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon name={cfg.icon} className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{cfg.label}</span>
                        <span className="text-sm font-medium text-foreground truncate">{ev.driverName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Борт #{ev.vehicleNumber} · М{ev.routeNumber}</p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{fmtEventTime(ev.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Map route data ────────────────────────────────────────────────────────────
const SPB_ROUTES: Record<string, [number, number][]> = {
  "5":  [[56.860, 60.605], [56.855, 60.615], [56.848, 60.625], [56.841, 60.635], [56.835, 60.645], [56.830, 60.635], [56.836, 60.620], [56.843, 60.608]],
  "3":  [[56.825, 60.575], [56.830, 60.588], [56.835, 60.600], [56.840, 60.612], [56.845, 60.625], [56.838, 60.635], [56.832, 60.622], [56.827, 60.608]],
  "7":  [[56.815, 60.580], [56.820, 60.595], [56.825, 60.608], [56.830, 60.620], [56.835, 60.632], [56.840, 60.645], [56.833, 60.655], [56.827, 60.640]],
  "9":  [[56.850, 60.555], [56.845, 60.570], [56.840, 60.585], [56.835, 60.598], [56.830, 60.612], [56.825, 60.598], [56.832, 60.582], [56.840, 60.568]],
  "11": [[56.870, 60.570], [56.865, 60.585], [56.858, 60.598], [56.851, 60.610], [56.844, 60.622], [56.838, 60.635], [56.843, 60.648], [56.850, 60.633]],
  "14": [[56.820, 60.635], [56.825, 60.648], [56.830, 60.660], [56.835, 60.668], [56.840, 60.655], [56.845, 60.640], [56.838, 60.625], [56.830, 60.615]],
  "6":  [[56.810, 60.620], [56.815, 60.633], [56.820, 60.645], [56.825, 60.658], [56.830, 60.670], [56.823, 60.682], [56.817, 60.668], [56.812, 60.650]],
  "18": [[56.855, 60.638], [56.850, 60.650], [56.844, 60.662], [56.837, 60.672], [56.831, 60.660], [56.836, 60.645], [56.843, 60.635], [56.850, 60.625]],
  "22": [[56.838, 60.610], [56.844, 60.622], [56.851, 60.630], [56.858, 60.618], [56.853, 60.604], [56.846, 60.592], [56.840, 60.597], [56.836, 60.607]],
  "2":  [[56.800, 60.590], [56.805, 60.602], [56.810, 60.615], [56.815, 60.628], [56.820, 60.615], [56.815, 60.602], [56.810, 60.590], [56.805, 60.578]],
};
const SPB_STOPS_FALLBACK: [number, number][] = [[56.835, 60.612], [56.845, 60.618], [56.830, 60.600], [56.840, 60.588], [56.825, 60.625], [56.850, 60.635]];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function getPosOnRoute(progress: number, stops: [number, number][]): [number, number] {
  const total = stops.length - 1;
  const segIdx = Math.min(Math.floor(progress * total), total - 1);
  const segT = progress * total - segIdx;
  const [aLat, aLng] = stops[segIdx];
  const [bLat, bLng] = stops[Math.min(segIdx + 1, total)];
  return [lerp(aLat, bLat, segT), lerp(aLng, bLng, segT)];
}

const VEHICLE_COLORS: Record<MapVehicleInfo["status"], string> = {
  ok: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
};

function makeVehicleIcon(status: MapVehicleInfo["status"]) {
  const color = VEHICLE_COLORS[status];
  const svg = `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
    ${status === "critical" ? `<circle cx="7" cy="7" r="6" fill="${color}" opacity="0.3"/>` : ""}
    <circle cx="7" cy="7" r="5" fill="${color}" stroke="white" stroke-width="1.5"/>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [14, 14], iconAnchor: [7, 7] });
}

export function DispatcherMap({
  filteredVehicles,
  onVehicleClick,
}: {
  filteredVehicles: MapVehicleInfo[];
  onVehicleClick: (v: MapVehicleInfo) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const progressRef = useRef<Map<string, number>>(new Map());
  const routeMapRef = useRef<Map<string, [number, number][]>>(new Map());
  const animRef = useRef<number>();
  const lastTimeRef = useRef(0);
  const onVehicleClickRef = useRef(onVehicleClick);
  onVehicleClickRef.current = onVehicleClick;

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [56.835, 60.612],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    filteredVehicles.forEach((v) => {
      if (!progressRef.current.has(v.id)) {
        progressRef.current.set(v.id, Math.random());
      }
      routeMapRef.current.set(v.id, SPB_ROUTES[v.route] || SPB_STOPS_FALLBACK);
    });

    markersRef.current.forEach((marker, id) => {
      if (!filteredVehicles.find((v) => v.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
        routeMapRef.current.delete(id);
      }
    });

    filteredVehicles.forEach((v) => {
      const progress = progressRef.current.get(v.id) ?? 0;
      const stops = routeMapRef.current.get(v.id) || SPB_STOPS_FALLBACK;
      const pos = getPosOnRoute(progress, stops);
      if (markersRef.current.has(v.id)) {
        markersRef.current.get(v.id)!.setLatLng(pos).setIcon(makeVehicleIcon(v.status));
      } else {
        const marker = L.marker(pos, { icon: makeVehicleIcon(v.status), zIndexOffset: v.status === "critical" ? 1000 : 500 })
          .bindTooltip(`Борт ${v.number} · М${v.route}`, { direction: "top", offset: [0, -8] })
          .on("click", () => onVehicleClickRef.current(v))
          .addTo(map);
        markersRef.current.set(v.id, marker);
      }
    });
  }, [filteredVehicles]);

  useEffect(() => {
    const animate = (time: number) => {
      const delta = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;
      const map = mapInstanceRef.current;
      if (!map) return;
      progressRef.current.forEach((p, id) => {
        const newP = (p + delta * 0.004) % 1;
        progressRef.current.set(id, newP);
        const marker = markersRef.current.get(id);
        if (marker) {
          const stops = routeMapRef.current.get(id) || SPB_STOPS_FALLBACK;
          marker.setLatLng(getPosOnRoute(newP, stops));
        }
      });
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return <div ref={mapRef} className="w-full h-full" />;
}
