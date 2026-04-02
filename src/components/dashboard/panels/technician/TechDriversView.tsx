import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type {
  VehicleInfo,
  DriverInfo,
  DriverStatus,
  RouteInfo,
  ScheduleEntry,
  DocumentInfo,
} from "@/types/dashboard";
import { formatTime } from "./TechRoutes";
import {
  DRIVER_STATUS_STYLES,
  DRIVER_STATUS_LABELS,
} from "./TechVDConstants";
import DriverDetailModal from "./DriverDetailModal";
import DriverEditModal from "./DriverEditModal";
import DriverCreateModal from "./DriverCreateModal";

type SortKey = "name" | "status" | "rating";

const LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  active: "Активен",
  vacation: "В отпуске",
  sick_leave: "Больничный",
  fired: "Уволен",
};
const LIFECYCLE_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-500",
  vacation: "bg-yellow-500/15 text-yellow-600",
  sick_leave: "bg-orange-500/15 text-orange-500",
  fired: "bg-red-500/15 text-red-500",
};

interface DriversViewProps {
  drivers: DriverInfo[];
  onReload?: () => void;
  vehicles?: VehicleInfo[];
  routes?: RouteInfo[];
  schedules?: ScheduleEntry[];
  documents?: DocumentInfo[];
}

export function DriversView({
  drivers,
  onReload,
  schedules,
}: DriversViewProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [showForm, setShowForm] = useState(false);
  const [detailDriver, setDetailDriver] = useState<DriverInfo | null>(null);
  const [editingDriver, setEditingDriver] = useState<DriverInfo | null>(null);

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
    const statusOrder: Record<DriverStatus, number> = {
      on_shift: 0,
      break: 1,
      off_shift: 2,
      sick: 3,
    };
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "ru");
      if (sortBy === "status")
        return statusOrder[a.status] - statusOrder[b.status];
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
          <Icon
            name="Search"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, табельному..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-muted-foreground mr-1">
            Сортировка:
          </span>
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
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          <Icon name="UserPlus" className="w-4 h-4" />
          Добавить
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-5 py-2.5 font-medium">
                Таб. номер
              </th>
              <th className="text-left px-3 py-2.5 font-medium">ФИО</th>
              <th className="text-left px-3 py-2.5 font-medium">
                Статус
              </th>
              <th className="text-left px-3 py-2.5 font-medium">ТС</th>
              <th className="text-left px-3 py-2.5 font-medium">
                Маршрут
              </th>
              <th className="text-left px-3 py-2.5 font-medium">
                Смена
              </th>
              <th className="text-left px-3 py-2.5 font-medium">PIN</th>
              <th className="text-left px-3 py-2.5 font-medium">
                Телефон
              </th>
              <th className="text-left px-3 py-2.5 font-medium">
                Рейтинг
              </th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Icon
                    name="UserX"
                    className="w-10 h-10 mx-auto mb-2 opacity-30"
                  />
                  <p>Не найдено</p>
                </td>
              </tr>
            ) : (
              filtered.map((d) => {
                const lifecycle = d.driverStatus || "active";
                return (
                  <tr
                    key={d.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {d.tabNumber}
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground">
                      {d.name}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded w-fit ${
                            DRIVER_STATUS_STYLES[d.status]
                          }`}
                        >
                          {DRIVER_STATUS_LABELS[d.status]}
                        </span>
                        {lifecycle !== "active" && (
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded w-fit ${
                              LIFECYCLE_STATUS_STYLES[lifecycle] || ""
                            }`}
                          >
                            {LIFECYCLE_STATUS_LABELS[lifecycle] || lifecycle}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">
                      {d.vehicleNumber || "---"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">
                      {d.routeNumber || "---"}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <span className="text-muted-foreground">
                        {d.shiftStart
                          ? `↑ ${formatTime(d.shiftStart)}`
                          : "---"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded tracking-widest text-foreground">
                        ••••
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs font-mono">
                      {d.phone || "---"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Icon
                            key={i}
                            name="Star"
                            className={`w-3.5 h-3.5 ${
                              i < Math.round(d.rating)
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                        <span className="text-[11px] text-muted-foreground ml-1">
                          {d.rating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDetailDriver(d)}
                          className="text-[11px] px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <Icon name="Eye" className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingDriver(d)}
                          className="text-[11px] px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <Icon name="Pencil" className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {detailDriver && (
        <DriverDetailModal
          driver={detailDriver}
          schedules={schedules}
          onClose={() => setDetailDriver(null)}
          onReload={onReload}
        />
      )}

      {editingDriver && (
        <DriverEditModal
          driver={editingDriver}
          onClose={() => setEditingDriver(null)}
          onReload={onReload}
        />
      )}

      {showForm && (
        <DriverCreateModal
          onClose={() => setShowForm(false)}
          onReload={onReload}
        />
      )}
    </div>
  );
}
