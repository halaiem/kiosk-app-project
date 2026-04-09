import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import SortableTh from "@/components/ui/SortableTh";
import { useTableSort } from "@/hooks/useTableSort";
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
  { key: "electrobus", label: "Электробусы" },
  { key: "technical", label: "Технические" },
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
  const { sort, toggle, sorted } = useTableSort(filtered as unknown as Record<string, unknown>[]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sortedFiltered = sorted as typeof filtered;
  const allSelected = sortedFiltered.length > 0 && sortedFiltered.every((v) => selectedIds.has(v.id));
  const someSelected = sortedFiltered.some((v) => selectedIds.has(v.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) { for (const v of sortedFiltered) next.delete(v.id); }
      else { for (const v of sortedFiltered) next.add(v.id); }
      return next;
    });
  }, [sortedFiltered, allSelected]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const exportCsv = useCallback((rows: VehicleInfo[]) => {
    const header = ["№", "Борт. номер", "VIN", "Тип ТС", "Гос. номер", "Модель", "Производитель", "Год", "Статус"];
    const lines = rows.map((v, i) => [
      i + 1, v.boardNumber ?? v.number, v.vinNumber ?? "", VEHICLE_TYPE_LABELS[v.type] ?? v.type,
      v.govRegNumber ?? "", v.model ?? "", v.manufacturer ?? "", v.year ?? "",
      VEHICLE_STATUS_LABELS[v.status] ?? v.status,
    ].join(";"));
    const blob = new Blob(["\uFEFF" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `vehicles_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, []);

  const handleExport = useCallback(() => {
    const rows = selectedIds.size > 0 ? sortedFiltered.filter((v) => selectedIds.has(v.id)) : sortedFiltered;
    exportCsv(rows);
  }, [sortedFiltered, selectedIds, exportCsv]);

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
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
            title={selectedIds.size > 0 ? `Экспорт выбранных (${selectedIds.size})` : "Экспорт CSV"}
          >
            <Icon name="Download" className="w-3.5 h-3.5" />
            CSV
          </button>
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
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleSelectAll} className="w-4 h-4 accent-primary cursor-pointer" />
                </th>
                <SortableTh label="Борт. номер" sortKey="boardNumber" sort={sort} onToggle={toggle} className="px-4" />
                <SortableTh label="VIN-номер" sortKey="vinNumber" sort={sort} onToggle={toggle} className="px-4" />
                <SortableTh label="Тип ТС" sortKey="type" sort={sort} onToggle={toggle} className="px-4" />
                <SortableTh label="Гос. номер" sortKey="govRegNumber" sort={sort} onToggle={toggle} className="px-4" />
                <SortableTh label="Модель / Произв." sortKey="model" sort={sort} onToggle={toggle} className="px-4" />
                <SortableTh label="Год" sortKey="year" sort={sort} onToggle={toggle} className="px-4" />
                <SortableTh label="Статус" sortKey="status" sort={sort} onToggle={toggle} className="px-4" />
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiltered.map((v) => (
                <tr
                  key={v.id}
                  className={`border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer ${selectedIds.has(v.id) ? "bg-primary/5" : ""}`}
                  onClick={() => onViewClick(v)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(v.id)} onChange={() => toggleRow(v.id)} className="w-4 h-4 accent-primary cursor-pointer" />
                  </td>
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

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium text-foreground">Выбрано {selectedIds.size}</span>
          <button onClick={() => exportCsv(sortedFiltered.filter((v) => selectedIds.has(v.id)))} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Icon name="Download" className="w-3.5 h-3.5" />
            Экспорт выбранных
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Сбросить
          </button>
        </div>
      )}
    </div>
  );
}