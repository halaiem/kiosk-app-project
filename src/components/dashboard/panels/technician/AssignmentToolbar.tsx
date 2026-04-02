import { useState, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import type { RouteInfo, ScheduleEntry } from "@/types/dashboard";
import {
  AssignmentRow,
  Template,
  nextKey,
} from "./assignment-shared";

interface AssignmentToolbarProps {
  date: string;
  setDate: (v: string) => void;
  existingForDate: ScheduleEntry[];
  filledRowsCount: number;
  saving: boolean;
  handleSubmit: () => void;
  clearAll: () => void;
  onPrintForm: () => void;
  setRows: React.Dispatch<React.SetStateAction<AssignmentRow[]>>;
  setResults: (v: null) => void;
  schedule: ScheduleEntry[];
  routes: RouteInfo[];
  templates: Template[];
  templatesLoading: boolean;
  templatesPanelOpen: boolean;
  setTemplatesPanelOpen: (v: boolean) => void;
  saveTemplateOpen: boolean;
  setSaveTemplateOpen: (v: boolean) => void;
  setTplOverwriteId: (v: number | null) => void;
  setTplName: (v: string) => void;
  setTplDesc: (v: string) => void;
  setTplError: (v: string) => void;
  handleLoadTemplate: (tpl: Template) => void;
  handleDeleteTemplate: (id: number) => void;
  openOverwrite: (tpl: Template) => void;
}

export default function AssignmentToolbar({
  date,
  setDate,
  existingForDate,
  filledRowsCount,
  saving,
  handleSubmit,
  clearAll,
  onPrintForm,
  setRows,
  setResults,
  schedule,
  routes,
  templates,
  templatesLoading,
  templatesPanelOpen,
  setTemplatesPanelOpen,
  saveTemplateOpen,
  setSaveTemplateOpen,
  setTplOverwriteId,
  setTplName,
  setTplDesc,
  setTplError,
  handleLoadTemplate,
  handleDeleteTemplate,
  openOverwrite,
}: AssignmentToolbarProps) {
  const [copyDatePickerOpen, setCopyDatePickerOpen] = useState(false);
  const [copySourceDate, setCopySourceDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });

  const sourceDateEntries = useMemo(
    () =>
      schedule.filter(
        (s) => s.date === copySourceDate && s.status !== "cancelled"
      ),
    [schedule, copySourceDate]
  );

  const datesWithSchedule = useMemo(() => {
    const map: Record<string, number> = {};
    schedule.forEach((s) => {
      if (s.date && s.status !== "cancelled") {
        map[s.date] = (map[s.date] || 0) + 1;
      }
    });
    return map;
  }, [schedule]);

  const extractTime = useCallback((v: string | undefined) => {
    if (!v) return "";
    if (v.includes("T")) return v.split("T")[1]?.slice(0, 5) ?? "";
    if (v.includes(":")) return v.slice(0, 5);
    return "";
  }, []);

  const copyFromDate = useCallback(() => {
    if (sourceDateEntries.length === 0) return;

    const newRows: AssignmentRow[] = sourceDateEntries.map((entry) => {
      const route = routes.find((r) => r.id === entry.routeId);
      return {
        key: nextKey(),
        routeId: entry.routeId ?? "",
        routeNumber: entry.routeNumber ?? route?.number ?? "",
        routeName: route?.name ?? "",
        driverId: entry.driverId ?? null,
        vehicleId: entry.vehicleId ?? "",
        shiftStart: extractTime(entry.startTime) || "06:00",
        shiftEnd: extractTime(entry.endTime) || "14:00",
        shiftType: (entry.shiftType as "regular" | "additional") ?? "regular",
        notes: "",
        showNotes: false,
      };
    });

    setRows(newRows);
    setResults(null);
    setCopyDatePickerOpen(false);
  }, [sourceDateEntries, routes, extractTime, setRows, setResults]);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon name="ClipboardList" className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Наряд на день</h2>
          <p className="text-xs text-muted-foreground">
            Массовое назначение водителей и транспорта на маршруты
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setResults(null);
          }}
          className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {existingForDate.length > 0 && (
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-500">
            {existingForDate.length} назн.
          </span>
        )}
        <div className="relative">
          <button
            onClick={() => setCopyDatePickerOpen(!copyDatePickerOpen)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
          >
            <Icon name="Copy" className="w-3.5 h-3.5" />
            Копировать из...
          </button>
          {copyDatePickerOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setCopyDatePickerOpen(false)}
              />
              <div className="absolute z-20 top-full right-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 pt-3 pb-2">
                  <p className="text-xs font-semibold text-foreground mb-2">
                    Копировать наряд с другой даты
                  </p>
                  <input
                    type="date"
                    value={copySourceDate}
                    onChange={(e) => setCopySourceDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {sourceDateEntries.length > 0 ? (
                  <div className="px-4 pb-3">
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Найдено{" "}
                      <span className="font-bold text-foreground">
                        {sourceDateEntries.length}
                      </span>{" "}
                      назначений
                    </p>
                    <button
                      onClick={copyFromDate}
                      className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Icon name="Copy" className="w-3.5 h-3.5" />
                      Копировать в форму
                    </button>
                  </div>
                ) : (
                  <div className="px-4 pb-3">
                    <p className="text-[11px] text-muted-foreground">
                      Нет назначений на эту дату
                    </p>
                  </div>
                )}
                {Object.keys(datesWithSchedule).length > 0 && (
                  <div className="border-t border-border px-4 py-2">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                      Даты с нарядами
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {Object.entries(datesWithSchedule)
                        .filter(([d]) => d !== date)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .slice(0, 20)
                        .map(([d, cnt]) => (
                          <button
                            key={d}
                            onClick={() => setCopySourceDate(d)}
                            className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                              d === copySourceDate
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-border text-muted-foreground hover:border-ring hover:text-foreground"
                            }`}
                          >
                            {d.slice(5)}{" "}
                            <span className="opacity-60">({cnt})</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => {
              setTemplatesPanelOpen(!templatesPanelOpen);
              setSaveTemplateOpen(false);
            }}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
          >
            <Icon name="BookOpen" className="w-3.5 h-3.5" />
            Шаблоны
            {templates.length > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-500">
                {templates.length}
              </span>
            )}
          </button>
          {templatesPanelOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setTemplatesPanelOpen(false)}
              />
              <div className="absolute z-20 top-full right-0 mt-1 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <p className="text-xs font-semibold text-foreground">
                    Шаблоны нарядов
                  </p>
                  <button
                    onClick={() => {
                      setTplOverwriteId(null);
                      setTplName("");
                      setTplDesc("");
                      setTplError("");
                      setSaveTemplateOpen(true);
                      setTemplatesPanelOpen(false);
                    }}
                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Icon name="Plus" className="w-3 h-3" />
                    Сохранить текущий
                  </button>
                </div>
                {templatesLoading ? (
                  <div className="px-4 pb-4 flex items-center justify-center gap-2 py-6">
                    <Icon
                      name="Loader2"
                      className="w-4 h-4 animate-spin text-muted-foreground"
                    />
                    <span className="text-xs text-muted-foreground">
                      Загрузка...
                    </span>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="px-4 pb-4 text-center py-6">
                    <Icon
                      name="FileX"
                      className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Нет сохранённых шаблонов
                    </p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="px-4 py-2.5 border-t border-border hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {tpl.name}
                            </p>
                            {tpl.description && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {tpl.description}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {tpl.rows.length} строк · {tpl.createdBy}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleLoadTemplate(tpl)}
                              title="Загрузить"
                              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-primary/10 text-primary transition-colors"
                            >
                              <Icon name="Download" className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openOverwrite(tpl)}
                              title="Перезаписать текущими данными"
                              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
                            >
                              <Icon name="RefreshCw" className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              title="Удалить"
                              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-500/10 text-red-500/60 hover:text-red-500 transition-colors"
                            >
                              <Icon name="Trash2" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <button
          onClick={onPrintForm}
          disabled={filledRowsCount === 0}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon name="Printer" className="w-3.5 h-3.5" />
          Печать
        </button>
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
        >
          <Icon name="RotateCcw" className="w-3.5 h-3.5" />
          Очистить все
        </button>
        <button
          onClick={handleSubmit}
          disabled={filledRowsCount === 0 || saving}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Icon name="Loader2" className="w-4 h-4 animate-spin" />
          ) : (
            <Icon name="Save" className="w-4 h-4" />
          )}
          Сохранить ({filledRowsCount})
        </button>
      </div>
    </div>
  );
}
