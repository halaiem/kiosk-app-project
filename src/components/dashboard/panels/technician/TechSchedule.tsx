import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { ScheduleEntry } from "@/types/dashboard";
import { Modal } from "./TechRoutes";
import { createSchedule } from "@/api/dashboardApi";

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

export function ScheduleView({ schedule, onReload }: { schedule: ScheduleEntry[]; onReload?: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [detailEntry, setDetailEntry] = useState<ScheduleEntry | null>(null);
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10));
  const [fRoute, setFRoute] = useState("");
  const [fDriver, setFDriver] = useState("");
  const [fVehicle, setFVehicle] = useState("");
  const [fStart, setFStart] = useState("06:00");
  const [fEnd, setFEnd] = useState("14:00");
  const [fStatus, setFStatus] = useState<ScheduleEntry["status"]>("planned");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
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
              <h3 className="text-base font-semibold text-foreground">Новый наряд / смена</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Дата *</label>
                <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Маршрут *</label>
                <input type="text" value={fRoute} onChange={e => setFRoute(e.target.value)} placeholder="5" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Водитель *</label>
                <input type="text" value={fDriver} onChange={e => setFDriver(e.target.value)} placeholder="ФИО водителя" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Бортовой номер</label>
                <input type="text" value={fVehicle} onChange={e => setFVehicle(e.target.value)} placeholder="ТМ-3407" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Начало смены</label>
                <input type="time" value={fStart} onChange={e => setFStart(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Конец смены</label>
                <input type="time" value={fEnd} onChange={e => setFEnd(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
                <select value={fStatus} onChange={e => setFStatus(e.target.value as ScheduleEntry["status"])} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="planned">Запланировано</option>
                  <option value="active">Активно</option>
                  <option value="completed">Завершено</option>
                  <option value="cancelled">Отменено</option>
                </select>
              </div>
            </div>
            {formError && <p className="text-xs text-destructive mt-3">{formError}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors">Отмена</button>
              <button
                disabled={!fDate || !fRoute.trim() || !fDriver.trim() || saving}
                onClick={async () => {
                  setSaving(true); setFormError("");
                  try {
                    await createSchedule({
                      routeNumber: fRoute.trim(),
                      driverName: fDriver.trim(),
                      vehicleNumber: fVehicle.trim(),
                      shiftStart: `${fDate}T${fStart}:00`,
                      shiftEnd: `${fDate}T${fEnd}:00`,
                      status: fStatus,
                    });
                    setFRoute(""); setFDriver(""); setFVehicle(""); setFStart("06:00"); setFEnd("14:00"); setFStatus("planned");
                    setShowForm(false);
                    onReload?.();
                  } catch (e) { setFormError(e instanceof Error ? e.message : "Ошибка"); }
                  finally { setSaving(false); }
                }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Создаю..." : "Создать наряд"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}