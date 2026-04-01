import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";

interface DiagnosticsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  rawData: unknown[];
  onReload: () => void;
}

export default function DiagnosticsToolbar({
  search,
  onSearchChange,
  rawData,
  onReload,
}: DiagnosticsToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-base font-semibold text-foreground flex-1">Диагностика транспортных средств</h2>
      <div className="relative">
        <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Борт, водитель..."
          className="h-9 pl-8 pr-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring w-40"
        />
      </div>
      <ReportButton filename="diagnostics" data={rawData} />
      <button
        onClick={onReload}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
      >
        <Icon name="RefreshCw" className="w-4 h-4" />
        Обновить
      </button>
    </div>
  );
}
