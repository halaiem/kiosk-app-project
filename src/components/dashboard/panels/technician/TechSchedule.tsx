import { useState } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { ScheduleEntry } from "@/types/dashboard";
import ScheduleSummaryCards from "./schedule/ScheduleSummaryCards";
import ScheduleTable from "./schedule/ScheduleTable";
import ScheduleFormModal from "./schedule/ScheduleFormModal";

export function ScheduleView({ schedule, onReload }: { schedule: ScheduleEntry[]; onReload?: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

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

      <ScheduleSummaryCards schedule={schedule} />

      <ScheduleTable schedule={schedule} search={search} onReload={onReload} />

      {showForm && (
        <ScheduleFormModal onClose={() => setShowForm(false)} onReload={onReload} />
      )}
    </div>
  );
}