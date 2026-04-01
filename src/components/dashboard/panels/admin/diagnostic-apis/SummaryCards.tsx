import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { DiagnosticApiConfig } from "@/types/dashboard";

interface SummaryCardsProps {
  apis: DiagnosticApiConfig[];
}

export default function SummaryCards({ apis }: SummaryCardsProps) {
  const activeCount = apis.filter((a) => a.isActive).length;
  const connectedVehicles = new Set(apis.map((a) => a.vehicleId)).size;

  const summaryCards = [
    {
      icon: "Plug",
      value: apis.length,
      label: "Всего API",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: "CheckCircle",
      value: activeCount,
      label: "Активных",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      icon: "Truck",
      value: connectedVehicles,
      label: "Подключено ТС",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="flex items-start gap-4">
      <div className="grid grid-cols-3 gap-4 flex-1">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3"
          >
            <div
              className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}
            >
              <Icon name={card.icon} className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>
      <ReportButton filename="diagnostic_apis" data={apis} />
    </div>
  );
}
