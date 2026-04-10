import { useState, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import SortableTh from "@/components/ui/SortableTh";
import { useTableSort } from "@/hooks/useTableSort";
import type {
  VehicleInfo,
  DriverInfo,
  DriverStatus,
  RouteInfo,
  ScheduleEntry,
  DocumentInfo,
} from "@/types/dashboard";
import {
  DRIVER_STATUS_STYLES,
  DRIVER_STATUS_LABELS,
} from "./TechVDConstants";
import DriverDetailModal from "./DriverDetailModal";
import DriverEditModal from "./DriverEditModal";
import DriverCreateModal from "./DriverCreateModal";
import { deleteDriver as apiDeleteDriver } from "@/api/dashboardApi";

type SortKey = "name" | "status" | "rating";

const LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  active: "Активен",
  vacation: "В отпуске",
  sick_leave: "Больничный",
  fired: "Неактивен",
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visiblePins, setVisiblePins] = useState<Set<string>>(new Set());

  const togglePinVisibility = useCallback((id: string) => {
    setVisiblePins(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await apiDeleteDriver(Number(id));
      setDeleteConfirmId(null);
      onReload?.();
    } catch (e) {
      console.error("Delete driver:", e);
    } finally {
      setDeleting(false);
    }
  };

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

  const { sort: colSort, toggle: colToggle, sorted: sortedFiltered } = useTableSort(
    filtered as unknown as Record<string, unknown>[]
  );
  const sortedList = sortedFiltered as typeof filtered;

  const allSelected = sortedList.length > 0 && sortedList.every((d) => selectedIds.has(d.id));
  const someSelected = sortedList.some((d) => selectedIds.has(d.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) { for (const d of sortedList) next.delete(d.id); }
      else { for (const d of sortedList) next.add(d.id); }
      return next;
    });
  }, [sortedList, allSelected]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const exportCsv = useCallback((rows: DriverInfo[]) => {
    const header = ["Таб.№", "ФИО", "Статус", "Телефон", "Рейтинг"];
    const lines = rows.map((d) => [
      d.tabNumber,
      `"${d.name.replace(/"/g, '""')}"`,
      LIFECYCLE_STATUS_LABELS[d.driverStatus || "active"] || "Активен",
      d.phone || "",
      d.rating.toFixed(1),
    ].join(";"));
    const blob = new Blob(["\uFEFF" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `drivers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, []);

  const exportExcel = useCallback((rows: DriverInfo[]) => {
    const header = "Таб.№\tФИО\tСтатус\tТелефон\tРейтинг";
    const lines = rows.map((d) => [
      d.tabNumber, d.name,
      LIFECYCLE_STATUS_LABELS[d.driverStatus || "active"] || "Активен",
      d.phone || "", d.rating.toFixed(1),
    ].join("\t"));
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `drivers_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click(); URL.revokeObjectURL(url);
  }, []);

  const exportRows = selectedIds.size > 0 ? sortedList.filter((d) => selectedIds.has(d.id)) : sortedList;

  const sortButtons: { key: SortKey; label: string }[] = [
    { key: "name", label: "Имя" },
    { key: "status", label: "Статус" },
    { key: "rating", label: "Рейтинг" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-full">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Icon name="Search" className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-44" />
        </div>
        <div className="flex items-center gap-1">
          {sortButtons.map((s) => (
            <button key={s.key} onClick={() => setSortBy(s.key)}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium transition-colors ${sortBy === s.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => exportExcel(exportRows)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="FileSpreadsheet" className="w-3.5 h-3.5" />Excel
          </button>
          <button onClick={() => exportCsv(exportRows)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="Download" className="w-3.5 h-3.5" />CSV
          </button>
          <ReportButton filename="drivers" data={drivers.map(d => ({
            tab: d.tabNumber, name: d.name,
            status: LIFECYCLE_STATUS_LABELS[d.driverStatus || "active"] || "Активен",
            phone: d.phone || "", rating: d.rating,
          }))} />
          {selectedIds.size > 0 && (
            <button onClick={async () => {
              if (!confirm(`Удалить ${selectedIds.size} записей?`)) return;
              for (const id of selectedIds) {
                try { await apiDeleteDriver(Number(id)); } catch (e) { console.error(e); }
              }
              setSelectedIds(new Set());
              onReload?.();
            }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors">
              <Icon name="Trash2" className="w-3.5 h-3.5" />
              Удалить ({selectedIds.size})
            </button>
          )}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0">
            <Icon name="UserPlus" className="w-3.5 h-3.5" />Добавить
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="w-10 px-4 py-2.5">
                <input type="checkbox" checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleSelectAll} className="w-4 h-4 accent-primary cursor-pointer" />
              </th>
              <SortableTh label="Таб. №" sortKey="tabNumber" sort={colSort} onToggle={colToggle} className="px-3" />
              <SortableTh label="ФИО" sortKey="name" sort={colSort} onToggle={colToggle} className="px-3" />
              <SortableTh label="Статус" sortKey="driverStatus" sort={colSort} onToggle={colToggle} className="px-3" />
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">PIN</th>
              <SortableTh label="Телефон" sortKey="phone" sort={colSort} onToggle={colToggle} className="px-3" />
              <SortableTh label="Рейтинг" sortKey="rating" sort={colSort} onToggle={colToggle} className="px-3" />
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-muted-foreground">
                  <Icon name="UserX" className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Не найдено</p>
                </td>
              </tr>
            ) : (
              sortedList.map((d) => {
                const lifecycle = d.driverStatus || "active";
                return (
                  <tr key={d.id}
                    className={`border-b border-border hover:bg-muted/30 transition-colors ${selectedIds.has(d.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selectedIds.has(d.id)} onChange={() => toggleRow(d.id)} className="w-4 h-4 accent-primary cursor-pointer" />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{d.tabNumber}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground text-sm">{d.name}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${LIFECYCLE_STATUS_STYLES[lifecycle] || "bg-muted text-muted-foreground"}`}>
                        {LIFECYCLE_STATUS_LABELS[lifecycle] || lifecycle}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded tracking-widest text-foreground min-w-[3rem]">
                          {visiblePins.has(d.id) ? (d.pin || '—') : '••••'}
                        </span>
                        <button onClick={() => togglePinVisibility(d.id)}
                          className="w-6 h-6 rounded bg-muted/50 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                          title={visiblePins.has(d.id) ? "Скрыть PIN" : "Показать PIN"}>
                          <Icon name={visiblePins.has(d.id) ? "EyeOff" : "Eye"} className="w-3 h-3" />
                        </button>
                        {visiblePins.has(d.id) && d.pin && (
                          <button onClick={() => navigator.clipboard.writeText(d.pin!)}
                            className="w-6 h-6 rounded bg-muted/50 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                            title="Копировать PIN">
                            <Icon name="Copy" className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs font-mono">{d.phone || "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Icon key={i} name="Star"
                            className={`w-3 h-3 ${i < Math.round(d.rating) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-1">{d.rating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        {deleteConfirmId === d.id ? (
                          <>
                            <span className="text-[10px] text-destructive font-medium">Удалить?</span>
                            <button onClick={() => handleDelete(d.id)} disabled={deleting}
                              className="w-7 h-7 rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500/25 flex items-center justify-center transition-colors disabled:opacity-50">
                              <Icon name="Check" className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirmId(null)}
                              className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">
                              <Icon name="X" className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setDetailDriver(d)}
                              className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors" title="Просмотр">
                              <Icon name="Eye" className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingDriver(d)}
                              className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors" title="Изменить">
                              <Icon name="Pencil" className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirmId(d.id)}
                              className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors" title="Удалить">
                              <Icon name="Trash2" className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedIds.size > 0 && (
        <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center gap-3">
          <span className="text-xs font-medium text-foreground">Выбрано: {selectedIds.size}</span>
          <button onClick={() => exportExcel(exportRows)}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="FileSpreadsheet" className="w-3 h-3" />Excel
          </button>
          <button onClick={() => exportCsv(exportRows)}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Icon name="Download" className="w-3 h-3" />CSV
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="ml-auto h-7 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
            Сбросить
          </button>
        </div>
      )}

      {detailDriver && (
        <DriverDetailModal driver={detailDriver} schedules={schedules}
          onClose={() => setDetailDriver(null)} onReload={onReload} />
      )}
      {editingDriver && (
        <DriverEditModal driver={editingDriver}
          onClose={() => setEditingDriver(null)} onReload={onReload} />
      )}
      {showForm && (
        <DriverCreateModal onClose={() => setShowForm(false)} onReload={onReload} />
      )}
    </div>
  );
}