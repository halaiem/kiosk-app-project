import { useState, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type {
  TechnicianTab,
  RouteInfo,
  DocumentInfo,
  VehicleInfo,
  DriverInfo,
  ScheduleEntry,
  DocumentStatus,
  VehicleStatus,
  DriverStatus,
  RouteStatus,
} from "@/types/dashboard";

interface TechnicianPanelProps {
  tab: TechnicianTab;
  routes: RouteInfo[];
  documents: DocumentInfo[];
  vehicles: VehicleInfo[];
  drivers: DriverInfo[];
  schedule: ScheduleEntry[];
  onUpdateDocumentStatus: (id: string, status: DocumentInfo["status"]) => void;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const DOC_TYPE_ICONS: Record<DocumentInfo["type"], string> = {
  route_sheet: "FileSpreadsheet",
  maintenance_report: "Wrench",
  schedule: "Calendar",
  instruction: "BookOpen",
  license: "Award",
};

const DOC_TYPE_LABELS: Record<DocumentInfo["type"], string> = {
  route_sheet: "Маршрутный лист",
  maintenance_report: "Акт ТО",
  schedule: "Расписание",
  instruction: "Инструкция",
  license: "Лицензия",
};

const DOC_STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: "bg-gray-500/15 text-gray-500",
  review: "bg-yellow-500/15 text-yellow-600",
  approved: "bg-green-500/15 text-green-500",
  expired: "bg-red-500/15 text-red-500",
};

const DOC_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Черновик",
  review: "На проверке",
  approved: "Утверждён",
  expired: "Истёк",
};

const VEHICLE_TYPE_ICONS: Record<VehicleInfo["type"], string> = {
  tram: "TramFront",
  trolleybus: "Zap",
  bus: "Bus",
};

const VEHICLE_TYPE_LABELS: Record<VehicleInfo["type"], string> = {
  tram: "Трамвай",
  trolleybus: "Троллейбус",
  bus: "Автобус",
};

const VEHICLE_STATUS_STYLES: Record<VehicleStatus, string> = {
  active: "bg-green-500/15 text-green-500",
  maintenance: "bg-yellow-500/15 text-yellow-600",
  idle: "bg-gray-500/15 text-gray-500",
  offline: "bg-red-500/15 text-red-500",
};

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  active: "Активен",
  maintenance: "ТО",
  idle: "Простой",
  offline: "Офлайн",
};

const DRIVER_STATUS_STYLES: Record<DriverStatus, string> = {
  on_shift: "bg-green-500/15 text-green-500",
  off_shift: "bg-gray-500/15 text-gray-500",
  break: "bg-yellow-500/15 text-yellow-600",
  sick: "bg-red-500/15 text-red-500",
};

const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  on_shift: "На смене",
  off_shift: "Свободен",
  break: "Перерыв",
  sick: "Больничный",
};

const SCHEDULE_STATUS_STYLES: Record<ScheduleEntry["status"], string> = {
  planned: "bg-blue-500/15 text-blue-500",
  active: "bg-green-500/15 text-green-500",
  completed: "bg-gray-500/15 text-gray-500",
  cancelled: "bg-red-500/15 text-red-500",
};

const SCHEDULE_STATUS_LABELS: Record<ScheduleEntry["status"], string> = {
  planned: "Запланировано",
  active: "Активно",
  completed: "Завершено",
  cancelled: "Отменено",
};

// ── Shared modal wrapper ──────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
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

function RoutesView({ routes }: { routes: RouteInfo[] }) {
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

type DocFilter = "all" | DocumentStatus;

function DocumentsView({
  documents,
  onUpdateDocumentStatus,
}: {
  documents: DocumentInfo[];
  onUpdateDocumentStatus: (id: string, status: DocumentInfo["status"]) => void;
}) {
  const [filter, setFilter] = useState<DocFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [viewDoc, setViewDoc] = useState<DocumentInfo | null>(null);

  const downloadDoc = useCallback((doc: DocumentInfo) => {
    const content = [
      `Документ: ${doc.title}`,
      `Тип: ${DOC_TYPE_LABELS[doc.type]}`,
      `Статус: ${DOC_STATUS_LABELS[doc.status]}`,
      `Автор: ${doc.author}`,
      `Назначен: ${doc.assignedTo ?? "—"}`,
      `Создан: ${formatDate(doc.createdAt)}`,
      `Обновлён: ${formatDate(doc.updatedAt)}`,
      "",
      "Содержание документа генерируется системой.",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${doc.title}.txt`; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const filtered = useMemo(() => {
    let list = [...documents].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    if (filter !== "all") list = list.filter((d) => d.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.title.toLowerCase().includes(q) || d.author.toLowerCase().includes(q));
    }
    return list;
  }, [documents, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: documents.length };
    for (const d of documents) c[d.status] = (c[d.status] ?? 0) + 1;
    return c;
  }, [documents]);

  const filters: { key: DocFilter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "draft", label: "Черновики" },
    { key: "review", label: "На проверке" },
    { key: "approved", label: "Утверждённые" },
    { key: "expired", label: "Истёкшие" },
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
            <span className="ml-1 opacity-60">({counts[f.key] ?? 0})</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Документ..." className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-36" />
          </div>
          <ReportButton filename="documents" data={documents} />
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            <Icon name="Plus" className="w-3.5 h-3.5" />
            Новый
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-5 py-2.5 font-medium">Документ</th>
              <th className="text-left px-3 py-2.5 font-medium">Тип</th>
              <th className="text-left px-3 py-2.5 font-medium">Статус</th>
              <th className="text-left px-3 py-2.5 font-medium">Автор</th>
              <th className="text-left px-3 py-2.5 font-medium">Назначен</th>
              <th className="text-left px-3 py-2.5 font-medium">Обновлён</th>
              <th className="text-right px-5 py-2.5 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Icon name="FileX" className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Нет документов</p>
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr key={doc.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Icon name={DOC_TYPE_ICONS[doc.type]} className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground truncate max-w-[200px]">{doc.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{DOC_TYPE_LABELS[doc.type]}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${DOC_STATUS_STYLES[doc.status]}`}>
                      {DOC_STATUS_LABELS[doc.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{doc.author}</td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{doc.assignedTo ?? "---"}</td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{formatDate(doc.updatedAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewDoc(doc)}
                        className="text-[11px] font-medium px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1"
                        title="Открыть"
                      >
                        <Icon name="Eye" className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => downloadDoc(doc)}
                        className="text-[11px] font-medium px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1"
                        title="Скачать"
                      >
                        <Icon name="Download" className="w-3 h-3" />
                      </button>
                      {doc.status === "draft" && (
                        <button
                          onClick={() => onUpdateDocumentStatus(doc.id, "review")}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/25 transition-colors"
                        >
                          На проверку
                        </button>
                      )}
                      {doc.status === "review" && (
                        <button
                          onClick={() => onUpdateDocumentStatus(doc.id, "approved")}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-green-500/15 text-green-500 hover:bg-green-500/25 transition-colors"
                        >
                          Утвердить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewDoc && (
        <Modal title={viewDoc.title} onClose={() => setViewDoc(null)} wide>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Тип</p>
                <div className="flex items-center gap-2">
                  <Icon name={DOC_TYPE_ICONS[viewDoc.type]} className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{DOC_TYPE_LABELS[viewDoc.type]}</span>
                </div>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Статус</p>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${DOC_STATUS_STYLES[viewDoc.status]}`}>{DOC_STATUS_LABELS[viewDoc.status]}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Автор</p>
                <span className="font-medium text-foreground">{viewDoc.author}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Назначен</p>
                <span className="font-medium text-foreground">{viewDoc.assignedTo ?? "—"}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Создан</p>
                <span className="font-medium text-foreground">{formatDate(viewDoc.createdAt)}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Обновлён</p>
                <span className="font-medium text-foreground">{formatDate(viewDoc.updatedAt)}</span>
              </div>
            </div>
            <div className="bg-muted/20 rounded-xl p-4 text-sm text-muted-foreground leading-relaxed border border-border">
              <p className="text-xs font-semibold text-foreground mb-2">Содержание</p>
              <p>Документ «{viewDoc.title}» — {DOC_TYPE_LABELS[viewDoc.type].toLowerCase()}.</p>
              <p className="mt-1">Назначен: {viewDoc.assignedTo ?? "не назначен"}. Последнее обновление: {formatDate(viewDoc.updatedAt)}.</p>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => downloadDoc(viewDoc)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
                <Icon name="Download" className="w-4 h-4" />Скачать
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">Новый документ</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Название</label>
                <input type="text" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Тип</label>
                <select className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— выберите —</option>
                  <option value="route_sheet">Маршрутный лист</option>
                  <option value="maintenance_report">Акт ТО</option>
                  <option value="schedule">Расписание</option>
                  <option value="instruction">Инструкция</option>
                  <option value="license">Лицензия</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Автор</label>
                <input type="text" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Назначен</label>
                <input type="text" placeholder="ФИО водителя или подразделение" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
                <select className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— выберите —</option>
                  <option value="draft">Черновик</option>
                  <option value="review">На проверке</option>
                  <option value="approved">Утверждён</option>
                </select>
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

function VehiclesView({ vehicles }: { vehicles: VehicleInfo[] }) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | VehicleInfo["type"]>("all");
  const isOverdue = (date: Date) => new Date(date).getTime() < Date.now();

  const filteredVehicles = useMemo(() => {
    let list = vehicles;
    if (typeFilter !== "all") list = list.filter((v) => v.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) => v.number.includes(q) || v.routeNumber.includes(q) || v.driverName.toLowerCase().includes(q));
    }
    return list;
  }, [vehicles, search, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-foreground flex-1">Транспортные средства</h2>
        {(["all", "tram", "trolleybus", "bus"] as const).map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {t === "all" ? "Все" : t === "tram" ? "Трамваи" : t === "trolleybus" ? "Тролл." : "Автобусы"}
          </button>
        ))}
        <div className="relative">
          <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Борт, маршрут..." className="h-9 pl-8 pr-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring w-40" />
        </div>
        <ReportButton filename="vehicles" data={vehicles} />
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Icon name="Plus" className="w-4 h-4" />
          Добавить ТС
        </button>
      </div>
      <div className="grid grid-cols-2 desktop:grid-cols-3 gap-4">
      {filteredVehicles.length === 0 ? (
        <div className="col-span-full flex items-center justify-center py-16 bg-card border border-border rounded-2xl">
          <div className="text-center">
            <Icon name="Bus" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Нет транспорта</p>
          </div>
        </div>
      ) : (
        filteredVehicles.map((v) => (
          <div key={v.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon name={VEHICLE_TYPE_ICONS[v.type]} className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">#{v.number}</p>
                  <p className="text-[11px] text-muted-foreground">{VEHICLE_TYPE_LABELS[v.type]}</p>
                </div>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${VEHICLE_STATUS_STYLES[v.status]}`}>
                {VEHICLE_STATUS_LABELS[v.status]}
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Icon name="Route" className="w-3 h-3" />
                  Маршрут
                </span>
                <span className="text-foreground font-medium">{v.routeNumber || "---"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Icon name="User" className="w-3 h-3" />
                  Водитель
                </span>
                <span className="text-foreground font-medium truncate ml-2 max-w-[120px]">{v.driverName || "---"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Icon name="Gauge" className="w-3 h-3" />
                  Пробег
                </span>
                <span className="text-foreground font-medium">{v.mileage.toLocaleString()} км</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Icon name="Wrench" className="w-3 h-3" />
                  Последнее ТО
                </span>
                <span className="text-foreground font-medium">{formatDate(v.lastMaintenance)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Icon name="CalendarClock" className="w-3 h-3" />
                  Следующее ТО
                </span>
                <span className={`font-medium ${isOverdue(v.nextMaintenance) ? "text-red-500" : "text-foreground"}`}>
                  {formatDate(v.nextMaintenance)}
                  {isOverdue(v.nextMaintenance) && (
                    <Icon name="AlertTriangle" className="w-3 h-3 inline ml-1 text-red-500" />
                  )}
                </span>
              </div>
            </div>
          </div>
        ))
      )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">Новое транспортное средство</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Бортовой номер</label>
                <input type="text" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Тип</label>
                <select className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— выберите —</option>
                  <option value="tram">Трамвай</option>
                  <option value="trolleybus">Троллейбус</option>
                  <option value="bus">Автобус</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Маршрут</label>
                <input type="text" placeholder="Номер маршрута" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Водитель</label>
                <input type="text" placeholder="ФИО" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Пробег км</label>
                <input type="number" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Дата посл. ТО</label>
                <input type="date" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Дата след. ТО</label>
                <input type="date" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
                <select className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— выберите —</option>
                  <option value="active">Активен</option>
                  <option value="maintenance">ТО</option>
                  <option value="idle">Простой</option>
                  <option value="offline">Офлайн</option>
                </select>
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

type SortKey = "name" | "status" | "rating";

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function DriversView({ drivers }: { drivers: DriverInfo[] }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [showForm, setShowForm] = useState(false);
  const [detailDriver, setDetailDriver] = useState<DriverInfo | null>(null);
  const [newPin, setNewPin] = useState(() => generatePin());
  // Mock PINs per driver (in real app from backend)
  const driverPins = useMemo(() => {
    const map: Record<string, string> = {};
    drivers.forEach((d, i) => { map[d.id] = String(1000 + i * 137 % 9000).padStart(4, "0"); });
    return map;
  }, [drivers]);

  const filtered = useMemo(() => {
    let list = [...drivers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.tabNumber.toLowerCase().includes(q) ||
          d.vehicleNumber.toLowerCase().includes(q)
      );
    }
    const statusOrder: Record<DriverStatus, number> = { on_shift: 0, break: 1, off_shift: 2, sick: 3 };
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "ru");
      if (sortBy === "status") return statusOrder[a.status] - statusOrder[b.status];
      return b.rating - a.rating;
    });
    return list;
  }, [drivers, search, sortBy]);

  const sortButtons: { key: SortKey; label: string }[] = [
    { key: "name", label: "Имя" },
    { key: "status", label: "Статус" },
    { key: "rating", label: "Рейтинг" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Icon name="Search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, табельному..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-muted-foreground mr-1">Сортировка:</span>
          {sortButtons.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                sortBy === s.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <ReportButton filename="drivers" data={drivers} />
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
          <Icon name="UserPlus" className="w-4 h-4" />
          Добавить
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-5 py-2.5 font-medium">Таб. номер</th>
              <th className="text-left px-3 py-2.5 font-medium">ФИО</th>
              <th className="text-left px-3 py-2.5 font-medium">Статус</th>
              <th className="text-left px-3 py-2.5 font-medium">ТС</th>
              <th className="text-left px-3 py-2.5 font-medium">Маршрут</th>
              <th className="text-left px-3 py-2.5 font-medium">Смена</th>
              <th className="text-left px-3 py-2.5 font-medium">PIN</th>
              <th className="text-left px-3 py-2.5 font-medium">Телефон</th>
              <th className="text-left px-3 py-2.5 font-medium">Рейтинг</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Icon name="UserX" className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Не найдено</p>
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{d.tabNumber}</td>
                  <td className="px-3 py-3 font-medium text-foreground">{d.name}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${DRIVER_STATUS_STYLES[d.status]}`}>
                      {DRIVER_STATUS_LABELS[d.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{d.vehicleNumber || "---"}</td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{d.routeNumber || "---"}</td>
                  <td className="px-3 py-3 text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground">{d.shiftStart ? `↑ ${formatTime(d.shiftStart)}` : "---"}</span>
                      <span className="text-muted-foreground">{d.shiftEnd ? `↓ ${formatTime(d.shiftEnd)}` : d.status === "on_shift" ? <span className="text-green-500">активна</span> : "---"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded tracking-widest text-foreground select-all">{driverPins[d.id]}</span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs font-mono">{d.phone}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Icon key={i} name="Star" className={`w-3.5 h-3.5 ${i < Math.round(d.rating) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                      ))}
                      <span className="text-[11px] text-muted-foreground ml-1">{d.rating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => setDetailDriver(d)} className="text-[11px] px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                      <Icon name="Eye" className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detailDriver && (
        <Modal title={`Водитель — ${detailDriver.name}`} onClose={() => setDetailDriver(null)}>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Таб. номер", value: detailDriver.tabNumber },
                { label: "Статус", value: DRIVER_STATUS_LABELS[detailDriver.status], colored: DRIVER_STATUS_STYLES[detailDriver.status] },
                { label: "Бортовой номер", value: detailDriver.vehicleNumber || "—" },
                { label: "Маршрут", value: detailDriver.routeNumber ? `№${detailDriver.routeNumber}` : "—" },
                { label: "Начало смены", value: detailDriver.shiftStart ? formatTime(detailDriver.shiftStart) : "—" },
                { label: "Конец смены", value: detailDriver.shiftEnd ? formatTime(detailDriver.shiftEnd) : detailDriver.status === "on_shift" ? "Активна" : "—" },
                { label: "Телефон", value: detailDriver.phone },
                { label: "Рейтинг", value: `${detailDriver.rating.toFixed(1)} / 5.0` },
              ].map(({ label, value, colored }) => (
                <div key={label} className="bg-muted/40 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                  {colored ? (
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${colored}`}>{value}</span>
                  ) : (
                    <span className="font-medium text-foreground">{value}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">PIN для входа в планшет</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-bold tracking-[0.4em] text-foreground select-all">{driverPins[detailDriver.id]}</span>
                <span className="text-xs text-muted-foreground">Используется для авторизации на устройстве</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">Новый водитель</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Табельный номер</label>
                <input type="text" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">ФИО полностью</label>
                <input type="text" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Телефон</label>
                <input type="text" placeholder="+7 (9XX) XXX-XX-XX" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
                <select className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— выберите —</option>
                  <option value="on_shift">На смене</option>
                  <option value="off_shift">Свободен</option>
                  <option value="break">Перерыв</option>
                  <option value="sick">Больничный</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Бортовой номер ТС</label>
                <input type="text" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Маршрут</label>
                <input type="text" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Начало смены</label>
                <input type="time" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Рейтинг</label>
                <input type="number" min={1} max={5} step={0.1} placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">PIN для входа в планшет</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-9 px-3 rounded-lg border border-primary/40 bg-primary/5 flex items-center gap-3">
                    <Icon name="KeyRound" className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-mono text-xl font-bold tracking-[0.4em] text-foreground select-all">{newPin}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewPin(generatePin())}
                    className="h-9 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Icon name="RefreshCw" className="w-3.5 h-3.5" />
                    Новый
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Водитель вводит этот PIN при авторизации на устройстве</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors">Отмена</button>
              <button onClick={() => { setShowForm(false); setNewPin(generatePin()); }} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleView({ schedule }: { schedule: ScheduleEntry[] }) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [detailEntry, setDetailEntry] = useState<ScheduleEntry | null>(null);
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

  const sorted = useMemo(() => {
    let list = [...schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.driverName.toLowerCase().includes(q) || e.routeNumber.includes(q) || e.vehicleNumber.includes(q));
    }
    return list;
  }, [schedule, search]);

  const summary = useMemo(() => {
    const s = { total: schedule.length, active: 0, planned: 0, completed: 0, cancelled: 0 };
    for (const e of schedule) s[e.status]++;
    return s;
  }, [schedule]);

  const summaryCards = [
    { icon: "Calendar", value: summary.total, label: "Всего смен", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: "Play", value: summary.active, label: "Активных", color: "text-green-500", bg: "bg-green-500/10" },
    { icon: "Clock", value: summary.planned, label: "Запланировано", color: "text-blue-400", bg: "bg-blue-400/10" },
    { icon: "XCircle", value: summary.cancelled, label: "Отменено", color: "text-red-500", bg: "bg-red-500/10" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon name="Calendar" className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{todayStr}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Водитель, маршрут..." className="h-9 pl-8 pr-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring w-40" />
          </div>
          <ReportButton filename="schedule" data={schedule} />
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Icon name="Plus" className="w-4 h-4" />
            Добавить смену
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
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

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-5 py-2.5 font-medium">Время</th>
              <th className="text-left px-3 py-2.5 font-medium">Маршрут</th>
              <th className="text-left px-3 py-2.5 font-medium">Водитель</th>
              <th className="text-left px-3 py-2.5 font-medium">Транспорт</th>
              <th className="text-left px-3 py-2.5 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Icon name="CalendarX" className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Нет записей в расписании</p>
                </td>
              </tr>
            ) : (
              sorted.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setDetailEntry(entry)}
                  className={`border-b border-border hover:bg-muted/30 transition-colors cursor-pointer ${
                    entry.status === "cancelled" ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    <span className="font-mono text-foreground font-medium">
                      {entry.startTime} – {entry.endTime}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1.5">
                      <Icon name="Route" className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-foreground font-medium">М{entry.routeNumber}</span>
                    </span>
                  </td>
                  <td className={`px-3 py-3 text-foreground ${entry.status === "cancelled" ? "line-through" : ""}`}>
                    {entry.driverName}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">#{entry.vehicleNumber}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${SCHEDULE_STATUS_STYLES[entry.status]}`}>
                      {SCHEDULE_STATUS_LABELS[entry.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Icon name="ChevronRight" className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detailEntry && (
        <Modal title={`Смена — М${detailEntry.routeNumber} · ${detailEntry.driverName}`} onClose={() => setDetailEntry(null)}>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Маршрут</p>
                <span className="font-bold text-foreground text-lg">№{detailEntry.routeNumber}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Статус</p>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${SCHEDULE_STATUS_STYLES[detailEntry.status]}`}>{SCHEDULE_STATUS_LABELS[detailEntry.status]}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Водитель</p>
                <span className="font-medium text-foreground">{detailEntry.driverName}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Транспорт</p>
                <span className="font-medium text-foreground">Борт #{detailEntry.vehicleNumber}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Начало смены</p>
                <span className="font-mono font-bold text-foreground text-base">{detailEntry.startTime}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Конец смены</p>
                <span className="font-mono font-bold text-foreground text-base">{detailEntry.endTime}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3 col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Дата</p>
                <span className="font-medium text-foreground">{detailEntry.date}</span>
              </div>
            </div>
            <div className="bg-muted/20 rounded-xl p-4 border border-border text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Информация о перевозке</p>
              <p>Парк: <span className="text-foreground font-medium">Трамвайный парк №1 (ТП-1)</span></p>
              <p className="mt-0.5">Направление: <span className="text-foreground font-medium">Маршрут №{detailEntry.routeNumber} — кольцевой</span></p>
              <p className="mt-0.5">Длительность смены: <span className="text-foreground font-medium">
                {(() => {
                  const [sh, sm] = detailEntry.startTime.split(":").map(Number);
                  const [eh, em] = detailEntry.endTime.split(":").map(Number);
                  const diff = (eh * 60 + em) - (sh * 60 + sm);
                  return diff > 0 ? `${Math.floor(diff / 60)}ч ${diff % 60}мин` : "—";
                })()}
              </span></p>
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">Новая смена</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Дата</label>
                <input type="date" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Маршрут</label>
                <input type="text" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Водитель</label>
                <input type="text" placeholder="ФИО" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Бортовой номер ТС</label>
                <input type="text" placeholder="..." className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Начало смены</label>
                <input type="time" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Конец смены</label>
                <input type="time" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
                <select className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— выберите —</option>
                  <option value="planned">Запланировано</option>
                  <option value="active">Активно</option>
                  <option value="completed">Завершено</option>
                  <option value="cancelled">Отменено</option>
                </select>
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

export default function TechnicianPanel({
  tab,
  routes,
  documents,
  vehicles,
  drivers,
  schedule,
  onUpdateDocumentStatus,
}: TechnicianPanelProps) {
  if (tab === "routes") return <RoutesView routes={routes} />;
  if (tab === "documents") return <DocumentsView documents={documents} onUpdateDocumentStatus={onUpdateDocumentStatus} />;
  if (tab === "vehicles") return <VehiclesView vehicles={vehicles} />;
  if (tab === "drivers") return <DriversView drivers={drivers} />;
  if (tab === "schedule") return <ScheduleView schedule={schedule} />;
  return null;
}