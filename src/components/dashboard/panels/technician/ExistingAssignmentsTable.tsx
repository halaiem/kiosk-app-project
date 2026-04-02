import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import type { ScheduleEntry } from "@/types/dashboard";
import { deleteSchedule, updateSchedule } from "@/api/dashboardApi";
import {
  SCHEDULE_STATUS_STYLES,
  SCHEDULE_STATUS_LABELS,
} from "./assignment-shared";

interface ExistingAssignmentsTableProps {
  date: string;
  existingForDate: ScheduleEntry[];
  existingNonCancelled: ScheduleEntry[];
  existingExpanded: boolean;
  setExistingExpanded: (v: boolean) => void;
  shouldAutoExpand: boolean;
  onDuplicateEntry: (entry: ScheduleEntry) => void;
  onDuplicateAll: () => void;
  onPrint: () => void;
  onReload?: () => void;
}

export default function ExistingAssignmentsTable({
  date,
  existingForDate,
  existingNonCancelled,
  existingExpanded,
  setExistingExpanded,
  shouldAutoExpand,
  onDuplicateEntry,
  onDuplicateAll,
  onPrint,
  onReload,
}: ExistingAssignmentsTableProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"cancel" | "restore" | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleCancelEntry = useCallback(async (id: string) => {
    setActionLoadingId(id);
    try {
      await deleteSchedule(id);
      onReload?.();
    } finally {
      setActionLoadingId(null);
      setConfirmId(null);
      setConfirmAction(null);
    }
  }, [onReload]);

  const handleRestoreEntry = useCallback(async (id: string) => {
    setActionLoadingId(id);
    try {
      await updateSchedule({ id, status: "planned" });
      onReload?.();
    } finally {
      setActionLoadingId(null);
      setConfirmId(null);
      setConfirmAction(null);
    }
  }, [onReload]);

  if (existingForDate.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setExistingExpanded(!existingExpanded)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon
            name="Calendar"
            className="w-4 h-4 text-muted-foreground"
          />
          <span className="text-sm font-medium text-foreground">
            Существующие назначения на {date}
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {existingForDate.length}
          </span>
        </div>
        <Icon
          name={existingExpanded || shouldAutoExpand ? "ChevronUp" : "ChevronDown"}
          className="w-4 h-4 text-muted-foreground"
        />
      </button>
      {(existingExpanded || shouldAutoExpand) && (
        <div className="border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-2 font-medium">
                  Маршрут
                </th>
                <th className="text-left px-3 py-2 font-medium">
                  Водитель
                </th>
                <th className="text-left px-3 py-2 font-medium">
                  Транспорт
                </th>
                <th className="text-left px-3 py-2 font-medium">Время</th>
                <th className="text-left px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {existingForDate.map((entry) => (
                <tr
                  key={entry.id}
                  className={`group border-b border-border last:border-b-0 transition-colors ${entry.status === "cancelled" ? "opacity-50" : ""}`}
                >
                  <td className="px-5 py-2.5 text-foreground font-medium">
                    М{entry.routeNumber}
                  </td>
                  <td className="px-3 py-2.5 text-foreground">
                    {entry.driverName}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    #{entry.vehicleNumber}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-foreground text-xs">
                    {entry.startTime} - {entry.endTime}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded ${SCHEDULE_STATUS_STYLES[entry.status] ?? ""}`}
                    >
                      {SCHEDULE_STATUS_LABELS[entry.status] ?? entry.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {confirmId === entry.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[11px] text-muted-foreground mr-1 whitespace-nowrap">
                          {confirmAction === "cancel" ? "Отменить?" : "Восстановить?"}
                        </span>
                        <button
                          onClick={() => confirmAction === "cancel" ? handleCancelEntry(entry.id) : handleRestoreEntry(entry.id)}
                          disabled={actionLoadingId === entry.id}
                          className={`flex items-center gap-1 h-6 px-2 rounded text-[11px] font-medium transition-colors disabled:opacity-50 ${confirmAction === "cancel" ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-green-500/10 text-green-600 hover:bg-green-500/20"}`}
                        >
                          {actionLoadingId === entry.id ? (
                            <Icon name="Loader2" className="w-3 h-3 animate-spin" />
                          ) : "Да"}
                        </button>
                        <button
                          onClick={() => { setConfirmId(null); setConfirmAction(null); }}
                          disabled={actionLoadingId === entry.id}
                          className="h-6 px-2 rounded bg-muted hover:bg-muted/70 text-[11px] text-muted-foreground transition-colors"
                        >
                          Нет
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => onDuplicateEntry(entry)}
                          title="Дублировать в форму"
                          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Icon name="Copy" className="w-3.5 h-3.5" />
                        </button>
                        {entry.status === "cancelled" ? (
                          <button
                            onClick={() => { setConfirmId(entry.id); setConfirmAction("restore"); }}
                            title="Восстановить"
                            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-green-500/10 text-muted-foreground hover:text-green-600 transition-colors"
                          >
                            <Icon name="RotateCcw" className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => { setConfirmId(entry.id); setConfirmAction("cancel"); }}
                            title="Отменить назначение"
                            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Icon name="X" className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-muted/20">
            <button
              onClick={onDuplicateAll}
              disabled={existingNonCancelled.length === 0}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:border-ring transition-colors disabled:opacity-40"
            >
              <Icon name="Copy" className="w-3.5 h-3.5" />
              Дублировать в форму
            </button>
            <button
              onClick={onPrint}
              disabled={existingNonCancelled.length === 0}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:border-ring transition-colors disabled:opacity-40"
            >
              <Icon name="Printer" className="w-3.5 h-3.5" />
              Печать
            </button>
            <span className="text-[11px] text-muted-foreground ml-auto">
              {existingNonCancelled.length} активных из {existingForDate.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
