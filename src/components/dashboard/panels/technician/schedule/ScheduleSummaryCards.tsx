import { useMemo } from "react";
import Icon from "@/components/ui/icon";
import type { ScheduleEntry } from "@/types/dashboard";

interface ScheduleSummaryCardsProps {
  schedule: ScheduleEntry[];
}

export default function ScheduleSummaryCards({ schedule }: ScheduleSummaryCardsProps) {
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
  );
}
