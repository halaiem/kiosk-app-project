import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  label?: string;
  filename?: string;
  data?: object[];
  itemLabel?: string;
  itemKey?: string;
  dateKey?: string;
}

type PeriodType = "day" | "week" | "month" | "all" | "custom";

const PERIOD_LABELS: { key: PeriodType; label: string }[] = [
  { key: "day", label: "День" },
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "all", label: "Все время" },
  { key: "custom", label: "Интервал" },
];

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

function downloadCSV(data: object[], filename: string) {
  const csv = toCSV(data);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function getPeriodRange(period: PeriodType): { from: Date; to: Date } | null {
  if (period === "all") return null;
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let from: Date;
  switch (period) {
    case "day":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    default:
      return null;
  }
  return { from, to };
}

function ReportModal({
  data,
  filename,
  itemLabel,
  itemKey,
  dateKey,
  onClose,
}: {
  data: object[];
  filename: string;
  itemLabel?: string;
  itemKey?: string;
  dateKey?: string;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<PeriodType>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const uniqueItems = useMemo(() => {
    if (!itemKey) return [];
    const seen = new Set<string>();
    for (const row of data) {
      const val = (row as Record<string, unknown>)[itemKey];
      if (val != null) seen.add(String(val));
    }
    return Array.from(seen).sort();
  }, [data, itemKey]);

  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => new Set(uniqueItems));
  const allSelected = uniqueItems.length > 0 && selectedItems.size === uniqueItems.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(uniqueItems));
    }
  };

  const toggleItem = (item: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const filteredData = useMemo(() => {
    let result = [...data];

    if (dateKey) {
      let range: { from: Date; to: Date } | null = null;
      if (period === "custom" && customFrom && customTo) {
        range = {
          from: new Date(customFrom + "T00:00:00"),
          to: new Date(customTo + "T23:59:59.999"),
        };
      } else if (period !== "all" && period !== "custom") {
        range = getPeriodRange(period);
      }
      if (range) {
        result = result.filter((row) => {
          const val = (row as Record<string, unknown>)[dateKey];
          if (!val) return false;
          const d = val instanceof Date ? val : new Date(String(val));
          return d >= range.from && d <= range.to;
        });
      }
    }

    if (itemKey && uniqueItems.length > 0) {
      result = result.filter((row) => {
        const val = (row as Record<string, unknown>)[itemKey];
        return val != null && selectedItems.has(String(val));
      });
    }

    return result;
  }, [data, dateKey, period, customFrom, customTo, itemKey, uniqueItems, selectedItems]);

  const handleDownload = () => {
    downloadCSV(filteredData, filename);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Icon name="Download" className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Скачать отчет</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
          >
            <Icon name="X" className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Период</label>
            <div className="flex flex-wrap gap-1.5">
              {PERIOD_LABELS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    period === p.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {period === "custom" && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">От</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">До</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>

          {itemKey && uniqueItems.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                {itemLabel || "Фильтр"}
              </label>
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={toggleAll}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors border-b border-border"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      allSelected
                        ? "bg-primary border-primary"
                        : "border-border"
                    }`}
                  >
                    {allSelected && <Icon name="Check" className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className="font-medium text-foreground">Выбрать все</span>
                  <span className="ml-auto text-muted-foreground">{selectedItems.size}/{uniqueItems.length}</span>
                </button>
                <div className="max-h-40 overflow-y-auto">
                  {uniqueItems.map((item) => {
                    const checked = selectedItems.has(item);
                    return (
                      <button
                        key={item}
                        onClick={() => toggleItem(item)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/30 transition-colors"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            checked
                              ? "bg-primary border-primary"
                              : "border-border"
                          }`}
                        >
                          {checked && <Icon name="Check" className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className="text-foreground">{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {filteredData.length} {filteredData.length === 1 ? "запись" : "записей"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDownload}
                disabled={filteredData.length === 0}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Icon name="Download" className="w-3.5 h-3.5" />
                Скачать CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportButton({ label, filename = "report", data = [], itemLabel, itemKey, dateKey }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title={label ?? "Скачать отчет"}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border transition-colors"
      >
        <Icon name="Download" className="w-3.5 h-3.5" />
        {label ?? "Отчет"}
      </button>
      {showModal && (
        <ReportModal
          data={data}
          filename={filename}
          itemLabel={itemLabel}
          itemKey={itemKey}
          dateKey={dateKey}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
