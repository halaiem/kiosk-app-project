import Icon from "@/components/ui/icon";
import type { VehicleInfo } from "@/types/dashboard";
import {
  VEHICLE_TYPE_LABELS,
  VEHICLE_TYPE_STYLES,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_STYLES,
  TypeFilter,
} from "./vehicleConstants";

interface VehiclesTableProps {
  filtered: VehicleInfo[];
  search: string;
  setSearch: (value: string) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (value: TypeFilter) => void;
  onAddClick: () => void;
  onViewClick: (vehicle: VehicleInfo) => void;
  onEditClick: (vehicle: VehicleInfo) => void;
  onDecommission: (vehicle: VehicleInfo) => void;
  onDelete: (vehicleId: string) => void;
}

const typeFilters: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "tram", label: "Трамваи" },
  { key: "trolleybus", label: "Троллейбусы" },
  { key: "bus", label: "Автобусы" },
];

export default function VehiclesTable({
  filtered,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  onAddClick,
  onViewClick,
  onEditClick,
  onDecommission,
  onDelete,
}: VehiclesTableProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        {typeFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Icon
              name="Search"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="VIN, борт, гос. номер..."
              className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-48"
            />
          </div>
          <button
            onClick={onAddClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Icon name="Plus" className="w-3.5 h-3.5" />
            Добавить ТС
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Icon
              name="Bus"
              className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2"
            />
            <p className="text-sm text-muted-foreground">Нет транспортных средств</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  Борт. номер
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  VIN-номер
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  Тип ТС
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  Гос. номер
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  Модель / Произв.
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  Год
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  Статус
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => onViewClick(v)}
                >
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground">
                      #{v.boardNumber ?? v.number}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {v.vinNumber ?? "---"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded ${VEHICLE_TYPE_STYLES[v.type]}`}
                    >
                      {VEHICLE_TYPE_LABELS[v.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground">
                    {v.govRegNumber ?? "---"}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground">
                    {[v.model, v.manufacturer].filter(Boolean).join(" / ") || "---"}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground">
                    {v.year ?? "---"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded ${VEHICLE_STATUS_STYLES[v.status]}`}
                    >
                      {VEHICLE_STATUS_LABELS[v.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onEditClick(v)}
                        title="Редактировать"
                        className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                      >
                        <Icon name="Pencil" className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      {v.status !== "offline" ? (
                        <button
                          onClick={() => onDecommission(v)}
                          title="Списать"
                          className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition-colors"
                        >
                          <Icon name="Ban" className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onDelete(v.id)}
                          title="Удалить"
                          className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition-colors"
                        >
                          <Icon name="Trash2" className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
