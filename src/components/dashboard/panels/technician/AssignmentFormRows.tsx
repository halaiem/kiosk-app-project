import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { RouteInfo } from "@/types/dashboard";
import {
  AssignmentRow,
  SearchableSelect,
  nextKey,
} from "./assignment-shared";

interface AssignmentFormRowsProps {
  rows: AssignmentRow[];
  routes: RouteInfo[];
  routeOptions: { id: string | number; label: string; sub?: string }[];
  driverOptions: { id: string | number; label: string; sub?: string }[];
  vehicleOptions: { id: string | number; label: string; sub?: string }[];
  getDriverDisplay: (driverId: number | null) => string;
  getVehicleDisplay: (vehicleId: string) => string;
  updateRow: (key: string, patch: Partial<AssignmentRow>) => void;
  removeRow: (key: string) => void;
  addCustomRow: () => void;
  setRows: React.Dispatch<React.SetStateAction<AssignmentRow[]>>;
  setResults: (v: null) => void;
}

export default function AssignmentFormRows({
  rows,
  routes,
  routeOptions,
  driverOptions,
  vehicleOptions,
  getDriverDisplay,
  getVehicleDisplay,
  updateRow,
  removeRow,
  addCustomRow,
  setRows,
  setResults,
}: AssignmentFormRowsProps) {
  const [rowConfirmKey, setRowConfirmKey] = useState<string | null>(null);
  const [rowConfirmAction, setRowConfirmAction] = useState<"duplicate" | "delete" | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Icon name="ListChecks" className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          Новые назначения
        </span>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {rows.length} маршрутов
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Icon
            name="ClipboardX"
            className="w-10 h-10 text-muted-foreground/30"
          />
          <p className="text-sm text-muted-foreground">
            Нет строк для назначения
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.key}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-36 pt-1.5">
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                    Маршрут
                  </label>
                  <SearchableSelect
                    value={row.routeId || null}
                    displayValue={row.routeNumber ? `М${row.routeNumber}${row.routeName ? ` — ${row.routeName}` : ""}` : ""}
                    placeholder="Выбрать маршрут"
                    options={routeOptions}
                    onSelect={(id) => {
                      const r = routes.find((rt) => rt.id === id);
                      if (r) updateRow(row.key, { routeId: r.id, routeNumber: r.number, routeName: r.name });
                    }}
                    onClear={() => updateRow(row.key, { routeId: "", routeNumber: "", routeName: "" })}
                  />
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                      Водитель
                    </label>
                    <SearchableSelect
                      value={row.driverId}
                      displayValue={getDriverDisplay(row.driverId)}
                      placeholder="Выбрать водителя"
                      options={driverOptions}
                      onSelect={(id) =>
                        updateRow(row.key, { driverId: id as number })
                      }
                      onClear={() => updateRow(row.key, { driverId: null })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                      Транспорт
                    </label>
                    <SearchableSelect
                      value={row.vehicleId || null}
                      displayValue={getVehicleDisplay(row.vehicleId)}
                      placeholder="Выбрать ТС"
                      options={vehicleOptions}
                      onSelect={(id) =>
                        updateRow(row.key, { vehicleId: id as string })
                      }
                      onClear={() => updateRow(row.key, { vehicleId: "" })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                        Начало
                      </label>
                      <input
                        type="time"
                        value={row.shiftStart}
                        onChange={(e) =>
                          updateRow(row.key, { shiftStart: e.target.value })
                        }
                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                        Конец
                      </label>
                      <input
                        type="time"
                        value={row.shiftEnd}
                        onChange={(e) =>
                          updateRow(row.key, { shiftEnd: e.target.value })
                        }
                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                        Тип смены
                      </label>
                      <select
                        value={row.shiftType}
                        onChange={(e) =>
                          updateRow(row.key, {
                            shiftType: e.target.value as
                              | "regular"
                              | "additional",
                          })
                        }
                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="regular">Обычная</option>
                        <option value="additional">Дополнит.</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateRow(row.key, { showNotes: !row.showNotes })
                      }
                      className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                        row.showNotes
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                      title="Заметки"
                    >
                      <Icon name="StickyNote" className="w-4 h-4" />
                    </button>

                    {rowConfirmKey === row.key ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {rowConfirmAction === "duplicate" ? "Дублировать?" : "Удалить?"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (rowConfirmAction === "duplicate") {
                              const cur = rows.find((r) => r.key === row.key);
                              if (cur) {
                                setRows((prev) => [...prev, { ...cur, key: nextKey(), showNotes: false }]);
                                setResults(null);
                              }
                            } else {
                              removeRow(row.key);
                            }
                            setRowConfirmKey(null);
                            setRowConfirmAction(null);
                          }}
                          className={`h-7 px-2 rounded text-[11px] font-medium transition-colors ${
                            rowConfirmAction === "duplicate"
                              ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                              : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          }`}
                        >
                          Да
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRowConfirmKey(null); setRowConfirmAction(null); }}
                          className="h-7 px-2 rounded bg-muted hover:bg-muted/70 text-[11px] text-muted-foreground transition-colors"
                        >
                          Нет
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => { setRowConfirmKey(row.key); setRowConfirmAction("duplicate"); }}
                          className="shrink-0 w-9 h-9 rounded-lg border border-border bg-background text-muted-foreground hover:text-blue-500 hover:border-blue-500/30 hover:bg-blue-500/5 flex items-center justify-center transition-colors"
                          title="Дублировать строку"
                        >
                          <Icon name="Copy" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRowConfirmKey(row.key); setRowConfirmAction("delete"); }}
                          className="shrink-0 w-9 h-9 rounded-lg border border-border bg-background text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 flex items-center justify-center transition-colors"
                          title="Удалить строку"
                        >
                          <Icon name="X" className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {row.showNotes && (
                <div className="mt-3 pl-0 sm:pl-[7.75rem]">
                  <textarea
                    value={row.notes}
                    onChange={(e) =>
                      updateRow(row.key, { notes: e.target.value })
                    }
                    placeholder="Заметки к назначению..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addCustomRow}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors w-full justify-center"
      >
        <Icon name="Plus" className="w-4 h-4" />
        Добавить строку
      </button>
    </div>
  );
}
