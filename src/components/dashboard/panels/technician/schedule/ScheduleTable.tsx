import { useState, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import SortableTh from "@/components/ui/SortableTh";
import { useTableSort } from "@/hooks/useTableSort";
import type { ScheduleEntry } from "@/types/dashboard";
import { Modal } from "../TechRoutes";
import { updateSchedule, deleteSchedule } from "@/api/dashboardApi";

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

const SHIFT_TYPE_LABELS: Record<string, string> = {
  regular: "Обычная",
  additional: "Дополнительная",
};

interface ScheduleTableProps {
  schedule: ScheduleEntry[];
  search: string;
  onReload?: () => void;
}

export default function ScheduleTable({ schedule, search, onReload }: ScheduleTableProps) {
  const [detailEntry, setDetailEntry] = useState<ScheduleEntry | null>(null);

  // Edit state
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [eDriverId, setEDriverId] = useState("");
  const [eVehicleId, setEVehicleId] = useState("");
  const [eRouteId, setERouteId] = useState("");
  const [eShiftStart, setEShiftStart] = useState("");
  const [eShiftEnd, setEShiftEnd] = useState("");
  const [eStatus, setEStatus] = useState<ScheduleEntry["status"]>("planned");
  const [eShiftType, setEShiftType] = useState("regular");
  const [eNotes, setENotes] = useState("");
  const [eDocumentId, setEDocumentId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const openEdit = useCallback((entry: ScheduleEntry) => {
    setEDriverId(entry.driverId != null ? String(entry.driverId) : "");
    setEVehicleId(entry.vehicleId || "");
    setERouteId(entry.routeId || "");
    // Extract datetime parts
    const startDt = entry.startTime || "";
    const endDt = entry.endTime || "";
    setEShiftStart(startDt);
    setEShiftEnd(endDt);
    setEStatus(entry.status);
    setEShiftType(entry.shiftType || "regular");
    setENotes(entry.notes || "");
    setEDocumentId(entry.documentId != null ? String(entry.documentId) : "");
    setEditError("");
    setEditingEntry(entry);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!editingEntry) return;
    setEditSaving(true);
    setEditError("");
    try {
      const payload: Record<string, unknown> = {
        id: editingEntry.id,
        status: eStatus,
        shiftType: eShiftType,
        notes: eNotes.trim() || null,
      };
      if (eDriverId) payload.driverId = Number(eDriverId);
      if (eVehicleId) payload.vehicleId = eVehicleId;
      if (eRouteId) payload.routeId = eRouteId;
      if (eShiftStart) payload.shiftStart = eShiftStart;
      if (eShiftEnd) payload.shiftEnd = eShiftEnd;
      if (eDocumentId) payload.documentId = Number(eDocumentId);
      await updateSchedule(payload);
      setEditingEntry(null);
      onReload?.();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setEditSaving(false);
    }
  }, [editingEntry, eDriverId, eVehicleId, eRouteId, eShiftStart, eShiftEnd, eStatus, eShiftType, eNotes, eDocumentId, onReload]);

  const handleCancel = useCallback(async (id: string) => {
    setCancellingId(id);
    try {
      await deleteSchedule(id);
      onReload?.();
    } catch (e) {
      console.error("Cancel schedule:", e);
    } finally {
      setCancellingId(null);
    }
  }, [onReload]);

  const sorted = useMemo(() => {
    let list = [...schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.driverName.toLowerCase().includes(q) || e.routeNumber.includes(q) || e.vehicleNumber.includes(q));
    }
    return list;
  }, [schedule, search]);

  const { sort: schedSort, toggle: schedToggle, sorted: sortedSchedule } = useTableSort(
    sorted as unknown as Record<string, unknown>[]
  );
  const sortedList = sortedSchedule as typeof sorted;

  const allSelected = sortedList.length > 0 && sortedList.every(item => selectedIds.has(item.id));
  const someSelected = sortedList.some(item => selectedIds.has(item.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) { for (const item of sortedList) next.delete(item.id); }
      else { for (const item of sortedList) next.add(item.id); }
      return next;
    });
  }, [sortedList, allSelected]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  return (
    <>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {selectedIds.size > 0 && (
          <div className="px-5 py-2.5 border-b border-border bg-muted/20 flex items-center gap-3">
            <span className="text-xs font-medium text-foreground">Выбрано: {selectedIds.size}</span>
            <button onClick={async () => {
              if (!confirm(`Удалить ${selectedIds.size} записей?`)) return;
              for (const id of selectedIds) {
                try { await deleteSchedule(id); } catch (e) { console.error(e); }
              }
              setSelectedIds(new Set());
              onReload?.();
            }}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors">
              <Icon name="Trash2" className="w-3 h-3" />
              Удалить ({selectedIds.size})
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="ml-auto h-7 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
              Сбросить
            </button>
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="w-10 px-4 py-2.5">
                <input type="checkbox" checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleSelectAll} className="w-4 h-4 accent-primary cursor-pointer" />
              </th>
              <SortableTh label="Время" sortKey="startTime" sort={schedSort} onToggle={schedToggle} className="px-5" />
              <SortableTh label="Маршрут" sortKey="routeNumber" sort={schedSort} onToggle={schedToggle} className="px-3" />
              <SortableTh label="Водитель" sortKey="driverName" sort={schedSort} onToggle={schedToggle} className="px-3" />
              <SortableTh label="Транспорт" sortKey="vehicleNumber" sort={schedSort} onToggle={schedToggle} className="px-3" />
              <SortableTh label="Статус" sortKey="status" sort={schedSort} onToggle={schedToggle} className="px-3" />
              <th className="px-3 py-2.5 font-medium text-right text-muted-foreground">Действия</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Icon name="CalendarX" className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Нет записей в расписании</p>
                </td>
              </tr>
            ) : (
              (sortedSchedule as typeof sorted).map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setDetailEntry(entry)}
                  className={`border-b border-border hover:bg-muted/30 transition-colors cursor-pointer ${
                    entry.status === "cancelled" ? "opacity-50" : ""
                  } ${selectedIds.has(entry.id) ? "bg-primary/5" : ""}`}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => toggleRow(entry.id)} className="w-4 h-4 accent-primary cursor-pointer" />
                  </td>
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
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(entry); }}
                        className="text-[11px] px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        title="Редактировать"
                      >
                        <Icon name="Pencil" className="w-3 h-3" />
                      </button>
                      {entry.status !== "cancelled" && entry.status !== "completed" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancel(entry.id); }}
                          disabled={cancellingId === entry.id}
                          className="text-[11px] px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Отменить"
                        >
                          <Icon name="X" className="w-3 h-3" />
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

      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingEntry(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">Редактирование смены</h3>
              <button onClick={() => setEditingEntry(null)} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">ID водителя</label>
                <input type="text" value={eDriverId} onChange={e => setEDriverId(e.target.value.replace(/\D/g, ""))} placeholder="Числовой ID" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                {editingEntry.driverName && <p className="text-[10px] text-muted-foreground mt-0.5">Текущий: {editingEntry.driverName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">ID транспорта</label>
                <input type="text" value={eVehicleId} onChange={e => setEVehicleId(e.target.value)} placeholder="UUID транспорта" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                {editingEntry.vehicleNumber && <p className="text-[10px] text-muted-foreground mt-0.5">Текущий: #{editingEntry.vehicleNumber}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">ID маршрута</label>
                <input type="text" value={eRouteId} onChange={e => setERouteId(e.target.value)} placeholder="UUID маршрута" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                {editingEntry.routeNumber && <p className="text-[10px] text-muted-foreground mt-0.5">Текущий: М{editingEntry.routeNumber}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
                <select value={eStatus} onChange={e => setEStatus(e.target.value as ScheduleEntry["status"])} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="planned">Запланировано</option>
                  <option value="active">Активно</option>
                  <option value="completed">Завершено</option>
                  <option value="cancelled">Отменено</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Начало смены</label>
                <input type="datetime-local" value={eShiftStart} onChange={e => setEShiftStart(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Конец смены</label>
                <input type="datetime-local" value={eShiftEnd} onChange={e => setEShiftEnd(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Тип смены</label>
                <select value={eShiftType} onChange={e => setEShiftType(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="regular">Обычная</option>
                  <option value="additional">Дополнительная</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">ID документа</label>
                <input type="text" value={eDocumentId} onChange={e => setEDocumentId(e.target.value.replace(/\D/g, ""))} placeholder="Числовой ID" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Примечания</label>
                <textarea value={eNotes} onChange={e => setENotes(e.target.value)} rows={2} placeholder="Заметки к смене..." className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>
            {editError && <p className="text-xs text-destructive mt-3">{editError}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditingEntry(null)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors">Отмена</button>
              <button
                disabled={editSaving}
                onClick={handleUpdate}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {editSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}