import Icon from "@/components/ui/icon";

interface StatCard {
  icon: string;
  value: number;
  label: string;
  color: string;
  bg: string;
}

interface DiagnosticsSummaryCardsProps {
  statCards: StatCard[];
}

export default function DiagnosticsSummaryCards({ statCards }: DiagnosticsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {statCards.map((card) => (
        <div
          key={card.label}
          className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4"
        >
          <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
            <Icon name={card.icon} className={`w-5 h-5 ${card.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
