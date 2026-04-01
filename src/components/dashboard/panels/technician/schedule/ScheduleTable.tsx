import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import type { ScheduleEntry } from "@/types/dashboard";
import { Modal } from "../TechRoutes";

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

interface ScheduleTableProps {
  schedule: ScheduleEntry[];
  search: string;
}

export default function ScheduleTable({ schedule, search }: ScheduleTableProps) {
  const [detailEntry, setDetailEntry] = useState<ScheduleEntry | null>(null);

  const sorted = useMemo(() => {
    let list = [...schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.driverName.toLowerCase().includes(q) || e.routeNumber.includes(q) || e.vehicleNumber.includes(q));
    }
    return list;
  }, [schedule, search]);

  return (
    <>
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
    </>
  );
}
