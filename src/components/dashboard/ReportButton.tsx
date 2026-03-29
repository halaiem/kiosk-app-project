import Icon from "@/components/ui/icon";

interface Props {
  label?: string;
  filename?: string;
  data?: object[];
}

function toCSV(data: object[]): string {
  if (!data.length) return "";
  const keys = Object.keys(data[0]);
  const header = keys.join(";");
  const rows = data.map((row) =>
    keys.map((k) => {
      const val = (row as Record<string, unknown>)[k];
      if (val instanceof Date) return new Date(val).toLocaleString("ru-RU");
      return String(val ?? "").replace(/;/g, ",");
    }).join(";")
  );
  return [header, ...rows].join("\n");
}

export default function ReportButton({ label, filename = "report", data = [] }: Props) {
  const handleDownload = () => {
    const csv = toCSV(data);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      title={label ?? "Скачать отчёт"}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border transition-colors"
    >
      <Icon name="Download" className="w-3.5 h-3.5" />
      {label ?? "Отчёт"}
    </button>
  );
}
