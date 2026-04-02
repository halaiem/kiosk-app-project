import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";

export interface AssignmentRow {
  key: string;
  routeId: string;
  routeNumber: string;
  routeName: string;
  driverId: number | null;
  vehicleId: string;
  shiftStart: string;
  shiftEnd: string;
  shiftType: "regular" | "additional";
  notes: string;
  showNotes: boolean;
}

export interface BatchResultItem {
  label: string;
  ok: boolean;
  error?: string;
}

export interface TemplateRow {
  routeId: string;
  routeNumber: string;
  routeName: string;
  driverId: number | null;
  vehicleId: string;
  shiftStart: string;
  shiftEnd: string;
  shiftType: "regular" | "additional";
}

export interface Template {
  id: number;
  name: string;
  description: string;
  rows: TemplateRow[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  bus: "Автобус",
  tram: "Трамвай",
  trolleybus: "Троллейбус",
};

export const SCHEDULE_STATUS_STYLES: Record<string, string> = {
  planned: "bg-blue-500/15 text-blue-500",
  active: "bg-green-500/15 text-green-500",
  completed: "bg-gray-500/15 text-gray-500",
  cancelled: "bg-red-500/15 text-red-500",
};

export const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  planned: "Запланировано",
  active: "Активно",
  completed: "Завершено",
  cancelled: "Отменено",
};

let rowCounter = 0;
export function nextKey() {
  rowCounter += 1;
  return `row-${Date.now()}-${rowCounter}`;
}

export function SearchableSelect({
  value,
  displayValue,
  placeholder,
  options,
  onSelect,
  onClear,
}: {
  value: string | number | null;
  displayValue: string;
  placeholder: string;
  options: { id: string | number; label: string; sub?: string }[];
  onSelect: (id: string | number) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sub && o.sub.toLowerCase().includes(q))
    );
  }, [options, search]);

  return (
    <div className="relative">
      {value ? (
        <div className="flex items-center gap-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm">
          <span className="flex-1 truncate">{displayValue}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="shrink-0 w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Icon name="X" className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            setSearch("");
          }}
          className="flex items-center gap-2 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:border-ring transition-colors text-left"
        >
          <Icon name="Search" className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{placeholder}</span>
        </button>
      )}
      {open && !value && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                  Ничего не найдено
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onSelect(opt.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex flex-col"
                  >
                    <span className="text-foreground">{opt.label}</span>
                    {opt.sub && (
                      <span className="text-[11px] text-muted-foreground">
                        {opt.sub}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SearchableSelect;
