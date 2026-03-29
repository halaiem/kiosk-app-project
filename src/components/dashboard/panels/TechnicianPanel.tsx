import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
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

function RoutesView({ routes }: { routes: RouteInfo[] }) {
  const totalDistance = useMemo(() => routes.reduce((s, r) => s + r.distance, 0), [routes]);
  const totalStops = useMemo(() => routes.reduce((s, r) => s + r.stopsCount, 0), [routes]);
  const activeCount = useMemo(() => routes.filter((r) => r.isActive).length, [routes]);

  const summaryCards = [
    { icon: "Route", value: routes.length, label: "Всего маршрутов", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: "MapPin", value: totalStops, label: "Всего остановок", color: "text-green-500", bg: "bg-green-500/10" },
    { icon: "Ruler", value: `${totalDistance.toFixed(1)} км`, label: "Общая дистанция", color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
        {routes.map((route) => (
          <div key={route.id} className="bg-card border border-border rounded-2xl p-5 flex gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg font-bold text-white ${
                route.isActive ? "bg-green-500" : "bg-gray-400"
              }`}
            >
              {route.number}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground truncate">{route.name}</p>
                {route.isActive ? (
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                )}
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
            </div>
          </div>
        ))}
      </div>
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

  const filtered = useMemo(() => {
    const list = [...documents].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    if (filter === "all") return list;
    return list.filter((d) => d.status === filter);
  }, [documents, filter]);

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

function VehiclesView({ vehicles }: { vehicles: VehicleInfo[] }) {
  const isOverdue = (date: Date) => new Date(date).getTime() < Date.now();

  return (
    <div className="grid grid-cols-2 desktop:grid-cols-3 gap-4">
      {vehicles.length === 0 ? (
        <div className="col-span-full flex items-center justify-center py-16 bg-card border border-border rounded-2xl">
          <div className="text-center">
            <Icon name="Bus" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Нет транспорта</p>
          </div>
        </div>
      ) : (
        vehicles.map((v) => (
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
  );
}

type SortKey = "name" | "status" | "rating";

function DriversView({ drivers }: { drivers: DriverInfo[] }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");

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
              <th className="text-left px-3 py-2.5 font-medium">Начало смены</th>
              <th className="text-left px-3 py-2.5 font-medium">Телефон</th>
              <th className="text-left px-3 py-2.5 font-medium">Рейтинг</th>
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
                  <td className="px-3 py-3 text-muted-foreground text-xs">
                    {d.shiftStart ? formatTime(d.shiftStart) : "---"}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs font-mono">{d.phone}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Icon
                          key={i}
                          name="Star"
                          className={`w-3.5 h-3.5 ${i < Math.round(d.rating) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                        />
                      ))}
                      <span className="text-[11px] text-muted-foreground ml-1">{d.rating.toFixed(1)}</span>
                    </div>
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

function ScheduleView({ schedule }: { schedule: ScheduleEntry[] }) {
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

  const sorted = useMemo(
    () => [...schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [schedule]
  );

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Icon name="Calendar" className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">{todayStr}</h2>
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
                  className={`border-b border-border hover:bg-muted/30 transition-colors ${
                    entry.status === "cancelled" ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    <span className="font-mono text-foreground font-medium">
                      {entry.startTime} - {entry.endTime}
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
