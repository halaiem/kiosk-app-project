import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { RouteInfo, RouteStatus } from "@/types/dashboard";

export function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatTime(date: Date): string {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Shared modal wrapper ──────────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className={`bg-card border border-border rounded-2xl shadow-2xl overflow-hidden ${wide ? "w-full max-w-2xl" : "w-full max-w-lg"} mx-4`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
            <Icon name="X" className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  );
}

// Generate mock stops list for a route
interface StopInfo {
  name: string;
  lat: number;
  lng: number;
}

function makeStops(route: RouteInfo): StopInfo[] {
  const base: StopInfo[] = [
    { name: "Депо", lat: 56.870, lng: 60.570 },
    { name: "ул. Заводская", lat: 56.865, lng: 60.582 },
    { name: "пл. 1905 года", lat: 56.855, lng: 60.595 },
    { name: "ул. Ленина", lat: 56.848, lng: 60.608 },
    { name: "Центральный рынок", lat: 56.842, lng: 60.618 },
    { name: "пр. Ленина", lat: 56.836, lng: 60.605 },
    { name: "ул. Малышева", lat: 56.830, lng: 60.595 },
    { name: "пл. Кирова", lat: 56.825, lng: 60.610 },
    { name: "ул. Восточная", lat: 56.820, lng: 60.625 },
    { name: "Парк Маяковского", lat: 56.815, lng: 60.638 },
    { name: "ул. Победы", lat: 56.810, lng: 60.650 },
    { name: "ст. м. Геологическая", lat: 56.837, lng: 60.633 },
    { name: "ТЦ Гринвич", lat: 56.843, lng: 60.598 },
    { name: "ул. Гагарина", lat: 56.828, lng: 60.582 },
    { name: "пр. Космонавтов", lat: 56.818, lng: 60.568 },
    { name: "ул. Молодёжная", lat: 56.808, lng: 60.580 },
    { name: "Стадион", lat: 56.800, lng: 60.595 },
    { name: "Больница №1", lat: 56.795, lng: 60.610 },
    { name: "ул. Весенняя", lat: 56.790, lng: 60.622 },
    { name: "Конечная", lat: 56.785, lng: 60.635 },
  ];
  return base.slice(0, Math.min(route.stopsCount, base.length));
}

const ROUTE_STATUS_CONFIG: Record<RouteStatus, { label: string; color: string; bg: string; border: string }> = {
  active:          { label: "Активный",          color: "text-green-600",  bg: "bg-green-500/10",  border: "border-green-500/30" },
  route_change:    { label: "Изменение маршрута", color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  temp_route:      { label: "Временная трасса",   color: "text-blue-600",   bg: "bg-blue-500/10",   border: "border-blue-500/30" },
  route_extension: { label: "Продление маршрута", color: "text-purple-600", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  suspended:       { label: "Приостановлен",      color: "text-gray-500",   bg: "bg-gray-500/10",   border: "border-gray-400/30" },
  planned:         { label: "Планируется",        color: "text-cyan-600",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30" },
};

function getRouteStatus(route: RouteInfo): RouteStatus {
  return route.routeStatus || (route.isActive ? 'active' : 'suspended');
}

export function RoutesView({ routes }: { routes: RouteInfo[] }) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [stopsRoute, setStopsRoute] = useState<RouteInfo | null>(null);
  const [statusFilter, setStatusFilter] = useState<RouteStatus | "all">("all");
  const totalDistance = useMemo(() => routes.reduce((s, r) => s + r.distance, 0), [routes]);
  const totalStops = useMemo(() => routes.reduce((s, r) => s + r.stopsCount, 0), [routes]);
  const activeCount = useMemo(() => routes.filter((r) => r.isActive).length, [routes]);
  const filtered = useMemo(() => {
    let result = routes;
    if (statusFilter !== "all") {
      result = result.filter((r) => getRouteStatus(r) === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.number.includes(q) || r.name.toLowerCase().includes(q));
    }
    return result;
  }, [routes, search, statusFilter]);

  const summaryCards = [
    { icon: "Route", value: routes.length, label: "Всего маршрутов", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: "MapPin", value: totalStops, label: "Всего остановок", color: "text-green-500", bg: "bg-green-500/10" },
    { icon: "Ruler", value: `${totalDistance.toFixed(1)} км`, label: "Общая дистанция", color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
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
        <div className="ml-4 flex items-center gap-2 shrink-0">
          <div className="relative">
            <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Маршрут..." className="h-9 pl-8 pr-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring w-36" />
          </div>
          <ReportButton filename="routes" data={routes} />
          <button onClick={() => setShowForm(true)} className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Icon name="Plus" className="w-4 h-4" />
            Добавить
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {([
          { key: "all" as const, label: "Все" },
          ...Object.entries(ROUTE_STATUS_CONFIG).map(([key, cfg]) => ({ key: key as RouteStatus, label: cfg.label }))
        ] as { key: RouteStatus | "all"; label: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((route) => {
          const rs = getRouteStatus(route);
          const rsConfig = ROUTE_STATUS_CONFIG[rs];
          return (
          <div key={route.id} className="bg-card border border-border rounded-2xl p-5 flex gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg font-bold text-white ${
                rs === "active" ? "bg-green-500" : rs === "route_change" ? "bg-orange-500" : rs === "temp_route" ? "bg-blue-500" : rs === "route_extension" ? "bg-purple-500" : rs === "planned" ? "bg-cyan-500" : "bg-gray-400"
              }`}
            >
              {route.number}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground truncate">{route.name}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rsConfig.bg} ${rsConfig.color} border ${rsConfig.border}`}>{rsConfig.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Icon name="MapPin" className="w-3 h-3" />
                  {route.stopsCount} остановок
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="Ruler" className="w-3 h-3" />
                  {route.distance} км
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="Clock" className="w-3 h-3" />
                  {route.avgTime} мин
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="Bus" className="w-3 h-3" />
                  {route.assignedVehicles} ТС
                </span>
              </div>
              <button
                onClick={() => setStopsRoute(route)}
                className="mt-2 flex items-center gap-1.5 text-[11px] text-primary hover:underline font-medium"
              >
                <Icon name="List" className="w-3 h-3" />
                Список остановок
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {stopsRoute && (
        <Modal title={`Маршрут №${stopsRoute.number} — ${stopsRoute.name}`} onClose={() => setStopsRoute(null)} wide>
          <div className="px-5 py-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 flex-wrap">
              <span className="flex items-center gap-1.5"><Icon name="MapPin" className="w-3.5 h-3.5" />{stopsRoute.stopsCount} остановок</span>
              <span className="flex items-center gap-1.5"><Icon name="Ruler" className="w-3.5 h-3.5" />{stopsRoute.distance} км</span>
              <span className="flex items-center gap-1.5"><Icon name="Clock" className="w-3.5 h-3.5" />{stopsRoute.avgTime} мин</span>
              {(() => {
                const srs = getRouteStatus(stopsRoute);
                const srsCfg = ROUTE_STATUS_CONFIG[srs];
                return (
                  <span className={`flex items-center gap-1.5 font-medium ${srsCfg.color}`}>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${srsCfg.bg} ${srsCfg.color} border ${srsCfg.border}`}>{srsCfg.label}</span>
                  </span>
                );
              })()}
            </div>
            <div className="space-y-1">
              {makeStops(stopsRoute).map((stop, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex flex-col items-center shrink-0 w-5">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${i === 0 ? "bg-green-500" : i === makeStops(stopsRoute).length - 1 ? "bg-red-500" : "bg-primary/60"}`} />
                    {i < makeStops(stopsRoute).length - 1 && <div className="w-0.5 h-4 bg-border mt-0.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground">{stop.name}</span>
                    <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">ост. {i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">Новый маршрут</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Номер маршрута</label>
                <input type="text" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Название</label>
                <input type="text" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Кол-во остановок</label>
                <input type="number" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Длина км</label>
                <input type="number" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Среднее время мин</label>
                <input type="number" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Кол-во ТС</label>
                <input type="number" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
                <select className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">--- выберите ---</option>
                  {Object.entries(ROUTE_STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 border-t border-border pt-3 mt-1">
                <label className="block text-xs font-medium text-muted-foreground mb-2">Остановки (координаты)</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="grid grid-cols-3 gap-2">
                      <input type="text" placeholder={`Остановка ${n}`} className="h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                      <input type="text" placeholder="Широта" className="h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                      <input type="text" placeholder="Долгота" className="h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  ))}
                </div>
                <button type="button" className="mt-2 text-xs text-primary hover:underline flex items-center gap-1">
                  <Icon name="Plus" className="w-3 h-3" />
                  Добавить остановку
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors">Отмена</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
