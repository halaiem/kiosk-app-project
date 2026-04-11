import { useState, useMemo, useCallback, useRef } from "react";
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
  generatePin,
} from "./TechVDConstants";
import DriverDetailModal from "./DriverDetailModal";
import DriverEditModal from "./DriverEditModal";
import DriverCreateModal from "./DriverCreateModal";
import { deleteDriver as apiDeleteDriver } from "@/api/dashboardApi";
import { createDriver as apiCreateDriver } from "@/api/driverApi";

interface BulkDriverRow {
  tabNumber: string;
  fullName: string;
  pin: string;
  phone: string;
  vehicleType: string;
  status: 'pending' | 'ok' | 'error';
  error?: string;
}

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

  // Bulk creation state
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkDriverRow[]>(() =>
    Array.from({ length: 3 }, (_, i) => ({ tabNumber: `T00${i + 1}`, fullName: "", pin: generatePin(), phone: "", vehicleType: "bus", status: 'pending' as const }))
  );
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDone, setBulkDone] = useState<BulkDriverRow[]>([]);
  const [showBulkExport, setShowBulkExport] = useState(false);
  const bulkFileRef = useRef<HTMLInputElement>(null);

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

  // ── Bulk helpers ─────────────────────────────────────────────────────────────
  const addBulkDriverRow = useCallback(() => {
    setBulkRows(prev => [...prev, { tabNumber: "", fullName: "", pin: generatePin(), phone: "", vehicleType: "bus", status: 'pending' }]);
  }, []);

  const removeBulkDriverRow = useCallback((idx: number) => {
    setBulkRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateBulkDriverRow = useCallback((idx: number, field: string, value: string) => {
    setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value, status: 'pending', error: undefined } : r));
  }, []);

  const genAllPins = useCallback(() => {
    setBulkRows(prev => prev.map(r => ({ ...r, pin: generatePin(), status: 'pending', error: undefined })));
  }, []);

  const handleBulkDriverCreate = useCallback(async () => {
    const toCreate = bulkRows.filter(r => r.fullName.trim() && r.pin.trim() && r.status !== 'ok');
    if (toCreate.length === 0) return;
    setBulkSaving(true);
    const results: BulkDriverRow[] = [...bulkRows];
    for (let i = 0; i < bulkRows.length; i++) {
      const row = bulkRows[i];
      if (!row.fullName.trim() || !row.pin.trim() || row.status === 'ok') continue;
      try {
        await apiCreateDriver({
          fullName: row.fullName.trim(),
          pin: row.pin.trim(),
          tabNumber: row.tabNumber.trim() || undefined,
          vehicleType: row.vehicleType,
          vehicleNumber: "",
          routeNumber: "",
          shiftStart: "08:00",
          ...(row.phone.trim() ? { phone: row.phone.trim() } : {}),
        } as Parameters<typeof apiCreateDriver>[0]);
        results[i] = { ...row, status: 'ok' };
      } catch (e) {
        results[i] = { ...row, status: 'error', error: e instanceof Error ? e.message : 'Ошибка' };
      }
    }
    setBulkDone(results);
    setShowBulkExport(true);
    onReload?.();
    setBulkSaving(false);
    const failed = results.filter(r => r.status === 'error');
    setBulkRows(failed.length > 0
      ? failed.map(r => ({ ...r, status: 'pending' as const }))
      : [{ tabNumber: "", fullName: "", pin: generatePin(), phone: "", vehicleType: "bus", status: 'pending' as const }]
    );
  }, [bulkRows, onReload]);

  const exportBulkDriversCsv = useCallback((rows: BulkDriverRow[]) => {
    const header = "Таб.№;ФИО;PIN;Телефон;Тип ТС";
    const lines = rows.filter(r => r.status === 'ok').map(r =>
      [r.tabNumber, `"${r.fullName.replace(/"/g, '""')}"`, r.pin, r.phone, r.vehicleType].join(";")
    );
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `drivers_pins_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, []);

  const exportBulkDriversExcel = useCallback((rows: BulkDriverRow[]) => {
    const header = "Таб.№\tФИО\tPIN\tТелефон\tТип ТС";
    const lines = rows.filter(r => r.status === 'ok').map(r =>
      [r.tabNumber, r.fullName, r.pin, r.phone, r.vehicleType].join("\t")
    );
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `drivers_pins_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click(); URL.revokeObjectURL(url);
  }, []);

  const handleBulkImportCsv = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || "";
      const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
      const start = lines[0]?.toLowerCase().includes("фио") || lines[0]?.toLowerCase().includes("таб") ? 1 : 0;
      const parsed: BulkDriverRow[] = lines.slice(start).map(line => {
        const cols = line.split(/[;,\t]/);
        return {
          tabNumber: (cols[0] || "").trim(),
          fullName: (cols[1] || "").replace(/^"|"$/g, "").trim(),
          pin: (cols[2] || generatePin()).trim() || generatePin(),
          phone: (cols[3] || "").trim(),
          vehicleType: (cols[4] || "bus").trim() || "bus",
          status: 'pending' as const,
        };
      }).filter(r => r.fullName);
      if (parsed.length > 0) setBulkRows(parsed);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }, []);

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
          <button onClick={() => { setShowBulkForm(v => !v); setShowForm(false); }}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-colors shrink-0 ${showBulkForm ? "bg-indigo-500/15 text-indigo-500 border-indigo-500/30" : "bg-muted text-muted-foreground hover:text-foreground border-border"}`}>
            <Icon name="Users" className="w-3.5 h-3.5" />Массово
          </button>
          <button onClick={() => { setShowForm(true); setShowBulkForm(false); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0">
            <Icon name="UserPlus" className="w-3.5 h-3.5" />Добавить
          </button>
        </div>
      </div>

      {/* Bulk create panel */}
      {showBulkForm && (
        <div className="px-5 py-4 border-b border-border bg-indigo-500/5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
              <Icon name="Users" className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">Массовое добавление водителей</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">PIN-коды генерируются автоматически. После создания — скачайте файл с PIN-кодами.</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input ref={bulkFileRef} type="file" accept=".csv,.txt" onChange={handleBulkImportCsv} className="hidden" />
              <button onClick={() => bulkFileRef.current?.click()}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="Upload" className="w-3.5 h-3.5" />Импорт CSV
              </button>
              <button onClick={genAllPins}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="RefreshCw" className="w-3.5 h-3.5" />Обновить PIN
              </button>
              <button onClick={() => { setShowBulkForm(false); setBulkDone([]); setShowBulkExport(false); }}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" className="w-3.5 h-3.5" />Закрыть
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border overflow-hidden mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8">#</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-24">Таб. №</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">ФИО</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-40">PIN</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-32">Телефон</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-32">Тип ТС</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-20">Статус</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((row, idx) => (
                  <tr key={idx} className={`border-b border-border last:border-0 ${row.status === 'ok' ? 'bg-green-500/5' : row.status === 'error' ? 'bg-red-500/5' : ''}`}>
                    <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-1.5">
                      <input value={row.tabNumber} onChange={e => updateBulkDriverRow(idx, 'tabNumber', e.target.value)}
                        disabled={row.status === 'ok'}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input value={row.fullName} onChange={e => updateBulkDriverRow(idx, 'fullName', e.target.value)}
                        disabled={row.status === 'ok'}
                        placeholder="Иванов И.И."
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50" />
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <input value={row.pin} onChange={e => updateBulkDriverRow(idx, 'pin', e.target.value)}
                          disabled={row.status === 'ok'}
                          className="flex-1 h-7 px-2 rounded-md border border-border bg-background text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 min-w-0 tracking-widest" />
                        {row.status !== 'ok' && (
                          <button onClick={() => updateBulkDriverRow(idx, 'pin', generatePin())}
                            className="w-6 h-6 rounded bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 transition-colors" title="Новый PIN">
                            <Icon name="RefreshCw" className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <input value={row.phone} onChange={e => updateBulkDriverRow(idx, 'phone', e.target.value)}
                        disabled={row.status === 'ok'}
                        placeholder="+7..."
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50" />
                    </td>
                    <td className="px-3 py-1.5">
                      <select value={row.vehicleType} onChange={e => updateBulkDriverRow(idx, 'vehicleType', e.target.value)}
                        disabled={row.status === 'ok'}
                        className="w-full h-7 px-2 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
                        <option value="bus">Автобус</option>
                        <option value="tram">Трамвай</option>
                        <option value="trolleybus">Троллейбус</option>
                        <option value="minibus">Маршрутка</option>
                        <option value="metro">Метро</option>
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      {row.status === 'ok' && <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-green-500/15 text-green-500">Создан</span>}
                      {row.status === 'error' && <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-red-500/15 text-red-500" title={row.error}>Ошибка</span>}
                      {row.status === 'pending' && <span className="text-[11px] text-muted-foreground">—</span>}
                    </td>
                    <td className="px-2 py-1.5">
                      {row.status !== 'ok' && (
                        <button onClick={() => removeBulkDriverRow(idx)}
                          className="w-6 h-6 rounded text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors">
                          <Icon name="X" className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={addBulkDriverRow}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="Plus" className="w-3.5 h-3.5" />Добавить строку
            </button>
            <button onClick={handleBulkDriverCreate}
              disabled={bulkSaving || bulkRows.filter(r => r.fullName.trim() && r.pin.trim() && r.status !== 'ok').length === 0}
              className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <Icon name="UserPlus" className="w-3.5 h-3.5" />
              {bulkSaving ? 'Создаю...' : `Создать (${bulkRows.filter(r => r.fullName.trim() && r.pin.trim() && r.status !== 'ok').length})`}
            </button>

            {showBulkExport && bulkDone.filter(r => r.status === 'ok').length > 0 && (
              <div className="flex items-center gap-2 ml-auto p-2 rounded-xl bg-green-500/10 border border-green-500/20">
                <Icon name="ShieldCheck" className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-xs text-green-600 font-medium">
                  Создано: {bulkDone.filter(r => r.status === 'ok').length} — скачайте PIN-коды
                </span>
                <button onClick={() => exportBulkDriversExcel(bulkDone)}
                  className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium bg-green-500 text-white hover:bg-green-600 transition-colors">
                  <Icon name="FileSpreadsheet" className="w-3 h-3" />Excel
                </button>
                <button onClick={() => exportBulkDriversCsv(bulkDone)}
                  className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium bg-white/80 text-green-700 border border-green-500/30 hover:bg-white transition-colors">
                  <Icon name="Download" className="w-3 h-3" />CSV
                </button>
                <button onClick={() => setShowBulkExport(false)} className="w-6 h-6 rounded text-green-500 hover:text-green-700 flex items-center justify-center">
                  <Icon name="X" className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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